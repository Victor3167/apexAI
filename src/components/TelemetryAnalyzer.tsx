import React, { useState, useEffect } from 'react';
import { analyzeTelemetry } from '../services/gemini';
import { TelemetryAnalysis } from '../types';
import { AlertTriangle, CheckCircle, Activity, Wrench, BarChart2, Clock, Trash2, History, ChevronRight, Plus } from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HistoryItem {
  id: string;
  timestamp: number;
  dateLabel: string;
  timeLabel: string;
  rawData: string;
  analysis: TelemetryAnalysis;
}

// --- Função de Parsing Inteligente (Suporta CSV e MSL) ---
function parseEcuData(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim());
  if (lines.length < 5) return null;

  // 1. Encontrar onde começam os dados (Header Discovery)
  let headerLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    // Procura por colunas essenciais. MSL geralmente começa com "Time" ou "Seconds"
    if ((line.includes('time') || line.includes('seconds')) && (line.includes('rpm') || line.includes('motor'))) {
      headerLineIndex = i;
      break;
    }
  }

  // Se não achar um cabeçalho reconhecível, tenta usar a primeira linha (CSV padrão)
  if (headerLineIndex === -1) headerLineIndex = 0;

  // 2. Identificar Separador (Vírgula, Ponto e Vírgula ou TAB)
  const sampleLine = lines[headerLineIndex];
  let separator = ',';
  if (sampleLine.includes('\t')) separator = '\t';
  else if (sampleLine.includes(';')) separator = ';';
  
  const headers = sampleLine.split(separator).map(h => h.trim().toLowerCase());
  
  const findColumn = (synonyms: string[]) => 
    headers.findIndex(h => synonyms.some(s => h === s || h.includes(s)));

  const timeIdx = findColumn(['time', 'seconds', 'sec', 'tempo', 'seg']);
  const rpmIdx = findColumn(['rpm', 'motor', 'engine']);
  const afrIdx = findColumn(['afr', 'lambda', 'sonda', 'wb', 'o2', 'field16']);

  if (timeIdx === -1 || rpmIdx === -1) return null;

  const timeData: string[] = [];
  const rpmData: number[] = [];
  const afrData: number[] = [];

  // 3. Processar Dados
  // Se for MSL, os dados costumam começar 2 linhas depois do header (pula a linha de unidades)
  // Se for CSV simples, começa na linha seguinte (index + 1)
  const isMSL = rawText.includes('MegaSquirt') || sampleLine.includes('\t');
  const startLine = isMSL ? headerLineIndex + 2 : headerLineIndex + 1;

  for (let i = startLine; i < lines.length; i++) {
    if (!lines[i]) continue;
    
    const row = lines[i].split(separator).map(v => v.trim().replace(',', '.'));
    
    if (row.length >= headers.length) {
      const time = row[timeIdx];
      const rpm = parseFloat(row[rpmIdx]);
      let afr = afrIdx !== -1 ? parseFloat(row[afrIdx]) : 14.7;

      if (!isNaN(rpm)) {
        timeData.push(`${time}s`);
        rpmData.push(rpm);
        
        // Conversão automática: Se o valor for baixo (ex: 0.85), entende como Lambda e converte para AFR
        if (afr < 3.0 && afr > 0.1) {
            afr = Number((afr * 14.7).toFixed(2));
        }
        afrData.push(isNaN(afr) ? 14.7 : afr);
      }
    }
  }
  
  return { timeData, rpmData, afrData };
}

export function TelemetryAnalyzer() {
  const [data, setData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TelemetryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('apexai_telemetry_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const buildChart = (rawText: string) => {
    const parsed = parseEcuData(rawText);
    if (parsed) {
      setChartData({
        labels: parsed.timeData,
        datasets: [
          {
            label: 'RPM',
            data: parsed.rpmData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            yAxisID: 'y',
            tension: 0.3,
            pointRadius: 1,
          },
          {
            label: 'AFR (Air/Fuel Ratio)',
            data: parsed.afrData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
            yAxisID: 'y1',
            tension: 0.3,
            pointRadius: 1,
          }
        ]
      });
    } else {
      setChartData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setData(text);
      setResult(null);
      setChartData(null);
      setActiveHistoryId(null);
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleAnalyze = async () => {
    if (!data.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await analyzeTelemetry(data);
      setResult(analysis);
      buildChart(data);

      const now = new Date();
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: now.getTime(),
        dateLabel: now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
        timeLabel: now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        rawData: data,
        analysis: analysis
      };

      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      setActiveHistoryId(newItem.id);
      localStorage.setItem('apexai_telemetry_history', JSON.stringify(newHistory));

    } catch (err: any) {
      setError(err.message || 'Falha ao analisar os dados de telemetria.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setData(item.rawData);
    setResult(item.analysis);
    buildChart(item.rawData);
    setError(null);
    setActiveHistoryId(item.id);
  };

  const handleNewAnalysis = () => {
    setData('');
    setResult(null);
    setChartData(null);
    setError(null);
    setActiveHistoryId(null);
  };

  const clearHistory = () => {
    if (window.confirm("Deseja apagar todo o histórico de logs?")) {
        setHistory([]);
        handleNewAnalysis();
        localStorage.removeItem('apexai_telemetry_history');
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { labels: { color: '#d4d4d8' } } },
    scales: {
      x: { ticks: { color: '#a1a1aa', maxTicksLimit: 8 }, grid: { color: '#27272a' } },
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'RPM', color: 'rgb(59, 130, 246)' }, ticks: { color: 'rgb(59, 130, 246)' }, grid: { color: '#27272a' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, title: { display: true, text: 'AFR', color: 'rgb(239, 68, 68)' }, ticks: { color: 'rgb(239, 68, 68)' }, grid: { drawOnChartArea: false } },
    },
  };

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden relative">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-zinc-950/80 border-r border-zinc-800/50 flex flex-col h-full shrink-0 z-10">
        <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-4 bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
              <History size={16} className="text-red-500" />
              Logs de Telemetria
            </h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-zinc-900">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <button onClick={handleNewAnalysis} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-medium transition-all shadow-md shadow-red-900/20">
            <Plus size={18} /> Nova Análise
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-zinc-600 text-sm flex flex-col items-center justify-center h-32 gap-2 opacity-50">
                <Clock size={24} />
                <p>Nenhum log salvo.</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`w-full text-left p-3 rounded-xl transition-all relative border ${
                  item.id === activeHistoryId ? 'bg-zinc-800 text-white border-zinc-700' : 'border-transparent text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                {item.id === activeHistoryId && <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-r-full" />}
                <div className="pl-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Log de Performance</span>
                    <ChevronRight size={14} />
                  </div>
                  <div className="text-xs opacity-60">{item.dateLabel} • {item.timeLabel}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 h-full overflow-y-auto bg-zinc-900/30 p-6 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Activity className="text-red-500" /> ApexAI Telemetry
            </h2>
            <p className="text-zinc-400">Arraste logs .csv ou .msl para análise técnica profunda do seu setup.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 shadow-xl">
            <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Cole o log aqui ou carregue um ficheiro..."
                className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 font-mono text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none mb-4"
            />
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                    <input type="file" accept=".csv, .txt, .msl" onChange={handleFileUpload} className="hidden" />
                    📁 Carregar .CSV / .MSL
                </label>
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !data.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? "Analisando..." : "Analisar Datalog"}
                </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3">
                <AlertTriangle size={20} /> <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {chartData && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart2 className="text-blue-400" /> Gráfico de Performance
                    </h3>
                    <div className="h-[400px]">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Activity className="text-blue-400" /> Saúde do Motor</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">{result.status_motor}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="text-red-400" /> Alertas</h3>
                        {result.alertas_criticos?.length ? (
                            <ul className="space-y-2">
                                {result.alertas_criticos.map((a, i) => <li key={i} className="text-red-300 text-xs bg-red-500/5 p-2 rounded border border-red-500/10">⚠️ {a}</li>)}
                            </ul>
                        ) : <p className="text-emerald-400 text-sm italic">Nenhum problema detectado.</p>}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Wrench className="text-orange-400" /> Recomendações de Tuning</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.recomendacoes_tuning?.map((rec, i) => (
                            <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-orange-500/50 transition-colors">
                                <div className="text-orange-500 text-[10px] font-bold uppercase mb-1">{rec.categoria}</div>
                                <div className="text-white font-medium mb-1">{rec.acao}</div>
                                <div className="text-zinc-500 text-xs">{rec.justificativa}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}