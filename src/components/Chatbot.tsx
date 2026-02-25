import React, { useState, useEffect, useRef } from 'react';
import { createChat } from '../services/gemini';
import { ChatMessage } from '../types';
import { Send, Bot, User, History, Trash2, Plus, MessageSquare, ChevronRight, Clock } from 'lucide-react';
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
  
  // Estados do Histórico
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar histórico ao iniciar a aplicação
  useEffect(() => {
    const savedHistory = localStorage.getItem('apexai_chat_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    // Inicia um chat vazio se não houver nada
    handleNewChat();
  }, []);

  // Rolar para a última mensagem automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Função para guardar conversa no Local Storage
  const saveToHistory = (newMessages: ChatMessage[], currentId: string | null) => {
    const now = new Date();
    const id = currentId || Date.now().toString();
    
    // O título do chat será as primeiras palavras da primeira pergunta do utilizador
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
      // Remove o item antigo se já existir (para não duplicar) e coloca o atualizado no topo
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
        id: '1', // ID fixo para a saudação inicial (importante para não enviar à API)
        role: 'model',
        text: 'Olá! Sou o ApexAI, o seu engenheiro de dados e preparador de alta performance. Como posso ajudar no acerto do seu carro hoje?',
      },
    ]);
    setActiveHistoryId(null);
    setInput('');
  };

  const loadHistoryItem = (item: ChatHistoryItem) => {
    setMessages(item.messages);
    setActiveHistoryId(item.id);
    
    // Prepara o histórico no formato exato que a API do Google exige para restaurar a memória
    const geminiHistory = item.messages
      .filter(m => m.id !== '1') // Ignoramos a saudação inicial
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

    // Recria a ligação com o modelo, injetando as conversas passadas
    chatRef.current = createChat(geminiHistory);
  };

  const clearHistory = () => {
    if (window.confirm("Tem a certeza que deseja apagar todo o histórico de conversas?")) {
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

    // Guarda logo no histórico para aparecer na lateral enquanto a IA pensa
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
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = { 
        id: Date.now().toString(), 
        role: 'model', 
        text: 'Desculpe, ocorreu um erro ao processar a sua mensagem. Tente novamente.' 
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden relative">
      
      {/* === PAINEL LATERAL DE HISTÓRICO === */}
      <div className="w-80 bg-zinc-950/80 border-r border-zinc-800/50 flex flex-col h-full shrink-0 z-10">
        <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-4 bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
              <History size={16} className="text-red-500" />
              Conversas
            </h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-zinc-900" title="Limpar Histórico">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-medium transition-all active:scale-[0.98] shadow-md shadow-red-900/20 border border-red-500/50"
          >
            <Plus size={18} />
            Novo Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {history.length === 0 ? (
            <div className="text-zinc-600 text-sm flex flex-col items-center justify-center h-32 gap-2 opacity-50">
                <Clock size={24} />
                <p>Nenhuma conversa.</p>
            </div>
          ) : (
            history.map((item) => {
              const isActive = item.id === activeHistoryId;
              return (
                <button
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className={`w-full text-left p-3 rounded-xl transition-all group relative border
                    ${isActive 
                        ? 'bg-zinc-800/80 border-zinc-700/50 text-white shadow-sm' 
                        : 'border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 hover:border-zinc-800/30'
                    }`}
                >
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-r-full" />}
                  
                  <div className={`pl-2 flex flex-col gap-0.5 ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate pr-2 ${isActive ? 'text-red-100' : 'text-zinc-300'}`}>
                            {item.title}
                        </span>
                        {(isActive || isActive === false) && (
                           <ChevronRight size={14} className={`shrink-0 transition-transform ${isActive ? 'text-red-400 translate-x-0' : 'text-zinc-700 -translate-x-2 group-hover:translate-x-0 group-hover:text-zinc-500'}`} />
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`${isActive ? 'text-zinc-300' : 'text-zinc-500'} font-medium`}>{item.dateLabel}</span>
                      <span className="text-zinc-700">•</span>
                      <span className="text-zinc-500">{item.timeLabel}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* === ÁREA PRINCIPAL DO CHAT === */}
      <div className="flex-1 h-full flex flex-col bg-zinc-900/30 p-6 md:p-8 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
            <div className="mb-6 shrink-0">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Bot className="text-red-500" />
                    ApexAI Chat
                </h2>
                <p className="text-zinc-400">Tire as suas dúvidas sobre tuning, calibração de motores e dinâmica veicular.</p>
            </div>

            <div className="flex-1 bg-zinc-900/80 border border-zinc-800/70 rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-black/20">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-red-600' : 'bg-zinc-800'}`}>
                        {msg.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-red-500" />}
                    </div>
                    <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-a:text-red-400 marker:text-zinc-500">
  <Markdown>{msg.text}</Markdown>
</div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 animate-in fade-in">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                        <Bot size={20} className="text-red-500" />
                    </div>
                    <div className="bg-zinc-800 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200" />
                    </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/50">
                <div className="flex gap-3">
                    <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pergunte ao ApexAI sobre o seu setup..."
                    className="flex-1 bg-zinc-900 border border-zinc-700/50 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-colors shadow-inner shadow-black/20"
                    />
                    <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-red-900/20 disabled:shadow-none transform active:scale-[0.96]"
                    >
                    <Send size={20} className={isLoading ? "opacity-50" : ""} />
                    </button>
                </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}