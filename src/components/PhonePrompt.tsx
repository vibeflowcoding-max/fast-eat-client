import React from 'react';
import { RestaurantInfo } from '../types';

interface PhonePromptProps {
    restaurantInfo: RestaurantInfo | null;
    initialCustomerName: string;
    setInitialCustomerName: (name: string) => void;
    countryCode: string;
    setCountryCode: (code: string) => void;
    phoneBody: string;
    setPhoneBody: (body: string) => void;
    handlePhoneSubmit: () => void;
}

const PhonePrompt: React.FC<PhonePromptProps> = ({
    restaurantInfo,
    initialCustomerName,
    setInitialCustomerName,
    countryCode,
    setCountryCode,
    phoneBody,
    setPhoneBody,
    handlePhoneSubmit,
}) => {
    const cleanCC = countryCode.replace(/\D/g, '');
    const cleanBody = phoneBody.replace(/\D/g, '');
    const minLength = cleanCC === '506' ? 8 : 6;
    const isPhoneValid = cleanBody.length >= minLength;
    const isNameValid = initialCustomerName.trim().length >= 2;
    const canSubmit = isPhoneValid && isNameValid;

    return (
        <div className="min-h-screen bg-[#fdfcf0] flex items-center justify-center p-6 japanese-pattern">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.1)] border-2 border-red-600 animate-popIn">
                <div className="text-center mb-10">
                    <span className="text-5xl mb-6 block">🎎</span>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                        Bienvenido a {restaurantInfo?.name || "..."}
                    </h2>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">
                        Para brindarte una experiencia personalizada y mantener tu pedido seguro, por favor ingresa tu número de teléfono.
                    </p>
                </div>
                <div className="space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">¿Cómo te llamas? (Para tu pedido)</label>
                        <input
                            type="text"
                            value={initialCustomerName}
                            onChange={(e) => setInitialCustomerName(e.target.value)}
                            placeholder="Ej. Daniel"
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-red-600 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-[0.35] space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">País</label>
                            <input
                                type="text"
                                maxLength={4}
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="506"
                                className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center font-black text-gray-900 focus:border-red-600 outline-none transition-all"
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Número</label>
                            <input
                                type="text"
                                maxLength={12}
                                value={phoneBody}
                                onChange={(e) => setPhoneBody(e.target.value.replace(/\D/g, ''))}
                                placeholder="88888888"
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 focus:border-red-600 outline-none transition-all tracking-widest"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handlePhoneSubmit}
                        disabled={!canSubmit}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-xl transition-all active:scale-95 ${canSubmit ? 'bg-black text-white hover:bg-red-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                    >
                        Entrar al Menú 🍱
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhonePrompt;
