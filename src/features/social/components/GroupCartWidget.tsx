"use client";

import React, { useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import { useCartStore } from '@/store';
import { useGroupCartSync } from '../hooks/useGroupCartSync';

export default function GroupCartWidget() {
    const groupSessionId = useCartStore(state => state.groupSessionId);
    const setGroupSession = useCartStore(state => state.setGroupSession);
    const leaveGroupSession = useCartStore(state => state.leaveGroupSession);
    const [copied, setCopied] = useState(false);

    // Initialize sync hook
    useGroupCartSync();

    const handleCreateGroup = () => {
        const newSessionId = `grp_${Math.random().toString(36).substring(2, 9)}`;
        const hostId = `host_${Math.random().toString(36).substring(2, 9)}`;
        const hostName = useCartStore.getState().customerName || 'Yo (Anfitrión)';
        setGroupSession(newSessionId, true, hostId, hostName);
    };

    const handleCopyLink = () => {
        if (!groupSessionId) return;
        const link = `${window.location.origin}/group/${groupSessionId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Users className="w-4 h-4 text-red-500" />
                    Pedido Grupal
                </h3>
            </div>

            {!groupSessionId ? (
                <div>
                    <p className="text-xs text-gray-500 mb-3 font-medium">
                        Crea un link para que tus amigos agreguen sus productos al mismo carrito en tiempo real.
                    </p>
                    <button
                        onClick={handleCreateGroup}
                        className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Iniciar Carrito Grupal
                    </button>
                </div>
            ) : (
                <div>
                    <p className="text-xs text-gray-600 mb-3 font-medium">
                        ¡Carrito grupal activo! Comparte este enlace:
                    </p>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/group/${groupSessionId}`}
                            className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none text-gray-500 font-mono"
                        />
                        <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Copiar enlace"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                        </button>
                    </div>
                    <button
                        onClick={leaveGroupSession}
                        className="w-full py-3 bg-red-50 text-red-600 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-100 transition-colors"
                    >
                        Salir del Grupo
                    </button>
                </div>
            )}
        </div>
    );
}
