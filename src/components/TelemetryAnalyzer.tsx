import React, { useState, useEffect } from 'react';
import { analyzeTelemetry } from '../services/gemini';
import { TelemetryAnalysis } from '../types';
import { AlertTriangle, CheckCircle, Activity, Wrench, BarChart2, Clock, Trash2, History, ChevronRight, Plus, Menu, X } from 'lucide-react';

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

function parseEcuData(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim());
  if (lines.length < 5) return null;

  let headerLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if ((line.includes('time') || line.includes('seconds')) && (line.includes('rpm') || line.includes('motor'))) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) headerLineIndex = 0;

  const sampleLine = lines[headerLineIndex];
  let separator = ',';
  if (sampleLine.includes('\t')) separator = '\t';
  else if (sampleLine.includes(';')) separator = ';';
  
  const headers = sampleLine.split(separator).map(h => h.trim().toLowerCase());
  const findColumn = (synonyms: string[]) => headers.findIndex(h => synonyms.some(s => h === s || h.includes(s)));

  const timeIdx = findColumn(['time', 'seconds', 'sec', 'tempo', 'seg']);
  const rpmIdx = findColumn(['rpm', 'motor', 'engine']);
  const afrIdx = findColumn(['afr', 'lambda', 'sonda', 'wb', 'o2', 'field16']);

  if (timeIdx === -1 || rpmIdx === -1) return null;

  const timeData: string[] = [];
  const rpmData: number[] = [];
  const afrData: number[] = [];

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
        if (afr < 3.0 && afr > 0.1) afr = Number((afr * 14.7).toFixed(2));
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('apexai_telemetry_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const buildChart = (rawText: string) => {
    const parsed = parseEcuData(rawText);
    if (parsed) {
      setChartData({
        labels: parsed.timeData,
        datasets: [
          { label: 'RPM', data: parsed.rpmData, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.5)', yAxisID: 'y', tension: 0.3, pointRadius: 1 },
          { label: 'AFR', data: parsed.afrData, borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)', yAxisID: 'y1', tension: 0.3, pointRadius: 1 }
        ]
      });
    } else setChartData(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setData(event.target?.result as string);
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
      setError(err.message || 'Erro na análise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setData(item.rawData);
    setResult(item.analysis);
    buildChart(item.rawData);
    setActiveHistoryId(item.id);
    setIsSidebarOpen(false);
  };

  const handleNewAnalysis = () => {
    setData('');
    setResult(null);
    setChartData(null);
    setActiveHistoryId(null);
    setIsSidebarOpen(false);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { labels: { color: '#d4d4d8', font: { size: 10 } } } },
    scales: {
      x: { ticks: { color: '#a1a1aa', maxTicksLimit: 6, font: { size: 9 } }, grid: { color: '#27272a' } },
      y: { type: 'linear' as const, display: true, position: 'left' as const, ticks: { color: 'rgb(59, 130, 246)', font: { size: 9 } }, grid: { color: '#27272a' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, ticks: { color: 'rgb(239, 68, 68)', font: { size: 9 } }, grid: { drawOnChartArea: false } },
    },
  };

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden relative">
      
      {/* SIDEBAR RESPONSIVA */}
      <div className={`
        fixed inset-0 z-50 transition-transform duration-300 transform bg-zinc-950 md:relative md:translate-x-0 md:flex md:w-80 border-r border-zinc-800/50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full w-80 max-w-[85vw] bg-zinc-950">
          <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-xs uppercase tracking-widest">
                <History size={14} className="text-red-500" /> Logs
              </h3>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 p-2"><X size={20} /></button>
            </div>
            <button onClick={handleNewAnalysis} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg">
              <Plus size={16} /> Nova Análise
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {history.map((item) => (
              <button key={item.id} onClick={() => loadHistoryItem(item)} className={`w-full text-left p-3 rounded-xl border ${item.id === activeHistoryId ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-transparent text-zinc-400 hover:bg-zinc-900'}`}>
                <div className="text-sm font-medium truncate">Log Performance</div>
                <div className="text-[10px] opacity-50">{item.dateLabel} • {item.timeLabel}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 h-full overflow-y-auto bg-zinc-900/30 p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">
          
          <header className="mb-8 flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white p-2 bg-zinc-800 rounded-lg">
                <Menu size={20} />
             </button>
             <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                    <Activity className="text-red-500" /> Telemetry
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 uppercase tracking-widest font-medium">Mecanismo de engenharia de dados</p>
             </div>
          </header>

          {/* INPUT AREA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 mb-8 shadow-xl">
            <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Cole o datalog aqui..."
                className="w-full h-32 md:h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 font-mono text-xs md:text-sm focus:border-red-500 transition-all resize-none mb-4"
            />
            <div className="flex flex-col md:flex-row gap-3">
                <label className="flex-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <input type="file" accept=".csv, .txt, .msl" onChange={handleFileUpload} className="hidden" />
                    📁 Carregar Arquivo
                </label>
                <button onClick={handleAnalyze} disabled={isAnalyzing || !data.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {isAnalyzing ? "Processando..." : "Analisar Agora"}
                </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-xs md:text-sm">
                <AlertTriangle size={18} /> <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* GRÁFICO COM SCROLL HORIZONTAL NO MOBILE */}
                {chartData && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden">
                    <h3 className="text-sm md:text-lg font-semibold text-white mb-4 flex items-center gap-2 italic uppercase tracking-tighter">
                        <BarChart2 className="text-blue-400" size={18} /> Live Telemetry Chart
                    </h3>
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <div className="h-[250px] md:h-[400px] min-w-[500px] md:min-w-0">
                            <Line options={chartOptions} data={chartData} />
                        </div>
                    </div>
                    <p className="md:hidden text-[9px] text-center text-zinc-600 mt-2 italic">Deslize para o lado para ver o percurso completo</p>
                </div>
                )}

                {/* CARDS DE RESULTADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6">
                        <h3 className="text-white text-xs md:text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-widest"><Activity className="text-blue-400" size={16} /> Saúde do Motor</h3>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">{result.status_motor}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6">
                        <h3 className="text-white text-xs md:text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-widest"><AlertTriangle className="text-red-400" size={16} /> Alertas de Risco</h3>
                        {result.alertas_criticos?.length ? (
                            <ul className="space-y-2">
                                {result.alertas_criticos.map((a, i) => <li key={i} className="text-red-300 text-[10px] md:text-xs bg-red-500/5 p-2 rounded border border-red-500/10 font-mono"> {a}</li>)}
                            </ul>
                        ) : <p className="text-emerald-400 text-xs italic font-medium">Nenhuma anomalia crítica.</p>}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-lg shadow-black/40">
                    <h3 className="text-white text-xs md:text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest"><Wrench className="text-orange-400" size={16} /> Tuning Adjustments</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.recomendacoes_tuning?.map((rec, i) => (
                            <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-orange-500/30 transition-all group">
                                <div className="text-orange-500 text-[9px] font-black uppercase mb-1 tracking-widest">{rec.categoria}</div>
                                <div className="text-white text-sm font-bold mb-1 group-hover:text-orange-100 transition-colors">{rec.acao}</div>
                                <div className="text-zinc-500 text-[10px] md:text-xs leading-snug">{rec.justificativa}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}