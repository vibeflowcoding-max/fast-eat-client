"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, OrderMetadata } from '../types';
import { useCartStore } from '../store';
import { sendChatToN8N, CartAction } from '../services/api';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

interface ChatWidgetProps {
  menuItems: MenuItem[];
  notification?: { content: string, item_ids?: any[] } | null;
  isThinking?: boolean;
  onNavigateToItem?: (itemId: string) => void;
  orderMetadata?: OrderMetadata;
}

interface ExtendedChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: CartAction;
  item_id?: string | null;
  item_ids?: any[] | null;
  confirmation?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  menuItems,
  notification,
  isThinking,
  onNavigateToItem,
  orderMetadata
}) => {
  const { items: cart, branchId, fromNumber, isTestMode } = useCartStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showInvitation, setShowInvitation] = useState(true);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>(() => {
    const saved = localStorage.getItem('izakaya_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: '¡Konichiwa! Soy el Chef Zen. ¿Puedo ayudarte con alguna recomendación del menú?', action: 'none', confirmation: true }
    ];
  });

  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const lastNotificationRef = useRef<string | null>(null);
  const hideInvitation = React.useEffectEvent(() => {
    setShowInvitation(false);
  });
  const showIncomingNotification = React.useEffectEvent(() => {
    setShowNotification(true);
  });
  const appendNotificationMessage = React.useEffectEvent((content: string, itemIds?: any[] | null) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content,
      item_ids: itemIds,
      action: 'none',
      confirmation: true
    }]);
  });

  useEffect(() => {
    localStorage.setItem('izakaya_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen || !showInvitation) {
      return;
    }

    const timer = setTimeout(() => hideInvitation(), 12000);
    return () => clearTimeout(timer);
  }, [isOpen, showInvitation]);

  useEffect(() => {
    if (notification && notification.content && notification.content !== lastNotificationRef.current) {
      lastNotificationRef.current = notification.content;
      appendNotificationMessage(notification.content, notification.item_ids);

      if (!isOpen) {
        showIncomingNotification();
        const timer = setTimeout(() => setShowNotification(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [notification, isOpen]);

  const handleSend = async (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsTyping(true);

    try {
      const response = await sendChatToN8N(content, cart, branchId, fromNumber, 'chat', 'none', undefined, orderMetadata, isTestMode);
      setIsTyping(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response?.output || (response.confirmation ? "¡Entendido! 🏮" : "Lo siento, mi conexión con la cocina falló. ⛩️"),
        action: response?.action || 'none',
        item_id: response?.item_id,
        item_ids: response?.item_ids,
        confirmation: response?.confirmation
      }]);

    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema conectando con la cocina. 🏮", confirmation: false }]);
    }
  };

  const handleDismissNotification = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowNotification(false);
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[100] flex flex-col items-end pointer-events-none">
      {showInvitation && !isOpen && !showNotification && (
        <div className="mb-4 mr-2 bg-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-red-600 animate-fadeIn relative pointer-events-auto cursor-pointer hover:scale-105 transition-transform" onClick={() => { setShowInvitation(false); setIsOpen(true); }}>
          <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">¿Dudas con el menú? 🍱</p>
          <p className="text-[9px] font-bold text-red-600 uppercase mt-1">Pregúntale al Chef Zen</p>
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-red-600 rotate-45"></div>
        </div>
      )}
      {showNotification && !isOpen && (
        <div className="mb-4 mr-2 max-w-[250px] md:max-w-[280px] bg-white border-[3px] border-red-600 rounded-[2rem] p-5 shadow-2xl animate-popIn relative cursor-pointer hover:scale-105 transition-transform pointer-events-auto" onClick={() => { setIsOpen(true); setShowNotification(false); }}>
          <button
            type="button"
            aria-label="Cerrar notificación de Chef Zen"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-base font-black text-red-600 transition-colors hover:bg-red-50"
            onClick={handleDismissNotification}
          >
            ×
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👨‍🍳</span>
            <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Chef Zen dice:</span>
          </div>
          <p className="text-gray-900 text-sm font-bold leading-snug break-words">{notification?.content}</p>
        </div>
      )}
      {isOpen && (
        <div className={`w-[calc(100vw-2rem)] md:w-[420px] ${isInputFocused ? 'h-[50vh]' : 'h-[75vh]'} md:h-[600px] bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_40px_120px_rgba(0,0,0,0.3)] border border-gray-100 flex flex-col mb-4 overflow-hidden animate-fadeIn pointer-events-auto transition-all duration-300`}>
          <div className="bg-black text-white p-5 md:p-7 flex items-center justify-between shadow-2xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-red-600 rounded-xl flex items-center justify-center text-xl md:text-3xl border-2 border-white/20">👨‍🍳</div>
              <div>
                <h4 className="font-black text-xs md:text-base uppercase tracking-widest leading-none">Chef Zen</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">En línea</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-600 flex items-center justify-center transition-all font-bold">✕</button>
          </div>

          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            isThinking={isThinking}
            menuItems={menuItems}
            onNavigateToItem={onNavigateToItem}
          />

          <ChatInput
            onSend={handleSend}
            isTyping={isTyping}
            onFocusChange={setIsInputFocused}
          />
        </div>
      )}
      <div className="relative pointer-events-auto">
        {!isOpen && <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-25 scale-125"></div>}
        <button onClick={() => { setShowInvitation(false); setIsOpen(!isOpen); setShowNotification(false); }} className={`w-16 h-16 md:w-24 md:h-24 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 border-4 border-white active:scale-90 relative z-20 overflow-hidden ${isOpen ? 'bg-black rotate-180' : 'bg-red-600 hover:scale-110'}`}>
          {isThinking ? <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : isOpen ? <span className="text-white text-2xl font-light">✕</span> : <div className="flex flex-col items-center"><span className="text-white text-4xl">👨‍🍳</span><span className="text-white text-[7px] font-black uppercase tracking-tighter -mt-1">Chef Zen</span></div>}
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
