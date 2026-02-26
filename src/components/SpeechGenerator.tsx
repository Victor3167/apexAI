import React, { useState } from 'react';
import { Volume2, Play, Pause, AlertTriangle, Mic } from 'lucide-react';

export function SpeechGenerator() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Função para Gerar Voz (Usando o Motor do Navegador) ---
  const handleGenerate = () => {
    if (!text.trim()) return;
    
    if (window.speechSynthesis) {
      setIsGenerating(true);
      setError(null);

      // Cancela qualquer fala anterior
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR'; // Força português do Brasil
      utterance.rate = 1.0;    // Velocidade normal
      utterance.pitch = 1.0;   // Tom normal

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsGenerating(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        console.error("Erro na voz nativa:", event);
        setError("Não foi possível reproduzir o áudio no seu navegador.");
        setIsGenerating(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setError("O seu navegador não suporta síntese de voz.");
    }
  };

  // --- Função para Pausar/Retomar ---
  const togglePlay = () => {
    if (window.speechSynthesis.speaking) {
      if (isPlaying) {
        window.speechSynthesis.pause();
      } else {
        window.speechSynthesis.resume();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar">
      
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
          <Volume2 className="text-red-500" /> Relatório de Áudio
        </h2>
        <p className="text-zinc-400 text-sm md:text-base italic">
          Briefing de voz instantâneo usando o motor nativo do sistema.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 mb-8 shadow-xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui a análise para ouvir..."
          className="w-full h-40 md:h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm md:text-base focus:outline-none focus:border-red-500 transition-all resize-none mb-4"
        />
        <div className="flex justify-stretch md:justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full md:w-auto bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            {isGenerating ? "Iniciando..." : <><Mic size={18} /> Ouvir Relatório</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <p className="text-xs md:text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Interface do Player aparece quando está falando ou pausado */}
      {(isPlaying || window.speechSynthesis.paused) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
          
          {isPlaying && (
            <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          )}

          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6 relative z-10">
            <div className={`absolute inset-0 rounded-full border-2 border-red-500/20 ${isPlaying ? 'animate-ping' : ''}`} />
            <Volume2 size={32} className={`${isPlaying ? 'text-red-500' : 'text-zinc-600'}`} />
          </div>

          <button
            onClick={togglePlay}
            className={`relative z-10 w-full md:w-auto px-10 py-4 rounded-full font-black transition-all flex items-center justify-center gap-3 shadow-xl ${
                isPlaying ? 'bg-white text-black' : 'bg-red-600 text-white'
            }`}
          >
            {isPlaying ? <><Pause size={24} fill="currentColor" /> PAUSAR</> : <><Play size={24} fill="currentColor" /> RETOMAR</>}
          </button>
        </div>
      )}
      
      <div className="h-24 md:hidden" />
    </div>
  );
}