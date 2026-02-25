import { useState, useRef } from 'react';
import { generateSpeech } from '../services/gemini';
import { Volume2, Play, Pause, AlertTriangle } from 'lucide-react';

export function SpeechGenerator() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const url = `data:audio/mp3;base64,${base64Audio}`;
        setAudioUrl(url);
      } else {
        setError('Failed to generate audio. No data returned.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating speech.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Audio Report</h2>
        <p className="text-zinc-400">Convert your tuning notes or telemetry analysis into a professional audio report.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your analysis or notes here to generate speech..."
          className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors resize-none mb-4"
        />
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Audio...
              </>
            ) : (
              <>
                <Volume2 size={20} />
                Generate Speech
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

      {audioUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-6 relative">
            <div className={`absolute inset-0 rounded-full border-2 border-red-500/30 ${isPlaying ? 'animate-ping' : ''}`} />
            <Volume2 size={40} className="text-red-500" />
          </div>
          
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden"
          />

          <button
            onClick={togglePlay}
            className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-full font-bold transition-colors flex items-center gap-3"
          >
            {isPlaying ? (
              <>
                <Pause size={24} />
                Pause Report
              </>
            ) : (
              <>
                <Play size={24} />
                Play Report
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
