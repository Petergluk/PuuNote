import { Mic } from "lucide-react";

// Типы для плагинов PuuNote (используем any или заглушки, так как мы пишем плагин для вашей локальной копии)
type PluginAPI = any;
type PluginDefinition = any;

let pluginApi: PluginAPI | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

const DEFAULT_PROMPT = `Ты расшифровщик и корректор текста. Твоя специализация - транскрипт аудиофайлов, вычитка, очистка, оптимизация разговорной речи, полученных от пользователя. Твои задачи:

## Исправить ошибки распознавания.
- исправить границы предложений, руководствуясь логикой текста.
- исправить ошибки в распознавании слов, эвристически, руководствуясь логикой текста.
- исправить пунктуацию, орфографию, согласовать падежи.
- поставить вопросительные знаки (?) в конце вопросительных предложений
- эвристически восстановить смысл если расшифровка низкого качества. Если смысл восстановить невозможно, пометить бессмысленные фрагменты как [*неразборчиво*]
- заменить цифры словами, по смыслу например вместо "1" может быть "первый", "один", "одного", "раз" и т.д. (а даты наоборот перевести в цифры).

## Очистить смысл от словесного мусора (если он есть)
- Удалить слова и обороты, исчезновение которых никак не меняет смысл сказанного, такие как: "как бы", "ну", "собственно", "какой-то", "некий" а также их сочетаний. Например: предложение «Ну и вот, собственно, я как бы это пришел домой» можно превратить в  «И вот, я пришел домой». 

## Разметить структуру текста:
- разбить длинные предложения на короткие
- разбить сплошной текст на короткие абзацы, (3-5 предложений) руководствуясь логикой текста.
- если логичная длина абзацев получается более 6 предложений, делай разбивку через союз "И" в начале первого предложения следующего абзаца
- Если в тексте более 5 абзацев и есть логические части - разбить текст на смысловые блоки и создать к ним заголовки H3.

!IMPORTANT! Ты сохраняешь полное содержание исходного текста, включая диалоги и тексты управляемых медитаций. Ты никогда не редактируешь и не корректируешь смыслы, лишь слегка оптимизируешь их изложение.

!IMPORTANT! При оптимизации текста сохраняй оригинальный тон и стиль.  Например, при расшифровке аудио-практик, избегай замены  разрешающих формулировок, таких как «можно», «и может быть» - конструкцями в повелительном наклонении, прямыми командами или повествованием от первого лица. Например, не надо заменять "И можно начать мягко раскачивать дыхание" на повелительное "Начните раскачивать дыхание". Сохраняй предполагаемый уровень взаимодействия говорящего с аудиторией.

Ты возвращаешь только расшифрованный текст и больше ничего.`;

export const voiceFixerPlugin: PluginDefinition = {
  id: "voice-fixer-plugin",
  name: "Voice Fixer (Gemini Transcription)",
  version: "1.0.0",

  async init(api: PluginAPI) {
    pluginApi = api;
    console.log("Voice Fixer plugin initialized!");
  },
  
  async unload() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  },

  commands: [
    {
      id: "voice-fixer-toggle",
      label: "Start/Stop Voice Recording",
      icon: Mic, // Убедитесь, что Mic импортируется из lucide-react в вашем приложении
      run: async () => {
        if (!pluginApi) return;

        // Если запись уже идет, останавливаем её
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            // Освобождаем микрофон
            stream.getTracks().forEach(track => track.stop());
            
            const mimeType = mediaRecorder?.mimeType || 'audio/webm';
            const cleanMimeType = mimeType.split(';')[0];
            const blob = new Blob(audioChunks, { type: cleanMimeType });

            if (blob.size === 0) {
              pluginApi?.toast("Ошибка: Аудиозапись пустая", "error");
              return;
            }

            const jobId = pluginApi?.addJob("Расшифровка аудио...");
            pluginApi?.updateJobProgress(jobId, 10, "Подготовка файла...");

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                
                pluginApi?.updateJobProgress(jobId, 30, "Отправка в Gemini...");
                
                // Получаем ключ API (сохраняем локально, чтобы не вводить каждый раз)
                let apiKey = localStorage.getItem('GEMINI_PLUGIN_API_KEY');
                if (!apiKey) {
                  apiKey = window.prompt("Введите ваш ключ API для Gemini (он сохранится в браузере):");
                  if (apiKey) localStorage.setItem('GEMINI_PLUGIN_API_KEY', apiKey);
                }

                if (!apiKey) {
                  pluginApi?.failJob(jobId, "API ключ не предоставлен");
                  return;
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [
                        { text: "Пожалуйста, транскрибируй эту аудиозапись и примени все инструкции по корректуре, указанные в системном промпте." },
                        { inlineData: { data: base64Data, mimeType: cleanMimeType } }
                      ]
                    }],
                    systemInstruction: {
                      parts: [{ text: DEFAULT_PROMPT }]
                    }
                  })
                });

                if (!response.ok) {
                  throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                
                pluginApi?.updateJobProgress(jobId, 80, "Обработка отклика...");
                const data = await response.json();
                const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (transcript) {
                  // Добавляем расшифрованный текст как новую карточку (PuuNode)
                  const store = pluginApi?.getState();
                  store.setNodes((prevNodes: any[]) => {
                    const newNode = {
                      id: crypto.randomUUID(),
                      parentId: null, // Добавляем как верхнеуровневую карточку
                      content: transcript,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    return [...prevNodes, newNode];
                  });

                  pluginApi?.updateJobProgress(jobId, 100, "Готово");
                  pluginApi?.completeJob(jobId, "Смотреть результат", () => {
                    pluginApi?.toast("Новая карточка с текстом создана!", "success");
                  });
                } else {
                  pluginApi?.failJob(jobId, "Модель не вернула текст");
                }
              } catch (err: any) {
                pluginApi?.failJob(jobId, err.message || "Неизвестная ошибка");
              }
            };
          };

          mediaRecorder.start();
          pluginApi.toast("🎙️ Запись началась! Вызовите эту же команду еще раз, чтобы остановить.", "info");

        } catch (err) {
          console.error(err);
          pluginApi?.toast("Не удалось получить доступ к микрофону", "error");
        }
      }
    }
  ]
};
