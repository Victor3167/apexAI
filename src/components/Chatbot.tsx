import React, { useState, useEffect, useRef } from 'react';
import { createChat } from '../services/gemini';
import { ChatMessage } from '../types';
import { Send, Bot, User, History, Trash2, Plus, MessageSquare, ChevronRight, Clock, Menu, X } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatHistoryItem {
  id: string;
  timestamp: number;
  dateLabel: string;
  timeLabel: string;
  title: string;
  messages: ChatMessage[];
}

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado para mobile
  
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('apexai_chat_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    handleNewChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveToHistory = (newMessages: ChatMessage[], currentId: string | null) => {
    const now = new Date();
    const id = currentId || Date.now().toString();
    const firstUserMsg = newMessages.find(m => m.role === 'user')?.text;
    const title = firstUserMsg ? (firstUserMsg.length > 35 ? firstUserMsg.substring(0, 35) + '...' : firstUserMsg) : 'Nova Conversa';

    const newItem: ChatHistoryItem = {
      id,
      timestamp: now.getTime(),
      dateLabel: now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      timeLabel: now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      title,
      messages: newMessages,
    };

    setHistory(prevHistory => {
      const filtered = prevHistory.filter(item => item.id !== id);
      const updated = [newItem, ...filtered];
      localStorage.setItem('apexai_chat_history', JSON.stringify(updated));
      return updated;
    });

    if (!currentId) setActiveHistoryId(id);
    return id;
  };

  const handleNewChat = () => {
    chatRef.current = createChat(); 
    setMessages([
      {
        id: '1',
        role: 'model',
        text: 'Olá! Sou o ApexAI. Como posso ajudar no acerto do seu carro hoje?',
      },
    ]);
    setActiveHistoryId(null);
    setInput('');
    setIsSidebarOpen(false); // Fecha ao iniciar novo no mobile
  };

  const loadHistoryItem = (item: ChatHistoryItem) => {
    setMessages(item.messages);
    setActiveHistoryId(item.id);
    const geminiHistory = item.messages
      .filter(m => m.id !== '1')
      .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    chatRef.current = createChat(geminiHistory);
    setIsSidebarOpen(false); // Fecha ao carregar no mobile
  };

  const clearHistory = () => {
    if (window.confirm("Apagar histórico?")) {
        setHistory([]);
        localStorage.removeItem('apexai_chat_history');
        handleNewChat();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input;
    setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    const updatedMessagesWithUser = [...messages, userMsg];
    setMessages(updatedMessagesWithUser);

    const currentChatId = activeHistoryId || saveToHistory(updatedMessagesWithUser, null);

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
      };
      const finalMessages = [...updatedMessagesWithUser, modelMsg];
      setMessages(finalMessages);
      saveToHistory(finalMessages, currentChatId);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'model', text: 'Erro ao processar.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden relative">
      
      {/* === SIDEBAR RESPONSIVA === */}
      <div className={`
        fixed inset-0 z-50 transition-transform duration-300 transform bg-zinc-950 md:relative md:translate-x-0 md:inset-auto md:flex md:w-80 border-r border-zinc-800/50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full w-80 max-w-[85vw] bg-zinc-950">
            <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-xs uppercase tracking-widest">
                <History size={14} className="text-red-500" /> Conversas
                </h3>
                <div className="flex gap-2">
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="text-zinc-600 hover:text-red-400 p-2"><Trash2 size={16} /></button>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 p-2"><X size={20} /></button>
                </div>
            </div>
            <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-900/20">
                <Plus size={18} /> Novo Chat
            </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {history.map((item) => (
                <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${item.id === activeHistoryId ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-transparent text-zinc-400'}`}
                >
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-[10px] opacity-50 uppercase tracking-tighter mt-1">{item.dateLabel} • {item.timeLabel}</div>
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* === ÁREA DO CHAT === */}
      <div className="flex-1 h-full flex flex-col bg-zinc-900/30 relative">
        
        {/* HEADER MOBILE */}
        <header className="flex items-center justify-between p-4 border-b border-zinc-800/50 md:p-8 shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white p-2 -ml-2 bg-zinc-800 rounded-lg">
                    <Menu size={20} />
                </button>
                <div>
                    <h2 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Bot className="text-red-500 hidden xs:block" /> ApexAI Chat
                    </h2>
                    <p className="text-[10px] md:text-sm text-zinc-500 font-medium uppercase tracking-widest">Performance Engine</p>
                </div>
            </div>
        </header>

        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-red-600 shadow-red-900/20' : 'bg-zinc-800 border border-zinc-700'}`}>
                            {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={18} className="text-red-500" />}
                        </div>
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm ${
                            msg.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-zinc-800 border border-zinc-700/50 text-zinc-200 rounded-tl-none'
                        }`}>
                            <div className="prose prose-invert prose-sm md:prose-base prose-zinc max-w-none prose-p:leading-relaxed">
                                <Markdown>{msg.text}</Markdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700" />
                        <div className="bg-zinc-800 rounded-2xl px-6 py-4 h-12 w-24" />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* INPUT */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-zinc-950 to-transparent">
            <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 md:p-3 shadow-2xl">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Dúvida técnica?"
                    className="flex-1 bg-transparent px-3 md:px-4 py-2 text-sm md:text-base text-white focus:outline-none"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white p-3 md:px-6 rounded-xl transition-all shadow-lg active:scale-95 shrink-0"
                >
                    <Send size={18} />
                </button>
            </div>
            <p className="text-[9px] text-center text-zinc-600 mt-4 uppercase tracking-[0.2em]">Assistente de ajuste profissional ApexAI</p>
        </div>
      </div>

      {/* OVERLAY PARA MOBILE */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}