
export type Category = string;

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
}

export interface RecommendedItem {
  id: string;
  qt: string | number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
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
  customerLatitude?: number;
  customerLongitude?: number;
  tableNumber?: string;
  scheduledFor?: string | null;
  optOutCutlery?: boolean;
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
    paymentMethod: string;
    orderType: string;
    source?: 'client' | 'virtualMenu' | 'consumer_app' | string;
    address?: string;
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
}

export interface GroupCartParticipant {
  id: string;
  name: string;
  isHost: boolean;
  items: CartItem[];
  joinedAt: number;
}

