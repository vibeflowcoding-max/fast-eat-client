"use client";

import React, { useEffect, useState } from 'react';
import { CartItem, OrderMetadata } from '../types';
import CartItemRow from './CartItemRow';
import OrderForm from './OrderForm';
import GroupCartWidget from '../features/social/components/GroupCartWidget';
import BillSplitterModal from '../features/payments/components/BillSplitterModal';
import SinpeRequestUI from '../features/payments/components/SinpeRequestUI';
import { SplitResult } from '../features/payments/utils/splitStrategies';
import { useCartStore } from '../store';
import { useTranslations } from 'next-intl';
import { fetchCheckoutFeeRates } from '@/services/api';
import { calculateCheckoutPricing } from '@/lib/checkout-pricing';

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
    onUseSavedProfileLocation?: () => void;
    onUseDifferentLocation?: () => void;
    onOpenLocationPicker?: () => void;
    locationPickerLoading?: boolean;
    locationServicePrompt?: string | null;
    isAutoSavingProfileLocation?: boolean;
    tableQuantity?: number;
    onOpenCheckoutPage?: () => void;
    onOpenCartsPage?: () => void;
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
    onUseSavedProfileLocation,
    onUseDifferentLocation,
    onOpenLocationPicker,
    locationPickerLoading = false,
    locationServicePrompt = null,
    isAutoSavingProfileLocation = false,
    tableQuantity = 0,
    onOpenCheckoutPage,
    onOpenCartsPage,
}) => {
    const t = useTranslations('checkout.cart');
    const branchId = useCartStore(state => state.branchId);
    const groupSessionId = useCartStore(state => state.groupSessionId);
    const groupParticipants = useCartStore(state => state.groupParticipants);
    const currentParticipantId = useCartStore(state => state.participantId);

    const [showBillSplitter, setShowBillSplitter] = useState(false);
    const [sinpeResults, setSinpeResults] = useState<SplitResult[] | null>(null);
    const [feeRates, setFeeRates] = useState({ serviceFeeRate: 0, platformFeeRate: 0 });
    const [isPricingUnavailable, setIsPricingUnavailable] = useState(false);

    useEffect(() => {
        let active = true;

        const normalizedBranchId = String(branchId || '').trim();
        if (!normalizedBranchId || normalizedBranchId === ':branchId') {
            setFeeRates({ serviceFeeRate: 0, platformFeeRate: 0 });
            setIsPricingUnavailable(false);
            return;
        }

        const loadRates = async () => {
            const rates = await fetchCheckoutFeeRates(normalizedBranchId);
            if (!active) {
                return;
            }

            setFeeRates(rates);
            setIsPricingUnavailable(rates.serviceFeeRate === 0 && rates.platformFeeRate === 0);
        };

        void loadRates();

        return () => {
            active = false;
        };
    }, [branchId]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const pricing = calculateCheckoutPricing(subtotal, feeRates);
    const taxesAndFees = pricing.serviceFeeAmount + pricing.platformFeeAmount;
    const total = pricing.totalBeforeDelivery;

    const formatCurrency = (value: number) => `₡${Math.round(value).toLocaleString()}`;
    const formatRate = (rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1)}%`;

    const isOrderFormValid = () => {
        const {
            customerName,
            customerPhone,
            paymentMethod,
            orderType,
            address,
            gpsLocation,
            customerLatitude,
            customerLongitude,
            tableNumber,
            locationOverriddenFromProfile,
            locationDifferenceAcknowledged,
        } = orderMetadata;
        const normalizedPhone = (customerPhone || fromNumber || '').trim();
        const hasOrderType = Boolean(orderType?.trim());
        const hasPaymentMethod = Boolean(paymentMethod?.trim());
        const hasCoordinates = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);
        const hasDeliveryReference = Boolean(address?.trim()) || Boolean(gpsLocation?.trim()) || hasCoordinates;
        const isDeliveryDetailsValid = orderType !== 'delivery' || hasDeliveryReference;
        const isLocationDifferenceAccepted =
            orderType !== 'delivery' ||
            !locationOverriddenFromProfile ||
            Boolean(locationDifferenceAcknowledged);
        const isTableValid = !(orderType === 'comer_aca' || orderType === 'comer_aqui' || orderType === 'dine_in') || tableNumber;
        return !!(
            customerName.trim() &&
            normalizedPhone &&
            hasOrderType &&
            hasPaymentMethod &&
            isDeliveryDetailsValid &&
            isLocationDifferenceAccepted &&
            isTableValid
        );
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
                            isUsingDifferentDeliveryLocation={Boolean(orderMetadata.locationOverriddenFromProfile)}
                            onUseSavedProfileLocation={onUseSavedProfileLocation}
                            onUseDifferentLocation={onUseDifferentLocation}
                            onOpenLocationPicker={onOpenLocationPicker}
                            locationPickerLoading={locationPickerLoading}
                            locationServicePrompt={locationServicePrompt}
                            isAutoSavingProfileLocation={isAutoSavingProfileLocation}
                            locationDifferenceWarningVisible={Boolean(orderMetadata.locationOverriddenFromProfile)}
                            locationDifferenceAcknowledged={Boolean(orderMetadata.locationDifferenceAcknowledged)}
                            onToggleLocationDifferenceAcknowledged={(value) => setOrderMetadata({
                                ...orderMetadata,
                                locationDifferenceAcknowledged: value,
                            })}
                            tableQuantity={tableQuantity}
                        />
                    )}
                    <div className="ui-panel mt-2 p-5 md:p-8 border-t-4 space-y-3">
                        {cart.length > 0 && (
                            <div className="ui-panel-soft border-2 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="ui-text-muted">{t('subtotal')}</span>
                                    <span>{formatCurrency(pricing.subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="ui-text-muted">{t('serviceFee', { rate: formatRate(pricing.serviceFeeRate) })}</span>
                                    <span>{formatCurrency(pricing.serviceFeeAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="ui-text-muted">{t('platformFee', { rate: formatRate(pricing.platformFeeRate) })}</span>
                                    <span>{formatCurrency(pricing.platformFeeAmount)}</span>
                                </div>
                                <div className="border-t border-border/30 pt-2 mt-2 flex items-center justify-between text-sm font-black uppercase tracking-widest">
                                    <span>{t('total')}</span>
                                    <span>{formatCurrency(pricing.totalBeforeDelivery)}</span>
                                </div>
                                <p className="ui-state-warning rounded-lg px-2 py-1 text-[10px] font-bold">
                                    {t('deliveryDisclaimer')}
                                </p>
                                {isPricingUnavailable && (
                                    <p className="ui-text-muted text-[10px] font-bold">{t('feesUnavailable')}</p>
                                )}
                            </div>
                        )}
                        {groupSessionId && groupParticipants.length > 1 && (
                            <button
                                onClick={() => setShowBillSplitter(true)}
                                disabled={cart.length === 0}
                                className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs border-2 transition-all active:scale-95 ${cart.length > 0 ? 'ui-btn-secondary' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                            >
                                {t('splitBill')} 🧮
                            </button>
                        )}
                        {cart.length > 0 && onOpenCheckoutPage ? (
                            <button
                                type="button"
                                onClick={onOpenCheckoutPage}
                                className="w-full rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-[0.24em] ui-btn-secondary"
                            >
                                {t('openCheckoutPage')}
                            </button>
                        ) : null}
                        {(cart.length > 0 || (groupSessionId && groupParticipants.length > 0)) && onOpenCartsPage ? (
                            <button
                                type="button"
                                onClick={onOpenCartsPage}
                                className="w-full rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-[0.24em] ui-btn-secondary"
                            >
                                {t('openCartsPage')}
                            </button>
                        ) : null}
                        <button
                            onClick={onPlaceOrder}
                            disabled={cart.length === 0 || !isOrderFormValid() || isOrdering}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 ${cart.length > 0 && isOrderFormValid() ? 'ui-btn-primary' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                        >
                            {isOrdering ? t('processing') : `${t('confirmOrder')} ⛩️`}
                        </button>
                    </div>
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
