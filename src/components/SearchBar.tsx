import React from 'react';

interface SearchBarProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = "Buscar platos, ingredientes..." }) => {
    return (
        <div className="relative flex-grow max-w-md w-full">
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale opacity-50 z-10 transition-transform hover:scale-110">
                    🔍
                </span>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-red-600 focus:bg-white rounded-2xl py-3 pl-12 pr-12 text-[11px] font-bold text-gray-900 placeholder:text-gray-400 placeholder:uppercase placeholder:tracking-widest focus:outline-none transition-all shadow-inner"
                />
                {value && (
                    <button
                        onClick={() => onChange('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-black hover:text-white text-gray-500 rounded-full transition-all active:scale-90 z-10 text-[10px] font-black"
                    >
                        ✕
                    </button>
                )}
            </div>
            {/* Soft decorative underline on focus */}
            <div className={`absolute bottom-0 left-4 right-4 h-[2px] bg-red-600/20 rounded-full transition-transform origin-left duration-300 scale-x-0 group-focus-within:scale-x-100`} />
        </div>
    );
};

export default SearchBar;
