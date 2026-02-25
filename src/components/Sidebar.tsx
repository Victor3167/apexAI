import { Activity, MessageSquare, Image as ImageIcon, Volume2 } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'telemetry', label: 'Telemetry Analyzer', icon: Activity },
    { id: 'chat', label: 'ApexAI Chat', icon: MessageSquare },
    { id: 'visualizer', label: 'Setup Visualizer', icon: ImageIcon },
    { id: 'audio', label: 'Audio Report', icon: Volume2 },
  ];

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-screen flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-red-500" />
          ApexAI
        </h1>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">Tuning & Dynamics</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-red-500/10 text-red-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
