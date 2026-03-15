import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { findCustomerIdByPhone } from '@/app/api/customer/_lib';
import { loadTrackedOrdersLocal } from '@/server/consumer/orders';

export const dynamic = 'force-dynamic';

function formatSseEvent(eventName: string, payload: Record<string, unknown>) {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const customerId = searchParams.get('customerId');
  const branchIdFromQuery = searchParams.get('branchId');
  
  const cookieStore = await cookies();
  const sessionBranchId = cookieStore.get('session_branch_id')?.value;
  const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;

  const branchId = branchIdFromQuery || sessionBranchId || DEFAULT_BRANCH_ID;

  console.log(
    `[SSE Proxy] Tracking attempt - Phone: ${phone || 'n/a'}, CustomerId: ${customerId || 'n/a'}, Branch: ${branchId}, SessionCookie: ${!!sessionBranchId}`,
  );

  if ((!phone && !customerId) || !branchId) {
    console.error("[SSE Proxy] Missing parameters", { phone, customerId, branchId });
    return new Response('Missing parameters or session not initialized', { status: 400 });
  }

  const resolvedCustomerId = customerId || (phone ? await findCustomerIdByPhone(phone) : null);
  if (!resolvedCustomerId) {
    return new Response('Customer not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const knownOrderSignatures = new Map<string, string>();
  const knownBidSignatures = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const enqueue = (eventName: string, payload: Record<string, unknown>) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(formatSseEvent(eventName, payload)));
      };

      const poll = async () => {
        if (closed) {
          return;
        }

        try {
          const orders = await loadTrackedOrdersLocal({
            customerId: resolvedCustomerId,
            branchId,
          });

          for (const order of orders) {
            const orderSignature = JSON.stringify({
              statusCode: order.status.code,
              updatedAt: order.updatedAt,
              deliveryId: order.deliveryId,
              confirmedByDelivery: order.confirmedByDelivery,
              acceptedByUser: order.acceptedByUser,
              cancellationReason: order.cancellationReason,
              total: order.total,
            });

            if (knownOrderSignatures.get(order.orderId) !== orderSignature) {
              knownOrderSignatures.set(order.orderId, orderSignature);
              enqueue('order_update', {
                eventType: 'order_update',
                orderId: order.orderId,
                orderNumber: order.orderNumber,
                newStatus: order.status,
                updatedAt: order.updatedAt,
                total: order.total,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                feesTotal: order.feesTotal,
                customerTotal: order.customerTotal,
                securityCode: order.securityCode,
                deliveryId: order.deliveryId,
                confirmedByDelivery: order.confirmedByDelivery,
                acceptedByUser: order.acceptedByUser,
                cancellationReason: order.cancellationReason,
              });
            }

            for (const bid of order.bids) {
              const bidSignature = `${order.orderId}:${bid.id}:${bid.status}:${bid.createdAt}`;
              if (knownBidSignatures.has(bidSignature)) {
                continue;
              }

              knownBidSignatures.add(bidSignature);
              enqueue('delivery_bid_created', {
                eventType: 'delivery_bid_created',
                orderId: order.orderId,
                occurredAt: bid.createdAt,
                bid,
              });
            }
          }

          enqueue('ping', { timestamp: new Date().toISOString() });
        } catch (error) {
          enqueue('error', {
            eventType: 'error',
            message: error instanceof Error ? error.message : 'Tracker poll failed',
            occurredAt: new Date().toISOString(),
          });
        } finally {
          if (!closed) {
            timer = setTimeout(poll, 5000);
          }
        }
      };

      enqueue('connected', {
        message: 'Connected to order tracking',
        customerId: resolvedCustomerId,
        branchId,
        phone: phone || null,
        timestamp: new Date().toISOString(),
      });

      poll();

      req.signal.addEventListener('abort', () => {
        closed = true;
        if (timer) {
          clearTimeout(timer);
        }
        controller.close();
      });
    },
    cancel() {
      return undefined;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
