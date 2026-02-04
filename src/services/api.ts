import { CartItem, MCPOrderPayload, MenuItem, OrderMetadata } from '../types';
import { APP_CONSTANTS } from '../constants';

export type InteractionType = 'chat' | 'carrito' | 'generar_orden' | 'get_carrito' | 'delete_cart';
export type CartAction = 'add' | 'increment' | 'reduce' | 'remove' | 'details' | 'clear' | 'none' | 'recommendation' | 'add-to-cart';

const PROXY_URL = '/api/external';

const cleanJsonResponse = (text: string): any => {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const matches = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/g);
    if (matches) {
      try {
        return JSON.parse(matches[0]);
      } catch (e2) {
        console.warn("No se pudo parsear el JSON extraído");
      }
    }
    return null;
  }
};

const extractDataFromN8N = (data: any) => {
  if (!data) return { message: "", action: "none", confirmation: false };
  
  let source = Array.isArray(data) ? data[0] : data;
  const original = { ...source };

  if (source?.output && typeof source.output === 'object') {
    source = source.output;
  }
  
  let message = source?.message || source?.reply_message || source?.text || original?.message || "";
  
  if (typeof message === 'string' && (message.includes("Workflow execution failed") || message.includes("Error: "))) {
    message = APP_CONSTANTS.MESSAGES.TECHNICAL_ERROR;
  }

  const action = source?.action || original?.action || "none";
  const item_id = source?.item_id || source?.productId || original?.item_id || null;
  const item_ids = source?.item_ids || source?.items || source?.cart?.items || original?.item_ids || null;
  
  const order_id = source?.order_id || source?.orderId || null;
  const order_number = source?.order_number || source?.orderNumber || null;

  const confirmation = 
    source?.confirmation === true || 
    source?.confirmation === 'true' || 
    source?.confirmation === 'success' ||
    original?.confirmation === true ||
    original?.output?.confirmation === true;
  
  return { message, action, item_id, item_ids, confirmation, order_id, order_number };
};

export const fetchMenuFromAPI = async (branchId: string): Promise<{ items: MenuItem[], categories: string[] }> => {
  try {
    // Use placeholder to hide real ID, but keep correct structure for Fast Eat API
    const path = `/mcp/public/branches/:branchId/menu`; 
    const response = await fetch(`${PROXY_URL}?target=fast-eat&path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Error al cargar el menú');
    const data = await response.json();
    const rawItems = Array.isArray(data) ? data : (data.menu || []);
    const items: MenuItem[] = rawItems.map((item: any) => ({
      id: String(item.id || item.productId || item.name), 
      name: item.name || 'Platillo',
      description: item.description || 'Delicioso platillo tradicional.',
      price: parseFloat(item.branch_price || item.base_price || 0),
      category: item.category || 'General',
      image: item.image_url || `https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&q=80&w=800`
    }));
    const categories = Array.from(new Set(items.map(i => i.category)));
    return { items, categories };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return { items: [], categories: [] };
  }
};

export const fetchRestaurantInfo = async (branchId: string): Promise<import('../types').RestaurantInfo | null> => {
  try {
    const path = `/restaurants/public/branch/:branchId`;
    const response = await fetch(`${PROXY_URL}?target=fast-eat&path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Error al cargar la información del restaurante');
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching restaurant info:', error);
    return null;
  }
};

export const fetchTableQuantity = async (branchId: string): Promise<{ quantity: number, is_available: boolean }> => {
  try {
    const response = await fetch(`/api/tables?branchId=${branchId}`);
    if (!response.ok) return { quantity: 0, is_available: false };
    return await response.json();
  } catch (error) {
    console.error('Error fetching table quantity:', error);
    return { quantity: 0, is_available: false };
  }
};
export const fetchBranches = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/branches');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
};

export const sendChatToN8N = async (
  message: string, 
  cart: CartItem[], 
  branchId: string,
  fromNumber: string,
  interaction: InteractionType = 'chat',
  action: CartAction = 'none',
  itemDetails?: CartItem,
  orderMetadata?: OrderMetadata,
  isTest: boolean = false
) => {
  try {
    const n8nOrderTypeMap: Record<string, string> = {
      'comer_aca': 'comer_ahi',
      'comer_aqui': 'comer_ahi',
      'dine_in': 'comer_ahi',
      'domicilio': 'domicilio',
      'delivery': 'domicilio',
      'recoger': 'recoger',
      'pickup': 'recoger'
    };

    const payload = {
      message,
      fromNumber,
      branch_id: branchId,
      intencion: interaction,
      action,
      metadata: orderMetadata ? {
        ...orderMetadata,
        customerPhone: fromNumber,
        orderType: orderMetadata.orderType,
        items: cart.map(i => ({
          item_id: i.id,
          nombre: i.name,
          cantidad: i.quantity,
          detalles: i.notes || "",
          precio: i.price
        }))
      } : undefined,
      ...( (interaction === 'carrito' || interaction === 'generar_orden') && itemDetails ? {
        item_id: itemDetails.id,
        nombre: itemDetails.name,
        cantidad: itemDetails.quantity,
        detalles: itemDetails.notes || "",
        precio: itemDetails.price
      } : {})
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'n8n',
        isTest,
        body: payload
      }),
    });
    
    const data = await response.json();
    const extracted = extractDataFromN8N(data);
    return { 
      output: extracted.message, 
      action: extracted.action as CartAction,
      item_id: extracted.item_id,
      item_ids: extracted.item_ids as any[],
      confirmation: extracted.confirmation,
      order_id: extracted.order_id,
      order_number: extracted.order_number
    };
  } catch (error) {
    return { 
      output: APP_CONSTANTS.MESSAGES.CONNECTION_ERROR, 
      action: "none" as CartAction,
      confirmation: false 
    };
  }
};

export const submitOrderToMCP = async (cart: CartItem[], orderMetadata: OrderMetadata, branchId: string) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const payload: MCPOrderPayload = {
    tool: 'create_branch_order',
    arguments: {
      branchId: branchId,
      totalAmount: total,
      customerName: orderMetadata.customerName,
      customerPhone: orderMetadata.customerPhone,
      paymentMethod: orderMetadata.paymentMethod,
      orderType: orderMetadata.orderType,
      address: orderMetadata.address,
      ...(orderMetadata.tableNumber ? { tableNumber: orderMetadata.tableNumber } : {}),
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes
      }))
    }
  };
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Error HTTP: ${response.status}`);
  }
  return await response.json();
};

export const getCartFromN8N = async (branchId: string, fromNumber: string, isTest: boolean = false): Promise<any[]> => {
  try {
    const payload = {
      message: "Obtener mi carrito actual",
      fromNumber: fromNumber,
      branch_id: branchId,
      intencion: "get_carrito"
    };
    const response = await fetch('/api/chat', { // Updated to use /api/chat
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'n8n',
        isTest,
        body: payload
      }),
    });
    const rawData = await response.json();
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const finalData = data?.output || data;
    if (finalData?.cart?.items) return finalData.cart.items;
    return [];
  } catch (error) {
    return [];
  }
};

export const sendOrderToN8N = async (message: string, cart: CartItem[], branchId: string, fromNumber: string, interaction: string, action: string, item: any, orderMetadata: OrderMetadata, isTest: boolean = false): Promise<any> => {
    const n8nOrderTypeMap: Record<string, string> = {
      'comer_aca': 'comer_ahi',
      'comer_aqui': 'comer_ahi',
      'dine_in': 'comer_ahi',
      'domicilio': 'domicilio',
      'delivery': 'domicilio',
      'recoger': 'recoger',
      'pickup': 'recoger'
    };

    const payload = {
      message,
      fromNumber,
      branch_id: branchId,
      intencion: interaction,
      action: action,
      metadata: {
        ...orderMetadata,
        customerPhone: fromNumber,
        orderType: orderMetadata.orderType,
        address: orderMetadata.address || '',
        gpsLocation: orderMetadata.gpsLocation || '',
        items: cart.map(i => ({
          item_id: i.id,
          nombre: i.name,
          cantidad: i.quantity,
          detalles: i.notes || "",
          precio: i.price
        }))
      }
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'n8n',
        isTest,
        body: payload
      }),
    });

    if (!response.ok) {
      throw new Error(`Order API Error: ${response.status}`);
    }

    const responseData = await response.json();
    const extracted = extractDataFromN8N(responseData);
    
    return {
      output: extracted.message,
      action: extracted.action,
      item_id: extracted.item_id,
      item_ids: extracted.item_ids,
      confirmation: extracted.confirmation,
      order_id: extracted.order_id,
      order_number: extracted.order_number
    };
};
