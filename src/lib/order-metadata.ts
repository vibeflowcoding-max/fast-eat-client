import type { OrderMetadata } from '@/types';

export const DEFAULT_ORDER_METADATA: OrderMetadata = {
  customerName: '',
  customerPhone: '',
  paymentMethod: '',
  orderType: '',
  source: 'client',
  address: '',
  gpsLocation: '',
  deliveryNotes: '',
  locationOverriddenFromProfile: false,
  locationDifferenceAcknowledged: false,
  promoCode: '',
  appliedDiscount: null,
};