import { useState, useEffect, useRef } from "react";
import { PuuNode } from "../../types";
import { Send, Bot, User, Play, Paperclip, Trash2 } from "lucide-react";
import { pluginApi as api } from "./api";
import {
  getSysPrompt,
  getArchPrompt,
  getArchitectFrequency,
  getArchitectContext,
  getMaxCards,
  getCoachModel,
  getArchModel
} from "./config";

export function ChatSidebar() {
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
    { role: 'model', text: 'Привет! Я твой стратегический коуч. О чем поговорим сегодня? Какая у тебя основная цель или вызов?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setInput(prev => prev + `\n\n--- [Файл: ${file.name}] ---\n${text}\n--- [Конец файла] ---\n`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !api?.llm) return;
    
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // 1. Chat Response
      const state = api?.getState?.();
      const activeNodeId = api?.document?.getActiveNodeId?.();
      const selectedNode = activeNodeId ? state?.nodes?.find((n: PuuNode) => n.id === activeNodeId) : null;
      const selectedNodeText = selectedNode ? `\n[Контекст: Пользователь в данный момент сфокусирован на карточке с текстом: "${selectedNode.content}"]` : '';

      const chatPrompt = `${getSysPrompt()}${selectedNodeText}\n\nИстория диалога:\n` + newMessages.map(m => `${m.role}: ${m.text}`).join('\n') + '\nУчитывая этот разговор, дай следующий коучинговый ответ.';
      
      const coachModel = getCoachModel();
      const response = await api?.llm?.generateText(chatPrompt, coachModel ? { model: coachModel } : undefined);
      if (response) {
         setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
      setIsLoading(false); // Enable chat interaction again

      // 2. Architect Background Call (Fire and forget async)
      const userMessageCount = newMessages.filter(m => m.role === 'user').length;
      const freqNum = getArchitectFrequency() || 0;
      const ctxNum = getArchitectContext() || 10;
      if (freqNum > 0 && userMessageCount % freqNum === 0) { // Call architect
        const treeStateStr = JSON.stringify(state?.nodes?.map((n: PuuNode) => ({ id: n.id, content: n.content })) || []);
        
        const maxCards = getMaxCards() || 0;
        const limitText = maxCards > 0 ? `Извлеки не более ${maxCards} идей.` : `Ты можешь извлечь от 0 до любого количества идей на свое усмотрение.`;
        const architectPrompt = `${getArchPrompt()}${selectedNodeText}\n\n${limitText}\n\nТекущее дерево:\n${treeStateStr}\n\nПоследние сообщения чата:\n` + newMessages.slice(-Math.max(2, ctxNum)).map(m => `${m.role}: ${m.text}`).join('\n') + '\n\nВыведи только валидный JSON.';
        
        const archModel = getArchModel();
        // Fire asynchronously to avoid blocking the user
        api?.llm?.generateText(architectPrompt, archModel ? { model: archModel } : undefined)
          .then((archResponse: {text: string}) => {
            let parsed: any = null;
            try {
              const cleanJson = archResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
              parsed = JSON.parse(cleanJson);
            } catch(e) {
              console.error("Failed to parse architect JSON", archResponse.text);
            }

            if (parsed && parsed.action === 'add' && Array.isArray(parsed.nodes)) {
              let addedCount = 0;
              parsed.nodes.forEach((node: any) => {
                if (node.content && (!maxCards || addedCount < maxCards)) {
                  api?.document?.addNode?.(node.content, node.parentId || activeNodeId || null);
                  addedCount++;
                }
              });
              if (addedCount > 0) {
                 api?.toast?.(`Архитектор добавил ${addedCount} новых карточек.`, "success");
              }
            }
          })
          .catch((e: Error) => console.error("Architect failed:", e));
      }

    } catch (err) {
      console.error(err);
      api?.toast?.("Ошибка связи с ИИ", "error");
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      { role: 'model', text: 'Привет! Я твой стратегический коуч. О чем поговорим сегодня? Какая у тебя основная цель или вызов?' }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-app-panel">
      <div className="p-4 border-b border-app-border bg-app-card shrink-0 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2 text-app-text-primary">
          <Bot size={18} className="text-app-accent" />
          PuuCoach
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="p-1.5 hover:bg-app-card-hover rounded text-app-text-muted hover:text-red-400 transition-colors" title="Очистить чат">
            <Trash2 size={16} />
          </button>
          <button onClick={() => api?.ui?.closeSidebar?.()} className="p-1 hover:bg-app-card-hover rounded text-app-text-muted" title="Закрыть">
            <Play size={16} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-app-accent/20 text-app-accent' : 'bg-app-card border border-app-border text-app-text-secondary'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-app-accent text-white' : 'bg-app-card border border-app-border text-app-text-primary'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="shrink-0 w-8 h-8 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-text-secondary">
               <Bot size={16} />
             </div>
             <div className="bg-app-card border border-app-border p-3 rounded-lg text-sm text-app-text-muted animate-pulse">
               Печатает...
             </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 bg-app-card border-t border-app-border shrink-0">
        <div className="relative flex items-end gap-1 bg-app-input-bg border border-app-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-app-accent transition-shadow group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.html,.css"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 mb-0.5 ml-0.5 flex items-center justify-center w-8 h-8 rounded-lg text-app-text-muted hover:text-app-text-primary hover:bg-app-card transition-colors"
            title="Загрузить файл"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            className="flex-1 bg-transparent border-none outline-none text-sm text-app-text-primary resize-none placeholder:text-app-text-muted max-h-32 pt-2 pb-1 px-1 custom-scrollbar"
            placeholder="Ваш ответ..."
            rows={1}
            style={{ minHeight: '40px' }}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && input.trim()) handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 mb-0.5 mr-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-app-accent text-white hover:opacity-90 disabled:opacity-50 disabled:bg-app-border disabled:text-app-text-muted transition-colors opacity-0 group-focus-within:opacity-100 peer-disabled:opacity-50 lg:opacity-100"
          >
            <Send size={15} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
