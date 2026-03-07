"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MenuItem, OrderMetadata, SelectedModifier } from '@/types';
import MenuItemCard from '@/components/MenuItemCard';
import { useCartStore } from '@/store';
import { CartAction } from '@/services/api';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import {
    areLocationsEquivalent,
    buildGoogleMapsQueryUrl,
    extractGoogleMapsUrl,
    parseCoordsFromGoogleMapsUrl,
} from '@/lib/location';
import { getCategoryActivationThreshold, getCategoryScrollTop } from '@/lib/menu-scroll';
import { DEFAULT_ORDER_MAP_CENTER, resolveOrderLocationOpenContext } from '@/lib/order-location';
import { DEFAULT_ORDER_METADATA } from '@/lib/order-metadata';
import type { BuildingType } from '@/components/AddressDetailsModal';
import { supabase } from '@/lib/supabase';

// Components
import LoadingScreen from '@/components/LoadingScreen';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import MenuSkeleton from '@/components/MenuSkeleton';
import MenuError from '@/components/MenuError';

const ChatWidget = dynamic(() => import('@/components/ChatWidget'));
const OrderTrackingModal = dynamic(() => import('@/components/OrderTrackingModal'));
const ItemDetailModal = dynamic(() => import('@/components/ItemDetailModal'));
const CartModal = dynamic(() => import('@/components/CartModal'));
const ConfirmModal = dynamic(() => import('@/components/ConfirmModal'));
const BranchSelectionModal = dynamic(() => import('@/components/BranchSelectionModal'));
const AddressDetailsModal = dynamic(() => import('@/components/AddressDetailsModal'));

// Hooks
import { useAppData } from '@/hooks/useAppData';
import { useCartActions } from '@/hooks/useCartActions';

interface MainAppProps {
    initialBranchId?: string;
}

export default function MainApp({ initialBranchId }: MainAppProps) {
    const normalizePhone = useCallback((value: string): string => String(value || '').replace(/\D/g, ''), []);

    const isValidPhone = useCallback((value: string): boolean => {
        const digits = normalizePhone(value);
        if (!digits) return false;

        if (digits.startsWith('506')) {
            return digits.length === 11;
        }

        return digits.length >= 8 && digits.length <= 15;
    }, [normalizePhone]);

    // Store
    const {
        items: cart,
        branchId,
        fromNumber,
        customerId,
        customerAddress,
        isTestMode,
        restaurantInfo,
        setBranchId,
        setFromNumber,
        setCustomerAddress,
        toggleTestMode,
        customerName,
        checkoutDraft: orderMetadata,
        isAuthenticated
    } = useCartStore();
    const setCustomerId = useCartStore(state => state.setCustomerId);
    const setOrderMetadata = useCartStore(state => state.setCheckoutDraft);

    // Data Loading Hook
    const {
        menuItems,
        categories,
        loading,
        activeCategory,
        setActiveCategory,
        error: dataError,
        refreshData,
        tableQuantity
    } = useAppData();

    // Actions Hook
    const {
        isSyncing,
        isOrdering,
        chefNotification,
        setChefNotification,
        syncCartAction,
        addToCart,
        handleClearCart,
        handlePlaceOrder
    } = useCartActions();

    // Local UI State
    const [highlightedItemId] = useState<string | null>(null);
    const [paymentOptions, setPaymentOptions] = useState<{ id: string, label: string }[]>([]);
    const [serviceOptions, setServiceOptions] = useState<{ id: string, label: string }[]>([]);
    const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
    const [modalQuantity, setModalQuantity] = useState(1);
    const [modalNotes, setModalNotes] = useState('');
    const [modalSelectedVariantId, setModalSelectedVariantId] = useState<string | null>(null);
    const [modalSelectedModifiers, setModalSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isModalSyncing, setIsModalSyncing] = useState(false);
    const [, setShowScrollArrow] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [isResolvingOrderLocation, setIsResolvingOrderLocation] = useState(false);
    const [locationServicePrompt, setLocationServicePrompt] = useState<string | null>(null);
    const [isAutoSavingProfileLocation, setIsAutoSavingProfileLocation] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOrderLocationModalOpen, setIsOrderLocationModalOpen] = useState(false);
    const [orderAddressInitialPosition, setOrderAddressInitialPosition] = useState<{ lat: number; lng: number } | null>(null);

    // Resolution State - Blocks rendering until we know what branch we are on
    const [isResolving, setIsResolving] = useState(true);
    // Strict Target ID Check - Prevents stale data from showing
    const [targetBranchId, setTargetBranchId] = useState<string | null>(null);

    // Refs
    const tabsRef = useRef<HTMLDivElement>(null);
    const modalScrollRef = useRef<HTMLDivElement>(null);
    const categorySectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const pendingCategoryNavigationRef = useRef<string | null>(null);
    const pendingCategoryNavigationTimeoutRef = useRef<number | null>(null);

    const clearPendingCategoryNavigation = useCallback(() => {
        pendingCategoryNavigationRef.current = null;

        if (pendingCategoryNavigationTimeoutRef.current !== null) {
            window.clearTimeout(pendingCategoryNavigationTimeoutRef.current);
            pendingCategoryNavigationTimeoutRef.current = null;
        }
    }, []);

    const beginPendingCategoryNavigation = useCallback((category: string) => {
        clearPendingCategoryNavigation();
        pendingCategoryNavigationRef.current = category;
        pendingCategoryNavigationTimeoutRef.current = window.setTimeout(() => {
            pendingCategoryNavigationRef.current = null;
            pendingCategoryNavigationTimeoutRef.current = null;
        }, 1200);
    }, [clearPendingCategoryNavigation]);

    const handleAddToCart = useCallback(
        (newItem: Parameters<typeof addToCart>[0]) => addToCart(newItem, orderMetadata),
        [addToCart, orderMetadata]
    );

    const profileLocation = useMemo(() => {
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

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Hydration fix & Initial Load
    useEffect(() => {
        // Start resolving immediately
        setIsResolving(true);

        const savedMetadata = localStorage.getItem('izakaya_metadata');
        if (savedMetadata) setOrderMetadata(JSON.parse(savedMetadata) as OrderMetadata);

        const urlBranch = searchParams.get('branch_id');
        const urlPhone = searchParams.get('fromNumber');
        const urlPlace = searchParams.get('place') || searchParams.get('restaurante'); // New support for pretty names

        const initSession = async (bId: string) => {
            console.log("🛡️ Initializing secure session for branch:", bId);
            setTargetBranchId(bId); // Set target immediately so render knows what to expect

            // Check for Branch Switch
            const currentStoreBranch = useCartStore.getState().branchId;
            // Detección de cambio de sucursal:
            if (currentStoreBranch && currentStoreBranch !== bId && currentStoreBranch !== ':branchId') {
                console.log("🔄 Cambiando de sucursal - Limpiando carrito anterior...");
                // Keep user session (Name/Phone) but clear cart and active orders for the new branch context
                useCartStore.getState().clearCart();
                useCartStore.getState().clearActiveOrders();

                // Clear specific branch data but KEEP metadata and user info
                localStorage.removeItem('izakaya_chat_history');
                // localStorage.removeItem('izakaya_metadata'); // KEEP THIS
                // localStorage.removeItem('izakaya_active_orders'); // Maybe keep this if we want global history? For now clear to avoid confusion.
                // localStorage.removeItem('izakaya_user_name'); // KEEP THIS

                // Reset local states but keep customer info
                setOrderMetadata(prev => ({
                    ...prev,
                    paymentMethod: '',
                    orderType: '',
                    address: '',
                    gpsLocation: ''
                    // customerName and customerPhone are PRESERVED from prev
                }));
                // Clear restaurant info to prevent stale data "flash"
                // This triggers the LoadingScreen because if (!restaurantInfo && loading) it shows loader
                if (useCartStore.getState().setRestaurantInfo) {
                    // @ts-ignore - We are passing null to force reset, assuming store handles it or type allows
                    useCartStore.getState().setRestaurantInfo(null);
                }
            }

            try {
                // If initializing with a real ID, we set the cookie AND set the store to ':branchId'
                // This means ':branchId' implies "Valid Session Active"
                await fetch('/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ branchId: bId })
                });

                // CRITICAL FIX: We must set the REAL ID here.
                // The modal logic checks if (branchId === ':branchId') to SHOW the modal.
                // So setting it to the real ID ensures the modal closes.
                setBranchId(bId);

                // Clean URL if it has raw ID to hide it, but keep it if it is a phone param
                if (urlBranch) router.replace(pathname);
            } catch (e) {
                console.error("Failed to sync session", e);
            }
        };

        const resolveBranch = async () => {
            try {
                // 1. Direct ID in URL (Legacy/Direct Link) - HIGHEST PRIORITY
                if (urlBranch) {
                    await initSession(urlBranch);
                    return;
                }

                // 2. Initial Branch ID Prop (From Dynamic Route)
                if (initialBranchId) {
                    await initSession(initialBranchId);
                    return;
                }

                // 3. Pretty Name in URL
                if (urlPlace) {
                    try {
                        // Start Loading state if needed (optional)
                        const response = await fetch('/api/branches');
                        if (response.ok) {
                            const branches = await response.json();
                            const matched = branches.find((b: any) =>
                                b.name.toLowerCase() === urlPlace.toLowerCase() ||
                                b.name.toLowerCase().replace(/ /g, '-') === urlPlace.toLowerCase()
                            );
                            if (matched) {
                                await initSession(matched.id);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error("Failed to resolve branch name", e);
                    }
                }

                // 4. Existing Session in Store
                // If we have a real UUID string (legacy) in store, upgrade it to session
                const branchInStore = useCartStore.getState().branchId;
                if (branchInStore && branchInStore !== ':branchId' && branchInStore.length > 10) {
                    await initSession(branchInStore);
                }
            } catch (err) {
                console.error("Error resolving branch", err);
            } finally {
                // Resolution Logic Complete - Unblock Rendering
                // We add a small timeout to ensure state updates propagate
                setTimeout(() => setIsResolving(false), 50);
            }
        };

        resolveBranch();

        if (!isAuthenticated && urlPhone) {
            const normalizedUrlPhone = normalizePhone(urlPhone);
            if (isValidPhone(normalizedUrlPhone)) {
                setFromNumber(normalizePhoneWithSinglePlus(normalizedUrlPhone));
                setOrderMetadata(prev => ({ ...prev, customerPhone: normalizePhoneWithSinglePlus(normalizedUrlPhone) }));
            } else {
                setFromNumber('');
                setCustomerId('');
            }
        } else if (!isAuthenticated) {
            const storedPhone = normalizePhone(useCartStore.getState().fromNumber || '');
            if (!isValidPhone(storedPhone)) {
                setFromNumber('');
                setCustomerId('');
            }
        }
    }, [initialBranchId, isAuthenticated, isValidPhone, normalizePhone, pathname, router, searchParams, setBranchId, setCustomerId, setFromNumber, setOrderMetadata]);

    // Sync Global Customer Name to Local Metadata
    useEffect(() => {
        const normalizedFromNumber = normalizePhoneWithSinglePlus(fromNumber);
        setOrderMetadata((prev) => {
            const nextName = customerName || prev.customerName;
            const nextPhone = normalizedFromNumber || prev.customerPhone;
            if (prev.customerName === nextName && prev.customerPhone === nextPhone) {
                return prev;
            }
            return {
                ...prev,
                customerName: nextName,
                customerPhone: nextPhone,
            };
        });
    }, [customerName, fromNumber, setOrderMetadata]);

    // Persistence of Metadata
    useEffect(() => {
        if (orderMetadata.customerPhone) {
            localStorage.setItem('izakaya_metadata', JSON.stringify(orderMetadata));
        }
    }, [orderMetadata]);

    useEffect(() => {
        if (!profileLocation) {
            setOrderMetadata((previous) => {
                if (previous.locationOverriddenFromProfile) {
                    return previous;
                }

                const hasLocationData = Boolean(String(previous.address || '').trim() || String(previous.gpsLocation || '').trim());
                if (!hasLocationData) {
                    return previous;
                }

                return {
                    ...previous,
                    address: '',
                    gpsLocation: '',
                    customerLatitude: undefined,
                    customerLongitude: undefined,
                    locationDifferenceAcknowledged: false,
                };
            });
            return;
        }

        setOrderMetadata((previous) => {
            if (previous.locationOverriddenFromProfile) {
                return previous;
            }

            const nextAddress = profileLocation.googleMapsUrl || profileLocation.label;
            const nextGps = profileLocation.googleMapsUrl || profileLocation.raw;
            const changed =
                previous.address !== nextAddress
                || previous.gpsLocation !== nextGps
                || (!Number.isFinite(previous.customerLatitude) && typeof profileLocation.lat === 'number')
                || (!Number.isFinite(previous.customerLongitude) && typeof profileLocation.lng === 'number');

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
    }, [profileLocation, setOrderMetadata]);

    const persistProfileLocation = async (input: {
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
                body: JSON.stringify({
                    urlGoogleMaps,
                }),
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
    };

    const applyProfileLocationToOrder = () => {
        if (!profileLocation) {
            return;
        }

        setOrderMetadata((previous) => ({
            ...previous,
            address: profileLocation.googleMapsUrl || profileLocation.label,
            gpsLocation: profileLocation.googleMapsUrl || profileLocation.raw,
            customerLatitude: typeof profileLocation.lat === 'number' ? profileLocation.lat : previous.customerLatitude,
            customerLongitude: typeof profileLocation.lng === 'number' ? profileLocation.lng : previous.customerLongitude,
            source: 'client',
            locationOverriddenFromProfile: false,
            locationDifferenceAcknowledged: false,
        }));
    };

    const handleUseDifferentOrderLocation = () => {
        setLocationServicePrompt(null);

        const openContext = resolveOrderLocationOpenContext({
            hasProfileLocation: Boolean(profileLocation?.googleMapsUrl),
            profilePosition:
                (typeof profileLocation?.lat === 'number' && typeof profileLocation?.lng === 'number')
                    ? { lat: profileLocation.lat, lng: profileLocation.lng }
                    : null,
            orderPosition:
                (Number.isFinite(orderMetadata.customerLatitude) && Number.isFinite(orderMetadata.customerLongitude))
                    ? {
                        lat: Number(orderMetadata.customerLatitude),
                        lng: Number(orderMetadata.customerLongitude),
                    }
                    : null,
        });

        setOrderMetadata((previous) => ({
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
                const livePosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                setLocationServicePrompt(null);
                setOrderAddressInitialPosition(livePosition);
                setIsResolvingOrderLocation(false);
                setIsOrderLocationModalOpen(true);
            },
            () => {
                setLocationServicePrompt('Location permission denied or unavailable. Opening map with default location.');
                setOrderAddressInitialPosition(openContext.initialPosition || DEFAULT_ORDER_MAP_CENTER);
                setIsResolvingOrderLocation(false);
                setIsOrderLocationModalOpen(true);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const handleSaveOrderLocation = async (value: {
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

        setOrderMetadata((previous) => {
            return {
                ...previous,
                address: nextAddress,
                gpsLocation: nextGps,
                customerLatitude: selectedPosition?.lat ?? previous.customerLatitude,
                customerLongitude: selectedPosition?.lng ?? previous.customerLongitude,
                source: 'client',
                locationOverriddenFromProfile: !equivalentToProfile,
                locationDifferenceAcknowledged: !equivalentToProfile ? false : previous.locationDifferenceAcknowledged,
            };
        });

        if (equivalentToProfile || !selectedPosition) {
            return;
        }

        const shouldPersistAsProfile = typeof window !== 'undefined'
            ? window.confirm('Do you want to save this location as your new profile location?')
            : false;

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
    };

    // Update payment/service options when restaurantInfo changes
    useEffect(() => {
        if (restaurantInfo) {
            const paymentMethods = Array.isArray(restaurantInfo.payment_methods) ? restaurantInfo.payment_methods : [];
            const serviceModes = Array.isArray(restaurantInfo.service_modes) ? restaurantInfo.service_modes : [];

            const pOptions = paymentMethods.map(pm => {
                if (pm === 'cash') return { id: 'cash', label: '💴 Efectivo' };
                if (pm === 'card') return { id: 'card', label: '💳 Tarjeta (Datáfono)' };
                if (pm === 'sinpe') return { id: 'sinpe', label: '📱 SINPE Móvil' };
                return { id: pm, label: pm.charAt(0).toUpperCase() + pm.slice(1) };
            });
            setPaymentOptions(pOptions);

            const sOptions = serviceModes.map(sm => {
                if (sm === 'pickup') return { id: 'pickup', label: '🥡 Para recoger' };
                if (sm === 'delivery') return { id: 'delivery', label: '🛵 Envío a casa' };
                if (sm === 'dine_in') return { id: 'dine_in', label: '🍱 Comer en el restaurante' };
                return { id: sm, label: sm.charAt(0).toUpperCase() + sm.slice(1).replace('_', ' ') };
            });
            setServiceOptions(sOptions);
        }
    }, [restaurantInfo]);

    const checkScroll = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    const handleModalScroll = () => {
        if (modalScrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = modalScrollRef.current;
            const hasMore = scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 40;
            setShowScrollArrow(hasMore);
        }
    };

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const { clientWidth } = tabsRef.current;
            const scrollAmount = clientWidth * 0.6;
            tabsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleOpenItemModal = (itemId: string) => {
        const item = menuItems.find(i => String(i.id) === String(itemId));
        if (item) {
            const inCart = cart.find(c => c.id === item.id);
            setSelectedItemForModal(item);
            setModalQuantity(inCart ? inCart.quantity : 1);
            setModalNotes(inCart ? inCart.notes : '');
            setModalSelectedVariantId(inCart?.variantId || item.defaultVariantId || item.variants?.find((variant) => variant.isDefault)?.id || item.variants?.[0]?.id || null);
            setModalSelectedModifiers(inCart?.selectedModifiers || []);
            setModalError(null);
            if (item.category !== activeCategory) {
                setActiveCategory(item.category);
            }
        }
    };

    const handleModalConfirm = async () => {
        if (selectedItemForModal) {
            const selectedVariant = (selectedItemForModal.variants || []).find((variant) => variant.id === modalSelectedVariantId)
                || selectedItemForModal.variants?.find((variant) => variant.isDefault)
                || selectedItemForModal.variants?.[0]
                || null;

            for (const group of selectedItemForModal.modifierGroups || []) {
                const selectedCount = modalSelectedModifiers
                    .filter((modifier) => modifier.groupId === group.id)
                    .reduce((sum, modifier) => sum + modifier.quantity, 0);

                if (group.required && selectedCount < Math.max(1, group.minSelection)) {
                    setModalError(`Selecciona ${Math.max(1, group.minSelection)} opción(es) en ${group.name}.`);
                    return;
                }

                if (group.maxSelection != null && selectedCount > group.maxSelection) {
                    setModalError(`Puedes elegir hasta ${group.maxSelection} opción(es) en ${group.name}.`);
                    return;
                }
            }

            setModalError(null);
            setIsModalSyncing(true);
            const modifiersTotal = modalSelectedModifiers.reduce((sum, modifier) => sum + modifier.priceDelta * modifier.quantity, 0);
            const unitPrice = Number(((selectedVariant?.price ?? selectedItemForModal.price) + modifiersTotal).toFixed(2));
            const success = await addToCart({
                ...selectedItemForModal,
                price: unitPrice,
                quantity: modalQuantity,
                notes: modalNotes,
                variantId: selectedVariant?.id || null,
                variantName: selectedVariant?.name || null,
                selectedModifiers: modalSelectedModifiers,
                lineTotal: Number((unitPrice * modalQuantity).toFixed(2)),
            }, orderMetadata);
            setIsModalSyncing(false);
            if (success) setSelectedItemForModal(null);
        }
    };

    const onHandleClearCart = async () => {
        setShowClearCartConfirm(false);
        await handleClearCart(orderMetadata);
    };

    const filteredItems = useMemo(() => {
        let items = menuItems;
        if (activeCategory !== 'Todos') {
            items = items.filter(item => item.category.trim() === activeCategory.trim());
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            items = items.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query))
            );
        }
        return items;
    }, [activeCategory, menuItems, searchQuery]);

    const categorySections = useMemo(() => {
        if (searchQuery.trim()) {
            return [] as Array<{ category: string; items: MenuItem[] }>;
        }

        const grouped = new Map<string, MenuItem[]>();
        for (const item of menuItems) {
            const category = item.category.trim();
            const previous = grouped.get(category) || [];
            grouped.set(category, [...previous, item]);
        }

        const orderedCategories = categories.filter((category) => category !== 'Todos' && grouped.has(category));
        return orderedCategories.map((category) => ({
            category,
            items: grouped.get(category) || []
        }));
    }, [categories, menuItems, searchQuery]);

    const handleCategoryChange = (category: string) => {
        setActiveCategory(category);

        if (searchQuery.trim()) {
            clearPendingCategoryNavigation();
            return;
        }

        if (category === 'Todos') {
            clearPendingCategoryNavigation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const section = categorySectionRefs.current[category];
        if (section) {
            beginPendingCategoryNavigation(category);
            window.scrollTo({
                top: getCategoryScrollTop(section),
                behavior: 'smooth',
            });
            return;
        }

        clearPendingCategoryNavigation();
    };

    useEffect(() => {
        if (searchQuery.trim() || categorySections.length === 0) {
            clearPendingCategoryNavigation();
            return;
        }

        const handleScroll = () => {
            const threshold = getCategoryActivationThreshold();
            const pendingCategory = pendingCategoryNavigationRef.current;

            if (pendingCategory) {
                const pendingSection = categorySectionRefs.current[pendingCategory];

                if (pendingSection) {
                    const pendingRect = pendingSection.getBoundingClientRect();
                    const hasReachedPendingSection = pendingRect.top <= threshold && pendingRect.bottom > threshold;

                    if (hasReachedPendingSection) {
                        clearPendingCategoryNavigation();

                        if (activeCategory !== pendingCategory) {
                            setActiveCategory(pendingCategory);
                        }
                    }
                }

                return;
            }

            const active = categorySections.find((section) => {
                const element = categorySectionRefs.current[section.category];
                if (!element) {
                    return false;
                }

                const rect = element.getBoundingClientRect();
                return rect.top <= threshold && rect.bottom > threshold;
            });

            if (active && active.category !== activeCategory) {
                setActiveCategory(active.category);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeCategory, categorySections, clearPendingCategoryNavigation, searchQuery, setActiveCategory]);

    useEffect(() => {
        return () => {
            clearPendingCategoryNavigation();
        };
    }, [clearPendingCategoryNavigation]);

    const groupSessionId = useCartStore(state => state.groupSessionId);
    const groupParticipants = useCartStore(state => state.groupParticipants);

    const effectiveCart = useMemo(() => {
        if (groupSessionId && groupParticipants.length > 0) {
            return groupParticipants.flatMap(p => p.items);
        }
        return cart;
    }, [cart, groupSessionId, groupParticipants]);

    const cartTotal = useMemo(() => effectiveCart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [effectiveCart]);
    const totalItemsCount = useMemo(() => effectiveCart.reduce((sum, item) => sum + item.quantity, 0), [effectiveCart]);
    const itemQuantities = useMemo(() => {
        const mapping: Record<string, number> = {};
        effectiveCart.forEach(item => mapping[item.id] = (mapping[item.id] || 0) + item.quantity);
        return mapping;
    }, [effectiveCart]);

    const isOrderFormValid = useMemo(() => {
        const { customerName, customerPhone, paymentMethod, orderType, address, gpsLocation, customerLatitude, customerLongitude } = orderMetadata;
        const normalizedPhone = (customerPhone || fromNumber || '').trim();
        const hasOrderType = Boolean(orderType?.trim());
        const hasPaymentMethod = Boolean(paymentMethod?.trim());
        const hasCoordinates = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);
        const hasDeliveryReference = Boolean(address?.trim()) || Boolean(gpsLocation?.trim()) || hasCoordinates;
        const isDeliveryDetailsValid = orderType !== 'delivery' || hasDeliveryReference;
        return !!(customerName.trim() && normalizedPhone && hasOrderType && hasPaymentMethod && isDeliveryDetailsValid);
    }, [fromNumber, orderMetadata]);

    const onHandlePlaceOrder = async () => {
        if (effectiveCart.length === 0 || !isOrderFormValid) return;
        const success = await handlePlaceOrder(effectiveCart, orderMetadata, cartTotal);
        if (success) {
            setIsConfirming(false);
            setOrderMetadata(prev => ({
                ...DEFAULT_ORDER_METADATA,
                customerName: prev.customerName,
                customerPhone: prev.customerPhone,
                customerLatitude: undefined,
                customerLongitude: undefined,
            }));
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setChefNotification({ content: "Tu navegador no soporta geolocalización. 🏮" });
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrderMetadata(prev => ({
                    ...prev,
                    gpsLocation: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
                    address: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
                    customerLatitude: pos.coords.latitude,
                    customerLongitude: pos.coords.longitude,
                    source: 'client',
                    locationOverriddenFromProfile: profileLocation ? true : prev.locationOverriddenFromProfile,
                    locationDifferenceAcknowledged: false,
                }));
                setIsLocating(false);
            },
            () => {
                setChefNotification({ content: "No pudimos obtener tu ubicación. 🏮" });
                setIsLocating(false);
            }
        );
    };

    // BLOCKER: Show generic loading while resolving URL
    if (isResolving) {
        return <LoadingScreen />;
    }

    if (loading && !restaurantInfo) return (
        <LoadingScreen restaurantName={restaurantInfo?.name} />
    );

    // STRICT CHECK: If we know the target branch, but the store info doesn't match yet, WAIT.
    // This prevents showing "Sumo" info when we are already on "Hola Dulce" URL.
    if (loading && targetBranchId && restaurantInfo?.id !== targetBranchId) {
        return <LoadingScreen restaurantName={null} />;
    }

    return (
        <div className="min-h-screen relative japanese-pattern pb-24">
            {showClearCartConfirm && (
                <ConfirmModal
                    title="¿Vaciar Mi Pedido?"
                    description="¿Estás seguro de que deseas eliminar por completo tu pedido actual?"
                    confirmText="Sí, Vaciar Todo 🍱"
                    cancelText="Cancelar"
                    onConfirm={onHandleClearCart}
                    onCancel={() => setShowClearCartConfirm(false)}
                />
            )}


            <Hero restaurantInfo={restaurantInfo} />

            <Navbar
                restaurantInfo={restaurantInfo}
                isTestMode={isTestMode}
                toggleTestMode={toggleTestMode}
                onShowHistory={() => setShowHistory(true)}
                onOpenCart={() => setIsConfirming(true)}
                totalItemsCount={totalItemsCount}
                cartLength={cart.length}
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={handleCategoryChange}
                tabsRef={tabsRef}
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                scrollTabs={scrollTabs}
                onScroll={checkScroll}
                isLoading={loading}
                onOpenReviews={() => {
                    if (branchId && branchId !== ':branchId') {
                        router.push(`/reviews/${encodeURIComponent(branchId)}`);
                    }
                }}
                onGoBack={() => {
                    if (typeof window !== 'undefined' && window.history.length > 1) {
                        router.back();
                    } else {
                        router.push('/');
                    }
                }}
                customerName={customerName}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                    {dataError ? (
                        <MenuError message={dataError} onRetry={refreshData} />
                    ) : (loading) ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <MenuSkeleton key={`skeleton-${i}`} />
                        ))
                    ) : (filteredItems.length === 0) ? (
                        <div className="col-span-full py-20 text-center animate-fadeIn">
                            <span className="text-6xl mb-6 block grayscale opacity-30">🍱🔍</span>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter text-gray-400">
                                No encontramos resultados
                            </h3>
                            <p className="text-gray-500 font-bold text-sm mt-2">
                                &ldquo;{searchQuery}&rdquo; no coincide con ningún plato.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-6 px-8 py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all active:scale-95"
                            >
                                Limpiar Búsqueda
                            </button>
                        </div>
                    ) : searchQuery.trim() ? (
                        filteredItems.map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                onAddToCart={handleAddToCart}
                                currentQuantity={itemQuantities[item.id] || 0}
                                isHighlighted={highlightedItemId === String(item.id)}
                                onOpenDetails={handleOpenItemModal}
                            />
                        ))
                    ) : (
                        categorySections.flatMap((section) => [
                            <div
                                key={`heading-${section.category}`}
                                ref={(element) => {
                                    categorySectionRefs.current[section.category] = element;
                                }}
                                className="col-span-full pt-2"
                            >
                                <h2 className="text-lg md:text-xl font-black">{section.category}</h2>
                            </div>,
                            ...section.items.map((item) => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    onAddToCart={handleAddToCart}
                                    currentQuantity={itemQuantities[item.id] || 0}
                                    isHighlighted={highlightedItemId === String(item.id)}
                                    onOpenDetails={handleOpenItemModal}
                                />
                            ))
                        ])
                    )}
                </div>
            </main>

            {selectedItemForModal && (
                <ItemDetailModal
                    item={selectedItemForModal}
                    quantity={modalQuantity}
                    setQuantity={setModalQuantity}
                    notes={modalNotes}
                    setNotes={setModalNotes}
                    selectedVariantId={modalSelectedVariantId}
                    setSelectedVariantId={setModalSelectedVariantId}
                    selectedModifiers={modalSelectedModifiers}
                    setSelectedModifiers={setModalSelectedModifiers}
                    onClose={() => setSelectedItemForModal(null)}
                    onConfirm={handleModalConfirm}
                    isSyncing={isModalSyncing}
                    modalScrollRef={modalScrollRef}
                    onScroll={handleModalScroll}
                    errorMessage={modalError}
                />
            )}

            {(!branchId || branchId === ':branchId') && !isTestMode && !initialBranchId && (
                <BranchSelectionModal onSelectBranch={(id, name) => {
                    setBranchId(id);
                    // Create a slug from the name
                    const slug = name.toLowerCase().replace(/ /g, '-');
                    // Force a reload to refresh data with pretty URL
                    // Note: If inside a dynamic route, we might want to redirect to the new slug instead of ?place
                    window.location.href = `/${encodeURIComponent(slug)}`;
                }} />
            )}

            {isConfirming && (
                <CartModal
                    cart={cart} // We pass the local cart for the local view, CartModal reads groupParticipants internally
                    orderMetadata={orderMetadata}
                    setOrderMetadata={setOrderMetadata}
                    onClose={() => setIsConfirming(false)}
                    onPlaceOrder={onHandlePlaceOrder}
                    onSyncCartAction={(item, action, qty) => syncCartAction(item, action as CartAction, qty, orderMetadata)}
                    onGetLocation={handleGetLocation}
                    isSyncing={isSyncing}
                    isOrdering={isOrdering}
                    isLocating={isLocating}
                    paymentOptions={paymentOptions}
                    serviceOptions={serviceOptions}
                    fromNumber={fromNumber}
                    hasProfileLocation={Boolean(profileLocation)}
                    profileLocationLabel={profileLocation?.label}
                    onUseSavedProfileLocation={applyProfileLocationToOrder}
                    onUseDifferentLocation={handleUseDifferentOrderLocation}
                    onOpenLocationPicker={handleUseDifferentOrderLocation}
                    locationPickerLoading={isResolvingOrderLocation}
                    locationServicePrompt={locationServicePrompt}
                    isAutoSavingProfileLocation={isAutoSavingProfileLocation}
                    tableQuantity={tableQuantity}
                    onOpenCheckoutPage={() => {
                        setIsConfirming(false);
                        router.push('/checkout');
                    }}
                    onOpenCartsPage={() => {
                        setIsConfirming(false);
                        router.push('/carts');
                    }}
                />
            )}

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

            <ChatWidget
                key={`chat-${fromNumber || 'anonymous'}`}
                menuItems={menuItems}
                notification={chefNotification}
                isThinking={isOrdering || isSyncing}
                onNavigateToItem={handleOpenItemModal}
                orderMetadata={orderMetadata}
            />

            <OrderTrackingModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                phone={fromNumber}
                customerId={customerId}
                branchId={branchId}
            />
        </div>
    );
}
