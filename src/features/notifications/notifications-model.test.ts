import { describe, expect, it } from 'vitest';
import { mapBidNotificationsToItems } from './notifications-model';
import type { BidNotification } from '@/types';

const baseNotification: BidNotification = {
  id: 'bid-1',
  orderId: 'order-1',
  bid: {
    id: 'bid-1',
    bidAmount: 2400,
    driverRating: 4.9,
    estimatedTimeMinutes: 12,
    driverNotes: null,
    basePrice: 2200,
    status: 'ACTIVE',
    expiresAt: '2026-01-01T10:15:00.000Z',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  receivedAt: '2026-01-01T10:00:00.000Z',
  read: false,
};

describe('mapBidNotificationsToItems', () => {
  it('prefers the real order number when available', () => {
    const [item] = mapBidNotificationsToItems([baseNotification], {
      locale: 'en-US',
      now: new Date('2026-01-01T10:10:00.000Z'),
      orderNumbersById: { 'order-1': 'ORDER_120' },
    });

    expect(item.orderNumber).toBe('ORDER_120');
    expect(item.body).toContain('ORDER_120');
  });

  it('falls back to the short order id when order number is missing', () => {
    const [item] = mapBidNotificationsToItems([baseNotification], {
      locale: 'en-US',
      now: new Date('2026-01-01T10:10:00.000Z'),
    });

    expect(item.orderNumber).toBe('order-1');
    expect(item.body).toContain('order-1');
  });
});