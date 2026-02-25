import React from 'react';
import { OrderMetadata } from '../types';

interface OrderFormProps {
    orderMetadata: OrderMetadata;
    setOrderMetadata: (metadata: OrderMetadata) => void;
    paymentOptions: { id: string, label: string }[];
    serviceOptions: { id: string, label: string }[];
    fromNumber: string;
    isLocating: boolean;
    onGetLocation: () => void;
    tableQuantity?: number;
}

const OrderForm: React.FC<OrderFormProps> = ({
    orderMetadata,
    setOrderMetadata,
    paymentOptions,
    serviceOptions,
    fromNumber,
    isLocating,
    onGetLocation,
    tableQuantity = 0
}) => {
    return (
        <div className="ui-panel p-6 rounded-3xl border-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Nombre Completo</label>
                        <input
                            type="text"
                            placeholder="Ej: Macarena..."
                            className="w-full px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-brand)] transition-all"
                            value={orderMetadata.customerName}
                            onChange={e => setOrderMetadata({ ...orderMetadata, customerName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1 opacity-60">
                        <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                        <div className="px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black ui-text-muted">
                            {fromNumber ? `+${fromNumber}` : 'No disponible'}
                        </div>
                    </div>
                </div>

                {/* Order Options */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Forma de Pago</label>
                        <select
                            className="w-full px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black focus:outline-none focus:border-[var(--color-brand)] appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                            value={orderMetadata.paymentMethod}
                            onChange={e => setOrderMetadata({ ...orderMetadata, paymentMethod: e.target.value as any })}
                            disabled={paymentOptions.length === 0}
                        >
                            <option value="" disabled>
                                {paymentOptions.length > 0 ? "Seleccionar método de pago" : "No hay opciones disponibles"}
                            </option>
                            {paymentOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Tipo de Servicio</label>
                        <select
                            className="w-full px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black focus:outline-none focus:border-[var(--color-brand)] appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
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
                                {serviceOptions.length > 0 ? "Seleccionar tipo de entrega" : "No hay tipos de servicio disponibles"}
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
                    <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Número de Mesa</label>
                    <select
                        className="w-full px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black focus:outline-none focus:border-[var(--color-brand)] appearance-none cursor-pointer"
                        value={orderMetadata.tableNumber || ''}
                        onChange={e => setOrderMetadata({ ...orderMetadata, tableNumber: e.target.value })}
                    >
                        <option value="" disabled>Seleccionar mesa</option>
                        {Array.from({ length: tableQuantity }, (_, i) => i + 1).map(num => (
                            <option key={num} value={String(num)}>Mesa #{num}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Delivery Address (only if applicable) */}
            {orderMetadata.orderType === 'delivery' && (
                <div className="space-y-1 animate-fadeIn">
                    <label className="ui-text-muted text-[8px] font-black uppercase tracking-widest ml-1">Dirección de Envío</label>
                    <textarea
                        placeholder="Calle, número de casa, referencias..."
                        className="w-full px-5 py-4 ui-panel-soft border-2 rounded-xl text-sm font-black placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-brand)] transition-all resize-none h-20"
                        value={orderMetadata.address}
                        onChange={e => setOrderMetadata({ ...orderMetadata, address: e.target.value })}
                    />
                    <div className="flex flex-col gap-2 mt-2">
                        {orderMetadata.gpsLocation && (
                            <div className="flex flex-col gap-1 animate-fadeIn mt-1">
                                <label className="text-[7px] font-black uppercase tracking-widest text-green-600 ml-1">Ubicación GPS Adjunta</label>
                                <div className="ui-state-success flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm">
                                    <span className="text-sm">📍</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={orderMetadata.gpsLocation}
                                        className="w-full bg-transparent text-xs font-bold focus:outline-none truncate"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setOrderMetadata({
                                            ...orderMetadata,
                                            gpsLocation: undefined,
                                            customerLatitude: undefined,
                                            customerLongitude: undefined,
                                        })}
                                        className="text-green-600 hover:text-[var(--color-brand)] font-bold px-1 py-1"
                                    >✕</button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onGetLocation}
                            disabled={isLocating}
                            className="ui-state-success flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {isLocating ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    Obteniendo GPS...
                                </>
                            ) : (
                                <>
                                    <span>📍</span>
                                    {orderMetadata.gpsLocation ? 'Actualizar Ubicación GPS' : 'Compartir mi Ubicación (GPS)'}
                                </>
                            )}
                        </button>
                        {(!Number.isFinite(orderMetadata.customerLatitude) || !Number.isFinite(orderMetadata.customerLongitude)) && (
                            <p className="ui-state-warning text-[10px] font-bold rounded-lg px-2 py-1 inline-block">
                                Debes compartir tu ubicación GPS para confirmar pedidos a domicilio.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Phase 4: Convenience & Utility Options */}
            <div className="pt-4 border-t-2 border-gray-100 space-y-5">
                {/* Eco-Friendly Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={!!orderMetadata.optOutCutlery}
                            onChange={(e) => setOrderMetadata({ ...orderMetadata, optOutCutlery: e.target.checked })}
                        />
                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand)]"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold group-hover:text-[var(--color-brand)] transition-colors flex items-center gap-1.5">
                            🌱 Sin Cubiertos ni Servilletas
                        </span>
                        <span className="ui-text-muted text-[10px] font-medium">Opción Eco-Amigable. ¡Ayuda al planeta!</span>
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
                                    scheduledFor: e.target.checked ? new Date(Date.now() + 3600000 - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : null
                                })}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand)]"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold group-hover:text-[var(--color-brand)] transition-colors flex items-center gap-1.5">
                                🕒 Programar para más tarde
                            </span>
                            <span className="ui-text-muted text-[10px] font-medium">Elige a qué hora quieres recibir tu pedido</span>
                        </div>
                    </label>

                    {orderMetadata.scheduledFor && (
                        <div className="pl-15 pt-2 animate-fadeIn">
                            <input
                                type="datetime-local"
                                className="w-full px-4 py-3 ui-panel-soft border-2 rounded-xl text-sm font-black focus:outline-none focus:border-[var(--color-brand)] transition-all"
                                value={orderMetadata.scheduledFor}
                                min={new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                onChange={(e) => setOrderMetadata({ ...orderMetadata, scheduledFor: e.target.value })}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderForm;
