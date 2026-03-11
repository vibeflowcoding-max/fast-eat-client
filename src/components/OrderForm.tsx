import React from 'react';
import { MapPinHouse, NotebookPen } from 'lucide-react';
import { OrderMetadata } from '../types';
import { useTranslations } from 'next-intl';
import type { MapsGeocodeData } from '@/services/maps-api';
import GoogleMapsAddressPicker from '@/components/GoogleMapsAddressPicker';
import { formatPhoneForDisplay } from '@/lib/phone';
import { Button, Surface } from '@/../resources/components';

const fieldLabelClassName = 'ml-1 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400';
const selectClassName = 'w-full cursor-pointer appearance-none rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 transition-colors focus:border-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800';
const toggleTrackClassName = 'h-6 w-12 rounded-full bg-gray-200 transition-colors peer-checked:bg-orange-600';
const toggleThumbClassName = "after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white";

interface OrderFormProps {
    orderMetadata: OrderMetadata;
    setOrderMetadata: (metadata: OrderMetadata) => void;
    paymentOptions: { id: string, label: string }[];
    serviceOptions: { id: string, label: string }[];
    fromNumber: string;
    isLocating: boolean;
    onGetLocation: () => void;
    hasProfileLocation?: boolean;
    profileLocationLabel?: string;
    isUsingDifferentDeliveryLocation?: boolean;
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
    locationDifferenceWarningVisible?: boolean;
    locationDifferenceAcknowledged?: boolean;
    onToggleLocationDifferenceAcknowledged?: (value: boolean) => void;
    tableQuantity?: number;
}

function toLocalDateTimeValue(date: Date): string {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
}

function extractCoordsFromLocationValue(value: string): { lat: number; lng: number } | null {
    const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
        return null;
    }

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

const OrderForm: React.FC<OrderFormProps> = ({
    orderMetadata,
    setOrderMetadata,
    paymentOptions,
    serviceOptions,
    fromNumber,
    isLocating: _isLocating,
    onGetLocation: _onGetLocation,
    hasProfileLocation = false,
    profileLocationLabel,
    isUsingDifferentDeliveryLocation = false,
    onUseSavedProfileLocation,
    onUseDifferentLocation,
    onOpenLocationPicker,
    onInlineLocationChange,
    locationPickerLoading = false,
    locationServicePrompt = null,
    isAutoSavingProfileLocation = false,
    locationDifferenceWarningVisible = false,
    locationDifferenceAcknowledged = false,
    onToggleLocationDifferenceAcknowledged,
    tableQuantity = 0
}) => {
    const t = useTranslations('checkout.orderForm');
    const [minimumScheduledDateTime] = React.useState(() => toLocalDateTimeValue(new Date()));

    const profilePreviewPosition = React.useMemo(() => {
        if (Number.isFinite(orderMetadata.customerLatitude) && Number.isFinite(orderMetadata.customerLongitude)) {
            return {
                lat: Number(orderMetadata.customerLatitude),
                lng: Number(orderMetadata.customerLongitude),
            };
        }

        const parsed = extractCoordsFromLocationValue(profileLocationLabel || orderMetadata.gpsLocation || orderMetadata.address || '');
        if (parsed) {
            return parsed;
        }

        return null;
    }, [orderMetadata.address, orderMetadata.customerLatitude, orderMetadata.customerLongitude, orderMetadata.gpsLocation, profileLocationLabel]);

    const currentOrderLocationText = orderMetadata.address || t('locationNotSelected');
    const currentOrderDeliveryNotes = String(orderMetadata.deliveryNotes || '').trim();
    const showInlineEditableMap = orderMetadata.orderType === 'delivery' && (!hasProfileLocation || isUsingDifferentDeliveryLocation);
    const shouldEmitMapSelection = !hasProfileLocation || isUsingDifferentDeliveryLocation;

    return (
        <Surface className="space-y-6" padding="lg" variant="base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className={fieldLabelClassName}>{t('fullName')}</label>
                        <Surface className="w-full text-sm font-black text-gray-900 dark:text-slate-100" variant="muted">
                            {orderMetadata.customerName || t('fullNamePlaceholder')}
                        </Surface>
                    </div>
                    <div className="space-y-1 opacity-60">
                        <label className={fieldLabelClassName}>{t('phone')}</label>
                        <Surface className="text-sm font-black text-slate-500 dark:text-slate-400" variant="muted">
                            {formatPhoneForDisplay(fromNumber) || t('phoneUnavailable')}
                        </Surface>
                    </div>
                </div>

                {/* Order Options */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className={fieldLabelClassName}>{t('paymentMethod')}</label>
                        <select
                            className={selectClassName}
                            value={orderMetadata.paymentMethod}
                            onChange={e => setOrderMetadata({ ...orderMetadata, paymentMethod: e.target.value as any })}
                            disabled={paymentOptions.length === 0}
                        >
                            <option value="" disabled>
                                {paymentOptions.length > 0 ? t('selectPayment') : t('noPaymentOptions')}
                            </option>
                            {paymentOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className={fieldLabelClassName}>{t('serviceType')}</label>
                        <select
                            className={selectClassName}
                            value={orderMetadata.orderType}
                            onChange={e => setOrderMetadata({
                                ...orderMetadata,
                                orderType: e.target.value as any,
                                tableNumber: undefined,
                                ...(e.target.value !== 'delivery'
                                    ? {
                                        gpsLocation: '',
                                        customerLatitude: undefined,
                                        customerLongitude: undefined,
                                    }
                                    : {}),
                            })}
                            disabled={serviceOptions.length === 0}
                        >
                            <option value="" disabled>
                                {serviceOptions.length > 0 ? t('selectServiceType') : t('noServiceTypes')}
                            </option>
                            {serviceOptions.filter(opt => {
                                // Only show dine-in option if tables are available
                                if (opt.id === 'comer_aca' || opt.id === 'comer_aqui' || opt.id === 'dine_in') {
                                    return tableQuantity > 0;
                                }
                                return true;
                            }).map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Selection (only for dine-in) */}
            {(orderMetadata.orderType === 'comer_aca' || orderMetadata.orderType === 'comer_aqui' || orderMetadata.orderType === 'dine_in') && tableQuantity > 0 && (
                <div className="space-y-1 animate-fadeIn">
                    <label className={fieldLabelClassName}>{t('tableNumber')}</label>
                    <select
                        className={selectClassName}
                        value={orderMetadata.tableNumber || ''}
                        onChange={e => setOrderMetadata({ ...orderMetadata, tableNumber: e.target.value })}
                    >
                        <option value="" disabled>{t('selectTable')}</option>
                        {Array.from({ length: tableQuantity }, (_, i) => i + 1).map(num => (
                            <option key={num} value={String(num)}>{t('table')} #{num}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Delivery Address (only if applicable) */}
            {orderMetadata.orderType === 'delivery' && (
                <div className="space-y-1 animate-fadeIn">
                    <label className={fieldLabelClassName}>{t('deliveryAddress')}</label>

                    {locationServicePrompt && (
                        <Surface className="inline-block text-[10px] font-bold" variant="raised">
                            {locationServicePrompt}
                        </Surface>
                    )}

                    {isAutoSavingProfileLocation && (
                        <Surface className="inline-block text-[10px] font-bold" variant="raised">
                            {t('savingProfileLocation')}
                        </Surface>
                    )}

                    <div className="space-y-3">
                        <GoogleMapsAddressPicker
                            initialUrl={orderMetadata.gpsLocation || orderMetadata.address || ''}
                            initialPosition={profilePreviewPosition}
                            onChange={(urlAddress, position, normalizedAddress) => {
                                onInlineLocationChange?.({
                                    urlAddress,
                                    lat: position?.lat,
                                    lng: position?.lng,
                                    formattedAddress: normalizedAddress?.formatted_address,
                                    normalizedAddress,
                                });
                            }}
                            preferCurrentLocationOnLoad={!hasProfileLocation && !profilePreviewPosition}
                            readOnly
                            showUrlInput={false}
                            emitInitialChange={shouldEmitMapSelection}
                        />

                        {currentOrderDeliveryNotes ? (
                            <Surface className="flex items-start gap-3" variant="raised">
                                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-200">{t('deliveryNotesSummary')}</p>
                                    <p className="mt-1 break-words text-xs font-bold text-slate-800 dark:text-slate-100">{currentOrderDeliveryNotes}</p>
                                </div>
                            </Surface>
                        ) : null}

                        <Surface className="flex items-start gap-3" variant="raised">
                            <MapPinHouse className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-200">{t('deliveryAddressSummary')}</p>
                                <p className="mt-1 break-words text-xs font-bold text-slate-800 dark:text-slate-100">{currentOrderLocationText}</p>
                            </div>
                        </Surface>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        {onOpenLocationPicker ? (
                            <Button
                                onClick={onOpenLocationPicker}
                                disabled={locationPickerLoading}
                                type="button"
                                variant="outline"
                            >
                                {locationPickerLoading ? t('openMapLocationPickerLoading') : t('openMapLocationPicker')}
                            </Button>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Phase 4: Convenience & Utility Options */}
            <div className="space-y-5 border-t-2 border-slate-100 pt-4 dark:border-slate-800">
                {/* Eco-Friendly Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={!!orderMetadata.optOutCutlery}
                            onChange={(e) => setOrderMetadata({ ...orderMetadata, optOutCutlery: e.target.checked })}
                        />
                        <div className={`${toggleTrackClassName} ${toggleThumbClassName}`}></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 text-sm font-bold transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-300">
                            🌱 {t('ecoTitle')}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t('ecoSubtitle')}</span>
                    </div>
                </label>

                {/* Schedule Order */}
                <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={!!orderMetadata.scheduledFor}
                                onChange={(e) => setOrderMetadata({
                                    ...orderMetadata,
                                    scheduledFor: e.target.checked ? toLocalDateTimeValue(new Date(Date.now() + 3600000)) : null
                                })}
                            />
                            <div className={`${toggleTrackClassName} ${toggleThumbClassName}`}></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-sm font-bold transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-300">
                                🕒 {t('scheduleTitle')}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t('scheduleSubtitle')}</span>
                        </div>
                    </label>

                    {orderMetadata.scheduledFor && (
                        <div className="pl-15 pt-2 animate-fadeIn">
                            <input
                                type="datetime-local"
                                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition-all focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={orderMetadata.scheduledFor}
                                min={minimumScheduledDateTime}
                                onChange={(e) => setOrderMetadata({ ...orderMetadata, scheduledFor: e.target.value })}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Surface>
    );
};

export default OrderForm;
