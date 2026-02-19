export const APP_CONSTANTS = {
  STORAGE_KEYS: {
    METADATA: 'izakaya_metadata',
    ORDER_HISTORY: 'izakaya_order_history',
    CHAT_HISTORY: 'izakaya_chat_history',
    HOME_DISCOVERY_HISTORY: 'izakaya_home_discovery_history',
    HOME_DISCOVERY_SESSION: 'izakaya_home_discovery_session',
    HOME_DISCOVERY_VIEWED: 'izakaya_home_discovery_viewed',
    ACTIVE_ORDERS: 'izakaya_active_orders',
    USER_NAME: 'izakaya_user_name',
    USER_PHONE: 'izakaya_user_phone',
    CART_STORAGE: 'virtual-menu-storage'
  },
  CART: {
    EXPIRATION_MINUTES: 40,
    EXPIRATION_MS: 40 * 60 * 1000
  },
  DEFAULTS: {
    BRANCH_ID: '832d68b4-063b-4657-91a3-bf72a1556a3a',
    COUNTRY_CODE: '506'
  },
  API: {
    MENU_PATH: (branchId: string) => `/mcp/public/branches/${branchId}/menu`,
    RESTAURANT_PATH: (branchId: string) => `/restaurants/public/branch/${branchId}`,
    ORDER_PATH: '/mcp/order'
  },
  MESSAGES: {
    TECHNICAL_ERROR: "🏮 Lo sentimos, hubo un problema técnico. Por favor, intenta de nuevo.",
    CONNECTION_ERROR: "🏮 Error de conexión con el asistente.",
    LOAD_ERROR: "Error al cargar la información. 🏮"
  }
};
