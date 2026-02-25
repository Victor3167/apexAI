import { useState } from 'react';
import { analyzeTelemetry } from '../services/gemini';
import { TelemetryAnalysis } from '../types';
import { AlertTriangle, CheckCircle, Activity, Wrench } from 'lucide-react';

export function TelemetryAnalyzer() {
  const [data, setData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TelemetryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!data.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeTelemetry(data);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze telemetry data.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Telemetry Analyzer</h2>
        <p className="text-zinc-400">Paste raw CSV or JSON telemetry logs for ApexAI analysis.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <textarea
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder="Paste telemetry data here (e.g. RPM, MAP, TPS, AFR, G-Force, Steering Angle...)"
          className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors resize-none"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !data.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity size={20} />
                Analyze Telemetry
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

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Engine Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="text-blue-400" size={20} />
                Engine Status
              </h3>
              <p className="text-zinc-300 leading-relaxed">{result.status_motor}</p>
            </div>

            {/* Critical Alerts */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                Critical Alerts
              </h3>
              {result.alertas_criticos && result.alertas_criticos.length > 0 ? (
                <ul className="space-y-3">
                  {result.alertas_criticos.map((alert, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-red-400 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                      <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                      <span className="text-sm">{alert}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                  <CheckCircle size={16} />
                  <span className="text-sm">No critical anomalies detected.</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamics Analysis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="text-purple-400" size={20} />
              Dynamics Analysis
            </h3>
            <p className="text-zinc-300 leading-relaxed">{result.analise_dinamica}</p>
          </div>

          {/* Tuning Recommendations */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Wrench className="text-orange-400" size={20} />
              Tuning Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recomendacoes_tuning && result.recomendacoes_tuning.map((rec, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                  <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                    {rec.categoria}
                  </div>
                  <h4 className="text-white font-medium mb-2">{rec.acao}</h4>
                  <p className="text-sm text-zinc-400">{rec.justificativa}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
