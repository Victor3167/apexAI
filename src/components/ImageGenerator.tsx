import { useState, useEffect } from 'react';
import { generateImage } from '../services/gemini';
import { Image as ImageIcon, Download, AlertTriangle } from 'lucide-react';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Check if user has selected an API key for the Pro Image model
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      window.aistudio.hasSelectedApiKey().then(setHasKey);
    } else {
      // Fallback if not in AI Studio environment
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
        setError('Failed to generate image. No data returned.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Requested entity was not found')) {
        setHasKey(false);
        setError('API Key error. Please select your API key again.');
      } else {
        setError(err.message || 'An error occurred while generating the image.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Setup Visualizer</h2>
        <p className="text-zinc-400">Generate high-quality images of car setups, tracks, or concepts using Nano Banana Pro.</p>
      </div>

      {!hasKey && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl mb-8 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3 text-orange-500">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-semibold">API Key Required</h3>
          </div>
          <p className="text-zinc-300">
            To use the high-quality image generation model (gemini-3-pro-image-preview), you must select your own API key from a paid Google Cloud project.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
              Learn more about billing
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
          >
            Select API Key
          </button>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the car, track, or setup you want to visualize..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer"
          >
            <option value="1K">1K Resolution</option>
            <option value="2K">2K Resolution</option>
            <option value="4K">4K Resolution</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !hasKey}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 min-w-[160px]"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon size={20} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <p>{error}</p>
        </div>
      )}

      {imageUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative group rounded-xl overflow-hidden bg-zinc-950 aspect-video flex items-center justify-center">
            <img src={imageUrl} alt="Generated Setup" className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a
                href={imageUrl}
                download="apexai-setup.png"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <Download size={20} />
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
