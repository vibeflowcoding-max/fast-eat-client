
export type Category = string;

export interface MenuItemModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  available: boolean;
  stockCount?: number | null;
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
  required: boolean;
  options: MenuItemModifierOption[];
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
}

export interface SelectedModifier {
  modifierItemId: string;
  name: string;
  priceDelta: number;
  quantity: number;
  groupId?: string;
  groupName?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  ingredients?: string[];
  restaurantId?: string;
  branchId?: string;
  defaultVariantId?: string | null;
  variants?: MenuItemVariant[];
  modifierGroups?: MenuItemModifierGroup[];
  hasStructuredCustomization?: boolean;
}

export interface RecommendedItem {
  id: string;
  qt: string | number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
  variantId?: string | null;
  variantName?: string | null;
  selectedModifiers?: SelectedModifier[];
  lineTotal?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrderMetadata {
  customerName: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'card' | 'sinpe' | string;
  orderType: 'pickup' | 'delivery' | 'dine_in' | string;
  source?: 'client' | 'virtualMenu' | 'consumer_app' | string;
  address?: string;
  gpsLocation?: string;
  deliveryNotes?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  locationOverriddenFromProfile?: boolean;
  locationDifferenceAcknowledged?: boolean;
  tableNumber?: string;
  scheduledFor?: string | null;
  optOutCutlery?: boolean;
  splitDraft?: SavedOrderSplitDraft | null;
}

export interface OrderHistoryItem {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  metadata: OrderMetadata;
}


export interface RestaurantInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  image_url: string;
  google_maps_url: string;
  opening_hours: {
    [key: string]: string;
  };
  payment_methods: string[];
  service_modes: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchShellPayload {
  branchId: string;
  restaurant: RestaurantInfo | null;
  tableQuantity: number;
  isTableAvailable: boolean;
}

export interface CheckoutFeeRates {
  serviceFeeRate: number;
  platformFeeRate: number;
  source?: string;
}

export interface BranchCheckoutContextPayload extends BranchShellPayload {
  feeRates: CheckoutFeeRates;
}

export interface BranchMenuCategorySummary {
  id: string;
  name: string;
  itemCount: number;
}

export interface BranchMenuCategoryItemsPayload {
  category: {
    id: string;
    name: string;
  } | null;
  items: MenuItem[];
  nextCursor: string | null;
  total: number;
}

export interface ClientBootstrapPayload {
  authUserId: string;
  customerId: string | null;
  profile: {
    userId: string;
    email: string | null;
    fullName: string | null;
    phone: string | null;
    urlGoogleMaps: string | null;
  };
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  primaryAddress: {
    id: string;
    customerId: string;
    urlAddress: string | null;
    buildingType: 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other' | string;
    unitDetails: string | null;
    deliveryNotes: string;
    lat: number | null;
    lng: number | null;
    formattedAddress: string | null;
    placeId: string | null;
  } | null;
  completion: {
    hasProfile: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
  };
}

export interface MCPOrderPayload {
  tool: string;
  arguments: {
    items: {
      productId: string;
      name: string;
      quantity: number;
      price: number;
      notes: string;
    }[];
    totalAmount: number;
    branchId: string;
    customerName: string;
    customerPhone: string;
    fromNumber?: string;
    customer?: {
      name?: string;
      phone?: string;
      email?: string | null;
      address?: string | null;
      latitude?: number;
      longitude?: number;
    };
    paymentMethod: string;
    orderType: string;
    source?: 'client' | 'virtualMenu' | 'consumer_app' | string;
    address?: string;
    tableNumber?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  };
}

export interface DeliveryBid {
  id: string;
  bidAmount: number;
  driverRating: number;
  estimatedTimeMinutes: number | null;
  driverNotes: string | null;
  basePrice: number;
  customerCounterOffer?: number | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface BidNotification {
  id: string;
  orderId: string;
  bid: DeliveryBid;
  receivedAt: string;
  read: boolean;
}

export interface AuctionState {
  isActive: boolean;
  driverAssigned: boolean;
  deliveryId?: string;
  deliveryFinalPrice?: number;
}

export interface RestaurantCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  city: string | null;
  country: string;
  human_addres: string | null;
  delivery_radius_km: number | null;
  is_accepting_orders: boolean;
  code: string | null;
  rating?: number | null;
  review_count?: number | null;
  eta_min?: number | null;
  avg_price_estimate?: number | null;
  estimated_delivery_fee?: number | null;
  promo_text?: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  rating?: number | null;
  review_count?: number | null;
  estimated_delivery_fee?: number | null;
  promo_text?: string | null;
  eta_min?: number | null;
  avg_price_estimate?: number | null;
}

export interface RestaurantWithBranches extends Restaurant {
  branches: Branch[];
  categories: RestaurantCategory[];
  distance?: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface DietaryProfile {
  allergies: string[];
  intolerances: string[];
  diet: 'none' | 'vegan' | 'vegetarian' | 'pescatarian' | 'keto' | 'paleo';
  preferences: string[];
  strictness?: 'low' | 'medium' | 'high';
  dislikedIngredients?: string[];
  healthGoals?: string[];
  syncStatus?: 'synced' | 'local-only';
}

export interface DietaryOption {
  id: string;
  value: string;
  label: string;
  iconKey?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DietaryOptionGroup {
  key: 'diet' | 'allergy' | 'strictness' | 'disliked_ingredient' | 'health_goal';
  name: string;
  description?: string | null;
  selectionMode: 'single' | 'multiple';
  allowCustom: boolean;
  options: DietaryOption[];
}

export interface DietaryOptionsCatalog {
  groups: DietaryOptionGroup[];
}

export interface SavedOrderSplitDraft {
  strategy: 'equal' | 'itemized' | 'custom';
  splitData: Record<string, unknown>;
  summary: Array<{
    participantId: string;
    participantName: string;
    amount: number;
    itemsTotal: number;
    proportionalTaxAndFees: number;
  }>;
  savedAt: string;
}

export interface DeliveryTrackingPayload {
  orderId: string;
  status: { code: string; label: string; description?: string | null } | null;
  serviceMode: string;
  restaurant: {
    id: string;
    name: string | null;
    coordinates: { latitude: number | null; longitude: number | null };
  };
  destination: {
    coordinates: { latitude: number | null; longitude: number | null };
  };
  courier: {
    assigned: boolean;
    coordinates: { latitude: number | null; longitude: number | null } | null;
    updatedAt: string | null;
    freshness: string;
  };
  eta: {
    minutes: number | null;
    source: string;
  };
  auction: {
    hasBids: boolean;
    state: string;
    startedAt: string | null;
    endedAt: string | null;
    latestBid: {
      id: string;
      status: string;
      estimatedTimeMinutes: number | null;
      bidAmount: number | null;
      expiresAt: string | null;
    } | null;
  };
}

export interface PlannerRecommendation {
  restaurant: {
    id: string;
    name: string;
    rating?: number | null;
  };
  item: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    variantId: string;
  };
  rationale: string[];
  score: number;
  cartSeed: {
    restaurantId: string;
    branchId?: string | null;
    items: Array<{
      item_id: string;
      variant_id?: string | null;
      quantity: number;
      modifiers: Array<{ modifier_item_id: string; quantity: number }>;
    }>;
  };
}

export interface PlannerRecommendationsResponse {
  generatedAt: string;
  inputs: {
    budget: number | null;
    serviceMode: string;
    searchTerms: string[];
    dietaryProfile: {
      allergies: string[];
      preferences: string[];
      strictness: string;
    };
  };
  recommendations: PlannerRecommendation[];
}

export interface MysteryBoxOffer {
  id: string | null;
  source: 'curated' | 'generated';
  canAccept: boolean;
  restaurant: { id: string; name: string | null };
  branch: { id: string; name: string | null } | null;
  title: string;
  description: string | null;
  price: number;
  originalValue: number | null;
  availableUntil: string | null;
  dietaryTags: string[];
  excludedAllergens: string[];
  itemsPreview: Array<{
    menu_item_name: string;
    quantity: number;
    metadata?: Record<string, unknown>;
  }>;
}

export interface MysteryBoxOffersResponse {
  customerId: string;
  generatedAt: string;
  offers: MysteryBoxOffer[];
}

export interface GroupCartParticipant {
  id: string;
  name: string;
  isHost: boolean;
  items: CartItem[];
  joinedAt: number;
}

export interface PersistedCartRecord {
  id: string;
  customerId: string;
  restaurantId: string;
  branchId: string;
  restaurantSlug: string;
  restaurantName: string;
  branchName: string | null;
  itemCount: number;
  subtotal: number;
  isActive: boolean;
  cartItems: CartItem[];
  checkoutDraft: OrderMetadata;
  restaurantSnapshot: RestaurantInfo | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastRestoredAt: string | null;
  storageSource: 'database' | 'local';
}

