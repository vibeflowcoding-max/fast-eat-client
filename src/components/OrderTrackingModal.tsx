import { useEffect, useMemo, useState } from 'react';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useCartStore } from '@/store';
import BidRow from './BidRow';
import { acceptBid, confirmDelivery, counterOffer, listOrderBids } from '@/services/api';

interface OrderTrackingModalProps {
    isOpen: boolean;
    branchId: string;
    phone: string;
    onClose: () => void;
}

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, branchId, phone, onClose }) => {
    const { orders, isConnected } = useOrderTracking(branchId, phone);
    const bidsByOrderId = useCartStore((state) => state.bidsByOrderId);
    const deepLinkTarget = useCartStore((state) => state.deepLinkTarget);
    const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);
    const setOrderBids = useCartStore((state) => state.setOrderBids);
    const updateActiveOrder = useCartStore((state) => state.updateActiveOrder);
    const auctionStateByOrderId = useCartStore((state) => state.auctionStateByOrderId);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [bidSort, setBidSort] = useState<'price_asc' | 'price_desc' | 'rating_desc' | 'rating_asc'>('price_asc');
    const [loadingBidsForOrder, setLoadingBidsForOrder] = useState<string | null>(null);
    const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
    const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});

    const parseStatusCode = (status: string | undefined): string => {
        const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
        const dictionary: Record<string, string> = {
            COCINANDO: 'PREPARING',
            EN_CAMINO: 'DELIVERING',
            ENTREGADO: 'COMPLETED',
            ENVIADO_A_COCINA: 'PENDING'
        };
        return dictionary[normalized] || normalized || 'UNKNOWN';
    };

    const getDisplayStatusLabel = (order: any): string => {
        const label = typeof order?.newStatus?.label === 'string' ? order.newStatus.label.trim() : '';
        return label || 'Estado actualizado';
    };

    const getStatusMessage = (statusCode: string, prepTimeEstimate?: number) => {
        if (statusCode === 'PENDING') return 'Your order has been sent to the restaurant ⏳';
        if (statusCode === 'CONFIRMED') return 'The restaurant accepted your order ✅';
        if (statusCode === 'AUCTION_ACTIVE') return 'Finding a driver for your order 🔍';
        if (statusCode === 'DRIVER_ASSIGNED') return 'We found a driver for your order! 🎉';
        if (statusCode === 'PREPARING') return `Your order is being prepared 👨‍🍳 · ~${prepTimeEstimate || 0} min`;
        if (statusCode === 'READY') return 'Your order is ready and waiting for pickup 🟢';
        if (statusCode === 'DELIVERING') return 'Your order is on its way! 🛵';
        if (statusCode === 'COMPLETED') return 'Your order was delivered ✅ Enjoy!';
        if (statusCode === 'CANCELLED') return 'Your order was cancelled';
        return 'Order updated';
    };

    const expandedOrder = orders.find((order) => order.orderId === expandedOrderId) || null;
    const expandedOrderBids = expandedOrder ? (bidsByOrderId[expandedOrder.orderId] || []) : [];

    const sortedBids = useMemo(() => {
        const byCreatedAtAsc = (a: typeof expandedOrderBids[number], b: typeof expandedOrderBids[number]) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        return [...expandedOrderBids].sort((a, b) => {
            if (bidSort === 'price_asc') {
                if (a.bidAmount !== b.bidAmount) return a.bidAmount - b.bidAmount;
                return byCreatedAtAsc(a, b);
            }

            if (bidSort === 'price_desc') {
                if (a.bidAmount !== b.bidAmount) return b.bidAmount - a.bidAmount;
                return byCreatedAtAsc(a, b);
            }

            if (bidSort === 'rating_desc') {
                if (a.driverRating !== b.driverRating) return b.driverRating - a.driverRating;
                return byCreatedAtAsc(a, b);
            }

            if (a.driverRating !== b.driverRating) return a.driverRating - b.driverRating;
            return byCreatedAtAsc(a, b);
        });
    }, [expandedOrderBids, bidSort]);

    useEffect(() => {
        if (!deepLinkTarget || !isOpen) return;

        setExpandedOrderId(deepLinkTarget.orderId);

        const timeoutId = window.setTimeout(() => {
            const targetElement = document.getElementById(`bid-${deepLinkTarget.bidId}`);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setDeepLinkTarget(null);
            }
        }, 200);

        return () => window.clearTimeout(timeoutId);
    }, [deepLinkTarget, isOpen, bidsByOrderId, setDeepLinkTarget]);

    useEffect(() => {
        if (!expandedOrder) return;
        const statusCode = parseStatusCode(expandedOrder.newStatus?.code || expandedOrder.newStatus?.label);
        const auctionState = auctionStateByOrderId[expandedOrder.orderId];
        const isAuctionVisible = statusCode === 'AUCTION_ACTIVE' && !auctionState?.driverAssigned;

        if (!isAuctionVisible) return;

        const loadBids = async () => {
            setLoadingBidsForOrder(expandedOrder.orderId);
            setOrderErrors((previous) => ({ ...previous, [expandedOrder.orderId]: '' }));

            try {
                const response = await listOrderBids(expandedOrder.orderId);
                setOrderBids(response.orderId, response.bids);
            } catch (error: any) {
                setOrderErrors((previous) => ({
                    ...previous,
                    [expandedOrder.orderId]: error?.message || 'Failed to load bids'
                }));
            } finally {
                setLoadingBidsForOrder(null);
            }
        };

        loadBids();
    }, [expandedOrder, auctionStateByOrderId, setOrderBids]);

    const handleAcceptBid = async (orderId: string, bidId: string) => {
        setAcceptingBidId(bidId);
        setOrderErrors((previous) => ({ ...previous, [orderId]: '' }));
        try {
            const response = await acceptBid(orderId, bidId);
            updateActiveOrder(orderId, {
                newStatus: {
                    code: response.status,
                    label: response.label || getDisplayStatusLabel(orders.find((entry) => entry.orderId === orderId)),
                },
                deliveryFinalPrice: response.deliveryFinalPrice
            });
        } catch (error: any) {
            setOrderErrors((previous) => ({
                ...previous,
                [orderId]: error?.message || 'Unable to accept this bid'
            }));
        } finally {
            setAcceptingBidId(null);
        }
    };
    const handleCounterOffer = async (orderId: string, bidId: string, amount: number) => {
        setOrderErrors((previous) => ({ ...previous, [orderId]: '' }));
        try {
            const response = await counterOffer(orderId, bidId, amount);
            // After countering, we refresh bids to show the "countered" status
            const bidsResponse = await listOrderBids(orderId);
            setOrderBids(bidsResponse.orderId, bidsResponse.bids);
        } catch (error: any) {
            setOrderErrors((previous) => ({
                ...previous,
                [orderId]: error?.message || 'Unable to send counter-offer'
            }));
        }
    };

    const handleConfirmDelivery = async (orderId: string) => {
        setConfirmingOrderId(orderId);
        setOrderErrors((previous) => ({ ...previous, [orderId]: '' }));
        try {
            const response = await confirmDelivery(orderId);
            updateActiveOrder(orderId, {
                acceptedByUser: response.acceptedByUser,
                newStatus: {
                    code: response.status,
                    label: response.label || getDisplayStatusLabel(orders.find((entry) => entry.orderId === orderId)),
                }
            });
        } catch (error: any) {
            setOrderErrors((previous) => ({
                ...previous,
                [orderId]: error?.message || 'Unable to confirm delivery'
            }));
        } finally {
            setConfirmingOrderId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#fdfcf0] w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative animate-popIn border-2 border-red-600">

                {/* Header */}
                <div className="p-5 md:p-8 bg-white border-b-4 border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Rastreo de Pedidos</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {isConnected ? 'Conectado en vivo' : 'Desconectado'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-black hover:bg-black hover:text-white transition-all">✕</button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-4 bg-gray-50/50">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center py-20 text-center">
                            <span className="text-6xl mb-4 grayscale opacity-50">🛵</span>
                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No hay actualizaciones recientes</p>
                            <p className="text-gray-300 text-[10px] mt-2 max-w-xs">Los pedidos activos aparecerán aquí automáticamente.</p>
                        </div>
                    ) : (
                        orders.map((order) => {
                            const isExpanded = expandedOrderId === order.orderId;
                            return (
                                <div
                                    key={order.orderId}
                                    onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                                    className={`bg-white rounded-2xl shadow-sm border border-gray-100 transition-all cursor-pointer hover:shadow-md overflow-hidden ${isExpanded ? 'ring-2 ring-red-500/20' : ''}`}
                                >
                                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Orden #{order.orderNumber || order.orderId.slice(0, 8)}</span>
                                                {order.total !== undefined && (
                                                    <span className="bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                                        ₡{order.total.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-lg font-black text-gray-900">{getDisplayStatusLabel(order)}</span>
                                            <span className="text-xs text-gray-500 font-semibold">
                                                {getStatusMessage(parseStatusCode(order.newStatus?.code || order.newStatus?.label), order.prepTimeEstimate)}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                Actualizado: {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                                                <span className="text-2xl">
                                                    {(() => {
                                                        const normalizedCode = parseStatusCode(order.newStatus?.code || order.newStatus?.label);
                                                        if (normalizedCode === 'PREPARING') return '👨‍🍳';
                                                        if (normalizedCode === 'DELIVERING') return '🛵';
                                                        if (normalizedCode === 'COMPLETED') return '✅';
                                                        return '🕓';
                                                    })()}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-400">Estado</span>
                                                    <span className="text-xs font-bold text-gray-800">{getDisplayStatusLabel(order)}</span>
                                                </div>
                                            </div>
                                            <div className="text-gray-300 transform transition-transform duration-300">
                                                {isExpanded ? '▲' : '▼'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed View */}
                                    {isExpanded && (
                                        <div
                                            className="bg-gray-50/50 p-5 border-t border-gray-100 animate-fadeIn"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            {order.items && (
                                                <>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Detalle del Pedido</h4>
                                                    <div className="space-y-3">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                <div className="flex gap-2">
                                                                    <span className="font-bold text-red-600 bg-red-50 px-1.5 rounded">{item.quantity}x</span>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-800">{item.name}</span>
                                                                        {item.notes && <span className="text-[10px] text-gray-500 italic">"{item.notes}"</span>}
                                                                    </div>
                                                                </div>
                                                                <span className="font-bold text-gray-900">₡{(item.price * item.quantity).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        {order.total !== undefined && (
                                                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                                                                <span className="font-black text-gray-900 uppercase text-[10px] tracking-widest">Total a Pagar</span>
                                                                <span className="font-black text-lg text-gray-900">₡{order.total.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {(() => {
                                                const orderStatusCode = parseStatusCode(order.newStatus?.code || order.newStatus?.label);
                                                const auctionState = auctionStateByOrderId[order.orderId];
                                                const source = (order.source || '').toLowerCase();
                                                const isAuctionSource = source !== 'virtualmenu';
                                                const showBidBoard = isAuctionSource && orderStatusCode === 'AUCTION_ACTIVE' && !auctionState?.driverAssigned;
                                                const currentBids = bidsByOrderId[order.orderId] || [];
                                                const currentError = orderErrors[order.orderId];

                                                if (!showBidBoard) {
                                                    return null;
                                                }

                                                return (
                                                    <div className="mt-4 space-y-3">
                                                        <div className="bg-white border border-gray-200 rounded-xl p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ordenar ofertas</span>
                                                                <select
                                                                    value={bidSort}
                                                                    onChange={(event) => setBidSort(event.target.value as 'price_asc' | 'price_desc' | 'rating_desc' | 'rating_asc')}
                                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white"
                                                                >
                                                                    <option value="price_asc">Precio: menor a mayor</option>
                                                                    <option value="price_desc">Precio: mayor a menor</option>
                                                                    <option value="rating_desc">Rating: mayor a menor</option>
                                                                    <option value="rating_asc">Rating: menor a mayor</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {loadingBidsForOrder === order.orderId && (
                                                            <p className="text-xs font-semibold text-gray-500">Cargando ofertas en vivo...</p>
                                                        )}

                                                        {currentError && (
                                                            <p className="text-xs font-semibold text-red-600">{currentError}</p>
                                                        )}

                                                        {currentBids.length === 0 && !currentError && loadingBidsForOrder !== order.orderId && (
                                                            <p className="text-xs font-semibold text-gray-500">Aún no hay ofertas disponibles.</p>
                                                        )}

                                                        {sortedBids.map((bid) => (
                                                            <BidRow
                                                                key={bid.id}
                                                                bid={bid}
                                                                orderId={order.orderId}
                                                                isLoading={acceptingBidId === bid.id}
                                                                isHighlighted={deepLinkTarget?.bidId === bid.id}
                                                                onAccept={handleAcceptBid}
                                                                onCounterOffer={handleCounterOffer}
                                                            />
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {parseStatusCode(order.newStatus?.code || order.newStatus?.label) === 'DELIVERING' && order.securityCode && (
                                                <div className="mt-4 p-4 bg-white border border-green-200 rounded-xl">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Share this code with your driver</h3>
                                                    <p className="text-2xl font-black text-gray-900 mt-2">{order.securityCode}</p>
                                                    <p className="text-xs text-gray-600 mt-1">The driver will ask for this when they arrive.</p>
                                                </div>
                                            )}

                                            {parseStatusCode(order.newStatus?.code || order.newStatus?.label) === 'DELIVERING' && order.confirmedByDelivery && !order.acceptedByUser && (
                                                <div className="mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirmDelivery(order.orderId)}
                                                        disabled={confirmingOrderId === order.orderId}
                                                        className="px-4 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-60"
                                                    >
                                                        {confirmingOrderId === order.orderId ? 'Confirmando...' : 'Accept Order ✅'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-gray-100 text-center">
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Actualizaciones en tiempo real via SSE</span>
                </div>
            </div>
        </div>
    );
};

export default OrderTrackingModal;
