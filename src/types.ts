export interface TelemetryAnalysis {
  status_motor: string;
  alertas_criticos: string[];
  analise_dinamica: string;
  recomendacoes_tuning: Array<{
    categoria: string;
    acao: string;
    justificativa: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

