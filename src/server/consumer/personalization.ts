import { randomUUID } from 'crypto';
import { getSupabaseServer } from '@/lib/supabase-server';

function toNumber(value: unknown, fallback = 0): number {
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

function buildSearchText(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function extractSearchTerms(rawTerms: string[]): string[] {
  const words = rawTerms
    .flatMap((value) => String(value || '').toLowerCase().split(/[^a-zA-Záéíóúñ0-9]+/))
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

  return Array.from(new Set(words)).slice(0, 12);
}

function evaluateDietaryCompatibility(
  searchText: string,
  allergies: string[],
  preferences: string[],
  strictness: string,
): { allowed: boolean; blockedTerms: string[]; matchedPreferences: string[] } {
  const haystack = String(searchText || '').toLowerCase();
  const blockedTerms = allergies.filter((term) => haystack.includes(String(term).toLowerCase()));
  const matchedPreferences = preferences.filter((term) => haystack.includes(String(term).toLowerCase()));
  const strict = strictness === 'high';

  return {
    allowed: strict ? blockedTerms.length === 0 : blockedTerms.length < 2,
    blockedTerms,
    matchedPreferences,
  };
}

function scorePlannerCandidate(
  candidate: any,
  searchTerms: string[],
  preferences: string[],
  budget: number | null,
  dietaryCheck: { blockedTerms: string[]; matchedPreferences: string[] },
): number {
  let score = Number(candidate.restaurant.rating || 0) * 2;
  const haystack = candidate.searchText;

  if (budget != null && candidate.price <= budget) {
    score += 4;
  }

  if (candidate.prepTime > 0 && candidate.prepTime <= 20) {
    score += 1.5;
  }

  score += dietaryCheck.matchedPreferences.length * 2;
  score -= dietaryCheck.blockedTerms.length * 6;

  for (const term of searchTerms) {
    if (haystack.includes(term)) {
      score += 2.5;
    }
  }

  if (preferences.length === 0) {
    score += 0.5;
  }

  return score;
}

function buildPlannerRationale(
  candidate: any,
  dietaryCheck: { blockedTerms: string[]; matchedPreferences: string[] },
  searchTerms: string[],
  budget: number | null,
): string[] {
  const rationale: string[] = [];

  if (dietaryCheck.matchedPreferences.length > 0) {
    rationale.push(`Aligns with preferences: ${dietaryCheck.matchedPreferences.join(', ')}`);
  }

  const matchedSearchTerms = searchTerms.filter((term) => candidate.searchText.includes(term)).slice(0, 2);
  if (matchedSearchTerms.length > 0) {
    rationale.push(`Matches recent intent: ${matchedSearchTerms.join(', ')}`);
  }

  if (budget != null && candidate.price <= budget) {
    rationale.push(`Within budget at ₡${candidate.price}`);
  }

  if (candidate.prepTime > 0) {
    rationale.push(`Estimated prep time ${candidate.prepTime} min`);
  }

  if (rationale.length === 0) {
    rationale.push('Recommended from active menu availability and restaurant quality');
  }

  return rationale;
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

async function loadCatalogCandidates(args: { limit: number; serviceMode: string; maxPrice: number | null }): Promise<any[]> {
  const admin = getSupabaseServer() as any;
  const { data: menuItems, error } = await admin
    .from('menu_items')
    .select('id, restaurant_id, branch_id, name, description, image_url, prep_time, is_active')
    .eq('is_active', true)
    .limit(Math.max(args.limit, 24));

  if (error) {
    throw new Error(error.message || 'No se pudo cargar el catálogo de menú');
  }

  const itemIds = (menuItems || []).map((item: any) => item.id);
  const restaurantIds = Array.from(new Set((menuItems || []).map((item: any) => item.restaurant_id).filter(Boolean)));
  const { data: variants } = itemIds.length > 0
    ? await admin
        .from('menu_item_variants')
        .select('id, menu_item_id, name, is_default, is_active, display_order')
        .in('menu_item_id', itemIds)
        .eq('is_active', true)
    : { data: [] };
  const variantIds = (variants || []).map((variant: any) => variant.id);

  const [{ data: prices }, { data: restaurants }] = await Promise.all([
    variantIds.length > 0
      ? admin.from('prices').select('variant_id, channel, service_mode, amount, period, created_at').in('variant_id', variantIds)
      : Promise.resolve({ data: [] }),
    restaurantIds.length > 0
      ? admin.from('restaurants').select('id, name, rating, latitude, longitude').in('id', restaurantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const variantsByItem = new Map<string, any[]>();
  for (const variant of variants || []) {
    const bucket = variantsByItem.get(variant.menu_item_id) || [];
    bucket.push(variant);
    variantsByItem.set(variant.menu_item_id, bucket);
  }

  const restaurantMap = new Map((restaurants || []).map((restaurant: any) => [restaurant.id, restaurant]));
  const catalog = (menuItems || [])
    .map((item: any) => {
      const itemVariants = variantsByItem.get(item.id) || [];
      const resolvedVariant = itemVariants.find((variant: any) => variant.is_default) || itemVariants[0] || null;
      const price = resolvedVariant
        ? getBestVariantPrice(prices || [], resolvedVariant.id, 'client', args.serviceMode)
        : null;

      return {
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.image_url,
        price: price == null ? 0 : Number(price),
        prepTime: Number(item.prep_time || 0),
        variantId: resolvedVariant?.id || null,
        branchId: item.branch_id,
        restaurant: restaurantMap.get(item.restaurant_id) || { id: item.restaurant_id, name: 'Restaurant', rating: 0 },
        searchText: buildSearchText([item.name, item.description, restaurantMap.get(item.restaurant_id)?.name]),
      };
    })
    .filter((candidate: any) => candidate.variantId);

  return catalog
    .filter((candidate: any) => args.maxPrice == null || candidate.price <= args.maxPrice)
    .sort((left: any, right: any) => {
      const leftRating = Number(left.restaurant.rating || 0);
      const rightRating = Number(right.restaurant.rating || 0);
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      return left.price - right.price;
    })
    .slice(0, Math.max(args.limit, 24));
}

async function loadCuratedMysteryBoxOffers(args: {
  serviceMode: string;
  restaurantId?: string;
  branchId?: string;
  maxPrice: number | null;
  now: string;
  limit: number;
}): Promise<any[]> {
  const admin = getSupabaseServer() as any;
  let query = admin
    .from('mystery_box_offers')
    .select(`
      *,
      restaurants (id, name),
      branches (id, name)
    `)
    .eq('status', 'active')
    .eq('service_mode', args.serviceMode)
    .or(`available_from.is.null,available_from.lte.${args.now}`)
    .or(`available_until.is.null,available_until.gte.${args.now}`)
    .order('updated_at', { ascending: false })
    .limit(args.limit);

  if (args.restaurantId) {
    query = query.eq('restaurant_id', args.restaurantId);
  }

  if (args.branchId) {
    query = query.eq('branch_id', args.branchId);
  }

  if (args.maxPrice != null) {
    query = query.lte('price', args.maxPrice);
  }

  const { data: offers, error } = await query;
  if (error) {
    if (error.message?.includes('relation') && error.message?.includes('mystery_box_offers')) {
      return [];
    }

    throw new Error(error.message || 'No se pudieron cargar las mystery boxes');
  }

  const offerIds = (offers || []).map((offer: any) => offer.id);
  const { data: offerItems } = offerIds.length > 0
    ? await admin
        .from('mystery_box_offer_items')
        .select('offer_id, menu_item_name, quantity, metadata')
        .in('offer_id', offerIds)
    : { data: [] };

  const itemsByOffer = new Map<string, any[]>();
  for (const item of offerItems || []) {
    const bucket = itemsByOffer.get(item.offer_id) || [];
    bucket.push(item);
    itemsByOffer.set(item.offer_id, bucket);
  }

  return (offers || []).map((offer: any) => ({
    id: offer.id,
    source: 'curated',
    canAccept: true,
    restaurant: {
      id: offer.restaurant_id,
      name: (offer.restaurants as any)?.name || null,
    },
    branch: offer.branch_id
      ? {
          id: offer.branch_id,
          name: (offer.branches as any)?.name || null,
        }
      : null,
    title: offer.title,
    description: offer.description,
    price: Number(offer.price || 0),
    originalValue: offer.original_value == null ? null : Number(offer.original_value),
    availableUntil: offer.available_until,
    dietaryTags: Array.isArray(offer.dietary_tags) ? offer.dietary_tags : [],
    excludedAllergens: Array.isArray(offer.excluded_allergens) ? offer.excluded_allergens : [],
    itemsPreview: itemsByOffer.get(offer.id) || [],
  }));
}

function isMysteryOfferDietarySafe(offer: any, allergies: string[]): boolean {
  const blocked = (offer.excludedAllergens || []).map((term: string) => String(term).toLowerCase());
  return !allergies.some((term) => blocked.includes(String(term).toLowerCase()));
}

async function buildGeneratedMysteryBoxOffers(args: {
  limit: number;
  maxPrice: number | null;
  serviceMode: string;
  allergies: string[];
}): Promise<any[]> {
  const catalog = await loadCatalogCandidates({
    limit: Math.max(args.limit * 8, 24),
    serviceMode: args.serviceMode,
    maxPrice: args.maxPrice,
  });

  const byRestaurant = new Map<string, any[]>();
  for (const candidate of catalog) {
    const dietaryCheck = evaluateDietaryCompatibility(candidate.searchText, args.allergies, [], 'high');
    if (!dietaryCheck.allowed) {
      continue;
    }

    const bucket = byRestaurant.get(candidate.restaurant.id) || [];
    bucket.push(candidate);
    byRestaurant.set(candidate.restaurant.id, bucket);
  }

  return Array.from(byRestaurant.values())
    .map((entries) => entries.sort((left, right) => left.price - right.price).slice(0, 2))
    .filter((entries) => entries.length > 0)
    .slice(0, args.limit)
    .map((entries) => {
      const first = entries[0];
      const totalPrice = entries.reduce((sum, entry) => sum + Number(entry.price || 0), 0);
      return {
        id: null,
        source: 'generated',
        canAccept: false,
        restaurant: first.restaurant,
        branch: first.branchId ? { id: first.branchId, name: null } : null,
        title: `Chef surprise from ${first.restaurant.name}`,
        description: 'Generated from active menu items while no curated mystery box is available.',
        price: totalPrice,
        originalValue: totalPrice,
        availableUntil: null,
        dietaryTags: [],
        excludedAllergens: [],
        itemsPreview: entries.map((entry) => ({
          menu_item_name: entry.name,
          quantity: 1,
          metadata: {
            menu_item_id: entry.menuItemId,
            variant_id: entry.variantId,
          },
        })),
      };
    });
}

export async function getLoyaltyProfileLocal(userId: string) {
  const admin = getSupabaseServer() as any;

  const [{ data: profile }, { data: badges }] = await Promise.all([
    admin
      .from('user_gamification')
      .select('total_points,current_streak,longest_streak,last_order_date')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('user_badges')
      .select('badge_id,earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false }),
  ]);

  return {
    points: Number(profile?.total_points || 0),
    currentStreak: Number(profile?.current_streak || 0),
    longestStreak: Number(profile?.longest_streak || 0),
    lastOrderDate: profile?.last_order_date || null,
    badges: (badges || []).map((badge: any) => ({
      id: String(badge.badge_id || randomUUID()),
      name: 'Badge',
      description: '',
      icon: 'award',
      earnedAt: badge.earned_at || new Date().toISOString(),
    })),
    status: profile ? 'ok' : 'empty',
    source: 'db',
  };
}

export async function getActivePromotionsLocal(branchId?: string) {
  const admin = getSupabaseServer() as any;
  const nowIso = new Date().toISOString();
  let query = admin
    .from('deals')
    .select('id,branch_id,title,starts_at,ends_at,active,created_at')
    .eq('active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'No se pudieron cargar las promociones');
  }

  return (data || []).map((promotion: any, index: number) => ({
    promoId: String(promotion.id),
    title: String(promotion.title || ''),
    subtitle: null,
    targetType: 'branch',
    targetId: promotion.branch_id ? String(promotion.branch_id) : null,
    startsAt: promotion.starts_at || null,
    endsAt: promotion.ends_at || null,
    priority: Math.max(1, 100 - index),
    status: 'active',
    source: 'db',
  }));
}

export async function getStoriesLocal(branchId?: string) {
  const admin = getSupabaseServer() as any;
  let query = admin
    .from('restaurant_story_videos')
    .select('id,restaurant_id,branch_id,restaurant_name,item_id,item_name,price,video_url,description,active,starts_at,ends_at,created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(40);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'No se pudieron cargar las historias');
  }

  return (data || []).map((story: any) => ({
    id: String(story.id),
    restaurantId: story.restaurant_id ? String(story.restaurant_id) : null,
    restaurantName: story.restaurant_name ? String(story.restaurant_name) : null,
    itemId: story.item_id ? String(story.item_id) : null,
    itemName: story.item_name ? String(story.item_name) : null,
    price: typeof story.price === 'number' ? story.price : null,
    videoUrl: story.video_url ? String(story.video_url) : null,
    description: story.description ? String(story.description) : null,
    isActive: Boolean(story.active),
    startsAt: story.starts_at || null,
    endsAt: story.ends_at || null,
    status: 'ok',
    source: 'db',
  }));
}

export async function getDietaryProfileLocal(userId: string) {
  const admin = getSupabaseServer() as any;
  const { data, error } = await admin
    .from('user_dietary_profiles')
    .select('id, user_id, allergies, preferences, strictness, disliked_ingredients, health_goals, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo cargar el perfil alimentario');
  }

  return data || {
    user_id: userId,
    allergies: [],
    preferences: [],
    strictness: 'medium',
    disliked_ingredients: [],
    health_goals: [],
  };
}

export async function upsertDietaryProfileLocal(userId: string, dto: {
  allergies?: string[];
  preferences?: string[];
  strictness?: string;
  dislikedIngredients?: string[];
  healthGoals?: string[];
}) {
  const admin = getSupabaseServer() as any;
  const payload = {
    user_id: userId,
    allergies: dto.allergies || [],
    preferences: dto.preferences || [],
    strictness: dto.strictness || 'medium',
    disliked_ingredients: dto.dislikedIngredients || [],
    health_goals: dto.healthGoals || [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('user_dietary_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('id, user_id, allergies, preferences, strictness, disliked_ingredients, health_goals, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo guardar el perfil alimentario');
  }

  return data;
}

export async function getDietaryOptionsCatalogLocal() {
  const admin = getSupabaseServer() as any;
  const [{ data: groups, error: groupsError }, { data: options, error: optionsError }] = await Promise.all([
    admin
      .from('dietary_option_groups')
      .select('key, name, description, selection_mode, allow_custom, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    admin
      .from('dietary_options')
      .select('id, group_key, value, label, icon_key, description, metadata, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);

  if (groupsError || optionsError) {
    throw new Error(groupsError?.message || optionsError?.message || 'No se pudo cargar el catálogo alimentario');
  }

  const optionsByGroup = new Map<string, any[]>();
  for (const option of options || []) {
    const bucket = optionsByGroup.get(option.group_key) || [];
    bucket.push({
      id: option.id,
      value: option.value,
      label: option.label,
      iconKey: option.icon_key,
      description: option.description,
      metadata: option.metadata || {},
    });
    optionsByGroup.set(option.group_key, bucket);
  }

  return {
    groups: (groups || []).map((group: any) => ({
      key: group.key,
      name: group.name,
      description: group.description,
      selectionMode: group.selection_mode,
      allowCustom: Boolean(group.allow_custom),
      options: optionsByGroup.get(group.key) || [],
    })),
  };
}

export async function getPlannerRecommendationsLocal(userId: string, dto: {
  limit?: number;
  budget?: number;
  serviceMode?: 'delivery' | 'pickup';
  mood?: string;
}) {
  const customer = await getCustomerByAuthUserId(userId);
  const admin = getSupabaseServer() as any;
  const limit = Math.max(1, Math.min(Number(dto.limit || 5), 10));
  const budget = dto.budget == null ? null : Number(dto.budget);

  const [{ data: dietaryProfile }, { data: recentSearches }] = await Promise.all([
    admin
      .from('user_dietary_profiles')
      .select('allergies, preferences, strictness')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('customer_searches')
      .select('query, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const catalog = await loadCatalogCandidates({
    limit: Math.max(limit * 8, 24),
    serviceMode: dto.serviceMode || 'delivery',
    maxPrice: budget,
  });

  const searchTerms = extractSearchTerms([
    ...(recentSearches || []).map((entry: any) => entry.query),
    dto.mood || '',
  ]);
  const allergies = Array.isArray(dietaryProfile?.allergies) ? dietaryProfile.allergies : [];
  const preferences = Array.isArray(dietaryProfile?.preferences) ? dietaryProfile.preferences : [];
  const strictness = dietaryProfile?.strictness || 'medium';

  const recommendations = catalog
    .map((candidate) => {
      const dietaryCheck = evaluateDietaryCompatibility(candidate.searchText, allergies, preferences, strictness);
      const score = scorePlannerCandidate(candidate, searchTerms, preferences, budget, dietaryCheck);
      return { candidate, dietaryCheck, score };
    })
    .filter((entry) => entry.dietaryCheck.allowed)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ candidate, dietaryCheck, score }) => ({
      restaurant: candidate.restaurant,
      item: {
        id: candidate.menuItemId,
        name: candidate.name,
        description: candidate.description,
        imageUrl: candidate.imageUrl,
        price: candidate.price,
        variantId: candidate.variantId,
      },
      rationale: buildPlannerRationale(candidate, dietaryCheck, searchTerms, budget),
      score: Number(score.toFixed(2)),
      cartSeed: {
        restaurantId: candidate.restaurant.id,
        branchId: candidate.branchId,
        items: [{
          item_id: candidate.menuItemId,
          variant_id: candidate.variantId,
          quantity: 1,
          modifiers: [],
        }],
      },
    }));

  return {
    generatedAt: new Date().toISOString(),
    inputs: {
      budget,
      serviceMode: dto.serviceMode || 'delivery',
      searchTerms,
      dietaryProfile: {
        allergies,
        preferences,
        strictness,
      },
    },
    recommendations,
  };
}

export async function getMysteryBoxOffersLocal(userId: string, dto: {
  limit?: number;
  maxPrice?: number;
  serviceMode?: 'delivery' | 'pickup';
  restaurantId?: string;
  branchId?: string;
}) {
  const customer = await getCustomerByAuthUserId(userId);
  const admin = getSupabaseServer() as any;
  const now = new Date().toISOString();
  const limit = Math.max(1, Math.min(Number(dto.limit || 4), 10));
  const maxPrice = dto.maxPrice == null ? null : Number(dto.maxPrice);

  const [{ data: dietaryProfile }, curatedOffersResult] = await Promise.all([
    admin
      .from('user_dietary_profiles')
      .select('allergies, preferences, strictness')
      .eq('user_id', userId)
      .maybeSingle(),
    loadCuratedMysteryBoxOffers({
      serviceMode: dto.serviceMode || 'delivery',
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      maxPrice,
      now,
      limit,
    }),
  ]);

  const allergies = Array.isArray(dietaryProfile?.allergies) ? dietaryProfile.allergies : [];
  const curatedOffers = curatedOffersResult.filter((offer) => isMysteryOfferDietarySafe(offer, allergies)).slice(0, limit);

  if (curatedOffers.length > 0) {
    return {
      customerId: customer.id,
      generatedAt: now,
      offers: curatedOffers,
    };
  }

  const fallbackOffers = await buildGeneratedMysteryBoxOffers({
    limit,
    maxPrice,
    serviceMode: dto.serviceMode || 'delivery',
    allergies,
  });

  return {
    customerId: customer.id,
    generatedAt: now,
    offers: fallbackOffers,
  };
}

export async function acceptMysteryBoxOfferLocal(userId: string, offerId: string) {
  const admin = getSupabaseServer() as any;
  const customer = await getCustomerByAuthUserId(userId);
  const now = new Date().toISOString();

  const { data: offer, error: offerError } = await admin
    .from('mystery_box_offers')
    .select('*')
    .eq('id', offerId)
    .maybeSingle();

  if (offerError) {
    throw new Error(offerError.message || 'No se pudo cargar la mystery box');
  }

  if (!offer) {
    throw new Error('Mystery box offer not found');
  }

  if (offer.status !== 'active') {
    throw new Error('Mystery box offer is not active');
  }

  if (offer.available_from && offer.available_from > now) {
    throw new Error('Mystery box offer is not available yet');
  }

  if (offer.available_until && offer.available_until < now) {
    throw new Error('Mystery box offer has expired');
  }

  if (offer.max_claims != null && Number(offer.claims_count || 0) >= Number(offer.max_claims)) {
    throw new Error('Mystery box offer is sold out');
  }

  const { data: offerItems, error: offerItemsError } = await admin
    .from('mystery_box_offer_items')
    .select('id, menu_item_id, variant_id, menu_item_name, quantity, metadata')
    .eq('offer_id', offerId)
    .order('created_at', { ascending: true });

  if (offerItemsError) {
    throw new Error(offerItemsError.message || 'No se pudieron cargar los ítems de la mystery box');
  }

  const cartSeed = {
    mysteryBoxOfferId: offerId,
    restaurantId: offer.restaurant_id,
    branchId: offer.branch_id,
    price: Number(offer.price),
    serviceMode: offer.service_mode,
    items: (offerItems || []).map((item: any) => ({
      item_id: item.menu_item_id,
      variant_id: item.variant_id,
      quantity: Number(item.quantity || 1),
      displayName: item.menu_item_name,
      metadata: item.metadata || {},
    })),
  };

  const claimId = randomUUID();
  const { data: claim, error: claimError } = await admin
    .from('mystery_box_claims')
    .insert({
      id: claimId,
      offer_id: offerId,
      user_id: userId,
      customer_id: customer.id,
      claim_status: 'accepted',
      created_cart_payload: cartSeed,
    })
    .select('*')
    .single();

  if (claimError) {
    throw new Error(claimError.message || 'No se pudo reclamar la mystery box');
  }

  await admin
    .from('mystery_box_offers')
    .update({
      claims_count: Number(offer.claims_count || 0) + 1,
      updated_at: now,
    })
    .eq('id', offerId);

  return {
    claim,
    cartSeed,
  };
}