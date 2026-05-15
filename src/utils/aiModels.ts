import { GoogleGenAI } from '@google/genai';

export const DEFAULT_MODELS = "gemini-2.5-pro, gemini-3-flash-preview, gemini-2.5-flash, gemini-3.1-flash-lite";

export function getGlobalModels(): string[] {
    const fromStorage = localStorage.getItem('GLOBAL_GEMINI_MODELS');
    let modelsStr = (fromStorage !== null && fromStorage !== undefined) ? fromStorage : DEFAULT_MODELS;
    
    if (!modelsStr.trim()) {
        modelsStr = DEFAULT_MODELS;
    }
    
    return modelsStr.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
}

export function getGlobalApiKeys(): string[] {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const fromStorage = localStorage.getItem('GLOBAL_GEMINI_API_KEY') || localStorage.getItem('GEMINI_PLUGIN_API_KEY') || "";
    
    const envKey = viteEnv?.VITE_GLOBAL_GEMINI_API_KEY || viteEnv?.VITE_GEMINI_API_KEY || "";
    const directEnv = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : "";

    const allKeysString = fromStorage + "," + (envKey || "") + "," + (directEnv || "");
    
    return allKeysString.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
}

export async function generateContentFallback(
    promptText: string | any, 
    customModelOverride?: string
) {
    const keys = Array.from(new Set(getGlobalApiKeys()));
    if (keys.length === 0) {
        throw new Error("API-ключ Gemini не найден. Добавьте его в настройках или .env файл.");
    }

    let models = customModelOverride ? [customModelOverride] : getGlobalModels();
    if (models.length === 0) {
        models = DEFAULT_MODELS.split(',').map(s => s.trim());
    }

    let lastError: any = null;

    for (const model of models) {
        for (const apiKey of keys) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: model,
                    contents: promptText,
                });
                return { text: response.text || '', usedModel: model };
            } catch (err: any) {
                lastError = err;
                console.warn(`Error with model ${model} and key start: ${apiKey.substring(0, 4)}... : ${err.message || String(err)}`);
                // If the error guarantees the prompt is totally invalid (e.g., 400 Bad Request), 
                // we might want to throw immediately, but 429/500/503 are retriable.
                // We'll just continue to provide fallback capability.
            }
        }
    }

    throw new Error(`Не удалось получить ответ ни от одной модели. Последняя ошибка: ${lastError?.message || String(lastError)}`);
}
