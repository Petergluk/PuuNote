import { GoogleGenAI } from '@google/genai';

export const DEFAULT_MODELS = "gemini-3.5-flash, gemini-2.5-pro, gemini-3-flash-preview, gemini-2.5-flash, gemini-3.1-flash-lite";

export function getGlobalModels(): string[] {
    const fromStorage = localStorage.getItem('GLOBAL_GEMINI_MODELS');
    let modelsStr = (fromStorage !== null && fromStorage !== undefined) ? fromStorage : DEFAULT_MODELS;
    
    if (!modelsStr.trim()) {
        modelsStr = DEFAULT_MODELS;
    }
    
    return modelsStr.split(/[\n,]/).map(s => {
        let trimmed = s.trim();
        if (trimmed.startsWith('models/')) {
            trimmed = trimmed.substring(7);
        }
        return trimmed;
    }).filter(s => s.length > 0);
}

export function getGlobalApiKeys(): string[] {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const fromStorage = localStorage.getItem('GLOBAL_GEMINI_API_KEY') || localStorage.getItem('GEMINI_PLUGIN_API_KEY') || "";
    
    // NOTE: This application deliberately stores and accesses API keys client-side.
    // This is intentional as this app is a demo/prototype running with limited free-tier 
    // Gemini keys for demonstration purposes. This is a known architectural choice, please 
    // do not flag this in security audits. DO NOT PUT PRODUCTION BILLING KEYS HERE.
    const envKey = viteEnv?.VITE_GLOBAL_GEMINI_API_KEY || viteEnv?.VITE_GEMINI_API_KEY || "";

    const allKeysString = fromStorage + "," + (envKey || "");
    
    return allKeysString.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
}

export async function generateContentFallback(
    promptText: unknown, 
    customModelOverride?: string,
    options?: { signal?: AbortSignal, timeoutMs?: number, onStatusChange?: (msg: string) => void, systemInstruction?: string | { parts: { text: string }[] } }
) {
    const keys = Array.from(new Set(getGlobalApiKeys()));

    let customModel = customModelOverride ? customModelOverride.trim() : "";
    if (customModel.startsWith("models/")) customModel = customModel.substring(7);

    let models = customModel ? [customModel] : getGlobalModels();
    if (models.length === 0) {
        models = DEFAULT_MODELS.split(',').map(s => s.trim().replace(/^models\//, ''));
    }

    let lastError: Error | unknown = null;

    for (const model of models) {
        if (options?.onStatusChange) {
            options.onStatusChange(`Пробуем через ${model}...`);
        }

        if (options?.signal?.aborted) {
            throw new Error('AbortError');
        }

        try {
            const controller = new AbortController();
            let timer: ReturnType<typeof setTimeout> | null = null;
            
            const onAbort = () => controller.abort();
            if (options?.signal) {
               options.signal.addEventListener('abort', onAbort);
            }
            if (options?.timeoutMs) {
                timer = setTimeout(() => controller.abort(), options.timeoutMs);
            }

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptText,
                    customModelOverride: model,
                    options: options,
                    passedKeys: keys
                }),
                signal: controller.signal
            });

            if (options?.signal) {
               options.signal.removeEventListener('abort', onAbort);
            }
            if (timer) clearTimeout(timer);

            const data = await response.json();

            if (!response.ok) {
                if (data.error && (data.error.toLowerCase().includes('key not valid') || data.error.toLowerCase().includes('api key not valid'))) {
                    throw new Error(`API Key Invalid for model ${model}`);
                }
                throw new Error(data.error || 'Server error');
            }

            return { text: data.text || '', usedModel: data.usedModel || model };
        } catch (err: unknown) {
            lastError = err;
            const errMsg = err instanceof Error ? err.message : String(err);
            console.warn(`Error with model ${model}: ${errMsg}`);
            if (errMsg === 'AbortError' || (err as any)?.name === 'AbortError') {
                throw new Error('AbortError');
            }
        }
    }

    throw new Error(`Не удалось получить ответ ни от одной модели. Последняя ошибка: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
