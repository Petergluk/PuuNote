import { DEFAULT_PROMPT } from './prompts';
import type { PluginAPI } from '../registry';

import type { PuuNode } from '../../../src/types';

const xhrFetch = (url: string, options: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value as string);
      }
    }
    xhr.onload = () => {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        json: async () => JSON.parse(xhr.responseText),
        text: async () => xhr.responseText
      };
      resolve(response);
    };
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.send(options.body);
  });
};

export const processAudio = async (
  blob: Blob, 
  mimeType: string, 
  targetNodeId: string | null, 
  pluginApi: PluginAPI
) => {
  const jobId = pluginApi.addJob("Расшифровка аудио...");
  pluginApi.updateJobProgress(jobId, 10, "Подготовка файла...");

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  
  reader.onloadend = async () => {
    try {
      const base64Data = (reader.result as string).split(',')[1];
      pluginApi.updateJobProgress(jobId, 30, "Отправка в Gemini...");
      
      const isAIStudioPreview = window.location.hostname.includes('run.app');
      const env = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

      const apiKeyString = env.VITE_GLOBAL_GEMINI_API_KEY || env.VITE_GEMINI_PLUGIN_API_KEY || env.VITE_GEMINI_API_KEY || localStorage.getItem('GLOBAL_GEMINI_API_KEY') || localStorage.getItem('GEMINI_PLUGIN_API_KEY');

      const apiKeys = (apiKeyString || '').split(',').map((k: string) => k.trim()).filter(Boolean);

      if (apiKeys.length === 0 && (isAIStudioPreview || env.DEV)) {
        // Use a stub if no API key is set and we're in AI Studio or local dev environment
        pluginApi.updateJobProgress(jobId, 60, "Используется заглушка...");
        setTimeout(() => {
          const store = pluginApi.getState();
          store.setNodes((prevNodes: PuuNode[]) => {
            const targetNode = prevNodes.find(n => n.id === targetNodeId);
            const isTargetEmpty = targetNode && (!targetNode.content || targetNode.content.trim() === '');
            
            const stubText = "*(Заглушка: расшифрованный текст)* Это пример текста, сгенерированного локальной заглушкой, поскольку API ключ не был найден в настройках, но приложение запущено в режиме превью.";

            if (isTargetEmpty) {
              return prevNodes.map(n => 
                n.id === targetNodeId ? { ...n, content: stubText } : n
              );
            } else {
              const newNode: PuuNode = {
                id: crypto.randomUUID(),
                parentId: targetNodeId,
                content: stubText,
              };
              return [...prevNodes, newNode];
            }
          });
          pluginApi.updateJobProgress(jobId, 100, "Готово (Заглушка)");
          pluginApi.completeJob(jobId, "Карточка создана (Заглушка)", () => {
             pluginApi.toast("Карточка-заглушка добавлена!", "info");
          });
        }, 1500);
        return;
      }

      if (apiKeys.length === 0) {
        pluginApi.failJob(jobId, "API ключ для Gemini не предоставлен. Добавьте его в панели плагинов или в .env файл.");
        return;
      }

      const preferredModel = localStorage.getItem('VOICE_FIXER_MODEL') || 'gemini-3-flash-preview';
      const promptToUse = localStorage.getItem('VOICE_FIXER_PROMPT') || DEFAULT_PROMPT;

      const fallbackChain = [preferredModel];
      if (!fallbackChain.includes('gemini-2.5-flash')) fallbackChain.push('gemini-2.5-flash');
      if (!fallbackChain.includes('gemini-3.1-flash-lite')) fallbackChain.push('gemini-3.1-flash-lite');

      let responseData = null;
      let lastError = null;

      outerLoop: for (let k = 0; k < apiKeys.length; k++) {
        const apiKey = apiKeys[k];

        for (let i = 0; i < fallbackChain.length; i++) {
          const modelName = fallbackChain[i];
          try {
            if (i > 0 || k > 0) {
              const msg = apiKeys.length > 1 
                ? `Ключ ${k+1}/${apiKeys.length}, применяем ${modelName}...` 
                : `Используем ${modelName} (fallback)...`;
              pluginApi.updateJobProgress(jobId, 30 + (i * 10), msg);
            }
            const response = await xhrFetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  role: "user",
                  parts: [
                    { text: "Пожалуйста, транскрибируй эту аудиозапись и примени все инструкции по корректуре, указанные в системном промпте." },
                    { inlineData: { data: base64Data, mimeType: mimeType } }
                  ]
                }],
                systemInstruction: {
                  parts: [{ text: promptToUse }]
                }
              })
            });

            if (!response.ok) {
              let errorDetails = '';
              try {
                const errData = await response.json();
                errorDetails = errData.error?.message || JSON.stringify(errData);
              } catch(e) {
                errorDetails = response.statusText;
              }
              
              if (response.status === 400) {
                // 400 Bad Request обычно не исправить сменой ключа или модели
                throw new Error(`Ошибка HTTP 400: ${errorDetails}`);
              } else if (response.status === 401 || response.status === 403 || response.status === 429) {
                const err = new Error(`Ошибка ключа HTTP ${response.status}: ${errorDetails}`);
                err.name = 'KeyError';
                throw err;
              }

              throw new Error(`Модель ${modelName} не справилась (${response.status}): ${errorDetails}`);
            }
            
            pluginApi.updateJobProgress(jobId, 80, "Обработка отклика...");
            responseData = await response.json();
            
            if (i > 0) {
              localStorage.setItem('VOICE_FIXER_MODEL', modelName);
              pluginApi.toast(`Авто-переключение на доступную модель: ${modelName}`, "info");
            }
            if (k > 0 && apiKeys.length > 1) {
              pluginApi.toast(`Запрос прошел успешно на ключе №${k+1}`, "success");
            }
            
            break outerLoop; // Успешно, выходим из обоих циклов
          } catch (e: any) {
            console.warn(`Ошибка (ключ #${k+1}, модель ${modelName}):`, e);
            lastError = e;
            
            if (e.name === 'KeyError') {
              // Ошибка авторизации или лимитов (401/403/429) - переходим к следующему ключу
              break; 
            }
            
            if (e.message && e.message.includes('Ошибка HTTP 400')) {
               throw e; // Прерываем полностью, запрос невалидный
            }
            // Иначе (например, 500) переходим к следующей модели
          }
        }
      }

      if (!responseData && lastError) {
        throw lastError; // Если все провалилось, кидаем последнюю ошибку
      }

      const transcript = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (transcript) {
        const store = pluginApi.getState();
        store.setNodes((prevNodes: PuuNode[]) => {
          const targetNode = prevNodes.find(n => n.id === targetNodeId);
          const isTargetEmpty = targetNode && (!targetNode.content || targetNode.content.trim() === '');

          if (isTargetEmpty) {
            return prevNodes.map(n => 
              n.id === targetNodeId ? { ...n, content: transcript } : n
            );
          } else {
            const newNode: PuuNode = {
              id: crypto.randomUUID(),
              parentId: targetNodeId, 
              content: transcript,
            };
            return [...prevNodes, newNode];
          }
        });

        pluginApi.updateJobProgress(jobId, 100, "Готово");
        pluginApi.completeJob(jobId, "Новая карточка создана", () => {
           pluginApi.toast("Новая карточка с текстом добавлена!", "success");
        });
      } else {
        pluginApi.failJob(jobId, "Модель не вернула текст");
      }
    } catch (err: unknown) {
      pluginApi.failJob(jobId, err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };
};
