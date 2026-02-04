"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MenuItem, CartItem, OrderMetadata } from '@/types';
import MenuItemCard from '@/components/MenuItemCard';
import ChatWidget from '@/components/ChatWidget';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import { useCartStore } from '@/store';
import { fetchRestaurantInfo, CartAction } from '@/services/api';

// Components
import LoadingScreen from '@/components/LoadingScreen';
import PhonePrompt from '@/components/PhonePrompt';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import ItemDetailModal from '@/components/ItemDetailModal';
import CartModal from '@/components/CartModal';
import ExpirationTimer from '@/components/ExpirationTimer';
import ConfirmModal from '@/components/ConfirmModal';
import MenuSkeleton from '@/components/MenuSkeleton';
import MenuError from '@/components/MenuError';
import BranchSelectionModal from '@/components/BranchSelectionModal';

// Hooks
import { useAppData } from '@/hooks/useAppData';
import { useCartActions } from '@/hooks/useCartActions';

interface MainAppProps {
    initialBranchId?: string;
}

export default function MainApp({ initialBranchId }: MainAppProps) {
    // Store
    const {
        items: cart,
        expirationTime,
        branchId,
        fromNumber,
        isTestMode,
        restaurantInfo,
        setBranchId,
        setFromNumber,
        toggleTestMode,
        setRestaurantInfo,
        setItems,
        resetSession,
        customerName
    } = useCartStore();

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
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [paymentOptions, setPaymentOptions] = useState<{ id: string, label: string }[]>([]);
    const [serviceOptions, setServiceOptions] = useState<{ id: string, label: string }[]>([]);
    const [showPhonePrompt, setShowPhonePrompt] = useState(false);
    const [countryCode, setCountryCode] = useState('506');
    const [phoneBody, setPhoneBody] = useState('');
    const [initialCustomerName, setInitialCustomerName] = useState('');
    const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
    const [modalQuantity, setModalQuantity] = useState(1);
    const [modalNotes, setModalNotes] = useState('');
    const [isModalSyncing, setIsModalSyncing] = useState(false);
    const [showScrollArrow, setShowScrollArrow] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState<string>('');
    const [showHistory, setShowHistory] = useState(false);
    const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [showUserChangeConfirm, setShowUserChangeConfirm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Resolution State - Blocks rendering until we know what branch we are on
    const [isResolving, setIsResolving] = useState(true);
    // Strict Target ID Check - Prevents stale data from showing
    const [targetBranchId, setTargetBranchId] = useState<string | null>(null);

    // Refs
    const tabsRef = useRef<HTMLDivElement>(null);
    const modalScrollRef = useRef<HTMLDivElement>(null);

    const [orderMetadata, setOrderMetadata] = useState<OrderMetadata>({
        customerName: '',
        customerPhone: '',
        paymentMethod: '',
        orderType: '',
        address: '',
        gpsLocation: ''
    });

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Hydration fix & Initial Load
    useEffect(() => {
        // Start resolving immediately
        setIsResolving(true);

        const savedMetadata = localStorage.getItem('izakaya_metadata');
        if (savedMetadata) setOrderMetadata(JSON.parse(savedMetadata));
        setInitialCustomerName(localStorage.getItem('izakaya_user_name') || '');

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
                console.log("🔄 Cambiando de sucursal - Limpiando sesión anterior...");
                resetSession();
                // Limpieza profunda de LocalStorage
                localStorage.removeItem('izakaya_chat_history');
                localStorage.removeItem('izakaya_metadata');
                localStorage.removeItem('izakaya_active_orders');
                localStorage.removeItem('izakaya_user_name');

                // Reset local states
                setOrderMetadata({
                    customerName: '',
                    customerPhone: '',
                    paymentMethod: '',
                    orderType: '',
                    address: '',
                    gpsLocation: ''
                });
                setInitialCustomerName('');
                setPhoneBody('');
                // Force show phone prompt for new session
                setShowPhonePrompt(true);

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

        if (urlPhone) {
            setFromNumber(urlPhone);
            setOrderMetadata(prev => ({ ...prev, customerPhone: urlPhone }));
        } else if (!useCartStore.getState().fromNumber) {
            setShowPhonePrompt(true);
        }
    }, [searchParams, pathname, initialBranchId]);

    // Sync Global Customer Name to Local Metadata
    useEffect(() => {
        const storedName = useCartStore.getState().customerName;
        if (storedName && orderMetadata.customerName !== storedName) {
            setOrderMetadata(prev => ({ ...prev, customerName: storedName }));
        }
    }, [showPhonePrompt]);

    // Persistence of Metadata
    useEffect(() => {
        if (orderMetadata.customerPhone) {
            localStorage.setItem('izakaya_metadata', JSON.stringify(orderMetadata));
        }
    }, [orderMetadata]);

    // Expiration Timer Effect
    useEffect(() => {
        if (!expirationTime) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = expirationTime - now;
            if (diff <= 0) {
                clearInterval(interval);
                useCartStore.getState().clearCart();
                setChefNotification({ content: "⌛ El tiempo del carrito ha expirado. Por favor, inicia un nuevo pedido." });
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeftStr(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expirationTime]);

    // Update payment/service options when restaurantInfo changes
    useEffect(() => {
        if (restaurantInfo) {
            const pOptions = restaurantInfo.payment_methods.map(pm => {
                if (pm === 'cash') return { id: 'cash', label: '💴 Efectivo' };
                if (pm === 'card') return { id: 'card', label: '💳 Tarjeta (Datáfono)' };
                if (pm === 'sinpe') return { id: 'sinpe', label: '📱 SINPE Móvil' };
                return { id: pm, label: pm.charAt(0).toUpperCase() + pm.slice(1) };
            });
            setPaymentOptions(pOptions);

            const sOptions = restaurantInfo.service_modes.map(sm => {
                if (sm === 'pickup') return { id: 'pickup', label: '🥡 Para recoger' };
                if (sm === 'delivery') return { id: 'delivery', label: '🛵 Envío a casa' };
                if (sm === 'dine_in') return { id: 'dine_in', label: '🍱 Comer en el restaurante' };
                return { id: sm, label: sm.charAt(0).toUpperCase() + sm.slice(1).replace('_', ' ') };
            });
            setServiceOptions(sOptions);
        }
    }, [restaurantInfo]);

    const handlePhoneSubmit = () => {
        const cleanCC = countryCode.replace(/\D/g, '');
        const cleanBody = phoneBody.replace(/\D/g, '');
        const cleanName = initialCustomerName.trim();

        if (cleanBody.length < 5 || cleanName.length < 2) return;

        const fullNum = `${cleanCC}${cleanBody}`;
        setFromNumber(fullNum);
        useCartStore.getState().setCustomerName(cleanName);
        setOrderMetadata(prev => ({ ...prev, customerPhone: fullNum, customerName: cleanName }));
        setShowPhonePrompt(false);
    };

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
            if (item.category !== activeCategory) {
                setActiveCategory(item.category);
            }
        }
    };

    const handleModalConfirm = async () => {
        if (selectedItemForModal) {
            setIsModalSyncing(true);
            const success = await addToCart({ ...selectedItemForModal, quantity: modalQuantity, notes: modalNotes }, orderMetadata);
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

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
    const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const itemQuantities = useMemo(() => {
        const mapping: Record<string, number> = {};
        cart.forEach(item => mapping[item.id] = (mapping[item.id] || 0) + item.quantity);
        return mapping;
    }, [cart]);

    const isOrderFormValid = useMemo(() => {
        const { customerName, customerPhone, orderType, address, gpsLocation } = orderMetadata;
        const isDeliveryDetailsValid = orderType !== 'delivery' || (address?.trim() || gpsLocation);
        return !!(customerName.trim() && customerPhone.trim() && isDeliveryDetailsValid);
    }, [orderMetadata]);

    const onHandlePlaceOrder = async () => {
        if (cart.length === 0 || !isOrderFormValid) return;
        const success = await handlePlaceOrder(orderMetadata, cartTotal);
        if (success) {
            setIsConfirming(false);
            setOrderMetadata(prev => ({ ...prev, paymentMethod: 'cash', orderType: 'pickup', address: '' }));
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
                setOrderMetadata(prev => ({ ...prev, gpsLocation: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}` }));
                setIsLocating(false);
            },
            () => {
                setChefNotification({ content: "No pudimos obtener tu ubicación. 🏮" });
                setIsLocating(false);
            }
        );
    };

    const handleChangeUser = () => {
        setShowUserChangeConfirm(true);
    };

    const executeUserChange = () => {
        resetSession();
        setChefNotification(null);
        localStorage.removeItem('izakaya_chat_history');
        localStorage.removeItem('izakaya_metadata');
        localStorage.removeItem('izakaya_active_orders');
        localStorage.removeItem('izakaya_user_name');

        setOrderMetadata({
            customerName: '',
            customerPhone: '',
            paymentMethod: '',
            orderType: '',
            address: '',
            gpsLocation: ''
        });
        setPhoneBody('');
        setShowPhonePrompt(true);
        setShowUserChangeConfirm(false);
    };

    if (showPhonePrompt) return (
        <PhonePrompt
            restaurantInfo={restaurantInfo}
            initialCustomerName={initialCustomerName}
            setInitialCustomerName={setInitialCustomerName}
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            phoneBody={phoneBody}
            setPhoneBody={setPhoneBody}
            handlePhoneSubmit={handlePhoneSubmit}
        />
    );

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
            {showUserChangeConfirm && (
                <ConfirmModal
                    title="⚠️ ¿Cambiar de Usuario?"
                    description="Si cambias de usuario, perderás todos los datos del pedido actual y el historial de rastreo en este dispositivo para comenzar una nueva orden. ¿Deseas continuar?"
                    confirmText="Sí, Limpiar y Cambiar 👤"
                    cancelText="No, Mantener Actual"
                    onConfirm={executeUserChange}
                    onCancel={() => setShowUserChangeConfirm(false)}
                />
            )}
            {expirationTime && cart.length > 0 && (
                <ExpirationTimer timeLeftStr={timeLeftStr} />
            )}

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
                setActiveCategory={setActiveCategory}
                tabsRef={tabsRef}
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                scrollTabs={scrollTabs}
                onScroll={checkScroll}
                isLoading={loading}
                onChangeUser={handleChangeUser}
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
                                "{searchQuery}" no coincide con ningún plato.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-6 px-8 py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all active:scale-95"
                            >
                                Limpiar Búsqueda
                            </button>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                onAddToCart={(newItem) => addToCart(newItem, orderMetadata)}
                                currentQuantity={itemQuantities[item.id] || 0}
                                isHighlighted={highlightedItemId === String(item.id)}
                            />
                        ))
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
                    onClose={() => setSelectedItemForModal(null)}
                    onConfirm={handleModalConfirm}
                    isSyncing={isModalSyncing}
                    modalScrollRef={modalScrollRef}
                    onScroll={handleModalScroll}
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
                    cart={cart}
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
                    tableQuantity={tableQuantity}
                />
            )}

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
                branchId={branchId}
            />
        </div>
    );
}
