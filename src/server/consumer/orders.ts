import { buildPersistedCartSummary, normalizePersistedCartRecord, type PersistedCartUpsertInput } from '@/lib/persisted-carts';
import { getSupabaseServer } from '@/lib/supabase-server';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

async function getCustomerByAuthUserId(userId: string): Promise<{ id: string; auth_user_id: string }> {
  const admin = getSupabaseServer() as any;

  const { data, error } = await admin
    .from('customers')
    .select('id, auth_user_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo resolver el cliente autenticado');
  }

  if (!data) {
    throw new Error('No se encontró el cliente autenticado');
  }

  return data;
}

async function getBranchContext(branchId: string): Promise<{
  branchId: string;
  branchName: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
}> {
  const admin = getSupabaseServer() as any;

  const { data: branch, error: branchError } = await admin
    .from('branches')
    .select('id, name, restaurant_id')
    .eq('id', branchId)
    .maybeSingle();

  if (branchError) {
    throw new Error(branchError.message || 'Sucursal inválida para guardar el carrito');
  }

  if (!branch?.restaurant_id) {
    throw new Error('La sucursal indicada no existe');
  }

  const { data: restaurant, error: restaurantError } = await admin
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', branch.restaurant_id)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(restaurantError.message || 'Restaurante inválido para guardar el carrito');
  }

  if (!restaurant) {
    throw new Error('No se encontró el restaurante de la sucursal');
  }

  return {
    branchId: String(branch.id),
    branchName: branch.name ? String(branch.name) : null,
    restaurantId: String(restaurant.id),
    restaurantName: String(restaurant.name || 'Restaurant'),
    restaurantSlug: String(restaurant.slug || restaurant.id),
  };
}

export async function listOrderBidsLocal(orderId: string) {
  const admin = getSupabaseServer() as any;
  const { data: bids, error } = await admin
    .from('delivery_bids')
    .select('id, order_id, base_price, driver_offer, driver_rating_snapshot, estimated_time_minutes, driver_notes, status, expires_at, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch bids');
  }

  return {
    orderId,
    bids: (bids || []).map((bid: any) => ({
      id: bid.id,
      bidAmount: bid.driver_offer ?? bid.base_price,
      driverRating: bid.driver_rating_snapshot,
      estimatedTimeMinutes: bid.estimated_time_minutes,
      driverNotes: bid.driver_notes,
      basePrice: bid.base_price,
      status: bid.status,
      expiresAt: bid.expires_at,
      createdAt: bid.created_at,
    })),
  };
}

export async function confirmDeliveryLocal(orderId: string) {
  const admin = getSupabaseServer() as any;

  const { data: order, error } = await admin
    .from('orders')
    .select('id, status_id, accepted_by_user, confirmed_by_delivery')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error(error?.message || 'Order not found');
  }

  const [deliveringStatus, completedStatus] = await Promise.all([
    admin.from('order_statuses').select('id, code, label').eq('code', 'DELIVERING').single(),
    admin.from('order_statuses').select('id, code, label').eq('code', 'COMPLETED').single(),
  ]);

  if (deliveringStatus.error || completedStatus.error) {
    throw new Error(deliveringStatus.error?.message || completedStatus.error?.message || 'Missing order statuses');
  }

  const now = new Date().toISOString();
  if (order.status_id !== deliveringStatus.data.id && order.status_id !== completedStatus.data.id) {
    throw new Error('Order must be DELIVERING or COMPLETED to confirm delivery');
  }

  const wasAlreadyCompleted = order.status_id === completedStatus.data.id;
  const shouldCompleteNow = order.status_id === deliveringStatus.data.id && order.confirmed_by_delivery === true;

  const updatePayload: any = {
    accepted_by_user: true,
    updated_at: now,
  };

  if (shouldCompleteNow) {
    updatePayload.status_id = completedStatus.data.id;
    updatePayload.completed_at = now;
  }

  const { error: updateError } = await admin.from('orders').update(updatePayload).eq('id', orderId);
  if (updateError) {
    throw new Error(updateError.message || 'Unable to confirm delivery');
  }

  const isCompleted = wasAlreadyCompleted || shouldCompleteNow;
  return {
    orderId,
    acceptedByUser: true,
    confirmedByDelivery: order.confirmed_by_delivery === true,
    status: isCompleted ? 'COMPLETED' : 'DELIVERING',
    label: isCompleted ? (completedStatus.data.label || null) : (deliveringStatus.data.label || null),
  };
}

export async function getOrderTrackingLocal(orderId: string) {
  const admin = getSupabaseServer() as any;
  const { data: order, error } = await admin
    .from('orders')
    .select(`
      id,
      status_id,
      service_mode,
      estimated_time,
      delivery_id,
      auction_started_at,
      auction_ended_at,
      customer_latitude,
      customer_longitude,
      branch_id,
      restaurant_id,
      restaurants (id, name, latitude, longitude),
      branches (id, name, latitude, longitude)
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error(error?.message || 'Order not found');
  }

  const [{ data: statusRecord }, { data: latestBids }] = await Promise.all([
    admin.from('order_statuses').select('id, code, label').eq('id', order.status_id).maybeSingle(),
    admin
      .from('delivery_bids')
      .select('id, status, estimated_time_minutes, expires_at, created_at, driver_offer, base_price')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const latestBid = (latestBids || [])[0] || null;
  const restaurantCoords = order.branches && (order.branches as any).latitude != null
    ? {
        latitude: (order.branches as any).latitude,
        longitude: (order.branches as any).longitude,
      }
    : {
        latitude: (order.restaurants as any)?.latitude ?? null,
        longitude: (order.restaurants as any)?.longitude ?? null,
      };

  return {
    orderId: order.id,
    status: statusRecord || null,
    serviceMode: order.service_mode,
    restaurant: {
      id: order.restaurant_id,
      name: (order.restaurants as any)?.name || null,
      coordinates: restaurantCoords,
    },
    destination: {
      coordinates: {
        latitude: order.customer_latitude,
        longitude: order.customer_longitude,
      },
    },
    courier: {
      assigned: Boolean(order.delivery_id),
      coordinates: null,
      updatedAt: null,
      freshness: 'unavailable',
    },
    eta: {
      minutes: latestBid?.estimated_time_minutes ?? order.estimated_time ?? null,
      source: latestBid?.estimated_time_minutes != null ? 'delivery_bid' : (order.estimated_time != null ? 'order_estimate' : 'unavailable'),
    },
    auction: {
      hasBids: (latestBids || []).length > 0,
      state: order.delivery_id ? 'assigned' : ((latestBids || []).length > 0 ? 'collecting_bids' : 'awaiting_driver'),
      startedAt: order.auction_started_at || null,
      endedAt: order.auction_ended_at || null,
      latestBid: latestBid
        ? {
            id: latestBid.id,
            status: latestBid.status,
            estimatedTimeMinutes: latestBid.estimated_time_minutes,
            bidAmount: latestBid.driver_offer ?? latestBid.base_price,
            expiresAt: latestBid.expires_at,
          }
        : null,
    },
  };
}

export async function saveOrderSplitLocal(orderId: string, userId: string, dto: { strategy: string; splitData: Record<string, unknown> }) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, customer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message || 'Order not found');
  }

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.customer_id !== customer.id) {
    throw new Error('You can only save split data for your own order');
  }

  const { data, error } = await admin
    .from('order_splits')
    .insert({
      order_id: orderId,
      strategy: dto.strategy,
      split_data: dto.splitData,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Could not save split');
  }

  return data;
}

export async function getLatestOrderSplitLocal(orderId: string, userId: string) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, customer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message || 'Order not found');
  }

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.customer_id !== customer.id) {
    throw new Error('You can only view split data for your own order');
  }

  const { data, error } = await admin
    .from('order_splits')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not load split');
  }

  return data || null;
}

export async function listSavedCartsLocal(userId: string, branchId?: string) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);

  let query = admin
    .from('carts')
    .select('*')
    .eq('customer_id', customer.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Could not load saved carts');
  }

  return (data || []).map((row: Record<string, unknown>) => normalizePersistedCartRecord(row, 'database'));
}

export async function getSavedCartLocal(userId: string, cartId: string) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);

  const { data, error } = await admin
    .from('carts')
    .select('*')
    .eq('id', cartId)
    .eq('customer_id', customer.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not load saved cart');
  }

  if (!data) {
    throw new Error('Saved cart not found');
  }

  return normalizePersistedCartRecord(data, 'database');
}

export async function upsertSavedCartLocal(userId: string, payload: PersistedCartUpsertInput) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);
  const branchContext = await getBranchContext(payload.branchId);
  const summary = buildPersistedCartSummary(payload.cartItems);

  const restaurantSnapshot = payload.restaurantSnapshot && typeof payload.restaurantSnapshot === 'object'
    ? payload.restaurantSnapshot
    : {
        id: branchContext.restaurantId,
        name: branchContext.restaurantName,
        image_url: null,
      };

  const rowPayload = {
    customer_id: customer.id,
    restaurant_id: branchContext.restaurantId,
    branch_id: branchContext.branchId,
    restaurant_slug: branchContext.restaurantSlug,
    restaurant_name: branchContext.restaurantName,
    branch_name: branchContext.branchName,
    is_active: true,
    item_count: summary.itemCount,
    subtotal: summary.subtotal,
    cart_items: payload.cartItems,
    checkout_draft: payload.checkoutDraft || {},
    restaurant_snapshot: restaurantSnapshot,
    metadata: payload.metadata || {},
    expires_at: null,
  };

  const { data, error } = await admin
    .from('carts')
    .upsert(rowPayload, { onConflict: 'customer_id,branch_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not save cart');
  }

  return normalizePersistedCartRecord(data, 'database');
}

export async function archiveSavedCartLocal(userId: string, cartId: string) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);

  const { data: cart, error: cartError } = await admin
    .from('carts')
    .select('id')
    .eq('id', cartId)
    .eq('customer_id', customer.id)
    .eq('is_active', true)
    .maybeSingle();

  if (cartError) {
    throw new Error(cartError.message || 'Could not archive saved cart');
  }

  if (!cart) {
    throw new Error('Saved cart not found');
  }

  const { error } = await admin
    .from('carts')
    .update({ is_active: false })
    .eq('id', cartId)
    .eq('customer_id', customer.id);

  if (error) {
    throw new Error(error.message || 'Could not archive saved cart');
  }
}

export async function loadTrackedOrdersLocal(params: {
  customerId: string;
  branchId?: string;
}) {
  const admin = getSupabaseServer() as any;
  let orderQuery = admin
    .from('orders')
    .select('id, order_number, status_id, total, customer_total, delivery_fee, delivery_final_price, updated_at, created_at, security_code, delivery_id, confirmed_by_delivery, accepted_by_user, branch_id, cancellation_reason')
    .eq('customer_id', params.customerId)
    .order('updated_at', { ascending: false })
    .limit(12);

  if (params.branchId) {
    orderQuery = orderQuery.eq('branch_id', params.branchId);
  }

  const { data: orders, error } = await orderQuery;
  if (error) {
    throw new Error(error.message || 'Could not load tracked orders');
  }

  const orderRows = orders || [];
  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((order: any) => order.id);
  const statusIds = Array.from(new Set(orderRows.map((order: any) => order.status_id).filter(Boolean)));
  const [{ data: statuses }, { data: bids }] = await Promise.all([
    statusIds.length > 0
      ? admin.from('order_statuses').select('id, code, label').in('id', statusIds)
      : Promise.resolve({ data: [] }),
    admin
      .from('delivery_bids')
      .select('id, order_id, base_price, driver_offer, driver_rating_snapshot, estimated_time_minutes, driver_notes, status, expires_at, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false }),
  ]);

  const statusById = new Map((statuses || []).map((status: any) => [status.id, status]));
  const bidsByOrder = new Map<string, any[]>();
  for (const bid of bids || []) {
    const bucket = bidsByOrder.get(bid.order_id) || [];
    bucket.push(bid);
    bidsByOrder.set(bid.order_id, bucket);
  }

  return orderRows.map((order: any) => {
    const status = statusById.get(order.status_id) || null;
    const statusRecord = status && typeof status === 'object' ? status as Record<string, unknown> : null;
    const orderBids = bidsByOrder.get(order.id) || [];
    const subtotal = toNumber(order.total);
    const customerTotal = toNumber(order.customer_total ?? order.total);
    const deliveryFee = toNumber(order.delivery_final_price ?? order.delivery_fee);
    const feesTotal = Math.max(0, customerTotal - subtotal - deliveryFee);
    const cancellationReason =
      String(statusRecord?.code || '').toUpperCase() === 'CANCELLED' && typeof order.cancellation_reason === 'string' && order.cancellation_reason.trim().length > 0
        ? order.cancellation_reason.trim()
        : null;

    return {
      orderId: String(order.id),
      orderNumber: typeof order.order_number === 'string' ? order.order_number : 'PENDING',
      updatedAt: order.updated_at || order.created_at || new Date().toISOString(),
      status: statusRecord
        ? {
            code: String(statusRecord.code || 'UNKNOWN'),
            label: String(statusRecord.label || statusRecord.code || 'Estado actualizado'),
          }
        : { code: 'UNKNOWN', label: 'Estado actualizado' },
      total: customerTotal,
      subtotal,
      deliveryFee,
      feesTotal,
      customerTotal,
      securityCode: typeof order.security_code === 'string' ? order.security_code : null,
      deliveryId: order.delivery_id ? String(order.delivery_id) : null,
      confirmedByDelivery: Boolean(order.confirmed_by_delivery),
      acceptedByUser: Boolean(order.accepted_by_user),
      cancellationReason,
      bids: orderBids.map((bid: any) => ({
        id: String(bid.id),
        bidAmount: toNumber(bid.driver_offer ?? bid.base_price),
        driverRating: toNumber(bid.driver_rating_snapshot),
        estimatedTimeMinutes: bid.estimated_time_minutes == null ? null : toNumber(bid.estimated_time_minutes),
        driverNotes: typeof bid.driver_notes === 'string' ? bid.driver_notes : null,
        basePrice: toNumber(bid.base_price),
        status: String(bid.status || 'ACTIVE'),
        expiresAt: bid.expires_at || new Date().toISOString(),
        createdAt: bid.created_at || new Date().toISOString(),
      })),
    };
  });
}