import React from 'react';
import { useTranslations } from 'next-intl';

interface MenuErrorProps {
    message: string;
    onRetry: () => void;
}

const MenuError: React.FC<MenuErrorProps> = ({ message, onRetry }) => {
    const t = useTranslations('checkout');

    return (
        <div className="col-span-full py-20 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl text-red-600">🏮</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">{t('menuErrorTitle')}</h3>
            <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs mx-auto">
                {message || t('menuErrorFallback')}
            </p>
            <button
                onClick={onRetry}
                className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl active:scale-95"
            >
                {t('retryLoad')} ⛩️
            </button>
        </div>
    );
};

export default MenuError;
