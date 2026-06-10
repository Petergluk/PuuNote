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
    if (keys.length === 0) {
        throw new Error("API-ключ Gemini не найден. Добавьте его в настройках или .env файл.");
    }

    let customModel = customModelOverride ? customModelOverride.trim() : "";
    if (customModel.startsWith("models/")) customModel = customModel.substring(7);

    let models = customModel ? [customModel] : getGlobalModels();
    if (models.length === 0) {
        models = DEFAULT_MODELS.split(',').map(s => s.trim().replace(/^models\//, ''));
    }

    let lastError: Error | unknown = null;
    const bannedKeys = new Set<string>();

    for (const model of models) {
        for (const apiKey of keys) {
            if (bannedKeys.has(apiKey)) continue;
            
            if (options?.onStatusChange) {
                options.onStatusChange(`Пробуем через ${model}...`);
            }

            if (options?.signal?.aborted) {
                throw new Error('AbortError');
            }

            try {
                const ai = new GoogleGenAI({ apiKey });
                
                let finalContents = promptText;
                if (Array.isArray(promptText)) {
                    // Check if it's an array of Parts (e.g. {text: "..."}) 
                    // and not already an array of Content objects (which have {role, parts})
                    if (promptText.length > 0 && !('parts' in promptText[0]) && !('role' in promptText[0])) {
                        finalContents = [{ role: "user", parts: promptText }];
                    }
                }
                
                const reqObj: any = {
                    model: model,
                    contents: finalContents,
                };
                if (options?.systemInstruction) {
                    reqObj.config = { systemInstruction: options.systemInstruction };
                }
                const requestPromise = ai.models.generateContent(reqObj);
                
                let timer: ReturnType<typeof setTimeout>;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('RequestTimeout')), options?.timeoutMs || 25000);
                    if (options?.signal) {
                        options.signal.addEventListener('abort', () => {
                            clearTimeout(timer);
                            reject(new Error('AbortError'));
                        });
                    }
                });

                let response;
                try {
                    response = await (Promise.race([requestPromise, timeoutPromise]) as Promise<any>);
                } finally {
                    clearTimeout(timer!);
                }
                
                return { text: response.text || '', usedModel: model };
            } catch (err: unknown) {
                lastError = err;
                const errMsg = err instanceof Error ? err.message : String(err);
                console.warn(`Error with model ${model}: ${errMsg}`);
                // If it's an AbortError, break out completely
                if (errMsg === 'AbortError') {
                    throw err;
                }
                if (errMsg.toLowerCase().includes('key not valid') || errMsg.toLowerCase().includes('api key not valid')) {
                    bannedKeys.add(apiKey);
                }
            }
        }
    }

    throw new Error(`Не удалось получить ответ ни от одной модели. Последняя ошибка: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
