
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
  address?: string;
  gpsLocation?: string;
  tableNumber?: string;
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
    address?: string;
  };
}
