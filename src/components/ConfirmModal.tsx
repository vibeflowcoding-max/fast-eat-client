import React from 'react';

interface ConfirmModalProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText: string;
    cancelText: string;
    icon?: string;
    variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    description,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    icon = '⛩️',
    variant = 'danger'
}) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#fdfcf0] w-full max-w-sm rounded-[2rem] p-8 md:p-12 text-center shadow-2xl border-4 border-red-600 animate-popIn">
                <span className="text-5xl mb-6 block">{icon}</span>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">{title}</h3>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed">{description}</p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className={`w-full py-4 ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-900'} text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg`}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
