"use client";

import React, { useState, useMemo } from 'react';
import { GroupCartParticipant } from '@/types';
import { EqualSplitStrategy, ItemizedSplitStrategy, CustomAmountSplitStrategy, SplitResult } from '../utils/splitStrategies';
import { Calculator, Users, PieChart, Info } from 'lucide-react';

interface BillSplitterModalProps {
    participants: GroupCartParticipant[];
    subtotal: number;
    taxesAndFees: number;
    total: number;
    onClose: () => void;
    onConfirmSplit: (results: SplitResult[]) => void;
}

export default function BillSplitterModal({
    participants,
    subtotal,
    taxesAndFees,
    total,
    onClose,
    onConfirmSplit
}: BillSplitterModalProps) {
    const [strategyType, setStrategyType] = useState<'equal' | 'itemized' | 'custom'>('itemized');
    const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

    const splitResults = useMemo(() => {
        let strategy;
        switch (strategyType) {
            case 'equal':
                strategy = new EqualSplitStrategy();
                break;
            case 'itemized':
                strategy = new ItemizedSplitStrategy();
                break;
            case 'custom':
                strategy = new CustomAmountSplitStrategy(customAmounts);
                break;
            default:
                strategy = new ItemizedSplitStrategy();
        }
        return strategy.calculate(participants, subtotal, taxesAndFees);
    }, [strategyType, participants, subtotal, taxesAndFees, customAmounts]);

    const customTotalAssigned = useMemo(() => {
        if (strategyType !== 'custom') return total;
        return Object.values(customAmounts).reduce((sum, val) => sum + (val || 0), 0);
    }, [customAmounts, strategyType, total]);

    const customRemaining = Math.max(0, total - customTotalAssigned);

    const handleCustomAmountChange = (participantId: string, amount: number) => {
        setCustomAmounts(prev => ({
            ...prev,
            [participantId]: amount
        }));
    };

    const formatCurrency = (val: number) => `₡${val.toLocaleString()}`;

    return (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 md:p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-red-500" />
                            Dividir Cuenta
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">Total de la orden: {formatCurrency(total)}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold hover:bg-gray-100 transition-colors border border-gray-200">✕</button>
                </div>

                <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-6">

                    {/* Strategy Tabs */}
                    <div className="flex bg-gray-100 p-1 mb-6 rounded-xl">
                        <button
                            onClick={() => setStrategyType('itemized')}
                            className={`flex-1 flex flex-col items-center py-2 text-xs font-bold rounded-lg transition-all ${strategyType === 'itemized' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Users className="w-4 h-4 mb-1" />
                            Por Persona
                        </button>
                        <button
                            onClick={() => setStrategyType('equal')}
                            className={`flex-1 flex flex-col items-center py-2 text-xs font-bold rounded-lg transition-all ${strategyType === 'equal' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <PieChart className="w-4 h-4 mb-1" />
                            Partes Iguales
                        </button>
                        <button
                            onClick={() => setStrategyType('custom')}
                            className={`flex-1 flex flex-col items-center py-2 text-xs font-bold rounded-lg transition-all ${strategyType === 'custom' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Calculator className="w-4 h-4 mb-1" />
                            Personalizado
                        </button>
                    </div>

                    <div className="bg-blue-50 text-blue-800 p-3 flex gap-3 text-xs rounded-xl items-start">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                            {strategyType === 'itemized' && "Cada quien paga solo lo que pidió. Los impuestos y costo de envío se dividen proporcionalmente al consumo."}
                            {strategyType === 'equal' && "El total exacto se divide en partes iguales entre todos los miembros del carrito."}
                            {strategyType === 'custom' && "Asigna montos manuales a cada persona. Útil si alguien quiere invitar parte de la cuenta."}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-900 uppercase tracking-widest text-[10px]">Detalle por Participante</h4>
                        {splitResults.map((result) => (
                            <div key={result.participantId} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                <div>
                                    <p className="font-bold text-gray-900">{result.participantName}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Consumo: {formatCurrency(result.itemsTotal)} • Extras: {formatCurrency(result.proportionalTaxAndFees)}</p>
                                </div>

                                {strategyType === 'custom' ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-500 font-bold">₡</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={500}
                                            value={customAmounts[result.participantId] || ''}
                                            onChange={(e) => handleCustomAmountChange(result.participantId, Number(e.target.value))}
                                            className="w-24 px-2 py-1 text-right font-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="0"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-lg font-black text-gray-900">
                                        {formatCurrency(result.finalTotal)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {strategyType === 'custom' && (
                        <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center shadow-inner">
                            <span className="font-bold text-sm">Restante por asignar:</span>
                            <span className={`text-lg font-black ${customRemaining > 0 ? 'text-yellow-400' : customRemaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(customRemaining)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-5 md:p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => onConfirmSplit(splitResults)}
                        disabled={strategyType === 'custom' && Math.abs(customRemaining) > 1}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${(strategyType === 'custom' && Math.abs(customRemaining) > 1)
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-red-600 active:scale-95 shadow-xl'
                            }`}
                    >
                        Confirmar Pagos SINPE 📱
                    </button>
                </div>
            </div>
        </div>
    );
}
