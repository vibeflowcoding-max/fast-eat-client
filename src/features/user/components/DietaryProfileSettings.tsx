'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, X, Save, Leaf, Activity, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store';
import { DietaryOption, DietaryOptionGroup, DietaryOptionsCatalog, DietaryProfile } from '@/types';
import { fetchDietaryOptions, saveDietaryProfile } from '@/services/api';

interface DietaryProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const ICON_MAP = {
    leaf: Leaf,
    activity: Activity,
} as const;

function findGroup(catalog: DietaryOptionsCatalog | null, key: DietaryOptionGroup['key']): DietaryOptionGroup | null {
    return catalog?.groups.find((group) => group.key === key) || null;
}

export default function DietaryProfileSettings({ isOpen, onClose }: DietaryProfileSettingsProps) {
    const { dietaryProfile, setDietaryProfile, isAuthenticated } = useCartStore();

    const [localProfile, setLocalProfile] = useState<DietaryProfile>({
        diet: 'none',
        allergies: [],
        intolerances: [],
        preferences: [],
        strictness: 'medium',
        dislikedIngredients: [],
        healthGoals: [],
        syncStatus: isAuthenticated ? 'synced' : 'local-only',
    });
    const syncLocalProfile = React.useEffectEvent((nextProfile: DietaryProfile) => {
        setLocalProfile(nextProfile);
    });

    useEffect(() => {
        if (isOpen && dietaryProfile) {
            syncLocalProfile(dietaryProfile);
        } else if (isOpen && !dietaryProfile) {
            syncLocalProfile({
                diet: 'none',
                allergies: [],
                intolerances: [],
                preferences: [],
                strictness: 'medium',
                dislikedIngredients: [],
                healthGoals: [],
                syncStatus: isAuthenticated ? 'synced' : 'local-only',
            });
        }
    }, [dietaryProfile, isAuthenticated, isOpen]);

    const [customAllergy, setCustomAllergy] = useState('');
    const [customDislike, setCustomDislike] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<DietaryOptionsCatalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || catalog) {
            return;
        }

        let cancelled = false;
        setCatalogLoading(true);
        setCatalogError(null);

        fetchDietaryOptions()
            .then((nextCatalog) => {
                if (!cancelled) {
                    setCatalog(nextCatalog);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setCatalogError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo alimentario.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setCatalogLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [catalog, isOpen]);

    const dietOptions = findGroup(catalog, 'diet')?.options || [];
    const allergyOptions = findGroup(catalog, 'allergy')?.options || [];
    const strictnessOptions = findGroup(catalog, 'strictness')?.options || [];
    const dislikedIngredientOptions = findGroup(catalog, 'disliked_ingredient')?.options || [];
    const healthGoalOptions = findGroup(catalog, 'health_goal')?.options || [];

    const customAllergies = localProfile.allergies.filter((entry) => !allergyOptions.some((option) => option.label === entry));
    const customDislikedIngredients = (localProfile.dislikedIngredients || []).filter((entry) => !dislikedIngredientOptions.some((option) => option.label === entry));

    const handleSave = async () => {
        setFeedback(null);
        setIsSaving(true);

        try {
            const nextProfile = {
                ...localProfile,
                syncStatus: isAuthenticated ? 'synced' : 'local-only',
            } satisfies DietaryProfile;

            if (isAuthenticated) {
                await saveDietaryProfile(nextProfile);
                setFeedback('Perfil guardado y sincronizado.');
            } else {
                setFeedback('Perfil guardado solo en este dispositivo.');
            }

            setDietaryProfile(nextProfile);
            window.setTimeout(() => onClose(), 300);
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
        } finally {
            setIsSaving(false);
        }
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

    const toggleTag = (key: 'dislikedIngredients' | 'healthGoals', value: string) => {
        setLocalProfile((prev) => {
            const current = prev[key] || [];
            const next = current.includes(value)
                ? current.filter((entry) => entry !== value)
                : [...current, value];

            return {
                ...prev,
                [key]: next,
            };
        });
    };

    const addCustomDislike = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customDislike.trim()) {
            e.preventDefault();
            const val = customDislike.trim();
            if (!(localProfile.dislikedIngredients || []).includes(val)) {
                setLocalProfile((prev) => ({
                    ...prev,
                    dislikedIngredients: [...(prev.dislikedIngredients || []), val],
                }));
            }
            setCustomDislike('');
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
                        type="button"
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

                <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
                    <span>{isAuthenticated ? 'Sincronización activa' : 'Solo local hasta iniciar sesión'}</span>
                    <span className={`rounded-full px-3 py-1 ${isAuthenticated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isAuthenticated ? 'Sync' : 'Local'}
                    </span>
                </div>

                <div className="space-y-8">
                    {/* TIPO DE DIETA */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Tipo de Dieta
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {dietOptions.map((diet) => {
                                const isSelected = localProfile.diet === diet.value;
                                const Icon = diet.iconKey ? ICON_MAP[diet.iconKey as keyof typeof ICON_MAP] : null;

                                return (
                                    <button
                                        key={diet.id}
                                        type="button"
                                        onClick={() => setLocalProfile(prev => ({ ...prev, diet: diet.value as DietaryProfile['diet'] }))}
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
                            {allergyOptions.map((allergy) => {
                                const isSelected = localProfile.allergies.includes(allergy.label);
                                return (
                                    <button
                                        key={allergy.id}
                                        type="button"
                                        onClick={() => toggleAllergy(allergy.label)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isSelected
                                                ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        {allergy.label}
                                    </button>
                                );
                            })}

                            {/* Tags de alergias customizadas (no están en la lista común) */}
                            {customAllergies.map(allergy => (
                                <span
                                    key={allergy}
                                    className="px-4 py-2 rounded-lg text-sm font-medium border bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-1"
                                >
                                    {allergy}
                                    <button
                                        type="button"
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

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Nivel de Estrictitud
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {strictnessOptions.map((strictnessOption) => {
                                const strictness = strictnessOption.value as NonNullable<DietaryProfile['strictness']>;
                                const isSelected = localProfile.strictness === strictness;
                                return (
                                    <button
                                        key={strictnessOption.id}
                                        type="button"
                                        onClick={() => setLocalProfile((prev) => ({ ...prev, strictness }))}
                                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${isSelected ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'}`}
                                    >
                                        {strictnessOption.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Ingredientes que Prefieres Evitar
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {dislikedIngredientOptions.map((entry) => {
                                const label = entry.label;
                                const isSelected = (localProfile.dislikedIngredients || []).includes(label);
                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => toggleTag('dislikedIngredients', label)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                            {customDislikedIngredients.map((entry) => (
                                <span key={entry} className="px-4 py-2 rounded-lg text-sm font-medium border bg-slate-100 border-slate-200 text-slate-700 flex items-center gap-1">
                                    {entry}
                                    <button type="button" onClick={() => toggleTag('dislikedIngredients', entry)} className="ml-1 p-0.5 hover:bg-slate-200 rounded-full">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={customDislike}
                            onChange={(e) => setCustomDislike(e.target.value)}
                            onKeyDown={addCustomDislike}
                            placeholder="Escribe otro ingrediente y presiona Enter..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                        />
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                            Objetivos de Comida
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {healthGoalOptions.map((goal) => {
                                const isSelected = (localProfile.healthGoals || []).includes(goal.label);
                                return (
                                    <button
                                        key={goal.id}
                                        type="button"
                                        onClick={() => toggleTag('healthGoals', goal.label)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isSelected ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        {goal.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {catalogLoading ? <p className="mt-4 text-sm text-slate-500">Cargando catálogo alimentario...</p> : null}
                {catalogError ? <p className="mt-4 text-sm font-medium text-rose-600">{catalogError}</p> : null}

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Guardar Perfil de Dieta</span>
                    </button>
                    {feedback ? <p className="mt-3 text-sm font-medium text-slate-600">{feedback}</p> : null}
                </div>
            </div>
        </div>
    );
}
