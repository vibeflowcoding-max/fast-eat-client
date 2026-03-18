import { getSupabaseServer } from '@/lib/supabase-server';

type ComboMenuItemRecord = {
  item_id: string;
  quantity: number;
  menu_item?: {
    id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    prep_time?: number | null;
    branch_id?: string | null;
  } | null;
};

type ComboRecord = {
  id: string;
  branch_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  base_price: number;
  combo_price: number;
  savings_amount: number;
  available_from?: string | null;
  available_to?: string | null;
  active: boolean;
  items: ComboMenuItemRecord[];
};

type DealTargetRecord = {
  id?: string;
  target_type: 'order' | 'category' | 'menu_item';
  target_id?: string | null;
};

type DealRecord = {
  id: string;
  branch_id: string;
  title: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  promo_code?: string | null;
  application_mode: 'auto' | 'code';
  max_discount_amount?: number | null;
  usage_limit_total?: number | null;
  usage_limit_per_customer?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  active: boolean;
  stackable: boolean;
  targets: DealTargetRecord[];
};

type CartOfferItemInput = {
  item_id?: string;
  combo_id?: string;
  quantity: number;
  combo_items?: Array<{ item_id: string; quantity?: number }>;
};

type DealReason =
  | 'not_found_or_inactive'
  | 'promo_code_required'
  | 'minimum_not_reached'
  | 'target_not_applicable'
  | 'usage_limit_reached'
  | 'customer_usage_limit_reached';

export type AppliedDiscountRecord = {
  source_type: 'combo' | 'deal';
  combo_id: string | null;
  deal_id: string | null;
  title_snapshot: string;
  discount_type_snapshot: 'combo' | 'percentage' | 'fixed';
  discount_value_snapshot: number;
  discount_amount: number;
  subtotal_snapshot: number;
  promo_code_snapshot: string | null;
  application_mode?: 'auto' | 'code';
};

export async function loadConsumerCombos(branchId: string): Promise<ComboRecord[]> {
  const normalizedBranchId = String(branchId || '').trim();
  if (!normalizedBranchId) {
    return [];
  }

  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('combos')
    .select('id, branch_id, title, description, image_url, display_order, base_price, combo_price, available_from, available_to, active, created_at')
    .eq('branch_id', normalizedBranchId)
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Could not load branch combos');
  }

  const hydratedCombos = await attachComboItems(data || []);
  return hydratedCombos.filter((combo) => isWithinAvailabilityWindow(combo.available_from, combo.available_to));
}

export async function getActiveCombosByIds(comboIds: string[]): Promise<ComboRecord[]> {
  const normalizedComboIds = Array.from(new Set((comboIds || []).map((comboId) => String(comboId || '').trim()))).filter(Boolean);
  if (normalizedComboIds.length === 0) {
    return [];
  }

  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('combos')
    .select('id, branch_id, title, description, image_url, display_order, base_price, combo_price, available_from, available_to, active, created_at')
    .in('id', normalizedComboIds)
    .eq('active', true);

  if (error) {
    throw new Error(error.message || 'Could not load combos');
  }

  const hydratedCombos = await attachComboItems(data || []);
  return hydratedCombos.filter((combo) => isWithinAvailabilityWindow(combo.available_from, combo.available_to));
}

export function expandComboSelections(
  comboRequests: Array<{ combo_id: string; quantity: number; notes?: string }>,
  comboDefinitions: ComboRecord[],
) {
  const comboById = new Map(comboDefinitions.map((combo) => [combo.id, combo]));
  const expandedItems: Array<{
    item_id: string;
    variant_id?: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ modifier_item_id: string; quantity?: number }>;
    combo_id: string;
    combo_title: string;
    source_type: 'combo';
    name_override: string;
  }> = [];
  const comboSelections: Array<{
    combo_id: string;
    title: string;
    quantity: number;
    combo_price: number;
    base_price: number;
  }> = [];
  const comboDiscounts: AppliedDiscountRecord[] = [];

  for (const comboRequest of comboRequests) {
    const combo = comboById.get(comboRequest.combo_id);
    if (!combo) {
      throw new Error(`Combo ${comboRequest.combo_id} is unavailable`);
    }

    if (!Array.isArray(combo.items) || combo.items.length === 0) {
      throw new Error(`Combo ${combo.title} has no configured items`);
    }

    comboSelections.push({
      combo_id: combo.id,
      title: combo.title,
      quantity: comboRequest.quantity,
      combo_price: Number(combo.combo_price || 0),
      base_price: Number(combo.base_price || 0),
    });

    const comboUnitDiscount = Number(
      Math.max(Number(combo.base_price || 0) - Number(combo.combo_price || 0), 0).toFixed(2),
    );

    if (comboUnitDiscount > 0) {
      comboDiscounts.push({
        source_type: 'combo',
        combo_id: combo.id,
        deal_id: null,
        title_snapshot: combo.title,
        discount_type_snapshot: 'combo',
        discount_value_snapshot: comboUnitDiscount,
        discount_amount: Number((comboUnitDiscount * comboRequest.quantity).toFixed(2)),
        subtotal_snapshot: Number((Number(combo.base_price || 0) * comboRequest.quantity).toFixed(2)),
        promo_code_snapshot: null,
      });
    }

    combo.items.forEach((comboItem, comboItemIndex) => {
      if (!comboItem?.item_id) {
        throw new Error(`Combo ${combo.title} has an invalid item reference`);
      }

      const resolvedQuantity = Math.max(1, Number(comboItem.quantity || 1));
      expandedItems.push({
        item_id: comboItem.item_id,
        variant_id: undefined,
        quantity: resolvedQuantity * comboRequest.quantity,
        notes: comboItemIndex === 0 ? comboRequest.notes : undefined,
        modifiers: [],
        combo_id: combo.id,
        combo_title: combo.title,
        source_type: 'combo',
        name_override: `${combo.title} · ${comboItem.menu_item?.name || 'Item'}`,
      });
    });
  }

  return {
    expandedItems,
    comboDiscounts,
    comboSelections,
  };
}

export async function validateDealForCart(args: {
  branchId: string;
  subtotal: number;
  promoCode?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  cartItems?: CartOfferItemInput[];
}): Promise<{
  applied: boolean;
  reason?: DealReason;
  deal?: DealRecord;
  discountAmount?: number;
  finalSubtotal?: number;
}> {
  const normalizedBranchId = String(args.branchId || '').trim();
  if (!normalizedBranchId) {
    return { applied: false, reason: 'not_found_or_inactive' };
  }

  const normalizedPromoCode = String(args.promoCode || '').trim().toUpperCase();
  const admin = getSupabaseServer() as any;
  let query = admin
    .from('deals')
    .select('id, branch_id, title, description, discount_type, discount_value, min_order, promo_code, application_mode, max_discount_amount, usage_limit_total, usage_limit_per_customer, starts_at, ends_at, active, stackable, created_at')
    .eq('branch_id', normalizedBranchId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (args.dealId) {
    query = query.eq('id', String(args.dealId));
  }

  if (normalizedPromoCode) {
    query = query.ilike('promo_code', normalizedPromoCode);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Could not validate deal');
  }

  const hydratedDeals = await attachDealTargets(data || []);
  const eligibleDeals = normalizedPromoCode
    ? hydratedDeals.filter((deal) => String(deal.promo_code || '').trim().toUpperCase() === normalizedPromoCode)
    : hydratedDeals.filter((deal) => deal.application_mode !== 'code');

  for (const deal of eligibleDeals) {
    const evaluation = await evaluateDealCandidate(deal, {
      ...args,
      branchId: normalizedBranchId,
      promoCode: normalizedPromoCode || undefined,
    });

    if (evaluation.applied || evaluation.reason !== 'not_found_or_inactive') {
      return evaluation;
    }
  }

  return {
    applied: false,
    reason: normalizedPromoCode ? 'not_found_or_inactive' : undefined,
  };
}

async function attachComboItems(combos: any[]): Promise<ComboRecord[]> {
  if (combos.length === 0) {
    return [];
  }

  const admin = getSupabaseServer() as any;
  const comboIds = combos.map((combo) => combo.id);
  const { data: comboItems, error } = await admin
    .from('combo_items')
    .select('combo_id, item_id, quantity, menu_items(id, name, description, image_url, prep_time, branch_id)')
    .in('combo_id', comboIds);

  if (error) {
    throw new Error(error.message || 'Could not load combo items');
  }

  const itemsByCombo = new Map<string, ComboMenuItemRecord[]>();
  for (const row of comboItems || []) {
    const menuItem = Array.isArray((row as any).menu_items)
      ? (row as any).menu_items[0]
      : (row as any).menu_items;
    const bucket = itemsByCombo.get(String((row as any).combo_id)) || [];
    bucket.push({
      item_id: String((row as any).item_id),
      quantity: Math.max(1, Number((row as any).quantity || 1)),
      menu_item: menuItem
        ? {
            id: String(menuItem.id),
            name: String(menuItem.name || 'Item'),
            description: menuItem.description ?? null,
            image_url: menuItem.image_url ?? null,
            prep_time: menuItem.prep_time ?? null,
            branch_id: menuItem.branch_id ?? null,
          }
        : null,
    });
    itemsByCombo.set(String((row as any).combo_id), bucket);
  }

  return combos.map((combo) => ({
    id: String(combo.id),
    branch_id: String(combo.branch_id),
    title: String(combo.title || 'Combo'),
    description: combo.description ?? null,
    image_url: combo.image_url ?? null,
    display_order: Number(combo.display_order || 0),
    base_price: Number(combo.base_price || 0),
    combo_price: Number(combo.combo_price || 0),
    savings_amount: Number(Math.max(Number(combo.base_price || 0) - Number(combo.combo_price || 0), 0).toFixed(2)),
    available_from: combo.available_from ?? null,
    available_to: combo.available_to ?? null,
    active: Boolean(combo.active),
    items: itemsByCombo.get(String(combo.id)) || [],
  }));
}

async function attachDealTargets(deals: any[]): Promise<DealRecord[]> {
  if (deals.length === 0) {
    return [];
  }

  const admin = getSupabaseServer() as any;
  const dealIds = deals.map((deal) => deal.id);
  const { data: targets, error } = await admin
    .from('deal_targets')
    .select('id, deal_id, target_type, target_id')
    .in('deal_id', dealIds);

  if (error) {
    throw new Error(error.message || 'Could not load deal targets');
  }

  const targetsByDeal = new Map<string, DealTargetRecord[]>();
  for (const target of targets || []) {
    const bucket = targetsByDeal.get(String((target as any).deal_id)) || [];
    bucket.push({
      id: String((target as any).id),
      target_type: (target as any).target_type,
      target_id: (target as any).target_id ?? null,
    });
    targetsByDeal.set(String((target as any).deal_id), bucket);
  }

  return deals.map((deal) => ({
    id: String(deal.id),
    branch_id: String(deal.branch_id),
    title: String(deal.title || 'Promo'),
    description: deal.description ?? null,
    discount_type: deal.discount_type,
    discount_value: Number(deal.discount_value || 0),
    min_order: Number(deal.min_order || 0),
    promo_code: deal.promo_code ? String(deal.promo_code).trim().toUpperCase() : null,
    application_mode: deal.application_mode || 'auto',
    max_discount_amount: deal.max_discount_amount == null ? null : Number(deal.max_discount_amount),
    usage_limit_total: deal.usage_limit_total == null ? null : Number(deal.usage_limit_total),
    usage_limit_per_customer: deal.usage_limit_per_customer == null ? null : Number(deal.usage_limit_per_customer),
    starts_at: deal.starts_at ?? null,
    ends_at: deal.ends_at ?? null,
    active: Boolean(deal.active),
    stackable: Boolean(deal.stackable),
    targets: targetsByDeal.get(String(deal.id)) || [],
  }));
}

async function evaluateDealCandidate(
  deal: DealRecord,
  args: {
    subtotal: number;
    promoCode?: string;
    customerId?: string | null;
    customerPhone?: string | null;
    cartItems?: CartOfferItemInput[];
  },
) {
  if (!isWithinAvailabilityWindow(deal.starts_at, deal.ends_at, true)) {
    return { applied: false, reason: 'not_found_or_inactive' as const };
  }

  if (deal.application_mode === 'code' && !args.promoCode) {
    return { applied: false, reason: 'promo_code_required' as const, deal };
  }

  const subtotal = Number(args.subtotal || 0);
  const minimumOrder = Number(deal.min_order || 0);
  if (subtotal < minimumOrder) {
    return {
      applied: false,
      reason: 'minimum_not_reached' as const,
      deal,
      subtotal,
    };
  }

  const targetApplicable = await isDealTargetApplicable(deal, args.cartItems || []);
  if (!targetApplicable) {
    return {
      applied: false,
      reason: 'target_not_applicable' as const,
      deal,
      subtotal,
    };
  }

  const resolvedCustomerId = await resolveDealCustomerId(args.customerId, args.customerPhone);
  const usageReason = await checkDealUsageLimits(deal, resolvedCustomerId);
  if (usageReason) {
    return {
      applied: false,
      reason: usageReason,
      deal,
      subtotal,
    };
  }

  const discountAmount = computeDiscountAmount(deal, subtotal);
  return {
    applied: discountAmount > 0,
    deal,
    discountAmount,
    finalSubtotal: Number(Math.max(subtotal - discountAmount, 0).toFixed(2)),
  };
}

async function resolveDealCustomerId(customerId?: string | null, customerPhone?: string | null) {
  if (customerId) {
    return customerId;
  }

  if (!customerPhone) {
    return null;
  }

  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('customers')
    .select('id')
    .eq('phone', String(customerPhone).trim())
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not resolve customer for deal validation');
  }

  return data?.id || null;
}

async function checkDealUsageLimits(deal: DealRecord, customerId: string | null): Promise<DealReason | null> {
  if (!deal.usage_limit_total && !deal.usage_limit_per_customer) {
    return null;
  }

  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('deal_redemptions')
    .select('deal_id, customer_id')
    .eq('deal_id', deal.id);

  if (error) {
    throw new Error(error.message || 'Could not check deal usage limits');
  }

  const redemptions = data || [];
  if (deal.usage_limit_total != null && redemptions.length >= Number(deal.usage_limit_total)) {
    return 'usage_limit_reached';
  }

  if (deal.usage_limit_per_customer != null && customerId) {
    const customerRedemptions = redemptions.filter((entry: any) => entry.customer_id === customerId).length;
    if (customerRedemptions >= Number(deal.usage_limit_per_customer)) {
      return 'customer_usage_limit_reached';
    }
  }

  return null;
}

async function isDealTargetApplicable(deal: DealRecord, cartItems: CartOfferItemInput[]) {
  const targets = Array.isArray(deal.targets) ? deal.targets : [];
  if (targets.length === 0) {
    return true;
  }

  if (targets.some((target) => target.target_type === 'order')) {
    return true;
  }

  const itemIds = await resolveCartMenuItemIds(cartItems);
  if (itemIds.length === 0) {
    return false;
  }

  const menuItemTargetIds = new Set(
    targets
      .filter((target) => target.target_type === 'menu_item' && target.target_id)
      .map((target) => String(target.target_id)),
  );

  if (itemIds.some((itemId) => menuItemTargetIds.has(itemId))) {
    return true;
  }

  const categoryTargetIds = new Set(
    targets
      .filter((target) => target.target_type === 'category' && target.target_id)
      .map((target) => String(target.target_id)),
  );

  if (categoryTargetIds.size === 0) {
    return false;
  }

  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('menu_item_categories')
    .select('menu_item_id, category_id')
    .in('menu_item_id', itemIds);

  if (error) {
    throw new Error(error.message || 'Could not validate deal category targets');
  }

  return (data || []).some((row: any) => categoryTargetIds.has(String(row.category_id)));
}

async function resolveCartMenuItemIds(cartItems: CartOfferItemInput[]) {
  const directItemIds = cartItems
    .flatMap((item) => {
      if (item.item_id) {
        return [String(item.item_id)];
      }

      if (Array.isArray(item.combo_items)) {
        return item.combo_items.map((comboItem) => String(comboItem.item_id || '')).filter(Boolean);
      }

      return [];
    })
    .filter(Boolean);

  const comboIds = cartItems.map((item) => item.combo_id).filter(Boolean) as string[];
  if (comboIds.length === 0) {
    return Array.from(new Set(directItemIds));
  }

  const combos = await getActiveCombosByIds(comboIds);
  const comboItemIds = combos.flatMap((combo) => (combo.items || []).map((item) => String(item.item_id)));
  return Array.from(new Set([...directItemIds, ...comboItemIds]));
}

function computeDiscountAmount(deal: DealRecord, subtotal: number) {
  const maxDiscountAmount = deal.max_discount_amount == null ? null : Number(deal.max_discount_amount || 0);
  if (deal.discount_type === 'percentage') {
    const rawDiscount = Number(((subtotal * Number(deal.discount_value || 0)) / 100).toFixed(2));
    const cappedDiscount = maxDiscountAmount == null ? rawDiscount : Math.min(rawDiscount, maxDiscountAmount);
    return Number(Math.min(subtotal, cappedDiscount).toFixed(2));
  }

  const rawDiscount = Number(Math.min(subtotal, Number(deal.discount_value || 0)).toFixed(2));
  const cappedDiscount = maxDiscountAmount == null ? rawDiscount : Math.min(rawDiscount, maxDiscountAmount);
  return Number(Math.min(subtotal, cappedDiscount).toFixed(2));
}

function isWithinAvailabilityWindow(startRaw?: string | null, endRaw?: string | null, dateTimeWindow = false) {
  if (!startRaw && !endRaw) {
    return true;
  }

  const now = new Date();

  if (dateTimeWindow || String(startRaw || '').includes('T') || String(endRaw || '').includes('T')) {
    const start = startRaw ? new Date(startRaw) : null;
    const end = endRaw ? new Date(endRaw) : null;

    if (start && Number.isFinite(start.getTime()) && now < start) {
      return false;
    }

    if (end && Number.isFinite(end.getTime()) && now > end) {
      return false;
    }

    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startRaw);
  const endMinutes = parseTimeToMinutes(endRaw);

  if (startMinutes == null || endMinutes == null) {
    return true;
  }

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function parseTimeToMinutes(value?: string | null) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}