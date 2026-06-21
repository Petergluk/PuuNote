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
      res.status(500).json({ error: err.message || "Unknown error" });
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
