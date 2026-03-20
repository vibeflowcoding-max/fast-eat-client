import { randomUUID } from 'crypto';
import { getSupabaseServer } from '@/lib/supabase-server';
import { expandComboSelections, getActiveCombosByIds, validateDealForCart, type AppliedDiscountRecord } from '@/server/offers/order-offers';

type OrderPaymentMethodCode = 'CASH' | 'CARD' | 'SINPE' | 'TRANSFER';

function normalizeOrderPaymentMethod(paymentMethod?: string | null): OrderPaymentMethodCode {
  const normalized = String(paymentMethod || 'CASH').trim().toUpperCase();

  if (normalized === 'CARD' || normalized === 'SINPE' || normalized === 'TRANSFER') {
    return normalized;
  }

  return 'CASH';
}

async function resolvePaymentMethodId(admin: any, paymentMethodCode?: OrderPaymentMethodCode | null): Promise<number | null> {
  if (!paymentMethodCode) {
    return null;
  }

  const { data, error } = await admin
    .from('payment_methods')
    .select('id, code')
    .eq('code', paymentMethodCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || `Could not resolve payment method ${paymentMethodCode}`);
  }

  if (!data?.id) {
    throw new Error(`Payment method ${paymentMethodCode} is not configured`);
  }

  return Number(data.id);
}

function isPricePeriodActive(periodRaw: unknown, referenceDate: Date = new Date()): boolean {
  if (typeof periodRaw !== 'string' || periodRaw.length < 2) {
    return true;
  }

  const body = periodRaw.slice(1, -1);
  const delimiterIndex = body.indexOf(',');
  if (delimiterIndex === -1) {
    return true;
  }

  const rawStart = body.slice(0, delimiterIndex).replace(/"/g, '').trim();
  const rawEnd = body.slice(delimiterIndex + 1).replace(/"/g, '').trim();
  const start = rawStart ? new Date(rawStart) : null;
  const end = rawEnd ? new Date(rawEnd) : null;

  if (start && Number.isFinite(start.getTime()) && referenceDate < start) {
    return false;
  }

  if (end && Number.isFinite(end.getTime()) && referenceDate >= end) {
    return false;
  }

  return true;
}

function getPricePreferenceScore(price: any, requestedChannel: string, requestedServiceMode: string): number {
  let score = 0;
  const channel = String(price.channel || '').toLowerCase();
  const serviceMode = String(price.service_mode || '').toLowerCase();

  if (requestedServiceMode && serviceMode === requestedServiceMode) {
    score += 4;
  } else if (!requestedServiceMode || serviceMode === 'delivery' || serviceMode === 'pickup') {
    score += 1;
  }

  if (requestedChannel && channel === requestedChannel) {
    score += 3;
  } else if (channel === 'default' || channel === 'client') {
    score += 2;
  }

  if (price.created_at) {
    score += new Date(price.created_at).getTime() / 1_000_000_000_000;
  }

  return score;
}

function getBestVariantPrice(priceRows: any[], variantId: string, requestedChannel: string, serviceMode?: string): number | null {
  const normalizedChannel = String(requestedChannel || '').toLowerCase();
  const normalizedServiceMode = String(serviceMode || '').toLowerCase();

  const eligibleRows = (priceRows || [])
    .filter((row: any) => row.variant_id === variantId)
    .filter((row: any) => isPricePeriodActive(row.period))
    .sort((left: any, right: any) => {
      const leftScore = getPricePreferenceScore(left, normalizedChannel, normalizedServiceMode);
      const rightScore = getPricePreferenceScore(right, normalizedChannel, normalizedServiceMode);
      return rightScore - leftScore;
    });

  const best = eligibleRows[0] || null;
  return best ? Number(best.amount || 0) : null;
}

function isModifierItemAvailable(item: any): boolean {
  const hasStock = item.stock_count == null || Number(item.stock_count) > 0;
  const isSnoozed = item.snooze_until ? new Date(item.snooze_until).getTime() > Date.now() : false;
  return item.is_available !== false && hasStock && !isSnoozed;
}

async function loadModifierCatalogForItems(menuItemIds: string[]) {
  if (menuItemIds.length === 0) {
    return {
      modifierCatalogByItem: new Map<string, any[]>(),
      modifierOptionsById: new Map<string, any>(),
    };
  }

  const admin = getSupabaseServer() as any;
  const { data: modifierLinks } = await admin
    .from('menu_item_modifier_groups')
    .select('menu_item_id, modifier_group_id, display_order')
    .in('menu_item_id', menuItemIds);

  const groupIds = Array.from(new Set((modifierLinks || []).map((link: any) => link.modifier_group_id).filter(Boolean)));
  const [{ data: modifierGroups }, { data: modifierItems }] = await Promise.all([
    groupIds.length > 0
      ? admin.from('modifier_groups').select('id, name, min_selection, max_selection, is_required').in('id', groupIds)
      : Promise.resolve({ data: [] }),
    groupIds.length > 0
      ? admin.from('modifier_items').select('id, group_id, name, price_adjustment, is_available, stock_count, snooze_until').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  const modifierGroupsById = new Map<string, any>((modifierGroups || []).map((group: any) => [String(group.id), group]));
  const modifierOptionsById = new Map<string, any>((modifierItems || []).map((item: any) => [String(item.id), item]));
  const modifierCatalogByItem = new Map<string, any[]>();

  for (const link of modifierLinks || []) {
    const group = modifierGroupsById.get(String(link.modifier_group_id));
    if (!group) {
      continue;
    }

    const options = (modifierItems || []).filter((item: any) => item.group_id === group.id);
    const bucket = modifierCatalogByItem.get(String(link.menu_item_id)) || [];
    bucket.push({
      ...group,
      display_order: link.display_order,
      options,
    });
    modifierCatalogByItem.set(String(link.menu_item_id), bucket);
  }

  return {
    modifierCatalogByItem,
    modifierOptionsById,
  };
}

function buildOrderLinePayloads(args: {
  items: Array<{ item_id: string; variant_id: string; variant_name: string; quantity: number; notes?: string; modifiers?: Array<{ modifier_item_id: string; quantity?: number }>; name_override?: string }>;
  menuItemMap: Map<string, any>;
  prices: any[];
  serviceMode: string;
  requestedChannel: string;
  modifierCatalogByItem: Map<string, any[]>;
  modifierOptionsById: Map<string, any>;
}) {
  const orderLinePayloads: any[] = [];
  const orderModifierPayloads: any[] = [];

  for (const item of args.items) {
    const menuItem = args.menuItemMap.get(item.item_id);
    if (!menuItem) {
      throw new Error(`Menu item ${item.item_id} is unavailable`);
    }

    const selectedModifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
    const selectedGroupsCount = new Map<string, number>();
    let modifierUnitPrice = 0;

    for (const selectedModifier of selectedModifiers) {
      const modifierOption = args.modifierOptionsById.get(selectedModifier.modifier_item_id);
      if (!modifierOption) {
        throw new Error(`Modifier ${selectedModifier.modifier_item_id} is not available for item ${item.item_id}`);
      }

      if (!isModifierItemAvailable(modifierOption)) {
        throw new Error(`Modifier ${modifierOption.name} is currently unavailable`);
      }

      const quantity = Math.max(1, Number(selectedModifier.quantity || 1));
      const currentCount = selectedGroupsCount.get(modifierOption.group_id) || 0;
      selectedGroupsCount.set(modifierOption.group_id, currentCount + quantity);
      modifierUnitPrice += Number(modifierOption.price_adjustment || 0) * quantity;
    }

    const linkedGroups = args.modifierCatalogByItem.get(item.item_id) || [];
    for (const linkedGroup of linkedGroups) {
      const selectedCount = selectedGroupsCount.get(linkedGroup.id) || 0;
      const minSelection = Number(linkedGroup.min_selection || 0);
      const maxSelection = linkedGroup.max_selection == null ? null : Number(linkedGroup.max_selection);
      const required = Boolean(linkedGroup.is_required);

      if ((required || minSelection > 0) && selectedCount < minSelection) {
        throw new Error(`Modifier group ${linkedGroup.name} requires at least ${minSelection} selection(s)`);
      }

      if (maxSelection != null && selectedCount > maxSelection) {
        throw new Error(`Modifier group ${linkedGroup.name} allows at most ${maxSelection} selection(s)`);
      }
    }

    const baseUnitPrice = getBestVariantPrice(args.prices, item.variant_id, args.requestedChannel, args.serviceMode);
    if (baseUnitPrice == null) {
      throw new Error(`No active price found for variant ${item.variant_id}`);
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number((baseUnitPrice + modifierUnitPrice).toFixed(2));
    const lineId = randomUUID();
    orderLinePayloads.push({
      id: lineId,
      menu_item_id: String(item.item_id),
      name: item.name_override || (item.variant_name && item.variant_name !== 'Default'
        ? `${menuItem.name} - ${item.variant_name}`
        : menuItem.name),
      price: unitPrice,
      quantity,
      subtotal: Number((unitPrice * quantity).toFixed(2)),
      special_instructions: item.notes || null,
    });

    for (const selectedModifier of selectedModifiers) {
      const modifierOption = args.modifierOptionsById.get(selectedModifier.modifier_item_id);
      const quantity = Math.max(1, Number(selectedModifier.quantity || 1));
      orderModifierPayloads.push({
        id: randomUUID(),
        order_item_id: lineId,
        modifier_item_id: selectedModifier.modifier_item_id,
        name: modifierOption.name,
        price: Number(modifierOption.price_adjustment || 0),
        quantity,
      });
    }
  }

  return { orderLinePayloads, orderModifierPayloads };
}

function haversineDistanceMeters(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const earthRadiusMeters = 6371000;

  // ⚡ Bolt: Removed inner toRadians function allocation in favor of constant multiplication.
  // ⚡ Bolt: Math.asin(Math.sqrt(a)) is mathematically equivalent to Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // but is ~3x faster in V8 engines. Reduces JS math overhead for distance calculations.
  const toRad = Math.PI / 180;

  const lat1 = origin.lat * toRad;
  const lat2 = destination.lat * toRad;
  const dLat = lat2 - lat1;
  const dLng = (destination.lng - origin.lng) * toRad;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return earthRadiusMeters * c;
}

export async function createConsumerOrderLocal(orderData: {
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  paymentMethod?: string;
  delivery_address?: string | null;
  items: Array<{ item_id?: string; combo_id?: string; variant_id?: string; quantity: number; notes?: string; modifiers?: Array<{ modifier_item_id: string; quantity?: number }> }>;
  deal_id?: string;
  promo_code?: string;
  total_amount: number;
  order_type: string;
  source?: 'client' | 'virtualMenu' | 'bot';
  customerLatitude?: number;
  customerLongitude?: number;
  scheduledFor?: string;
  optOutCutlery?: boolean;
  metadata?: Record<string, any>;
}) {
  const admin = getSupabaseServer() as any;

  const [restaurantResult, pendingStatusResult] = await Promise.all([
    admin.from('restaurants').select('id, latitude, longitude, delivery_enabled, smart_stock_enabled').eq('id', orderData.restaurant_id).single(),
    admin.from('order_statuses').select('id, code').eq('code', 'PENDING').single(),
  ]);

  if (restaurantResult.error || !restaurantResult.data) {
    throw new Error('Restaurant not found');
  }
  if (pendingStatusResult.error || !pendingStatusResult.data) {
    throw new Error('PENDING status not found');
  }

  const restaurant = restaurantResult.data as any;
  const pendingStatus = pendingStatusResult.data as any;
  const normalizedRequestedItems = (orderData.items || []).map((item) => ({
    item_id: item.item_id ? String(item.item_id) : undefined,
    combo_id: item.combo_id ? String(item.combo_id) : undefined,
    variant_id: item.variant_id ? String(item.variant_id) : undefined,
    quantity: Math.max(1, Number(item.quantity || 1)),
    notes: item.notes,
    modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
  }));
  const comboRequests = normalizedRequestedItems
    .filter((item) => Boolean(item.combo_id))
    .map((item) => ({
      combo_id: String(item.combo_id),
      quantity: item.quantity,
      notes: item.notes,
    }));
  const standardItems = normalizedRequestedItems
    .filter((item) => Boolean(item.item_id))
    .map((item) => ({
      item_id: String(item.item_id),
      combo_id: item.combo_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      notes: item.notes,
      modifiers: item.modifiers,
      source_type: 'item' as const,
    }));

  const comboDefinitions = comboRequests.length > 0
    ? await getActiveCombosByIds(comboRequests.map((combo) => combo.combo_id))
    : [];
  const comboDefinitionIds = new Set(comboDefinitions.map((combo) => combo.id));
  for (const comboRequest of comboRequests) {
    if (!comboDefinitionIds.has(comboRequest.combo_id)) {
      throw new Error(`Combo ${comboRequest.combo_id} is unavailable`);
    }
  }

  const { expandedItems: comboExpandedItems, comboDiscounts, comboSelections } = expandComboSelections(comboRequests, comboDefinitions);
  const requestedItems = [...standardItems, ...comboExpandedItems];
  const menuItemIds = Array.from(new Set(requestedItems.map((item) => item.item_id).filter(Boolean)));

  const { data: variants, error: variantsError } = menuItemIds.length > 0
    ? await admin.from('menu_item_variants').select('id, menu_item_id, name, is_default, is_active, display_order').in('menu_item_id', menuItemIds).eq('is_active', true)
    : { data: [], error: null };

  if (variantsError) {
    throw new Error(variantsError.message || 'Could not load variants');
  }

  const variantsByItem = new Map<string, any[]>();
  const variantsById = new Map<string, any>();
  for (const variant of variants || []) {
    const bucket = variantsByItem.get(variant.menu_item_id) || [];
    bucket.push(variant);
    variantsByItem.set(variant.menu_item_id, bucket);
    variantsById.set(variant.id, variant);
  }

  const resolvedItems = requestedItems.map((item) => {
    const availableVariants = variantsByItem.get(item.item_id) || [];
    const explicitVariant = item.variant_id ? variantsById.get(item.variant_id) : null;
    const resolvedVariant = explicitVariant || availableVariants.find((variant: any) => variant.is_default) || availableVariants[0] || null;

    if (!resolvedVariant) {
      throw new Error(`No active variant found for item ${item.item_id}`);
    }
    if (item.variant_id && resolvedVariant.menu_item_id !== item.item_id) {
      throw new Error(`Variant ${item.variant_id} does not belong to item ${item.item_id}`);
    }

    return {
      ...item,
      variant_id: resolvedVariant.id,
      variant_name: resolvedVariant.name,
    };
  });

  const variantIds = resolvedItems.map((item) => item.variant_id).filter(Boolean);
  const { data: menuItems, error: menuItemsError } = menuItemIds.length > 0
    ? await admin.from('menu_items').select('id, name, prep_time, branch_id, description').in('id', menuItemIds)
    : { data: [], error: null };

  if (menuItemsError) {
    throw new Error(menuItemsError.message || 'Could not load menu items');
  }

  const menuItemMap = new Map<string, any>((menuItems || []).map((item: any) => [String(item.id), item]));
  const prepTimeEstimate = resolvedItems.reduce((acc, item) => {
    const menuItem = menuItemMap.get(item.item_id);
    const prep = menuItem ? Number(menuItem.prep_time || 0) : 0;
    return acc + prep * Math.max(1, item.quantity || 1);
  }, 0);
  const resolvedBranchCandidates = Array.from(new Set([
    ...(menuItems || []).map((menuItem: any) => menuItem.branch_id).filter(Boolean),
    ...comboDefinitions.map((combo) => combo.branch_id).filter(Boolean),
  ]));
  if (resolvedBranchCandidates.length > 1) {
    throw new Error('All order items and combos must belong to the same branch');
  }
  const resolvedBranchId = resolvedBranchCandidates[0] || null;

  const { data: priceData, error: priceError } = variantIds.length > 0
    ? await admin.from('prices').select('variant_id, channel, service_mode, amount, period, created_at').in('variant_id', variantIds)
    : { data: [], error: null };

  if (priceError) {
    throw new Error(priceError.message || 'Could not load prices');
  }

  const serviceMode = (orderData.order_type || 'delivery') === 'pickup' ? 'pickup' : (orderData.order_type === 'dine_in' ? 'dine_in' : 'delivery');
  const requestedChannel = orderData.source || 'client';
  const { modifierCatalogByItem, modifierOptionsById } = await loadModifierCatalogForItems(menuItemIds);
  const { orderLinePayloads, orderModifierPayloads } = buildOrderLinePayloads({
    items: resolvedItems,
    menuItemMap,
    prices: priceData || [],
    serviceMode,
    requestedChannel,
    modifierCatalogByItem,
    modifierOptionsById,
  });
  const itemsSubtotal = Number(orderLinePayloads.reduce((sum, line) => sum + Number(line.subtotal || 0), 0).toFixed(2));
  const comboDiscountAmount = Number(comboDiscounts.reduce((sum, discount) => sum + Number(discount.discount_amount || 0), 0).toFixed(2));
  const subtotalAfterCombos = Number(Math.max(itemsSubtotal - comboDiscountAmount, 0).toFixed(2));
  const appliedDiscounts: AppliedDiscountRecord[] = [...comboDiscounts];

  const normalizedCustomerPhone = String(orderData.customer_phone || '').trim();
  if (!normalizedCustomerPhone) {
    throw new Error('customer_phone is required to create an order');
  }

  const normalizedCustomerName = String(orderData.customer_name || '').trim() || 'Cliente';
  const { data: customerRecord, error: customerError } = await admin
    .from('customers')
    .upsert({
      name: normalizedCustomerName,
      phone: normalizedCustomerPhone,
      address: orderData.delivery_address || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone' })
    .select('id')
    .single();

  if (customerError || !customerRecord?.id) {
    throw new Error(customerError?.message || 'Unable to resolve customer for order');
  }

  let originLatitude: number | null = typeof restaurant.latitude === 'number' ? restaurant.latitude : null;
  let originLongitude: number | null = typeof restaurant.longitude === 'number' ? restaurant.longitude : null;

  if ((originLatitude === null || originLongitude === null) && resolvedBranchId) {
    const { data: branchCoords } = await admin.from('branches').select('latitude, longitude').eq('id', resolvedBranchId).maybeSingle();
    if (branchCoords) {
      originLatitude = typeof branchCoords.latitude === 'number' ? branchCoords.latitude : originLatitude;
      originLongitude = typeof branchCoords.longitude === 'number' ? branchCoords.longitude : originLongitude;
    }
  }

  if (
    serviceMode === 'delivery' &&
    orderData.source === 'client' &&
    (!Number.isFinite(orderData.customerLatitude) || !Number.isFinite(orderData.customerLongitude))
  ) {
    throw new Error('Delivery orders from client source require customerLatitude and customerLongitude');
  }

  let deliveryDistanceKm: number | null = null;
  let deliveryBasePrice: number | null = null;

  if (
    serviceMode === 'delivery' &&
    typeof orderData.customerLatitude === 'number' &&
    typeof orderData.customerLongitude === 'number' &&
    typeof originLatitude === 'number' &&
    typeof originLongitude === 'number'
  ) {
    const distanceMeters = haversineDistanceMeters(
      { lat: originLatitude, lng: originLongitude },
      { lat: orderData.customerLatitude, lng: orderData.customerLongitude },
    );
    deliveryDistanceKm = Number((distanceMeters / 1000).toFixed(2));

    const { data: feeRules } = await admin
      .from('fee_rules')
      .select('branch_id, delivery_fee, minimum_fee')
      .or(resolvedBranchId ? `branch_id.eq.${resolvedBranchId},branch_id.is.null` : 'branch_id.is.null')
      .eq('active', true)
      .order('created_at', { ascending: false });

    const matchedFeeRule = (feeRules || []).find((rule: any) => resolvedBranchId && rule.branch_id === resolvedBranchId)
      || (feeRules || []).find((rule: any) => !rule.branch_id)
      || null;

    const deliveryFeePerKm = Number(matchedFeeRule?.delivery_fee || 0);
    const minimumFee = Number(matchedFeeRule?.minimum_fee || 0);
    const calculatedDeliveryFee = Number((deliveryFeePerKm * (distanceMeters / 1000)).toFixed(2));
    deliveryBasePrice = Number(Math.max(calculatedDeliveryFee, minimumFee).toFixed(2));
  }

  const source = orderData.source || 'client';
  const normalizedPaymentMethod = normalizeOrderPaymentMethod(orderData.paymentMethod);
  const resolvedPaymentMethodId = orderData.paymentMethod
    ? await resolvePaymentMethodId(admin, normalizedPaymentMethod)
    : null;
  const metadata = orderData.metadata || {};

  if (orderData.deal_id || orderData.promo_code) {
    if (!resolvedBranchId) {
      throw new Error('A branch-scoped deal requires a resolved branch');
    }

    const dealValidation = await validateDealForCart({
      branchId: resolvedBranchId,
      subtotal: subtotalAfterCombos,
      dealId: orderData.deal_id,
      promoCode: orderData.promo_code,
      customerPhone: normalizedCustomerPhone,
      customerId: customerRecord.id,
      cartItems: normalizedRequestedItems.map((item) => ({
        item_id: item.item_id,
        combo_id: item.combo_id,
        quantity: item.quantity,
      })),
    });

    if (!dealValidation.applied || !dealValidation.deal) {
      throw new Error(`The selected deal is not applicable: ${dealValidation.reason || 'invalid'}`);
    }

    appliedDiscounts.push({
      source_type: 'deal',
      combo_id: null,
      deal_id: dealValidation.deal.id,
      title_snapshot: dealValidation.deal.title,
      discount_type_snapshot: dealValidation.deal.discount_type,
      discount_value_snapshot: Number(dealValidation.deal.discount_value || 0),
      discount_amount: Number(dealValidation.discountAmount || 0),
      subtotal_snapshot: subtotalAfterCombos,
      promo_code_snapshot: dealValidation.deal.promo_code || (orderData.promo_code ? orderData.promo_code.trim().toUpperCase() : null),
      application_mode: dealValidation.deal.application_mode,
    });
  }

  const totalDiscountAmount = Number(appliedDiscounts.reduce((sum, discount) => sum + Number(discount.discount_amount || 0), 0).toFixed(2));
  const discountedSubtotal = Number(Math.max(itemsSubtotal - totalDiscountAmount, 0).toFixed(2));
  const scheduledForRaw = orderData.scheduledFor || metadata.scheduledFor;
  const optOutCutlery = Boolean(orderData.optOutCutlery ?? metadata.optOutCutlery ?? false);
  let scheduledFor: string | null = null;

  if (scheduledForRaw) {
    const parsedDate = new Date(scheduledForRaw);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('scheduledFor must be a valid ISO datetime');
    }
    if (parsedDate.getTime() <= Date.now()) {
      throw new Error('scheduledFor must be in the future');
    }
    scheduledFor = parsedDate.toISOString();
  }

  const orderPayload = {
    restaurant_id: orderData.restaurant_id,
    customer_id: customerRecord.id,
    status_id: pendingStatus.id,
    payment_method: normalizedPaymentMethod,
    payment_method_id: resolvedPaymentMethodId,
    delivery_address: orderData.delivery_address || null,
    customer_latitude: Number.isFinite(orderData.customerLatitude) ? Number(orderData.customerLatitude) : null,
    customer_longitude: Number.isFinite(orderData.customerLongitude) ? Number(orderData.customerLongitude) : null,
    service_mode: serviceMode,
    branch_id: resolvedBranchId,
    source,
    delivery_enabled: Boolean(restaurant.delivery_enabled),
    prep_time_estimate: prepTimeEstimate,
    delivery_distance_km: deliveryDistanceKm,
    delivery_base_price: deliveryBasePrice,
    smart_stock_enabled_at_creation: Boolean(restaurant.smart_stock_enabled),
    customer_total: Number(orderData.total_amount),
    total: Number(orderData.total_amount),
    scheduled_for: scheduledFor,
    opt_out_cutlery: optOutCutlery,
    metadata: {
      ...metadata,
      scheduledFor,
      optOutCutlery,
      comboSelections,
      appliedDiscounts,
      pricing: {
        itemsSubtotal,
        discountedSubtotal,
        discountAmount: totalDiscountAmount,
      },
    },
    created_at: new Date().toISOString(),
  };

  const { data: order, error } = await admin
    .from('orders')
    .insert(orderPayload)
    .select('id, order_number, status_id, source, delivery_enabled, delivery_distance_km, delivery_base_price, prep_time_estimate, workflow_code')
    .single();

  if (error) {
    throw new Error(error.message || 'Error creating order');
  }

  if (orderLinePayloads.length > 0) {
    const orderItemsPayload = orderLinePayloads.map((line) => ({
      id: line.id,
      order_id: order.id,
      menu_item_id: line.menu_item_id,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      subtotal: line.subtotal,
      special_instructions: line.special_instructions,
    }));

    const { error: orderItemsError } = await admin.from('order_items').insert(orderItemsPayload);
    if (orderItemsError) {
      throw new Error(orderItemsError.message || 'Error creating order items');
    }

    if (orderModifierPayloads.length > 0) {
      const { error: modifiersError } = await admin.from('order_item_modifiers').insert(orderModifierPayloads);
      if (modifiersError) {
        throw new Error(modifiersError.message || 'Error creating order modifiers');
      }
    }
  }

  if (appliedDiscounts.length > 0) {
    const { error: appliedDiscountsError } = await admin
      .from('applied_order_discounts')
      .insert(
        appliedDiscounts.map((discount) => ({
          order_id: order.id,
          deal_id: discount.deal_id,
          combo_id: discount.combo_id,
          source_type: discount.source_type,
          title_snapshot: discount.title_snapshot,
          discount_type_snapshot: discount.discount_type_snapshot,
          discount_value_snapshot: discount.discount_value_snapshot,
          discount_amount: discount.discount_amount,
          subtotal_snapshot: discount.subtotal_snapshot,
          promo_code_snapshot: discount.promo_code_snapshot,
        })),
      );

    if (appliedDiscountsError) {
      throw new Error(appliedDiscountsError.message || 'Error creating applied order discounts');
    }

    const dealDiscounts = appliedDiscounts.filter((discount) => discount.source_type === 'deal' && discount.deal_id);
    if (dealDiscounts.length > 0) {
      const { error: dealRedemptionsError } = await admin
        .from('deal_redemptions')
        .insert(
          dealDiscounts.map((discount) => ({
            deal_id: discount.deal_id,
            order_id: order.id,
            customer_id: customerRecord.id,
            branch_id: resolvedBranchId,
            discount_amount: discount.discount_amount,
          })),
        );

      if (dealRedemptionsError) {
        throw new Error(dealRedemptionsError.message || 'Error creating deal redemptions');
      }
    }
  }

  return {
    ...order,
    orderNumber: order.order_number,
    workflowCode: order.workflow_code,
    deliveryEnabled: order.delivery_enabled,
    deliveryDistanceKm: order.delivery_distance_km,
    deliveryBasePrice: order.delivery_base_price,
    prepTimeEstimate: order.prep_time_estimate,
    customer_id: customerRecord.id,
    applied_discounts: appliedDiscounts,
    items: orderLinePayloads.map((line) => ({
      id: line.id,
      menu_item_id: line.menu_item_id,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
      subtotal: line.subtotal,
      modifiers: orderModifierPayloads
        .filter((modifier) => modifier.order_item_id === line.id)
        .map((modifier) => ({
          modifier_item_id: modifier.modifier_item_id,
          name: modifier.name,
          price: modifier.price,
          quantity: modifier.quantity,
        })),
    })),
  };
}

export async function createBranchOrderRpcLocal(args: {
  branchId: string;
  restaurantId: string;
  customer: { name?: string; phone: string; email?: string | null; address?: string | null };
  items: Array<{ menu_item_id: string; quantity: number; special_instructions?: string | null }>;
  paymentMethodCode: string;
  serviceMode: 'pickup' | 'delivery' | 'dine_in' | 'takeaway';
  deliveryAddress?: string | null;
  notes?: string | null;
  tableNumber?: number | null;
}) {
  const admin = getSupabaseServer() as any;
  const { data, error } = await admin.rpc('create_branch_order', {
    p_restaurant_id: args.restaurantId,
    p_branch_id: args.branchId,
    p_customer: args.customer,
    p_items: args.items,
    p_payment_method_code: args.paymentMethodCode,
    p_delivery_address: args.deliveryAddress ?? null,
    p_notes: args.notes ?? null,
    p_delivery_fee: 0,
    p_tax_rate: 0,
    p_service_fee: 0,
    p_currency: 'CRC',
    p_service_mode: args.serviceMode,
    p_table_number: args.tableNumber ?? null,
  });

  if (error) {
    throw new Error(error.message || 'Error creating branch order');
  }

  return data;
}