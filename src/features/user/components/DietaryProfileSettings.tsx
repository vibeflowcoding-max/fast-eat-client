'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, X, Save, Leaf, Activity } from 'lucide-react';
import { useCartStore } from '@/store';
import { DietaryProfile } from '@/types';

interface DietaryProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const COMMON_ALLERGIES = ['Maní', 'Mariscos', 'Lácteos', 'Huevos', 'Nueces', 'Soya', 'Trigo'];
const DIET_TYPES = [
    { id: 'none', label: 'Sin restricciones', icon: null },
    { id: 'vegetarian', label: 'Vegetariano', icon: Leaf },
    { id: 'vegan', label: 'Vegano', icon: Leaf },
    { id: 'keto', label: 'Keto', icon: Activity },
    { id: 'paleo', label: 'Paleo', icon: Activity },
    { id: 'pescatarian', label: 'Pescatariano', icon: null }
] as const;

export default function DietaryProfileSettings({ isOpen, onClose }: DietaryProfileSettingsProps) {
    const { dietaryProfile, setDietaryProfile } = useCartStore();

    const [localProfile, setLocalProfile] = useState<DietaryProfile>({
        diet: 'none',
        allergies: [],
        intolerances: [],
        preferences: []
    });

    const [customAllergy, setCustomAllergy] = useState('');

    useEffect(() => {
        if (isOpen && dietaryProfile) {
            setLocalProfile(dietaryProfile);
        } else if (isOpen && !dietaryProfile) {
            setLocalProfile({
                diet: 'none',
                allergies: [],
                intolerances: [],
                preferences: []
            });
        }
    }, [isOpen, dietaryProfile]);

    const handleSave = () => {
        setDietaryProfile(localProfile);
        onClose();
    };

    const toggleAllergy = (allergy: string) => {
        setLocalProfile(prev => ({
            ...prev,
            allergies: prev.allergies.includes(allergy)
                ? prev.allergies.filter(a => a !== allergy)
                : [...prev.allergies, allergy]
        }));
    };

    const addCustomAllergy = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customAllergy.trim()) {
            e.preventDefault();
            const val = customAllergy.trim();
            if (!localProfile.allergies.includes(val)) {
                setLocalProfile(prev => ({
                    ...prev,
                    allergies: [...prev.allergies, val]
                }));
            }
            setCustomAllergy('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Dietary Guardian
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tu perfil de restricciones alimenticias
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 rounded-xl p-4 mb-8 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
                        Nuestra IA usará este perfil para advertirte sobre platillos que puedan contener ingredientes no aptos para ti.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* TIPO DE DIETA */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Tipo de Dieta
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {DIET_TYPES.map((diet) => {
                                const isSelected = localProfile.diet === diet.id;
                                const Icon = diet.icon;

                                return (
                                    <button
                                        key={diet.id}
                                        type="button"
                                        onClick={() => setLocalProfile(prev => ({ ...prev, diet: diet.id as any }))}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${isSelected
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className="font-medium text-sm flex-1">{diet.label}</span>
                                        {Icon && <Icon className="w-4 h-4 shrink-0 opacity-50" />}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ALERGIAS E INTOLERANCIAS */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Alergias e Intolerancias
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {COMMON_ALLERGIES.map((allergy) => {
                                const isSelected = localProfile.allergies.includes(allergy);
                                return (
                                    <button
                                        key={allergy}
                                        type="button"
                                        onClick={() => toggleAllergy(allergy)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isSelected
                                                ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        {allergy}
                                    </button>
                                );
                            })}

                            {/* Tags de alergias customizadas (no están en la lista común) */}
                            {localProfile.allergies.filter(a => !COMMON_ALLERGIES.includes(a)).map(allergy => (
                                <span
                                    key={allergy}
                                    className="px-4 py-2 rounded-lg text-sm font-medium border bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-1"
                                >
                                    {allergy}
                                    <button
                                        onClick={() => toggleAllergy(allergy)}
                                        className="ml-1 p-0.5 hover:bg-rose-200 dark:hover:bg-rose-800 rounded-full"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div>
                            <input
                                type="text"
                                value={customAllergy}
                                onChange={(e) => setCustomAllergy(e.target.value)}
                                onKeyDown={addCustomAllergy}
                                placeholder="Escribe otra alergia y presiona Enter..."
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                            />
                        </div>
                    </section>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        <Save className="w-5 h-5" />
                        <span>Guardar Perfil de Dieta</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
