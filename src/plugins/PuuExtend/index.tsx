import type { PluginDefinition, PluginAPI, CardActionHook } from "../registry";
import { documentApi } from "../../domain/documentTree";
import { manifest } from "./manifest";
import { Sparkles, Wand2, Zap, BrainCircuit, Lightbulb, MessageSquare, Smile, PenTool, Hash, Star, Edit3, Type, List, FileText, CheckSquare, Search, Flame, Cpu, Code, Target, Rocket, Scissors, Compass, Ghost, Gem, MessageCircle, Mic, Image as ImageIcon, Briefcase, Glasses, Coffee } from "lucide-react";
import { SettingsComponent } from "./SettingsModal";
import { GoogleGenAI } from '@google/genai';

const ICONS = {
    Sparkles, Wand2, Zap, BrainCircuit, Lightbulb, MessageSquare, 
    Smile, PenTool, Hash, Star, Edit3, Type, List, FileText, 
    CheckSquare, Search, Flame, Cpu, Code, Target, Rocket, 
    Scissors, Compass, Ghost, Gem, MessageCircle, Mic, ImageIcon, 
    Briefcase, Glasses, Coffee
};

export interface PromptConfig {
    id: string;
    label: string;
    iconName: keyof typeof ICONS;
    template: string;
    parseAsMultiple: boolean;
    isActive?: boolean;
}

let pluginApi: PluginAPI | null = null;
export let currentPrompts: PromptConfig[] = [];

// Mutable array to allow adding/removing actions dynamically
const cardActionsList: CardActionHook[] = [];

function loadPrompts() {
    try {
        const stored = localStorage.getItem('ai_prompt_configs');
        if (stored) {
            currentPrompts = JSON.parse(stored);
        } else {
            currentPrompts = [
                {
                    id: 'default-1',
                    label: 'Сгенерировать шутки',
                    iconName: 'Sparkles',
                    template: 'Напиши 5 вариантов шуток на основе этой ситуации: {{text}}.',
                    parseAsMultiple: true,
                    isActive: true
                }
            ];
            savePrompts(currentPrompts);
        }
    } catch {
        currentPrompts = [];
    }
}

export function savePrompts(prompts: PromptConfig[]) {
    currentPrompts = prompts;
    localStorage.setItem('ai_prompt_configs', JSON.stringify(prompts));
    updateCardActions();
    
    // Dispatch a custom event to force the app to re-render plugin actions
    // In a real app the host would listen to an observable plugin registry, but firing an event works for mock.
    window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
}

function updateCardActions() {
    cardActionsList.length = 0; // clear
    currentPrompts.forEach(p => {
        if (p.isActive === false) return; // Skip inactive prompts
        const IconComponent = ICONS[p.iconName] || Sparkles;
        cardActionsList.push({
            id: `prompt-${p.id}`,
            label: p.label,
            icon: <IconComponent size={16} />,
            isVisible: () => true,
            onClick: (nodeId) => runPrompt(p, nodeId)
        });
    });
}

async function runPrompt(prompt: PromptConfig, nodeId: string) {
    if (!pluginApi) return;
    const store = pluginApi.getState();
    const node = store.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Use Vite env variables or process.env depending on setup
    const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const apiKey = viteEnv?.VITE_GLOBAL_GEMINI_API_KEY || viteEnv?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || localStorage.getItem('GLOBAL_GEMINI_API_KEY');
    
    if (!apiKey) {
        pluginApi.toast("API-ключ Gemini не найден. Добавьте его в .env файл.", "error");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const jobId = pluginApi.addJob(`AI: ${prompt.label}`);
    
    try {
        pluginApi.updateJobProgress(jobId, 20, "Отправка запроса...");
        
        let finalText = prompt.template.replace(/\{\{text\}\}/g, node.content);
        if (prompt.parseAsMultiple) {
             finalText += "\n\nCRITICAL DIRECTIVE: You MUST return a strictly valid JSON array of strings ONLY. No other markdown, no explanations. Example: [\"Item 1\", \"Item 2\"]";
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalText,
        });

        const textOutput = response.text || '';
        
        pluginApi.updateJobProgress(jobId, 80, "Обработка ответа...");
        
        if (prompt.parseAsMultiple) {
            let parsed: string[] = [];
            try {
                const match = textOutput.match(/\[.*\]/s);
                const jsonStr = match ? match[0] : textOutput;
                parsed = JSON.parse(jsonStr);
                if (!Array.isArray(parsed)) throw new Error("JSON is not an array");
                parsed = parsed.map(p => typeof p === 'string' ? p : JSON.stringify(p, null, 2));
            } catch {
                parsed = textOutput.split(/\n\n+/).filter((x:string) => x.trim().length > 0);
                pluginApi.toast("Не удалось распарсить JSON, текст разбит по абзацам", "warning");
            }
            
            let currentNodes = store.nodes;
            parsed.forEach(content => {
                const res = documentApi.addChild(currentNodes, nodeId);
                currentNodes = documentApi.updateContent(res.nextNodes, res.newId, content);
            });
            store.setNodes(currentNodes, { historyGroupKey: jobId });
            
        } else {
             const res = documentApi.addChild(store.nodes, nodeId);
             const updatedNodes = documentApi.updateContent(res.nextNodes, res.newId, textOutput);
             store.setNodes(updatedNodes, { historyGroupKey: jobId });
        }
        
        pluginApi.updateJobProgress(jobId, 100, "Готово");
        pluginApi.completeJob(jobId, "Завершено");

    } catch(err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        pluginApi.failJob(jobId, errorMsg);
        pluginApi.toast(`Ошибка: ${errorMsg}`, "error");
    }
}

export const aiPromptPlugin: PluginDefinition = {
    ...manifest,
    cardActions: cardActionsList,
    settingsComponent: SettingsComponent,
    async init(api: PluginAPI) {
        pluginApi = api;
        loadPrompts();
        updateCardActions();
    }
}
