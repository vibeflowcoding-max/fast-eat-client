import { getSupabaseServer } from '@/lib/supabase-server';
import { loadConsumerCombos } from '@/server/offers/order-offers';

type ModifierGroupRecord = {
  id: string | number;
  name?: string | null;
  min_selection?: unknown;
  max_selection?: unknown;
  is_required?: boolean | null;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getDefaultVariantId(variants: Array<any>) {
  return variants.find((variant) => Boolean(variant?.is_default))?.id ?? variants[0]?.id ?? null;
}

function getDefaultMenuItemPrice(variants: Array<any>) {
  const defaultVariant = variants.find((variant) => Boolean(variant?.is_default));
  return toNumber(defaultVariant?.price ?? variants[0]?.price ?? 0);
}

function isModifierItemAvailable(modifierItem: any) {
  if (modifierItem?.is_available === false) {
    return false;
  }

  if (modifierItem?.stock_count != null && toNumber(modifierItem.stock_count, 0) <= 0) {
    return false;
  }

  if (modifierItem?.snooze_until) {
    const snoozedUntil = Date.parse(String(modifierItem.snooze_until));
    if (Number.isFinite(snoozedUntil) && snoozedUntil > Date.now()) {
      return false;
    }
  }

  return true;
}

export async function loadBranchMenuFromSupabase(branchId: string) {
  const supabaseServer = getSupabaseServer();
  const client = supabaseServer as any;

  const { data: branchRecord, error: branchError } = await client
    .from('branches')
    .select('id, restaurant_id')
    .eq('id', branchId)
    .maybeSingle();

  if (branchError) {
    throw new Error(branchError.message || 'Could not load branch menu');
  }

  if (!branchRecord?.restaurant_id) {
    return { menu: { id: branchId, name: 'Menu' }, categories: [], combos: [] };
  }

  const { data: menuItems, error: menuError } = await client
    .from('menu_items')
    .select('id, name, description, image_url, is_active, display_order, prep_time, branch_id')
    .eq('restaurant_id', branchRecord.restaurant_id)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (menuError) {
    throw new Error(menuError.message || 'Could not load branch menu');
  }

  const combos = await loadConsumerCombos(branchId);

  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    return { menu: { id: String(branchRecord.restaurant_id), name: 'Menu' }, categories: [], combos };
  }

  const itemIds = menuItems.map((item: any) => item.id);
  const [associationsResult, variantsResult, modifierLinksResult, ingredientLinksResult] = await Promise.all([
    client
      .from('menu_item_categories')
      .select('menu_item_id, category_id, categories!inner (id, name, display_order)')
      .in('menu_item_id', itemIds),
    client
      .from('menu_item_variants')
      .select('id, menu_item_id, name, is_default, display_order, is_active')
      .in('menu_item_id', itemIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    client
      .from('menu_item_modifier_groups')
      .select('menu_item_id, modifier_group_id, display_order')
      .in('menu_item_id', itemIds)
      .order('display_order', { ascending: true }),
    client
      .from('menu_item_ingredients')
      .select('menu_item_id, ingredient_id, ingredients(name)')
      .in('menu_item_id', itemIds),
  ]);

  if (associationsResult.error) {
    throw new Error(associationsResult.error.message || 'Could not load menu categories');
  }

  if (variantsResult.error) {
    throw new Error(variantsResult.error.message || 'Could not load menu variants');
  }

  const variantIds = Array.isArray(variantsResult.data) ? variantsResult.data.map((variant: any) => variant.id) : [];
  const [pricesResult, modifierGroupsResult, modifierItemsResult] = await Promise.all([
    variantIds.length > 0
      ? client
          .from('prices')
          .select('variant_id, channel, service_mode, amount, period, created_at')
          .in('variant_id', variantIds)
      : Promise.resolve({ data: [], error: null }),
    Array.isArray(modifierLinksResult.data) && modifierLinksResult.data.length > 0
      ? client
          .from('modifier_groups')
          .select('id, name, min_selection, max_selection, is_required')
          .in('id', Array.from(new Set(modifierLinksResult.data.map((link: any) => link.modifier_group_id).filter(Boolean))))
      : Promise.resolve({ data: [], error: null }),
    Array.isArray(modifierLinksResult.data) && modifierLinksResult.data.length > 0
      ? client
          .from('modifier_items')
          .select('id, group_id, name, price_adjustment, is_available, stock_count, snooze_until')
          .in('group_id', Array.from(new Set(modifierLinksResult.data.map((link: any) => link.modifier_group_id).filter(Boolean))))
      : Promise.resolve({ data: [], error: null }),
  ]);

  // ⚡ Bolt: Pre-compute best prices per variant in a single O(N) pass to avoid O(N*M log M) filtering/sorting loops
  const bestPriceByVariant = new Map<string, { amount: number; createdAt: number }>();
  for (const priceRow of pricesResult.data || []) {
    const variantId = String(priceRow?.variant_id || '');
    if (!variantId) continue;

    const createdAt = Date.parse(String(priceRow?.created_at || 0));
    const currentBest = bestPriceByVariant.get(variantId);

    if (!currentBest || createdAt > currentBest.createdAt) {
      bestPriceByVariant.set(variantId, {
        amount: toNumber(priceRow?.amount),
        createdAt
      });
    }
  }

  const variantsByItem = new Map<string, any[]>();
  for (const variant of variantsResult.data || []) {
    const bucket = variantsByItem.get(String(variant.menu_item_id)) || [];
    bucket.push({
      id: String(variant.id),
      name: String(variant.name || 'Regular'),
      is_default: Boolean(variant.is_default),
      display_order: toNumber(variant.display_order),
      price: bestPriceByVariant.get(String(variant.id))?.amount ?? 0,
    });
    variantsByItem.set(String(variant.menu_item_id), bucket);
  }

  const modifierItemsByGroup = new Map<string, any[]>();
  for (const modifierItem of modifierItemsResult.data || []) {
    const bucket = modifierItemsByGroup.get(String(modifierItem.group_id)) || [];
    bucket.push({
      id: String(modifierItem.id),
      name: String(modifierItem.name || 'Opcion'),
      price_delta: toNumber(modifierItem.price_adjustment),
      available: isModifierItemAvailable(modifierItem),
      stock_count: modifierItem.stock_count ?? null,
      snooze_until: modifierItem.snooze_until ?? null,
    });
    modifierItemsByGroup.set(String(modifierItem.group_id), bucket);
  }

  const modifierGroupMap = new Map<string, ModifierGroupRecord>(
    (modifierGroupsResult.data || []).map((group: any) => [String(group.id), group as ModifierGroupRecord]),
  );
  const modifierGroupsByItem = new Map<string, any[]>();
  for (const link of modifierLinksResult.data || []) {
    const group = modifierGroupMap.get(String(link.modifier_group_id));
    if (!group) {
      continue;
    }

    const bucket = modifierGroupsByItem.get(String(link.menu_item_id)) || [];
    bucket.push({
      id: String(group.id),
      name: String(group.name || 'Extras'),
      min_selection: toNumber(group.min_selection),
      max_selection: group.max_selection == null ? null : toNumber(group.max_selection),
      required: Boolean(group.is_required),
      options: modifierItemsByGroup.get(String(group.id)) || [],
      display_order: toNumber(link.display_order),
    });
    modifierGroupsByItem.set(String(link.menu_item_id), bucket);
  }

  const ingredientsByItem = new Map<string, string[]>();
  for (const row of ingredientLinksResult.data || []) {
    const ingredientName = Array.isArray((row as any).ingredients)
      ? (row as any).ingredients[0]?.name
      : (row as any).ingredients?.name;

    if (!ingredientName) {
      continue;
    }

    const bucket = ingredientsByItem.get(String((row as any).menu_item_id)) || [];
    if (!bucket.includes(String(ingredientName))) {
      bucket.push(String(ingredientName));
    }
    ingredientsByItem.set(String((row as any).menu_item_id), bucket);
  }

  const itemMap = new Map((menuItems || []).map((item: any) => [String(item.id), item]));
  const categoryMap = new Map<string, { id: string; name: string; items: any[]; order: number }>();

  for (const association of associationsResult.data || []) {
    const category = Array.isArray((association as any).categories)
      ? (association as any).categories[0]
      : (association as any).categories;
    const item = itemMap.get(String((association as any).menu_item_id));
    if (!category || !item) {
      continue;
    }

    const categoryId = String(category.id);
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: String(category.name || 'General'),
        items: [],
        order: toNumber(category.display_order),
      });
    }

    categoryMap.get(categoryId)!.items.push({
      id: String(item.id),
      name: String(item.name || 'Platillo'),
      description: String(item.description || ''),
      image_url: item.image_url || null,
      price: getDefaultMenuItemPrice(variantsByItem.get(String(item.id)) || []),
      ingredients: ingredientsByItem.get(String(item.id)) || [],
      preparation_time: item.prep_time ?? null,
      default_variant_id: getDefaultVariantId(variantsByItem.get(String(item.id)) || []),
      variants: variantsByItem.get(String(item.id)) || [],
      modifier_groups: modifierGroupsByItem.get(String(item.id)) || [],
    });
  }

  const itemsInCategories = new Set((associationsResult.data || []).map((association: any) => String(association.menu_item_id)));
  const uncategorizedItems = (menuItems || []).filter((item: any) => !itemsInCategories.has(String(item.id)));
  if (uncategorizedItems.length > 0) {
    categoryMap.set('sin-categoria', {
      id: 'sin-categoria',
      name: 'Sin categoria',
      items: uncategorizedItems.map((item: any) => ({
        id: String(item.id),
        name: String(item.name || 'Platillo'),
        description: String(item.description || ''),
        image_url: item.image_url || null,
        price: getDefaultMenuItemPrice(variantsByItem.get(String(item.id)) || []),
        ingredients: ingredientsByItem.get(String(item.id)) || [],
        preparation_time: item.prep_time ?? null,
        default_variant_id: getDefaultVariantId(variantsByItem.get(String(item.id)) || []),
        variants: variantsByItem.get(String(item.id)) || [],
        modifier_groups: modifierGroupsByItem.get(String(item.id)) || [],
      })),
      order: Number.MAX_SAFE_INTEGER,
    });
  }

  const categories = Array.from(categoryMap.values())
    .sort((left, right) => left.order - right.order)
    .map(({ order: _order, ...category }) => category);

  return {
    menu: { id: String(branchRecord.restaurant_id), name: 'Menu' },
    categories,
    combos,
  };
}

export async function getBranchMenuCategoriesPayload(branchId: string) {
  const payload = await loadBranchMenuFromSupabase(branchId);
  return {
    categories: Array.isArray(payload?.categories)
      ? payload.categories.map((category: any) => ({
          id: String(category?.id || category?.name || 'general'),
          name: String(category?.name || 'General'),
          itemCount: Array.isArray(category?.items) ? category.items.length : 0,
        }))
      : [],
  };
}

export async function getBranchMenuItemsPayload(branchId: string, params: { categoryId: string; cursor?: string; limit?: string }) {
  const payload = await loadBranchMenuFromSupabase(branchId);
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  const matchedCategory = categories.find((category: any) => String(category?.id || '') === params.categoryId)
    || categories.find((category: any) => String(category?.name || '') === params.categoryId)
    || null;

  const normalizedLimit = Math.max(1, Math.min(Number.parseInt(params.limit || '12', 10) || 12, 24));
  const offset = Math.max(Number.parseInt(params.cursor || '0', 10) || 0, 0);
  const items = Array.isArray(matchedCategory?.items) ? matchedCategory.items : [];
  const nextCursor = offset + normalizedLimit < items.length ? String(offset + normalizedLimit) : null;

  return {
    category: matchedCategory
      ? {
          id: String(matchedCategory?.id || params.categoryId),
          name: String(matchedCategory?.name || 'General'),
        }
      : null,
    items: items.slice(offset, offset + normalizedLimit),
    nextCursor,
    total: items.length,
  };
}