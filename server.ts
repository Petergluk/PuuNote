import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route - Analyze Dialog (Smart Import plugin)
  app.post("/api/analyze", async (req, res) => {
    try {
      const { text, maxDepth = 3, detailLevel = 'brief', keepTrash = false, customPrompt = '', systemPrompt = '', passedKeys = [] } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const envKey = process.env.GEMINI_API_KEY;
      const candidates = [...(passedKeys || []), envKey].filter(Boolean);
      
      if (candidates.length === 0) {
        return res.status(401).json({ error: "Нет доступных API ключей (ни в настройках, ни в .env)" });
      }

      let baseInstructions = systemPrompt || `Пожалуйста, проанализируй следующий текст/диалог. Твоя задача — извлечь из него всю фактологию, ключевые темы, тезисы и значимую информацию.\nВАЖНО: Ни в коем случае не переписывай и не «придумывай» текст заново. Просто выдели и структурируй ту информацию, которая там УЖЕ ЕСТЬ.\n`;
      baseInstructions += `\nСтруктурируй результат в виде древовидного вложенного JSON-массива объектов.\n`;
      baseInstructions += `Каждый объект должен иметь поле 'title' (строка, текст узла, например тема или тезис)\n`;
      baseInstructions += `и опционально массив 'children' (содержащий дочерние объекты-тезисы такой же структуры).\n`;

      if (detailLevel === 'brief') {
        baseInstructions += `Извлекай информацию кратко и тезисно. Оставь только самую суть. Максимальная глубина вложенности: ${maxDepth}.\n`;
      } else if (detailLevel === 'optimized') {
        baseInstructions += `Извлекай всю информацию по смыслу, но удаляй повторы, тавтологию, отпавшие темы и воду. Текст должен быть плотным и структурированным. Максимальная глубина вложенности: ${maxDepth}.\n`;
      } else {
        baseInstructions += `Извлекай информацию максимально полно и подробно, стараясь ничего не упустить. Максимальная глубина вложенности: ${maxDepth}.\n`;
      }

      if (keepTrash) {
        baseInstructions += `Если в тексте присутствует малозначимая информация, мусор или флуд, не удаляй его полностью, а собери в отдельную корневую ветку с названием "Разное".\n`;
      }

      if (customPrompt) {
        baseInstructions += `\nДополнительные инструкции от пользователя:\n${customPrompt}\n`;
      }

      const prompt = `${baseInstructions}
      Сделай так, чтобы у корня были ключевые тезисы (или основные темы обсуждения), а дальше эти тезисы древовидно разворачивались вглубь конкретными аргументами, деталями или выводами.
      
      Диалог/Текст:
      ${text}
      
      Ответь ТОЛЬКО валидным JSON-массивом. Не добавляй никаких других слов или форматирования вокруг массива.`;

      let lastError: any = null;

      for (const apiKey of candidates) {
        try {
          const ai = new GoogleGenAI({ apiKey: apiKey as string });
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            }
          });

          const jsonText = response.text || "[]";
          let parsed = [];
          try {
            parsed = JSON.parse(jsonText);
          } catch (e) {
             const cleaned = jsonText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
             parsed = JSON.parse(cleaned);
          }

          return res.json({ result: parsed });
        } catch (err: any) {
           lastError = err;
           if (err?.message?.toLowerCase().includes('key not valid') || err?.message?.toLowerCase().includes('api key not valid')) {
               continue; // Try next key
           }
           if (err?.message?.toLowerCase().includes('quota') || err?.message?.toLowerCase().includes('exhausted')) {
               continue; // Try next key
           }
           throw err; // Stop on other API errors
        }
      }

      throw lastError || new Error("Failed to process API keys");

    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message || "Failed to analyze dialog";
      try {
         const parsed = JSON.parse(errorMessage);
         if (parsed.error && parsed.error.message) {
             errorMessage = parsed.error.message;
         }
      } catch (e) {}
      
      if (errorMessage.toLowerCase().includes('key not valid') || errorMessage.toLowerCase().includes('api key not valid')) {
          errorMessage = "Недействительный API ключ (API key not valid). Пожалуйста, проверьте настройки ключей в плагинах.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { promptText, customModelOverride, options, passedKeys } = req.body;
      
      // We will try keys in this order: user passed keys, then the environment SDK key
      const envKey = process.env.GEMINI_API_KEY;
      const candidates = [...(passedKeys || []), envKey].filter(Boolean);
      
      if (candidates.length === 0) {
        return res.status(401).json({ error: "Нет доступных API ключей (ни в настройках, ни в .env)" });
      }

      let model = customModelOverride || process.env.DEFAULT_GEMINI_MODEL || "gemini-3.5-flash";
      if (model.startsWith("models/")) model = model.substring(7);

      let lastError: any = null;

      for (const apiKey of candidates) {
          try {
            const ai = new GoogleGenAI({ apiKey: apiKey as string });
            
            let finalContents = promptText;
            if (Array.isArray(promptText)) {
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
            
            let timer: NodeJS.Timeout;
            const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('RequestTimeout')), options?.timeoutMs || 45000);
            });

            const response: any = await Promise.race([requestPromise, timeoutPromise]);
            clearTimeout(timer!);
            
            return res.json({ text: response.text || '', usedModel: model });
          } catch (err: any) {
             lastError = err;
             if (err?.message?.toLowerCase().includes('key not valid') || err?.message?.toLowerCase().includes('api key not valid')) {
                 continue; // Try next key
             }
             throw err; // Stop on other API errors
          }
      }
      
      throw lastError || new Error("Failed to process API keys");

    } catch (err: any) {
      console.error("Gemini API backend error:", err);
      let errorMessage = err.message || "Unknown error";
      try {
         const parsed = JSON.parse(errorMessage);
         if (parsed.error && parsed.error.message) {
             errorMessage = parsed.error.message;
         }
      } catch (e) {}
      
      if (errorMessage.toLowerCase().includes('key not valid') || errorMessage.toLowerCase().includes('api key not valid')) {
          errorMessage = "Недействительный API ключ (API key not valid). Пожалуйста, проверьте настройки ключей в плагинах.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
