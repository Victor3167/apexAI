import { Activity, MessageSquare, Image as ImageIcon, Volume2, Menu } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'telemetry', label: 'Telemetria', icon: Activity },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'visualizer', label: 'Visualizer', icon: ImageIcon },
    { id: 'audio', label: 'Áudio', icon: Volume2 },
  ];

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Visível apenas em telas md para cima) --- */}
      <div className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 h-screen flex-col shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-red-500" />
            ApexAI
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-bold">Tuning & Dynamics</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-500 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
            <div className="bg-zinc-800/50 p-3 rounded-lg">
                <p className="text-[10px] text-zinc-500 uppercase font-black text-center">v2.0 Stable Build</p>
            </div>
        </div>
      </div>

      {/* --- MOBILE BOTTOM NAV (Visível apenas em telas pequenas) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 z-[100] px-2 pb-safe">
        <nav className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
                  isActive ? 'text-red-500' : 'text-zinc-500'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-red-500/10' : ''}`}>
                    <Icon size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {tab.id === 'visualizer' ? 'Setup' : tab.label.split(' ')[0]}
                </span>
                
                {/* Indicador de aba ativa */}
                {isActive && (
                    <div className="absolute top-0 w-8 h-1 bg-red-500 rounded-b-full shadow-[0_2px_10px_rgba(239,68,68,0.5)]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}