import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TelemetryAnalysis } from "../types";

// Create a default instance for non-image tasks
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeTelemetry(data: string): Promise<TelemetryAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Você é o ApexAI, um engenheiro de dados automotivos e preparador (tuner) de alta performance especializado em dinâmica veicular e calibração de motores.

Seu objetivo é analisar logs de telemetria brutos (fornecidos em formato CSV ou JSON) extraídos de ECUs de carros preparados (como motores com injeção programável) ou de simuladores profissionais de corrida.

Ao receber os dados, você deve executar as seguintes análises:
1. Análise de Saúde do Motor: Verifique a relação Ar/Combustível (AFR) versus RPM e carga (MAP/TPS). Identifique qualquer sinal de mistura excessivamente pobre ou rica, ou quedas anormais de pressão de óleo/combustível que possam indicar risco de quebra.
2. Dinâmica de Condução e Suspensão: Analise os dados de força G (lateral e longitudinal), ângulo de esterçamento (steering angle) e patinação das rodas (wheel slip). Identifique comportamentos de subesterço (understeer) ou sobresterço (oversteer) em trechos específicos.
3. Recomendações de Setup: Com base na análise, forneça recomendações práticas e diretas de acerto. Exemplos: "Atrase o ponto de ignição em 2 graus na faixa de 4500-5500 RPM para evitar detonação", ou "Aumente o camber negativo na dianteira para melhorar o contorno de curvas de alta velocidade".

Aja com extrema precisão técnica. Se os dados fornecidos forem insuficientes para uma recomendação segura, informe no JSON que faltam parâmetros específicos.

Aqui estão os dados:
${data}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status_motor: {
            type: Type.STRING,
            description: "Resumo da saúde do motor com base nos dados",
          },
          alertas_criticos: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista de anomalias perigosas encontradas, ou vazio",
          },
          analise_dinamica: {
            type: Type.STRING,
            description: "Como o carro está se comportando fisicamente",
          },
          recomendacoes_tuning: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoria: { type: Type.STRING, description: "Motor/Suspensao/Freio" },
                acao: { type: Type.STRING, description: "O que fazer" },
                justificativa: { type: Type.STRING, description: "Por que fazer" },
              },
            },
          },
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as TelemetryAnalysis;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("Invalid JSON response from model");
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Zephyr" },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
}

export async function generateImage(prompt: string, imageSize: "1K" | "2K" | "4K"): Promise<string | null> {
  const enhancedPrompt = `${prompt}, photorealistic automotive photography, highly detailed, 8k resolution, ray tracing`;

  try {
    const response = await fetch("http://localhost:3001/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: enhancedPrompt }),
    });

    if (!response.ok) throw new Error("Erro no servidor Proxy");

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(error);
    throw new Error("Certifique-se que o servidor proxy está rodando!");
  }
}

export function createChat(history: any[] = []) {
  return ai.chats.create({
    model: "gemini-2.5-flash", // Mantemos o Flash para ser rápido e não dar erro de limite!
    history: history,
    config: {
      systemInstruction: "Você é o ApexAI, um engenheiro de dados automotivos e preparador (tuner) de alta performance especializado em dinâmica veicular e calibração de motores. Responda de forma técnica e objetiva em português.",
    },
  });
}