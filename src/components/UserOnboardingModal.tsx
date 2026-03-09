"use client";

import React, { useState } from 'react';
import { X, MapPin, User, Phone, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';

interface UserOnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export default function UserOnboardingModal({ isOpen, onComplete }: UserOnboardingModalProps) {
    const t = useTranslations('userOnboardingModal');
    const { customerName, fromNumber, setCustomerName, setFromNumber, setUserLocation, setOnboarded } = useCartStore();

    const [name, setName] = useState(customerName || '');
    const [phone, setPhone] = useState(fromNumber || '');
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

    const validatePhone = (value: string) => {
        // Costa Rica phone format: 8 digits starting with 6, 7, or 8
        const crRegex = /^[678]\d{7}$/;
        // Allow international format with country code
        const intlRegex = /^\+?\d{10,15}$/;
        return crRegex.test(value.replace(/\D/g, '')) || intlRegex.test(value.replace(/\D/g, ''));
    };

    const handleRequestLocation = async () => {
        setLocationLoading(true);
        setLocationError(null);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            setLocationGranted(true);
        } catch (err) {
            if (err instanceof GeolocationPositionError) {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setLocationError(t('locationErrors.permissionDenied'));
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setLocationError(t('locationErrors.positionUnavailable'));
                        break;
                    case err.TIMEOUT:
                        setLocationError(t('locationErrors.timeout'));
                        break;
                }
            } else {
                setLocationError(t('locationErrors.generic'));
            }
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: { name?: string; phone?: string } = {};

        if (!name.trim()) {
            newErrors.name = t('errors.nameRequired');
        }

        if (!phone.trim()) {
            newErrors.phone = t('errors.phoneRequired');
        } else if (!validatePhone(phone)) {
            newErrors.phone = t('errors.phoneInvalid');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Save to store
        setCustomerName(name.trim());
        setFromNumber(phone.trim());
        setOnboarded(true);
        onComplete();
    };

    const handleSkip = () => {
        setOnboarded(true);
        onComplete();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="relative p-6 pb-4 border-b">
                    <button
                        type="button"
                        onClick={handleSkip}
                        aria-label={t('skip')}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
                    <p className="text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('nameLabel')}
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                                }}
                                placeholder={t('namePlaceholder')}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('phoneLabel')}
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                                }}
                                placeholder={t('phonePlaceholder')}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all ${errors.phone ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('locationLabel')}
                        </label>
                        <button
                            type="button"
                            onClick={handleRequestLocation}
                            disabled={locationLoading || locationGranted}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${locationGranted
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                }`}
                        >
                            {locationLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>{t('locationLoading')}</span>
                                </>
                            ) : locationGranted ? (
                                <>
                                    <MapPin size={20} />
                                    <span>{t('locationGranted')}</span>
                                </>
                            ) : (
                                <>
                                    <MapPin size={20} />
                                    <span>{t('allowLocation')}</span>
                                </>
                            )}
                        </button>
                        {locationError && (
                            <p className="text-amber-600 text-xs mt-1">{locationError}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                            {t('locationHelper')}
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                    >
                        {t('continue')}
                    </button>

                    {/* Skip */}
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
                    >
                        {t('skip')}
                    </button>
                </form>
            </div>
        </div>
    );
}
