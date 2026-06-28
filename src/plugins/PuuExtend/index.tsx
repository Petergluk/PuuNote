/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import type { PluginDefinition, PluginAPI, CardActionHook } from "../registry";
import { Sparkles, Plus, Trash2, Edit2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { manifest as puuExtendManifest } from "./manifest";
import { generateContentFallback } from "../../utils/aiModels";

export interface PromptDefinition {
  id: string;
  name: string;
  content: string;
  systemPrompt?: string;
  enabled: boolean;
  modelOverride?: string;
  actionType?: "child" | "sibling" | "replace" | "append" | "multiple_children";
  contextScope?: string;
  promptOnAction?: boolean;
  iconName?: string;
}

const DEFAULT_PROMPTS: PromptDefinition[] = [
  { id: '1', name: 'Summarize', content: 'Summarize the following text in 3 bullet points:\n\n', enabled: true, actionType: 'child', contextScope: 'card', iconName: 'AlignLeft' },
  { id: '2', name: 'Explain', content: 'Explain the following text simply:\n\n', enabled: true, actionType: 'child', contextScope: 'card', iconName: 'BrainCircuit' },
  { id: '3', name: 'Improve', content: 'Improve the writing and grammar of the following text.', enabled: true, actionType: 'replace', contextScope: 'card', iconName: 'Sparkles' },
  { id: '4', name: 'Ask AI...', content: '', enabled: true, actionType: 'child', contextScope: 'card', promptOnAction: true, iconName: 'MessageCircle' },
];

function getPrompts(): PromptDefinition[] {
  const data = localStorage.getItem('PuuExtend_prompts');
  if (data) {
    try {
      return JSON.parse(data);
    } catch { }
  }
  return DEFAULT_PROMPTS;
}

function savePrompts(p: PromptDefinition[]) {
  localStorage.setItem('PuuExtend_prompts', JSON.stringify(p));
}

let pluginApi: PluginAPI | null = null;
const cardActionsList: CardActionHook[] = [];

function updateCardActions() {
  cardActionsList.length = 0; // Clear the list
  const prompts = getPrompts().filter(p => p.enabled);
  
  prompts.forEach(p => {
    let IconComponent = Sparkles as any;
    if (p.iconName && (LucideIcons as any)[p.iconName]) {
      IconComponent = (LucideIcons as any)[p.iconName];
    }
    
    cardActionsList.push({
      id: `puu-extend-prompt-${p.id}`,
      label: p.name,
      icon: IconComponent,
      onClick: async (nodeId: string, node: any) => {
        const api = pluginApi;
        if (!api) return;
        
        // 1. Resolve Global Settings & API Key
        const selectedModel = p.modelOverride || undefined;

        // 2. Determine Context Scope
        const scope = p.contextScope || "card";

        // 3. User Prompt on Execution
        let userAddition = "";
        if (p.promptOnAction) {
          const res = window.prompt(`Instruction for "${p.name}":\nProvides context: ${scope}`);
          if (res === null) return; // cancelled
          userAddition = res;
        }

        // 4. Construct Full Request
        let rawInstruction = "";
        if (p.content) rawInstruction += p.content + "\n\n";
        if (userAddition) rawInstruction += userAddition + "\n\n";

        let fullPrompt = rawInstruction;

        const resolveTemplate = (template: string) => {
            const varRegex = /\{\{([^}]+)\}\}/g;
            let match;
            const scopesToResolve = new Set<string>();
            while ((match = varRegex.exec(template)) !== null) {
               scopesToResolve.add(match[1].trim());
            }
            
            const scopeResolutions: Record<string, string> = {};
            for (const s of scopesToResolve) {
               try {
                   scopeResolutions[s] = api.document?.resolveContext?.(nodeId, s) || "";
               } catch {
                   scopeResolutions[s] = "";
               }
            }
            
            return template.replace(varRegex, (_, varName) => {
                 return scopeResolutions[varName.trim()] || "";
            });
        };

        fullPrompt = resolveTemplate(fullPrompt);

        // Fallback for older prompts without variables
        if (!/\{\{[^}]+\}\}/.test(rawInstruction) && scope && scope !== "none") {
            let fallbackContext = "";
            try {
                fallbackContext = api.document?.resolveContext?.(nodeId, scope) || "";
            } catch {
                fallbackContext = node.content || '';
            }
            if (fallbackContext) {
                fullPrompt += "Target Content Context:\n" + fallbackContext;
            }
        }

        const resolvedSystemInstruction = p.systemPrompt ? resolveTemplate(p.systemPrompt) : undefined;

        let jobId: string | undefined;
        try {
          jobId = api.addJob?.(`AI: ${p.name}`);
          api.updateJobProgress?.(jobId!, 10, "Generating content...");
          
          const response = await generateContentFallback(fullPrompt, selectedModel, {
            systemInstruction: resolvedSystemInstruction,
            onStatusChange: (msg) => {
              api.updateJobProgress?.(jobId!, 50, msg);
            }
          });
          const text = response.text || "";
          
          api.updateJobProgress?.(jobId!, 90, "Updating tree...");
          
          // 5. Output handling based on actionType
          const action = p.actionType || "child";
          if (action === "child") {
            if (api?.document?.addNode) api.document.addNode(text, nodeId);
          } else if (action === "multiple_children") {
            if (api?.document?.addNode) {
              let parsed: string[] = [];
              try {
                let cleanText = text.trim();
                const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                  cleanText = jsonMatch[1].trim();
                }
                const possibleArray = JSON.parse(cleanText);
                if (Array.isArray(possibleArray)) {
                  parsed = possibleArray.map(item => String(item));
                } else {
                  parsed = [text];
                }
              } catch (e) {
                // Fallback if not valid JSON array
                parsed = [text];
              }

              // Get all siblings to distribute the parsed items
              let targetSiblings = [node]; // fallback to current node
              const state = api.getState?.();
              if (state && state.nodes) {
                const siblings = Object.values(state.nodes).filter(
                  (n: any) => n.parentId === node.parentId
                );
                if (siblings.length > 0) {
                  siblings.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
                  targetSiblings = siblings;
                }
              }

              // Distribute parsed items to the siblings one by one
              const maxItems = Math.max(parsed.length, targetSiblings.length);
              for (let i = 0; i < maxItems; i++) {
                const textItem = parsed[i];
                if (!textItem) continue; // no more text to add
                const targetNode = targetSiblings[i] || targetSiblings[targetSiblings.length - 1]; // fallback to last sibling if more text than siblings
                api.document.addNode(textItem, targetNode.id);
              }
            }
          } else if (action === "sibling") {
            const parentId = node.parentId || null; // standard assumption or fallback to root
            if (api?.document?.addNode) api.document.addNode(text, parentId);
          } else if (action === "replace") {
            if (api?.document?.updateNodeContent) api.document.updateNodeContent(nodeId, text);
          } else if (action === "append") {
            const newContent = (node.content || '') + '\n\n' + text;
            if (api?.document?.updateNodeContent) api.document.updateNodeContent(nodeId, newContent);
          } else {
             api.toast?.("Failed to process node action.", "error");
          }
          
          api.completeJob?.(jobId!, "Completed", () => {});
          api.toast?.(`Success: ${p.name}`, "success");
        } catch (error) {
          console.error(error);
          if (jobId) api.failJob?.(jobId, String(error));
          api.toast?.(`Error: ${String(error)}`, "error");
        }
      }
    });
  });
  
  // Notify application that actions changed
  window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
}


const COMMON_ICONS = [
  "AlertCircle", "TriangleAlert", "Ambulance", "Amphora", "Angry", "Anchor", "Annoyed", "Aperture", 
  "ArrowBigDownDash", "ArrowBigLeftDash", "ArrowBigRightDash", "ArrowBigUpDash", "Atom", "Banana", 
  "Bird", "BellElectric", "Bolt", "Bomb", "Biohazard", "Box", "Brain", "BrainCircuit", "BrickWall", "Bug", 
  "Bus", "Cake", "Candy", "Cannabis", "Cat", "Cherry", "ChartPie", "CheckCircle", "CheckSquare", "CirclePlus", 
  "CircleHelp", "CirclePlay", "CircleEqual", "CirclePause", "CloudSun", "CloudHail", "Club", "Cog", "Compass", 
  "Cross", "Crosshair", "Crown", "Disc2", "Dice6", "Drama", "Drum", "Droplet", "Eye", "Egg", "Feather", "Fan", 
  "FastForward", "Flower", "Flame", "FlaskConical", "Frown", "Ghost", "Globe", "HandFist", "Guitar", "Heart", 
  "HeartHandshake", "HeartPlus", "Infinity", "Key", "Laugh", "KeySquare", "Landmark", "LifeBuoy", "Leaf", "TreePine", 
  "Tag", "Target", "Sparkles", "AlignLeft", "MessageCircle"
];

function renderIcon(name: string, props: any = {}) {
  const IconCmp = (LucideIcons as any)[name];
  if (IconCmp) return <IconCmp {...props} />;
  return <LucideIcons.HelpCircle {...props} />;
}

function IconPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState(value || "Sparkles");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomName(value || "Sparkles");
  }, [value]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-app-border bg-app-input-bg hover:bg-app-card text-app-text-primary shadow-sm focus:ring-1 focus:ring-app-accent focus:outline-none transition-colors group"
        title="Выбрать иконку"
      >
        <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
          {renderIcon(value || "Sparkles", { size: 18 })}
          <LucideIcons.ChevronDown size={12} className="ml-0.5 opacity-50" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-9 left-0 z-50 w-64 bg-app-card border border-app-border rounded shadow-xl p-2 flex flex-col gap-2">
           <div className="flex gap-2 items-center">
             <input 
               value={customName}
               onChange={(e) => setCustomName(e.target.value)}
               className="w-full px-2 py-1 bg-app-input-bg border border-app-border rounded-lg text-sm focus:outline-app-accent text-app-text-primary"
               placeholder="Название из Lucide"
             />
             <button onClick={() => { onChange(customName); setIsOpen(false); }} className="bg-app-accent text-white px-2 py-1 rounded-lg text-sm">OK</button>
           </div>
           <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto mt-1 justify-center p-1">
             {COMMON_ICONS.map(name => {
               const IconCmp = (LucideIcons as any)[name];
               if (!IconCmp) return null;
               return (
                 <button 
                   key={name}
                   onClick={() => { onChange(name); setIsOpen(false); }}
                   className={`p-1.5 rounded border ${value === name ? 'border-app-accent bg-app-accent/10 text-app-accent' : 'border-transparent hover:border-app-border hover:bg-app-card-hover text-app-text-primary'}`}
                   title={name}
                 >
                   <IconCmp size={16} />
                 </button>
               )
             })}
           </div>
        </div>
      )}
    </div>
  );
}

function PuuExtendSettings() {
  const [showVarsHelp, setShowVarsHelp] = useState(false);
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editActionType, setEditActionType] = useState<"child" | "sibling" | "replace" | "append" | "multiple_children">("child");
  const [editContextScope, setEditContextScope] = useState<string>("card");
  const [editPromptOnAction, setEditPromptOnAction] = useState(false);
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editModelOverride, setEditModelOverride] = useState("");
  const [editIconName, setEditIconName] = useState("Sparkles");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrompts(getPrompts());
  }, []);

  const handleChange = (newPrompts: PromptDefinition[]) => {
    setPrompts(newPrompts);
    savePrompts(newPrompts);
    updateCardActions();
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    handleChange(prompts.map(p => p.id === id ? { ...p, enabled } : p));
  };

  const deletePrompt = (id: string) => {
    handleChange(prompts.filter(p => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addPrompt = () => {
    const newPrompt: PromptDefinition = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now().toString(),
      name: "Новый промпт",
      content: "",
      enabled: true,
      actionType: "child",
      contextScope: "card",
      promptOnAction: true
    };
    handleChange([newPrompt, ...prompts]);
    startEditing(newPrompt);
  };

  const startEditing = (p: PromptDefinition) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditContent(p.content);
    setEditSystemPrompt(p.systemPrompt || "");
    setEditModelOverride(p.modelOverride || "");
    setEditActionType(p.actionType || "child");
    setEditContextScope(p.contextScope || "card");
    setEditPromptOnAction(p.promptOnAction || false);
    setEditIconName(p.iconName || "Sparkles");
  };

  const saveEdit = () => {
    handleChange(prompts.map(p => 
      p.id === editingId ? { 
        ...p, 
        name: editName, 
        content: editContent,
        systemPrompt: editSystemPrompt,
        modelOverride: editModelOverride,
        actionType: editActionType,
        contextScope: editContextScope as any,
        promptOnAction: editPromptOnAction,
        iconName: editIconName 
      } : p
    ));
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-6 text-app-text-primary">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-app-text-primary">Промпты PuuExtend</h3>
            <button 
              onClick={() => setShowVarsHelp(true)}
              className="text-app-text-secondary hover:text-app-text-primary text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-app-card transition-colors" 
              title="Справка по переменным"
            >
              <LucideIcons.HelpCircle size={16} />
            </button>
          </div>
          <button 
            onClick={addPrompt}
            className="bg-app-accent text-white px-3 py-1.5 flex items-center gap-1 auto rounded text-sm hover:bg-app-accent/90 transition-colors"
          >
            <Plus size={16} /> Добавить промпт
          </button>
        </div>

      <div className="flex flex-col gap-3">
        {prompts.map(p => (
          <div key={p.id} className="border border-app-border rounded-lg p-3 bg-app-card flex flex-col gap-2">
            {editingId === p.id ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <IconPicker value={editIconName} onChange={setEditIconName} />
                  <input 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none font-medium text-app-text-primary"
                    placeholder="Название промпта"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm text-app-text-primary">Системный промпт / Инструкции (Опционально)</label>
                    <textarea 
                      value={editSystemPrompt}
                      onChange={e => setEditSystemPrompt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm h-24 focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none resize-y text-app-text-primary font-mono"
                      placeholder="Например: Ты хороший помощник, пиши в markdown..."
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm text-app-text-primary">Текст промпта (Инструкция)</label>
                    <textarea 
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm h-32 focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none resize-y text-app-text-primary font-mono"
                      placeholder="Например: Переведи на английский:\n\n"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm text-app-text-primary">Результат (Action Target)</label>
                    <select 
                      value={editActionType}
                      onChange={e => setEditActionType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                    >
                      <option value="child">Создать дочернюю карточку</option>
                      <option value="sibling">Создать соседнюю карточку</option>
                      <option value="replace">Заменить этот текст</option>
                      <option value="append">Дописать вниз текущей</option>
                      <option value="multiple_children">Дочерние ко всем на уровне (массив JSON)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm text-app-text-primary">Дополнительный контекст</label>
                    <select 
                      value={editContextScope}
                      onChange={e => setEditContextScope(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                    >
                      <option value="none">Без дополнительного контекста (или использую переменные)</option>
                      <option value="card">Только эта карточка</option>
                      <option value="document">Текст всего документа целиком</option>
                      <option value="level_branch">Карточки-братья (тот же родитель)</option>
                      <option value="level_all">Все вертикальные карточки уровня</option>
                      <option value="branch_parent">От корня до выбранной карточки</option>
                      <option value="branch_children">Карточка + все потомки текущей</option>
                      <option value="branch_1">Карточка + потомки на 1 поколение</option>
                      <option value="branch_2">Карточка + потомки на 2 поколения</option>
                      <option value="branch_-1">Карточка + предки на 1 поколение</option>
                      <option value="branch_-2">Карточка + предки на 2 поколения</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm text-app-text-primary">Приоритетная модель (Model Override)</label>
                    <input 
                      type="text"
                      value={editModelOverride}
                      placeholder="Например: gemini-3.1-flash-lite"
                      onChange={e => setEditModelOverride(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-app-text-primary w-fit">
                      <input 
                        type="checkbox"
                        checked={editPromptOnAction}
                        onChange={e => setEditPromptOnAction(e.target.checked)}
                        className="w-4 h-4 rounded border border-app-border bg-app-input-bg text-app-accent focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none cursor-pointer"
                      />
                      <span className="font-medium">Запрашивать текст при запуске</span>
                    </label>
                  </div>
                </div>

                <div className="flex mt-2">
                  <button onClick={saveEdit} className="text-sm bg-app-accent hover:bg-app-accent/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">Сохранить изменения</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => {
                // Ignore clicks on checkbox and action buttons
                if ((e.target as HTMLElement).closest('input[type="checkbox"], button')) return;
                startEditing(p);
              }}>
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <input 
                    type="checkbox" 
                    checked={p.enabled}
                    onChange={(e) => toggleEnabled(p.id, e.target.checked)}
                    className="w-4 h-4 shrink-0 rounded border border-app-border bg-app-input-bg text-app-accent cursor-pointer focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none"
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`shrink-0 flex items-center justify-center p-1.5 rounded-md ${p.enabled ? "text-app-text-primary bg-app-text-primary/10 border border-app-text-primary/20 brightness-150" : "text-app-text-secondary opacity-60 bg-app-input-bg border border-app-border"}`}>
                      {renderIcon(p.iconName || "Sparkles", { size: 16 })}
                    </span>
                    <span className={`text-[15px] whitespace-nowrap shrink-0 ${p.enabled ? "text-app-text-primary font-medium" : "text-app-text-secondary line-through opacity-60"}`}>
                      {p.name}
                    </span>
                    <span className="text-[13px] text-app-text-secondary opacity-60 truncate ml-1 font-mono">
                       &mdash; {p.content || (p.promptOnAction ? "(Запрашивается при запуске)" : "Нет инструкции")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); startEditing(p); }} className="text-app-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-app-card" title="Настроить">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deletePrompt(p.id); }} className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-app-card" title="Удалить">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {prompts.length === 0 && (
          <div className="text-sm text-app-text-secondary py-4 text-center border border-dashed border-app-border rounded-lg">Нет промптов. Создайте новый!</div>
        )}
      </div>
     </div>

      {showVarsHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm" onClick={() => setShowVarsHelp(false)}>
          <div className="bg-app-panel border border-app-border rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-app-text-primary max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <LucideIcons.Braces size={20} className="text-app-accent" />
                Переменные для промптов
              </h3>
              <button 
                onClick={() => setShowVarsHelp(false)}
                className="p-1 rounded-lg hover:bg-app-card text-app-text-secondary transition-colors"
                title="Закрыть"
              >
                <LucideIcons.X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-app-text-secondary">
              Вы можете вставлять эти переменные прямо в текст вашей инструкции. При выполнении промпта они будут заменены на соответствующий текст из вашего документа.
            </p>
            
            <div className="flex flex-col gap-2 relative">
              {[
                { v: 'card', d: 'текст выбранной карточки' },
                { v: 'document', d: 'текст всего документа целиком' },
                { v: 'level_branch', d: 'карточки-братья (тот же родитель)' },
                { v: 'level_all', d: 'все вертикальные карточки уровня' },
                { v: 'branch_parent', d: 'от корня до выбранной карточки' },
                { v: 'branch_children', d: 'карточка + все потомки текущей' },
                { v: 'branch_1', d: 'карточка + потомки на 1 поколение' },
                { v: 'branch_2', d: 'карточка + потомки на 2 поколения' },
                { v: 'branch_-1', d: 'карточка + предки на 1 поколение' },
                { v: 'branch_-2', d: 'карточка + предки на 2 поколения' },
              ].map(item => (
                <div key={item.v} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-app-card border border-app-border hover:border-app-accent/30 transition-colors group">
                  <div className="flex flex-col gap-0.5 min-w-0">
                     <code className="text-[13px] font-mono text-app-accent font-semibold">{`{{${item.v}}}`}</code>
                     <span className="text-[13px] text-app-text-secondary leading-tight">{item.d}</span>
                  </div>
                  <button 
                     onClick={() => navigator.clipboard.writeText(`{{${item.v}}}`)}
                     className="shrink-0 p-1.5 rounded bg-app-input-bg text-app-text-secondary hover:text-app-text-primary hover:bg-app-card-hover opacity-0 group-hover:opacity-100 transition-all border border-app-border"
                     title="Копировать"
                  >
                    <LucideIcons.Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-app-accent/10 rounded-lg border border-app-accent/20 text-xs text-app-accent mt-2">
              <strong>Совет:</strong> Если вы не используете переменные в тексте, то к вашему промпту будет автоматически добавлен "Дополнительный контекст", который выбран в настройках промпта.
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

export const puuExtendPlugin: PluginDefinition = {
  ...puuExtendManifest,
  settingsComponent: PuuExtendSettings,
  
  async init(api: PluginAPI) {
    pluginApi = api;
    updateCardActions();
    console.log("PuuExtend Plugin initialized.");
  },
  
  async unload() {
    cardActionsList.length = 0;
    console.log("PuuExtend Plugin unloaded.");
  },

  cardActions: cardActionsList
};

export default puuExtendPlugin;

