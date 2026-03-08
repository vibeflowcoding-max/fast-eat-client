import type { OrderMetadata } from '@/types';

export const DEFAULT_ORDER_METADATA: OrderMetadata = {
  customerName: '',
  customerPhone: '',
  paymentMethod: '',
  orderType: '',
  source: 'client',
  address: '',
  gpsLocation: '',
  locationOverriddenFromProfile: false,
  locationDifferenceAcknowledged: false,
};