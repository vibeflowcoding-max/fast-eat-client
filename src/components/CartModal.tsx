"use client";

import React, { useState } from 'react';
import { CartItem, OrderMetadata } from '../types';
import CartItemRow from './CartItemRow';
import OrderForm from './OrderForm';
import GroupCartWidget from '../features/social/components/GroupCartWidget';
import BillSplitterModal from '../features/payments/components/BillSplitterModal';
import SinpeRequestUI from '../features/payments/components/SinpeRequestUI';
import { SplitResult } from '../features/payments/utils/splitStrategies';
import { useCartStore } from '../store';
import { useTranslations } from 'next-intl';

interface CartModalProps {
    cart: CartItem[];
    orderMetadata: OrderMetadata;
    setOrderMetadata: (metadata: OrderMetadata) => void;
    onClose: () => void;
    onPlaceOrder: () => void;
    onSyncCartAction: (item: CartItem, action: string, newQuantity: number) => void;
    onGetLocation: () => void;
    isSyncing: boolean;
    isOrdering: boolean;
    isLocating: boolean;
    paymentOptions: { id: string, label: string }[];
    serviceOptions: { id: string, label: string }[];
    fromNumber: string;
    hasProfileLocation?: boolean;
    profileLocationLabel?: string;
    tableQuantity?: number;
}

const CartModal: React.FC<CartModalProps> = ({
    cart,
    orderMetadata,
    setOrderMetadata,
    onClose,
    onPlaceOrder,
    onSyncCartAction,
    onGetLocation,
    isSyncing,
    isOrdering,
    isLocating,
    paymentOptions,
    serviceOptions,
    fromNumber,
    hasProfileLocation = false,
    profileLocationLabel,
    tableQuantity = 0
}) => {
    const t = useTranslations('checkout.cart');
    const groupSessionId = useCartStore(state => state.groupSessionId);
    const groupParticipants = useCartStore(state => state.groupParticipants);
    const currentParticipantId = useCartStore(state => state.participantId);

    const [showBillSplitter, setShowBillSplitter] = useState(false);
    const [sinpeResults, setSinpeResults] = useState<SplitResult[] | null>(null);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxesAndFees = 0; // For future implementation if delivery fees exist before order placement
    const total = subtotal + taxesAndFees;

    const isOrderFormValid = () => {
        const { customerName, customerPhone, paymentMethod, orderType, address, gpsLocation, customerLatitude, customerLongitude, tableNumber } = orderMetadata;
        const normalizedPhone = (customerPhone || fromNumber || '').trim();
        const hasOrderType = Boolean(orderType?.trim());
        const hasPaymentMethod = Boolean(paymentMethod?.trim());
        const hasCoordinates = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);
        const hasDeliveryReference = Boolean(address?.trim()) || Boolean(gpsLocation?.trim()) || hasCoordinates;
        const isDeliveryDetailsValid = orderType !== 'delivery' || hasDeliveryReference;
        const isTableValid = !(orderType === 'comer_aca' || orderType === 'comer_aqui' || orderType === 'dine_in') || tableNumber;
        return !!(customerName.trim() && normalizedPhone && hasOrderType && hasPaymentMethod && isDeliveryDetailsValid && isTableValid);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="ui-page w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
                {(isSyncing || isOrdering) && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[110] flex items-center justify-center rounded-[2rem]">
                        <div className="w-12 h-12 border-4 border-black border-t-[var(--color-brand)] rounded-full animate-spin"></div>
                    </div>
                )}
                <div className="ui-panel p-5 md:p-8 border-b-4 flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tighter">{t('title')}</h3>
                    <button onClick={onClose} className="ui-btn-secondary w-10 h-10 rounded-full flex items-center justify-center font-black transition-colors">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-4">
                    <GroupCartWidget />
                    {cart.length === 0 && (!groupSessionId || groupParticipants.length === 0) ? (
                        <div className="flex flex-col items-center py-20">
                            <span className="text-6xl mb-4">🍱</span>
                            <p className="ui-text-muted font-black uppercase tracking-widest text-xs">{t('empty')}</p>
                        </div>
                    ) : groupSessionId && groupParticipants.length > 0 ? (
                        <div className="space-y-6">
                            {groupParticipants.map(participant => (
                                <div key={participant.id} className="space-y-2">
                                    <h4 className="ui-text-muted font-bold text-sm uppercase tracking-wider border-b pb-1">
                                        {participant.name} {participant.isHost ? `(${t('host')})` : ''}
                                    </h4>
                                    {participant.items.map((item, idx) => (
                                        <CartItemRow
                                            key={`${participant.id}-${item.id}-${idx}`}
                                            item={item}
                                            isSyncing={isSyncing}
                                            onSyncCartAction={(item, action, qt) => {
                                                if (participant.id === currentParticipantId) {
                                                    onSyncCartAction(item, action, qt);
                                                } else {
                                                    alert(t('cantEditOthers'));
                                                }
                                            }}
                                        />
                                    ))}
                                    {participant.items.length === 0 && <p className="ui-text-muted text-xs italic">{t('participantNoItems')}</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item, idx) => (
                                <CartItemRow
                                    key={`${item.id}-${idx}`}
                                    item={item}
                                    isSyncing={isSyncing}
                                    onSyncCartAction={onSyncCartAction}
                                />
                            ))}
                        </div>
                    )}

                    {cart.length > 0 && (
                        <OrderForm
                            orderMetadata={orderMetadata}
                            setOrderMetadata={setOrderMetadata}
                            paymentOptions={paymentOptions}
                            serviceOptions={serviceOptions}
                            fromNumber={fromNumber}
                            isLocating={isLocating}
                            onGetLocation={onGetLocation}
                            hasProfileLocation={hasProfileLocation}
                            profileLocationLabel={profileLocationLabel}
                            tableQuantity={tableQuantity}
                        />
                    )}
                </div>
                <div className="ui-panel p-5 md:p-8 border-t-4 space-y-3">
                    {groupSessionId && groupParticipants.length > 1 && (
                        <button
                            onClick={() => setShowBillSplitter(true)}
                            disabled={cart.length === 0}
                            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs border-2 transition-all active:scale-95 ${cart.length > 0 ? 'ui-btn-secondary' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                        >
                            {t('splitBill')} 🧮
                        </button>
                    )}
                    <button
                        onClick={onPlaceOrder}
                        disabled={cart.length === 0 || !isOrderFormValid() || isOrdering}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 ${cart.length > 0 && isOrderFormValid() ? 'ui-btn-primary' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                    >
                        {isOrdering ? t('processing') : `${t('confirmOrder')} ⛩️`}
                    </button>
                </div>
            </div>

            {showBillSplitter && (
                <BillSplitterModal
                    participants={groupParticipants}
                    subtotal={subtotal}
                    taxesAndFees={taxesAndFees}
                    total={total}
                    onClose={() => setShowBillSplitter(false)}
                    onConfirmSplit={(results) => {
                        setSinpeResults(results);
                        setShowBillSplitter(false);
                    }}
                />
            )}

            {sinpeResults && (
                <SinpeRequestUI
                    splitResults={sinpeResults}
                    hostPhone={fromNumber || ''}
                    hostName={useCartStore.getState().customerName || t('host')}
                    onBack={() => {
                        setSinpeResults(null);
                        setShowBillSplitter(true);
                    }}
                    onClose={() => setSinpeResults(null)}
                />
            )}
        </div>
    );
};

export default CartModal;
