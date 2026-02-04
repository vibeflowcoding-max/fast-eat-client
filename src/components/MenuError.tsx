import React from 'react';

interface MenuErrorProps {
    message: string;
    onRetry: () => void;
}

const MenuError: React.FC<MenuErrorProps> = ({ message, onRetry }) => {
    return (
        <div className="col-span-full py-20 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl text-red-600">🏮</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">¡Oops! Algo salió mal</h3>
            <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs mx-auto">
                {message || "No pudimos cargar el menú en este momento."}
            </p>
            <button
                onClick={onRetry}
                className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl active:scale-95"
            >
                Reintentar Carga ⛩️
            </button>
        </div>
    );
};

export default MenuError;
