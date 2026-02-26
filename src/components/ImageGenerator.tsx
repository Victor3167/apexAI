import { useState, useEffect } from 'react';
import { generateImage } from '../services/gemini';
import { Image as ImageIcon, Download, AlertTriangle, Key } from 'lucide-react';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      window.aistudio.hasSelectedApiKey().then(setHasKey);
    } else {
      setHasKey(true);
    }
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const url = await generateImage(prompt, size);
      if (url) {
        setImageUrl(url);
      } else {
        setError('Falha ao gerar imagem. Nenhum dado retornado.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao gerar a imagem.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    // Padding ajustado: p-4 em mobile, p-8 em desktop
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar">
      
      {/* Cabeçalho Responsivo */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
          <ImageIcon className="text-red-500" />
          Setup Visualizer
        </h2>
        <p className="text-zinc-400 text-sm md:text-base">
          Gere conceitos visuais de setups e projetos automotivos.
        </p>
      </div>

      {/* Alerta de API Key Responsivo */}
      {!hasKey && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 md:p-6 rounded-2xl mb-8 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3 text-orange-500">
            <AlertTriangle size={20} className="shrink-0" />
            <h3 className="text-base md:text-lg font-semibold">Configuração Necessária</h3>
          </div>
          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
            Para gerar imagens de alta qualidade, configure a sua API Key do Google Cloud ou Hugging Face no ficheiro .env.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            Configurar Chave
          </button>
        </div>
      )}

      {/* Container de Input - Flex-col em mobile, flex-row em desktop */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 mb-8 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Descrição do Projeto</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Nissan 350Z widebody em Tokyo..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-sm md:text-base"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Qualidade</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer text-sm"
              >
                <option value="1K">HD (1K)</option>
                <option value="2K">Full HD (2K)</option>
                <option value="4K">Ultra HD (4K)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:justify-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || !hasKey}
                className="w-full md:min-w-[200px] h-[46px] bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} />
                    Gerar Conceito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Erros */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8 flex items-start gap-3 animate-shake">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <p className="text-xs md:text-sm">{error}</p>
        </div>
      )}

      {/* Resultado da Imagem */}
      {imageUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 md:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
          <div className="relative group rounded-xl overflow-hidden bg-zinc-950 aspect-video flex items-center justify-center">
            <img 
                src={imageUrl} 
                alt="Generated Setup" 
                className="w-full h-full object-cover md:object-contain" 
            />
            
            {/* Overlay de Download - Sempre visível em mobile, hover em desktop */}
            <div className="absolute inset-x-0 bottom-0 md:inset-0 bg-gradient-to-t from-black/80 to-transparent md:bg-black/50 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-4 flex items-center justify-center">
              <a
                href={imageUrl}
                download="apexai-setup.png"
                className="w-full md:w-auto bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm"
              >
                <Download size={18} />
                Guardar na Galeria
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-center text-zinc-600 mt-8 uppercase tracking-[0.2em]">
        Powered by ApexAI Visual Engine
      </p>
    </div>
  );
}