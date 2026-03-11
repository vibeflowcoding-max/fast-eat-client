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
import type { MapsGeocodeData } from '@/services/maps-api';
import { Button, Icon, Surface } from '@/../resources/components';

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
    onInlineLocationChange?: (value: {
        urlAddress: string;
        lat?: number;
        lng?: number;
        formattedAddress?: string;
        normalizedAddress?: MapsGeocodeData;
    }) => void;
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
    onInlineLocationChange,
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
            <Surface className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] p-0 shadow-2xl" padding="none" variant="base">
                {(isSyncing || isOrdering) && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center rounded-[2rem] bg-white/40 backdrop-blur-[2px] dark:bg-slate-900/50">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-900 border-t-orange-600 dark:border-slate-100 dark:border-t-orange-300"></div>
                    </div>
                )}
                <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-5 md:px-8 md:py-6 dark:border-slate-800/80">
                    <h3 className="text-xl font-black uppercase tracking-tighter">{t('title')}</h3>
                    <Button aria-label="Cerrar" className="shrink-0" onClick={onClose} size="icon" variant="ghost">
                        <Icon symbol="close" />
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-4">
                    <GroupCartWidget />
                    {cart.length === 0 && (!groupSessionId || groupParticipants.length === 0) ? (
                        <div className="flex flex-col items-center py-20">
                            <span className="text-6xl mb-4">🍱</span>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('empty')}</p>
                        </div>
                    ) : groupSessionId && groupParticipants.length > 0 ? (
                        <div className="space-y-6">
                            {groupParticipants.map(participant => (
                                <div key={participant.id} className="space-y-2">
                                    <h4 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
                                    {participant.items.length === 0 && <p className="text-xs italic text-slate-500 dark:text-slate-400">{t('participantNoItems')}</p>}
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
                            onInlineLocationChange={onInlineLocationChange}
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
                    <Surface className="mt-2 space-y-3 rounded-[1.75rem] border border-slate-200/80 p-5 md:p-8 dark:border-slate-800/80" variant="muted">
                        {cart.length > 0 && (
                            <Surface className="space-y-2 border border-orange-100 dark:border-[#4b2f21]" variant="raised">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="text-slate-500 dark:text-slate-400">{t('subtotal')}</span>
                                    <span>{formatCurrency(pricing.subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="text-slate-500 dark:text-slate-400">{t('serviceFee', { rate: formatRate(pricing.serviceFeeRate) })}</span>
                                    <span>{formatCurrency(pricing.serviceFeeAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="text-slate-500 dark:text-slate-400">{t('platformFee', { rate: formatRate(pricing.platformFeeRate) })}</span>
                                    <span>{formatCurrency(pricing.platformFeeAmount)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black uppercase tracking-widest dark:border-slate-700">
                                    <span>{t('total')}</span>
                                    <span>{formatCurrency(pricing.totalBeforeDelivery)}</span>
                                </div>
                                <Surface className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-200" padding="none" variant="muted">
                                    {t('deliveryDisclaimer')}
                                </Surface>
                                {isPricingUnavailable && (
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('feesUnavailable')}</p>
                                )}
                            </Surface>
                        )}
                        {groupSessionId && groupParticipants.length > 1 && (
                            <Button
                                onClick={() => setShowBillSplitter(true)}
                                disabled={cart.length === 0}
                                className="text-xs font-bold uppercase tracking-wider"
                                fullWidth
                                size="lg"
                                variant="secondary"
                            >
                                {t('splitBill')} 🧮
                            </Button>
                        )}
                        {cart.length > 0 && onOpenCheckoutPage ? (
                            <Button
                                onClick={onOpenCheckoutPage}
                                className="text-xs font-black uppercase tracking-[0.24em]"
                                fullWidth
                                size="lg"
                                variant="secondary"
                            >
                                {t('openCheckoutPage')}
                            </Button>
                        ) : null}
                        {(cart.length > 0 || (groupSessionId && groupParticipants.length > 0)) && onOpenCartsPage ? (
                            <Button
                                onClick={onOpenCartsPage}
                                className="text-xs font-black uppercase tracking-[0.24em]"
                                fullWidth
                                size="lg"
                                variant="secondary"
                            >
                                {t('openCartsPage')}
                            </Button>
                        ) : null}
                        <Button
                            onClick={onPlaceOrder}
                            disabled={cart.length === 0 || !isOrderFormValid() || isOrdering}
                            className="text-xs font-black uppercase tracking-[0.3em]"
                            fullWidth
                            size="lg"
                            variant="primary"
                        >
                            {isOrdering ? t('processing') : `${t('confirmOrder')} ⛩️`}
                        </Button>
                    </Surface>
                </div>
            </Surface>

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
