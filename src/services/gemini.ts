import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TelemetryAnalysis } from "../types";

// Instância principal
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeTelemetry(data: string): Promise<TelemetryAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Você é o ApexAI, um engenheiro de dados automotivos e preparador (tuner) de alta performance especializado em dinâmica veicular e calibração de motores.

Seu objetivo é analisar logs de telemetria brutos (fornecidos em formato CSV ou JSON) extraídos de ECUs de carros preparados ou de simuladores profissionais de corrida.

Analise: Saúde do Motor (AFR, RPM, MAP), Dinâmica (G-Force, Steering) e forneça recomendações de Setup.

Aqui estão os dados:
${data}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status_motor: { type: Type.STRING },
          alertas_criticos: { type: Type.ARRAY, items: { type: Type.STRING } },
          analise_dinamica: { type: Type.STRING },
          recomendacoes_tuning: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoria: { type: Type.STRING },
                acao: { type: Type.STRING },
                justificativa: { type: Type.STRING },
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
    throw new Error("Resposta inválida do modelo.");
  }
}

// === FUNÇÃO DE ÁUDIO REFORÇADA ===
export async function generateSpeech(text: string): Promise<string | null> {
  try {
    // Limpeza de caracteres que o TTS às vezes tenta "ler" e trava
    const cleanText = text.replace(/[*_#]/g, '').trim();

    // No SDK atualizado, usamos o modelo 2.0-flash para TTS
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite", 
      contents: [
        {
          role: "user",
          parts: [{ text: `Diga exatamente isto: ${cleanText}` }],
        },
      ],
      config: {
        // ESSENCIAL: Isso diz ao Gemini para não gerar texto, apenas áudio
        responseModalities: ["audio"], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: "Puck" // Puck é o mais estável para português
            },
          },
        },
      },
    });

    // Se a API retornar candidatos, procuramos o dado binário (inlineData)
    const candidate = response.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      const audioPart = candidate.content.parts.find(p => p.inlineData && p.inlineData.data);
      if (audioPart && audioPart.inlineData) {
        return audioPart.inlineData.data;
      }
    }

    console.warn("Aviso: O modelo não anexou o áudio binário à resposta.");
    return null;

  } catch (error: any) {
    console.error("Erro no Speech Engine:", error.message);
    
    // Se der erro 400 de novo, pode ser que o "Puck" não esteja disponível na sua região. 
    // Tente comentar a linha do voiceName para usar a padrão.
    return null;
  }
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
    model: "gemini-2.0-flash", 
    history: history,
    config: {
      systemInstruction: "Você é o ApexAI, um engenheiro de dados automotivos especializado em alta performance. Responda de forma técnica em português.",
    },
  });
}