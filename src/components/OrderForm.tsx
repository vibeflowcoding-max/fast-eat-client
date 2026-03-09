import React from 'react';
import { OrderMetadata } from '../types';
import { useTranslations } from 'next-intl';
import { formatPhoneForDisplay } from '@/lib/phone';
import { Button, ChoiceCard, Surface } from '@/../resources/components';

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

                    {hasProfileLocation && (
                        <Surface className="space-y-2" variant="muted">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('deliveryLocationSource')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <ChoiceCard
                                    checked={!isUsingDifferentDeliveryLocation}
                                    description={profileLocationLabel || undefined}
                                    onClick={onUseSavedProfileLocation}
                                    title={t('useProfileLocation')}
                                    type="radio"
                                />
                                <ChoiceCard
                                    checked={isUsingDifferentDeliveryLocation}
                                    onClick={onUseDifferentLocation}
                                    title={t('useDifferentLocation')}
                                    type="radio"
                                />
                            </div>
                        </Surface>
                    )}

                    {locationServicePrompt && (
                        <Surface className="inline-block text-[10px] font-bold" variant="raised">
                            {locationServicePrompt}
                        </Surface>
                    )}

                    {isAutoSavingProfileLocation && (
                        <Surface className="inline-block text-[10px] font-bold" variant="raised">
                            Saving current location to your profile...
                        </Surface>
                    )}

                    {!isUsingDifferentDeliveryLocation && hasProfileLocation ? (
                        <Surface className="flex items-start gap-2" variant="raised">
                            <span className="text-sm">📍</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-200">{t('profileLocationTag')}</p>
                                <p className="mt-1 break-words text-xs font-bold text-emerald-800 dark:text-emerald-100">{profileLocationLabel || orderMetadata.gpsLocation || orderMetadata.address}</p>
                            </div>
                        </Surface>
                    ) : (
                        <>
                            <Surface className="space-y-2" variant="muted">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('currentOrderLocation')}</p>
                                <p className="break-words text-xs font-bold text-slate-800 dark:text-slate-100">{orderMetadata.gpsLocation || orderMetadata.address || t('locationNotSelected')}</p>
                            </Surface>
                            <div className="flex flex-col gap-2 mt-2">
                                <Button
                                    onClick={onOpenLocationPicker}
                                    disabled={locationPickerLoading}
                                    type="button"
                                    variant="outline"
                                >
                                    <span aria-hidden="true">🗺️</span>
                                    {locationPickerLoading ? t('openMapLocationPickerLoading') : t('openMapLocationPicker')}
                                </Button>

                                {orderMetadata.gpsLocation && (
                                    <div className="flex flex-col gap-1 animate-fadeIn mt-1">
                                        <label className="ml-1 text-[7px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Ubicación GPS Adjunta</label>
                                        <label className="ml-1 text-[7px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">{t('gpsAttached')}</label>
                                        <Surface className="flex items-center gap-2" variant="raised">
                                            <span className="text-sm">📍</span>
                                            <input
                                                type="text"
                                                readOnly
                                                value={orderMetadata.gpsLocation}
                                                className="w-full bg-transparent text-xs font-bold focus:outline-none truncate"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <Button
                                                onClick={() => setOrderMetadata({
                                                    ...orderMetadata,
                                                    gpsLocation: undefined,
                                                    address: '',
                                                    customerLatitude: undefined,
                                                    customerLongitude: undefined,
                                                })}
                                                size="sm"
                                                type="button"
                                                variant="ghost"
                                            >✕</Button>
                                        </Surface>
                                    </div>
                                )}

                                {(!Number.isFinite(orderMetadata.customerLatitude) || !Number.isFinite(orderMetadata.customerLongitude)) && (
                                    <Surface className="inline-block text-[10px] font-bold" variant="raised">
                                        {t('gpsRequired')}
                                    </Surface>
                                )}

                                {locationDifferenceWarningVisible && (
                                    <label className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-100">
                                        <input
                                            type="checkbox"
                                            checked={locationDifferenceAcknowledged}
                                            onChange={(event) => onToggleLocationDifferenceAcknowledged?.(event.target.checked)}
                                            className="mt-0.5"
                                        />
                                        <span>{t('differentLocationWarning')}</span>
                                    </label>
                                )}
                            </div>
                        </>
                    )}
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
