import React, { useRef, useEffect } from 'react';
import { MenuItem, ChatMessage } from '../types';

interface ChatMessageListProps {
    messages: any[];
    isTyping: boolean;
    isThinking: boolean;
    menuItems: MenuItem[];
    onNavigateToItem?: (itemId: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
    messages,
    isTyping,
    isThinking,
    menuItems,
    onNavigateToItem
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const formatText = (text: any) => {
        if (!text || typeof text !== 'string') return <div className="h-2" />;
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={i} className={line.trim() === "" ? "h-3" : "mb-1 last:mb-0"}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </div>
            );
        });
    };

    const renderRecommendationButton = (item: MenuItem) => (
        <button
            key={`rec-${item.id}`}
            onClick={() => onNavigateToItem?.(item.id)}
            className="my-2 block w-full bg-white text-black p-3 rounded-2xl border border-gray-100 hover:border-red-600 hover:shadow-lg transition-all flex items-center justify-between group/btn animate-fadeIn pointer-events-auto active:scale-[0.98]"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-gray-100">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="w-full h-full flex items-center justify-center text-xl">🍱</span>
                    )}
                </div>
                <div className="text-left">
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover/btn:text-red-600 mb-0.5">Ver detalles</span>
                    <span className="block text-xs font-black uppercase tracking-tighter line-clamp-1 text-gray-900">{item.name}</span>
                </div>
            </div>
            <span className="text-lg text-gray-300 group-hover/btn:text-red-600 transition-all transform group-hover/btn:translate-x-1 pl-2">→</span>
        </button>
    );

    const renderMessageContent = (message: any) => {
        const { content, item_id, item_ids, confirmation, role } = message;

        if (confirmation === false && role === 'assistant') {
            return (
                <div className="text-[13px] md:text-[14px] leading-relaxed tracking-tight text-red-600 font-bold">
                    {formatText(content)}
                </div>
            );
        }

        const idsToRender: string[] = [];
        if (item_id) idsToRender.push(String(item_id));
        if (Array.isArray(item_ids)) {
            item_ids.forEach(ref => {
                const id = typeof ref === 'object' ? (ref.id || ref.productId) : ref;
                if (id && !idsToRender.includes(String(id))) idsToRender.push(String(id));
            });
        }

        const recommendedButtons = idsToRender.map(id => {
            const item = menuItems.find(mi =>
                String(mi.id).toLowerCase() === String(id).toLowerCase() ||
                mi.name.toLowerCase() === String(id).toLowerCase()
            );
            if (item) return renderRecommendationButton(item);
            return null;
        }).filter(b => b !== null);

        return (
            <div className="flex flex-col">
                <div className={`text-[13px] md:text-[14px] leading-relaxed tracking-tight ${role === 'assistant' ? 'text-gray-700' : 'text-white'}`}>
                    {formatText(content)}
                </div>
                {recommendedButtons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Platillos sugeridos:</span>
                        {recommendedButtons}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 md:p-8 space-y-6 bg-[#fdfcf0]/30 scroll-smooth">
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 md:p-6 rounded-[1.8rem] md:rounded-[2.2rem] shadow-sm ${m.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} break-words overflow-hidden font-medium`}>
                        {renderMessageContent(m)}
                    </div>
                </div>
            ))}
            {(isTyping || isThinking) && (
                <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-[1.2rem] border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="flex space-x-1.5">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatMessageList;
