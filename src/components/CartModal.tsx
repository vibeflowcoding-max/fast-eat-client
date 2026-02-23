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
    tableQuantity = 0
}) => {
    const groupSessionId = useCartStore(state => state.groupSessionId);
    const groupParticipants = useCartStore(state => state.groupParticipants);
    const currentParticipantId = useCartStore(state => state.participantId);

    const [showBillSplitter, setShowBillSplitter] = useState(false);
    const [sinpeResults, setSinpeResults] = useState<SplitResult[] | null>(null);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxesAndFees = 0; // For future implementation if delivery fees exist before order placement
    const total = subtotal + taxesAndFees;

    const isOrderFormValid = () => {
        const { customerName, customerPhone, orderType, address, gpsLocation, customerLatitude, customerLongitude, tableNumber } = orderMetadata;
        const hasCoordinates = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);
        const isDeliveryDetailsValid = orderType !== 'delivery' || ((address?.trim() || gpsLocation) && hasCoordinates);
        const isTableValid = !(orderType === 'comer_aca' || orderType === 'comer_aqui' || orderType === 'dine_in') || tableNumber;
        return !!(customerName.trim() && customerPhone.trim() && isDeliveryDetailsValid && isTableValid);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#fdfcf0] w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
                {(isSyncing || isOrdering) && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[110] flex items-center justify-center rounded-[2rem]">
                        <div className="w-12 h-12 border-4 border-black border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}
                <div className="p-5 md:p-8 bg-white border-b-4 border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Finalizar Pedido</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-black hover:bg-gray-200 transition-colors">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-4">
                    <GroupCartWidget />
                    {cart.length === 0 && (!groupSessionId || groupParticipants.length === 0) ? (
                        <div className="flex flex-col items-center py-20">
                            <span className="text-6xl mb-4">🍱</span>
                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Tu pedido está vacío</p>
                        </div>
                    ) : groupSessionId && groupParticipants.length > 0 ? (
                        <div className="space-y-6">
                            {groupParticipants.map(participant => (
                                <div key={participant.id} className="space-y-2">
                                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">
                                        {participant.name} {participant.isHost ? '(Organizador)' : ''}
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
                                                    alert("Solo puedes modificar tus propios productos.");
                                                }
                                            }}
                                        />
                                    ))}
                                    {participant.items.length === 0 && <p className="text-xs text-gray-400 italic">No ha agregado productos</p>}
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
                            tableQuantity={tableQuantity}
                        />
                    )}
                </div>
                <div className="p-5 md:p-8 bg-white border-t-4 border-gray-100 space-y-3">
                    {groupSessionId && groupParticipants.length > 1 && (
                        <button
                            onClick={() => setShowBillSplitter(true)}
                            disabled={cart.length === 0}
                            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs border-2 transition-all active:scale-95 ${cart.length > 0 ? 'border-gray-900 text-gray-900 hover:bg-gray-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                        >
                            Dividir Cuenta 🧮
                        </button>
                    )}
                    <button
                        onClick={onPlaceOrder}
                        disabled={cart.length === 0 || !isOrderFormValid() || isOrdering}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 ${cart.length > 0 && isOrderFormValid() ? 'bg-black text-white hover:bg-red-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                    >
                        {isOrdering ? 'Procesando...' : 'Confirmar Pedido ⛩️'}
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
                    hostName={useCartStore.getState().customerName || 'Organizador'}
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
