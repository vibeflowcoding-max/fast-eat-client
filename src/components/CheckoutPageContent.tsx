"use client";

import React from 'react';
import { ArrowLeft, ShoppingBag, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { BuildingType } from '@/components/AddressDetailsModal';
import { Badge, Button, EmptyState, SectionHeader, Surface } from '@/../resources/components';
import AddressDetailsModal from '@/components/AddressDetailsModal';
import CartItemRow from '@/components/CartItemRow';
import OrderForm from '@/components/OrderForm';
import BillSplitterModal from '@/features/payments/components/BillSplitterModal';
import SinpeRequestUI from '@/features/payments/components/SinpeRequestUI';
import { calculateCheckoutPricing } from '@/lib/checkout-pricing';
import { DEFAULT_ORDER_MAP_CENTER, resolveOrderLocationOpenContext } from '@/lib/order-location';
import {
  areLocationsEquivalent,
  buildGoogleMapsQueryUrl,
  extractGoogleMapsUrl,
  parseCoordsFromGoogleMapsUrl,
} from '@/lib/location';
import { DEFAULT_ORDER_METADATA } from '@/lib/order-metadata';
import { formatPhoneForDisplay, normalizePhoneWithSinglePlus } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { useCartActions } from '@/hooks/useCartActions';
import { fetchCheckoutContext } from '@/services/api';
import { useCartStore } from '@/store';

function mapPaymentOptions(methods: string[]) {
  return methods.map((method) => {
    if (method === 'cash') return { id: 'cash', label: '💴 Efectivo' };
    if (method === 'card') return { id: 'card', label: '💳 Tarjeta (Datáfono)' };
    if (method === 'sinpe') return { id: 'sinpe', label: '📱 SINPE Móvil' };
    return { id: method, label: method.charAt(0).toUpperCase() + method.slice(1) };
  });
}

function mapServiceOptions(modes: string[]) {
  return modes.map((mode) => {
    if (mode === 'pickup') return { id: 'pickup', label: '🥡 Para recoger' };
    if (mode === 'delivery') return { id: 'delivery', label: '🛵 Envío a casa' };
    if (mode === 'dine_in') return { id: 'dine_in', label: '🍱 Comer en el restaurante' };
    return { id: mode, label: mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ') };
  });
}

export default function CheckoutPageContent() {
  const tPage = useTranslations('checkout.page');
  const tCart = useTranslations('checkout.cart');
  const router = useRouter();
  const {
    items: cart,
    branchId,
    checkoutDraft: orderMetadata,
    customerAddress,
    customerName,
    fromNumber,
    groupParticipants,
    groupSessionId,
    participantId,
    restaurantInfo,
    setCheckoutDraft,
    setCustomerAddress,
    setRestaurantInfo,
  } = useCartStore();

  const {
    chefNotification,
    handlePlaceOrder,
    isOrdering,
    isSyncing,
    setChefNotification,
    syncCartAction,
  } = useCartActions();

  const [paymentOptions, setPaymentOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [serviceOptions, setServiceOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [tableQuantity, setTableQuantity] = React.useState(0);
  const [feeRates, setFeeRates] = React.useState({ serviceFeeRate: 0, platformFeeRate: 0 });
  const [isPricingUnavailable, setIsPricingUnavailable] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isResolvingOrderLocation, setIsResolvingOrderLocation] = React.useState(false);
  const [locationServicePrompt, setLocationServicePrompt] = React.useState<string | null>(null);
  const [isAutoSavingProfileLocation, setIsAutoSavingProfileLocation] = React.useState(false);
  const [isOrderLocationModalOpen, setIsOrderLocationModalOpen] = React.useState(false);
  const [orderAddressInitialPosition, setOrderAddressInitialPosition] = React.useState<{ lat: number; lng: number } | null>(null);
  const [showBillSplitter, setShowBillSplitter] = React.useState(false);
  const [sinpeResults, setSinpeResults] = React.useState<import('@/features/payments/utils/splitStrategies').SplitResult[] | null>(null);

  const profileLocation = React.useMemo(() => {
    const canonicalUrl = extractGoogleMapsUrl(customerAddress?.urlAddress)
      || extractGoogleMapsUrl(customerAddress?.formattedAddress)
      || null;

    if (!canonicalUrl) {
      return null;
    }

    const coords = parseCoordsFromGoogleMapsUrl(canonicalUrl);

    return {
      raw: canonicalUrl,
      googleMapsUrl: canonicalUrl,
      lat: typeof customerAddress?.lat === 'number' ? customerAddress.lat : coords.lat,
      lng: typeof customerAddress?.lng === 'number' ? customerAddress.lng : coords.lng,
      label: canonicalUrl,
    };
  }, [customerAddress]);

  React.useEffect(() => {
    if (!orderMetadata.customerPhone && typeof window !== 'undefined') {
      const savedMetadata = window.localStorage.getItem('izakaya_metadata');
      if (savedMetadata) {
        setCheckoutDraft(JSON.parse(savedMetadata));
      }
    }
  }, [orderMetadata.customerPhone, setCheckoutDraft]);

  React.useEffect(() => {
    const normalizedPhone = normalizePhoneWithSinglePlus(fromNumber);
    setCheckoutDraft((previous) => {
      const nextName = customerName || previous.customerName;
      const nextPhone = normalizedPhone || previous.customerPhone;

      if (previous.customerName === nextName && previous.customerPhone === nextPhone) {
        return previous;
      }

      return {
        ...previous,
        customerName: nextName,
        customerPhone: nextPhone,
      };
    });
  }, [customerName, fromNumber, setCheckoutDraft]);

  React.useEffect(() => {
    let active = true;
    const normalizedBranchId = String(branchId || '').trim();

    if (!normalizedBranchId) {
      return () => {
        active = false;
      };
    }

    const loadCheckoutData = async () => {
      const context = await fetchCheckoutContext(normalizedBranchId);

      if (!active) {
        return;
      }

      if (context?.restaurant) {
        setRestaurantInfo(context.restaurant);
        setPaymentOptions(mapPaymentOptions(context.restaurant.payment_methods || []));
        setServiceOptions(mapServiceOptions(context.restaurant.service_modes || []));
      }

      const nextFeeRates = context?.feeRates || { serviceFeeRate: 0, platformFeeRate: 0 };

      setTableQuantity(context?.isTableAvailable ? context.tableQuantity || 0 : 0);
      setFeeRates(nextFeeRates);
      setIsPricingUnavailable(nextFeeRates.serviceFeeRate === 0 && nextFeeRates.platformFeeRate === 0);
    };

    void loadCheckoutData();

    return () => {
      active = false;
    };
  }, [branchId, restaurantInfo, setRestaurantInfo]);

  React.useEffect(() => {
    if (!profileLocation) {
      return;
    }

    setCheckoutDraft((previous) => {
      if (previous.locationOverriddenFromProfile) {
        return previous;
      }

      const nextAddress = profileLocation.googleMapsUrl || profileLocation.label;
      const nextGps = profileLocation.googleMapsUrl || profileLocation.raw;
      const changed =
        previous.address !== nextAddress ||
        previous.gpsLocation !== nextGps ||
        (!Number.isFinite(previous.customerLatitude) && typeof profileLocation.lat === 'number') ||
        (!Number.isFinite(previous.customerLongitude) && typeof profileLocation.lng === 'number');

      if (!changed) {
        return previous;
      }

      return {
        ...previous,
        address: nextAddress,
        gpsLocation: nextGps,
        customerLatitude: typeof profileLocation.lat === 'number' ? profileLocation.lat : previous.customerLatitude,
        customerLongitude: typeof profileLocation.lng === 'number' ? profileLocation.lng : previous.customerLongitude,
        source: 'client',
        locationDifferenceAcknowledged: false,
      };
    });
  }, [profileLocation, setCheckoutDraft]);

  const effectiveCart = React.useMemo(() => {
    if (groupSessionId && groupParticipants.length > 0) {
      return groupParticipants.flatMap((participant) => participant.items);
    }

    return cart;
  }, [cart, groupParticipants, groupSessionId]);

  const subtotal = React.useMemo(
    () => effectiveCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [effectiveCart],
  );
  const pricing = React.useMemo(() => calculateCheckoutPricing(subtotal, feeRates), [feeRates, subtotal]);
  const taxesAndFees = pricing.serviceFeeAmount + pricing.platformFeeAmount;
  const total = pricing.totalBeforeDelivery;
  const continueHref = branchId ? `/?branch_id=${encodeURIComponent(branchId)}` : '/';
  const isGroupCheckout = Boolean(groupSessionId && groupParticipants.length > 0);
  const isOrderFormValid = React.useMemo(() => {
    const normalizedPhone = (orderMetadata.customerPhone || fromNumber || '').trim();
    const hasOrderType = Boolean(orderMetadata.orderType?.trim());
    const hasPaymentMethod = Boolean(orderMetadata.paymentMethod?.trim());
    const hasCoordinates = Number.isFinite(orderMetadata.customerLatitude) && Number.isFinite(orderMetadata.customerLongitude);
    const hasDeliveryReference = Boolean(orderMetadata.address?.trim()) || Boolean(orderMetadata.gpsLocation?.trim()) || hasCoordinates;
    const isDeliveryDetailsValid = orderMetadata.orderType !== 'delivery' || hasDeliveryReference;
    const isLocationDifferenceAccepted =
      orderMetadata.orderType !== 'delivery' ||
      !orderMetadata.locationOverriddenFromProfile ||
      Boolean(orderMetadata.locationDifferenceAcknowledged);
    const isTableValid = !(orderMetadata.orderType === 'comer_aca' || orderMetadata.orderType === 'comer_aqui' || orderMetadata.orderType === 'dine_in') || orderMetadata.tableNumber;

    return Boolean(
      orderMetadata.customerName.trim() &&
      normalizedPhone &&
      hasOrderType &&
      hasPaymentMethod &&
      isDeliveryDetailsValid &&
      isLocationDifferenceAccepted &&
      isTableValid,
    );
  }, [fromNumber, orderMetadata]);

  const formatCurrency = React.useCallback((value: number) => `₡${Math.round(value).toLocaleString('es-CR')}`, []);
  const formatRate = React.useCallback((rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1)}%`, []);

  const persistProfileLocation = React.useCallback(async (input: {
    position: { lat: number; lng: number };
    mapsUrl?: string;
    formattedAddress?: string;
  }) => {
    try {
      setIsAutoSavingProfileLocation(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        return;
      }

      const urlGoogleMaps = extractGoogleMapsUrl(input.mapsUrl) || buildGoogleMapsQueryUrl(input.position);
      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ urlGoogleMaps }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const persistedUrl = extractGoogleMapsUrl(data?.profile?.urlGoogleMaps) || urlGoogleMaps;
      const persistedCoords = parseCoordsFromGoogleMapsUrl(persistedUrl);

      setCustomerAddress({
        urlAddress: persistedUrl,
        buildingType: 'Other',
        deliveryNotes: 'Meet at door',
        lat: persistedCoords.lat ?? input.position.lat,
        lng: persistedCoords.lng ?? input.position.lng,
        formattedAddress: input.formattedAddress || persistedUrl,
      });
    } finally {
      setIsAutoSavingProfileLocation(false);
    }
  }, [setCustomerAddress]);

  const applyProfileLocationToOrder = React.useCallback(() => {
    if (!profileLocation) {
      return;
    }

    setCheckoutDraft((previous) => ({
      ...previous,
      address: profileLocation.googleMapsUrl || profileLocation.label,
      gpsLocation: profileLocation.googleMapsUrl || profileLocation.raw,
      customerLatitude: typeof profileLocation.lat === 'number' ? profileLocation.lat : previous.customerLatitude,
      customerLongitude: typeof profileLocation.lng === 'number' ? profileLocation.lng : previous.customerLongitude,
      source: 'client',
      locationOverriddenFromProfile: false,
      locationDifferenceAcknowledged: false,
    }));
  }, [profileLocation, setCheckoutDraft]);

  const handleUseDifferentOrderLocation = React.useCallback(() => {
    setLocationServicePrompt(null);

    const openContext = resolveOrderLocationOpenContext({
      hasProfileLocation: Boolean(profileLocation?.googleMapsUrl),
      profilePosition:
        (typeof profileLocation?.lat === 'number' && typeof profileLocation?.lng === 'number')
          ? { lat: profileLocation.lat, lng: profileLocation.lng }
          : null,
      orderPosition:
        (Number.isFinite(orderMetadata.customerLatitude) && Number.isFinite(orderMetadata.customerLongitude))
          ? { lat: Number(orderMetadata.customerLatitude), lng: Number(orderMetadata.customerLongitude) }
          : null,
    });

    setCheckoutDraft((previous) => ({
      ...previous,
      locationOverriddenFromProfile: true,
      locationDifferenceAcknowledged: false,
    }));

    const openModalWithPosition = (nextPosition: { lat: number; lng: number } | null) => {
      setOrderAddressInitialPosition(nextPosition);
      setIsOrderLocationModalOpen(true);
    };

    if (!openContext.shouldRequestCurrentLocation) {
      openModalWithPosition(openContext.initialPosition);
      return;
    }

    if (!navigator.geolocation) {
      setLocationServicePrompt('Location services are disabled. Opening map with default location.');
      openModalWithPosition(openContext.initialPosition || DEFAULT_ORDER_MAP_CENTER);
      return;
    }

    setLocationServicePrompt('Please allow location access to center the map on your current location.');
    setIsResolvingOrderLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationServicePrompt(null);
        setOrderAddressInitialPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsResolvingOrderLocation(false);
        setIsOrderLocationModalOpen(true);
      },
      () => {
        setLocationServicePrompt('Location permission denied or unavailable. Opening map with default location.');
        setOrderAddressInitialPosition(openContext.initialPosition || DEFAULT_ORDER_MAP_CENTER);
        setIsResolvingOrderLocation(false);
        setIsOrderLocationModalOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [orderMetadata.customerLatitude, orderMetadata.customerLongitude, profileLocation, setCheckoutDraft]);

  const handleSaveOrderLocation = React.useCallback(async (value: {
    urlAddress: string;
    buildingType: BuildingType;
    unitDetails?: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    placeId?: string;
  }) => {
    const nextGps = String(value.urlAddress || '').trim();
    const nextAddress = String(value.formattedAddress || value.urlAddress || '').trim();
    const parsedCoordsFromUrl = parseCoordsFromGoogleMapsUrl(nextGps || nextAddress);
    const selectedPosition =
      typeof value.lat === 'number' && typeof value.lng === 'number'
        ? { lat: value.lat, lng: value.lng }
        : (
          Number.isFinite(parsedCoordsFromUrl.lat) && Number.isFinite(parsedCoordsFromUrl.lng)
            ? { lat: Number(parsedCoordsFromUrl.lat), lng: Number(parsedCoordsFromUrl.lng) }
            : null
        );

    const equivalentToProfile = profileLocation
      ? areLocationsEquivalent({
        aUrl: nextGps || nextAddress,
        aLat: selectedPosition?.lat,
        aLng: selectedPosition?.lng,
        bUrl: profileLocation.googleMapsUrl || profileLocation.raw,
        bLat: profileLocation.lat,
        bLng: profileLocation.lng,
      })
      : false;

    setCheckoutDraft((previous) => ({
      ...previous,
      address: nextAddress,
      gpsLocation: nextGps,
      customerLatitude: selectedPosition?.lat ?? previous.customerLatitude,
      customerLongitude: selectedPosition?.lng ?? previous.customerLongitude,
      source: 'client',
      locationOverriddenFromProfile: !equivalentToProfile,
      locationDifferenceAcknowledged: !equivalentToProfile ? false : previous.locationDifferenceAcknowledged,
    }));

    if (equivalentToProfile || !selectedPosition || typeof window === 'undefined') {
      return;
    }

    const shouldPersistAsProfile = window.confirm('Do you want to save this location as your new profile location?');
    if (!shouldPersistAsProfile) {
      return;
    }

    try {
      await persistProfileLocation({
        position: selectedPosition,
        mapsUrl: nextGps || nextAddress,
        formattedAddress: nextAddress,
      });
      setChefNotification({ content: '✅ Location saved to your profile.' });
    } catch {
      setChefNotification({ content: '⚠️ Could not save location to profile. We kept it for this order.' });
    }
  }, [persistProfileLocation, profileLocation, setCheckoutDraft, setChefNotification]);

  const handleGetLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setChefNotification({ content: 'Tu navegador no soporta geolocalización. 🏮' });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCheckoutDraft((previous) => ({
          ...previous,
          gpsLocation: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`,
          address: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`,
          customerLatitude: position.coords.latitude,
          customerLongitude: position.coords.longitude,
          source: 'client',
          locationOverriddenFromProfile: profileLocation ? true : previous.locationOverriddenFromProfile,
          locationDifferenceAcknowledged: false,
        }));
        setIsLocating(false);
      },
      () => {
        setChefNotification({ content: 'No pudimos obtener tu ubicación. 🏮' });
        setIsLocating(false);
      },
    );
  }, [profileLocation, setCheckoutDraft, setChefNotification]);

  const handlePlaceOrderFromPage = React.useCallback(async () => {
    if (effectiveCart.length === 0 || !isOrderFormValid) {
      return;
    }

    const success = await handlePlaceOrder(effectiveCart, orderMetadata, total);
    if (!success) {
      return;
    }

    setCheckoutDraft((previous) => ({
      ...DEFAULT_ORDER_METADATA,
      customerName: previous.customerName,
      customerPhone: previous.customerPhone,
    }));
    router.push('/orders');
  }, [effectiveCart, handlePlaceOrder, isOrderFormValid, orderMetadata, router, setCheckoutDraft, total]);

  if (!branchId) {
    return (
      <main className="min-h-screen bg-[#f8f6f2] pb-14 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-8 pt-6">
          <EmptyState
            action={(
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push('/carts')} type="button" variant="secondary">
                  {tCart('openCartsPage')}
                </Button>
                <Button onClick={() => router.push('/')} type="button" variant="outline">
                  {tPage('returnToMenu')}
                </Button>
              </div>
            )}
            description={tPage('emptySubtitle')}
            icon={<ShoppingBag className="h-6 w-6" />}
            title={tPage('emptyTitle')}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-14 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-8 pt-6">
        <Surface className="space-y-4" padding="lg" variant="raised">
          <div className="space-y-2">
            <Button
              leadingIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.push(continueHref)}
              size="sm"
              type="button"
              variant="outline"
            >
              {tPage('backToMenu')}
            </Button>
          </div>
          <SectionHeader
            eyebrow={tPage('eyebrow')}
            title={tPage('title')}
            description={tPage('subtitle')}
            action={(
              <div className="flex flex-wrap justify-end gap-2">
                <Badge className="px-4 py-2 text-xs font-black" variant="brand">
                  {isGroupCheckout ? tPage('groupMode') : tPage('soloMode')}
                </Badge>
                <Badge className="px-4 py-2 text-xs font-black" variant="neutral">
                  {formatPhoneForDisplay(fromNumber) || tPage('phoneFallback')}
                </Badge>
              </div>
            )}
          />
        </Surface>

        {chefNotification?.content ? (
          <Surface className="text-sm font-semibold" variant="raised">
            {chefNotification.content}
          </Surface>
        ) : null}

        {effectiveCart.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => router.push(continueHref)} type="button">
                {tPage('returnToMenu')}
              </Button>
            }
            description={tPage('emptySubtitle')}
            icon={<ShoppingBag className="h-6 w-6" />}
            title={tPage('emptyTitle')}
          />
        ) : (
          <>
            <Surface className="space-y-4" variant="base">
              <SectionHeader
                action={isGroupCheckout ? <Badge leading={<Users className="h-3.5 w-3.5" />} variant="neutral">{groupParticipants.length}</Badge> : null}
                eyebrow={tPage('cartEyebrow')}
                title={restaurantInfo?.name || tPage('restaurantFallback')}
              />

              {isGroupCheckout ? (
                <div className="space-y-4">
                  {groupParticipants.map((participant) => (
                    <div key={participant.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {participant.name}{participant.isHost ? ` (${tCart('host')})` : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {participant.items.reduce((sum, item) => sum + item.quantity, 0)} {tPage('itemsLabel')}
                        </p>
                      </div>
                      {participant.items.length === 0 ? (
                        <p className="text-xs italic text-slate-500 dark:text-slate-400">{tCart('participantNoItems')}</p>
                      ) : (
                        participant.items.map((item, index) => (
                          <CartItemRow
                            key={`${participant.id}-${item.id}-${index}`}
                            item={item}
                            isSyncing={isSyncing}
                            onSyncCartAction={(nextItem, action, quantity) => {
                              if (participant.id === participantId) {
                                void syncCartAction(nextItem, action as import('@/services/api').CartAction, quantity, orderMetadata);
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <CartItemRow
                      key={`${item.id}-${index}`}
                      item={item}
                      isSyncing={isSyncing}
                      onSyncCartAction={(nextItem, action, quantity) => {
                        void syncCartAction(nextItem, action as import('@/services/api').CartAction, quantity, orderMetadata);
                      }}
                    />
                  ))}
                </div>
              )}
            </Surface>

            <OrderForm
              orderMetadata={orderMetadata}
              setOrderMetadata={setCheckoutDraft}
              paymentOptions={paymentOptions}
              serviceOptions={serviceOptions}
              fromNumber={fromNumber}
              isLocating={isLocating}
              onGetLocation={handleGetLocation}
              hasProfileLocation={Boolean(profileLocation)}
              profileLocationLabel={profileLocation?.label}
              isUsingDifferentDeliveryLocation={Boolean(orderMetadata.locationOverriddenFromProfile)}
              onUseSavedProfileLocation={applyProfileLocationToOrder}
              onUseDifferentLocation={handleUseDifferentOrderLocation}
              onOpenLocationPicker={handleUseDifferentOrderLocation}
              locationPickerLoading={isResolvingOrderLocation}
              locationServicePrompt={locationServicePrompt}
              isAutoSavingProfileLocation={isAutoSavingProfileLocation}
              locationDifferenceWarningVisible={Boolean(orderMetadata.locationOverriddenFromProfile)}
              locationDifferenceAcknowledged={Boolean(orderMetadata.locationDifferenceAcknowledged)}
              onToggleLocationDifferenceAcknowledged={(value) => setCheckoutDraft((previous) => ({
                ...previous,
                locationDifferenceAcknowledged: value,
              }))}
              tableQuantity={tableQuantity}
            />

            <Surface className="space-y-4" variant="base">
              <SectionHeader eyebrow={tPage('summaryEyebrow')} title={tPage('summaryTitle')} />
              <Surface className="space-y-2" variant="muted">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-400">{tCart('subtotal')}</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-400">{tCart('serviceFee', { rate: formatRate(pricing.serviceFeeRate) })}</span>
                  <span>{formatCurrency(pricing.serviceFeeAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-400">{tCart('platformFee', { rate: formatRate(pricing.platformFeeRate) })}</span>
                  <span>{formatCurrency(pricing.platformFeeAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-black uppercase tracking-widest dark:border-slate-700">
                  <span>{tCart('total')}</span>
                  <span>{formatCurrency(pricing.totalBeforeDelivery)}</span>
                </div>
                <Surface className="text-[10px] font-bold" variant="raised">{tCart('deliveryDisclaimer')}</Surface>
                {isPricingUnavailable ? (
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tCart('feesUnavailable')}</p>
                ) : null}
              </Surface>

              <div className="flex flex-col gap-3 sm:flex-row">
                {groupSessionId && groupParticipants.length > 1 ? (
                  <Button onClick={() => setShowBillSplitter(true)} type="button" variant="outline">
                    {tCart('splitBill')}
                  </Button>
                ) : null}
                <Button
                  onClick={handlePlaceOrderFromPage}
                  disabled={!isOrderFormValid || isOrdering}
                  fullWidth
                  type="button"
                >
                  {isOrdering ? tCart('processing') : tPage('placeOrder')}
                </Button>
              </div>
            </Surface>
          </>
        )}
      </div>

      {showBillSplitter ? (
        <BillSplitterModal
          participants={groupParticipants}
          subtotal={subtotal}
          taxesAndFees={taxesAndFees}
          total={total}
          onClose={() => setShowBillSplitter(false)}
          onConfirmSplit={(results) => {
            const amounts = results.map((entry) => Number(entry.finalTotal.toFixed(2)));
            const allEqual = amounts.every((amount) => Math.abs(amount - amounts[0]) < 1);
            const allItemized = results.every((entry) => Math.abs(entry.itemsTotal + entry.proportionalTaxAndFees - entry.finalTotal) < 1);

            setCheckoutDraft((previous) => ({
              ...previous,
              splitDraft: {
                strategy: allEqual ? 'equal' : (allItemized ? 'itemized' : 'custom'),
                splitData: {
                  participants: results.map((entry) => ({
                    participantId: entry.participantId,
                    participantName: entry.participantName,
                    amount: entry.finalTotal,
                    itemsTotal: entry.itemsTotal,
                    fees: entry.proportionalTaxAndFees,
                  })),
                  total,
                },
                summary: results.map((entry) => ({
                  participantId: entry.participantId,
                  participantName: entry.participantName,
                  amount: entry.finalTotal,
                  itemsTotal: entry.itemsTotal,
                  proportionalTaxAndFees: entry.proportionalTaxAndFees,
                })),
                savedAt: new Date().toISOString(),
              },
            }));
            setSinpeResults(results);
            setShowBillSplitter(false);
          }}
        />
      ) : null}

      {sinpeResults ? (
        <SinpeRequestUI
          splitResults={sinpeResults}
          hostPhone={fromNumber || ''}
          hostName={customerName || tCart('host')}
          onBack={() => {
            setSinpeResults(null);
            setShowBillSplitter(true);
          }}
          onClose={() => setSinpeResults(null)}
        />
      ) : null}

      <AddressDetailsModal
        isOpen={isOrderLocationModalOpen}
        initialValue={{
          urlAddress: orderMetadata.gpsLocation || '',
          buildingType: 'Other',
          deliveryNotes: '',
          lat: Number.isFinite(orderMetadata.customerLatitude) ? orderMetadata.customerLatitude : undefined,
          lng: Number.isFinite(orderMetadata.customerLongitude) ? orderMetadata.customerLongitude : undefined,
          formattedAddress: orderMetadata.address || undefined,
        }}
        initialPosition={orderAddressInitialPosition}
        onClose={() => setIsOrderLocationModalOpen(false)}
        onSave={handleSaveOrderLocation}
        preferCurrentLocationOnOpen={false}
      />
    </main>
  );
}