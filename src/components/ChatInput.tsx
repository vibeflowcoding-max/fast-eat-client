import React, { useState } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    isTyping: boolean;
    onFocusChange?: (focused: boolean) => void;
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    inputAriaLabel?: string;
    sendButtonAriaLabel?: string;
    containerClassName?: string;
    inputClassName?: string;
    buttonClassName?: string;
}

const defaultContainerClassName = 'p-5 md:p-8 border-t bg-white flex flex-col gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]';
const defaultInputClassName = 'flex-grow min-w-0 px-5 py-3 md:py-5 text-xs md:text-sm border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-red-600 font-black transition-all bg-gray-50/50 text-gray-900 placeholder:text-gray-400 disabled:opacity-50';
const defaultButtonClassName = 'w-12 h-12 md:w-16 md:h-16 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all shadow-xl active:scale-90 disabled:bg-gray-200 flex-shrink-0';

const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    isTyping,
    onFocusChange,
    value,
    onValueChange,
    placeholder = 'Pregúntale al Chef...',
    inputRef,
    inputAriaLabel,
    sendButtonAriaLabel = 'Enviar mensaje',
    containerClassName,
    inputClassName,
    buttonClassName
}) => {
    const [internalInput, setInternalInput] = useState('');
    const isControlled = value !== undefined;
    const inputValue = isControlled ? value : internalInput;

    const setInputValue = (nextValue: string) => {
        if (isControlled) {
            onValueChange?.(nextValue);
            return;
        }

        setInternalInput(nextValue);
    };

    const handleSend = () => {
        if (!inputValue.trim() || isTyping) return;
        onSend(inputValue);
        setInputValue('');
    };

    return (
        <div className={containerClassName ?? defaultContainerClassName}>
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    aria-label={inputAriaLabel ?? placeholder}
                    className={inputClassName ?? defaultInputClassName}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                    onFocus={() => onFocusChange?.(true)}
                    onBlur={() => onFocusChange?.(false)}
                />
                <button
                    onClick={handleSend}
                    disabled={isTyping}
                    aria-label={sendButtonAriaLabel}
                    className={buttonClassName ?? defaultButtonClassName}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-7 md:w-7 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
