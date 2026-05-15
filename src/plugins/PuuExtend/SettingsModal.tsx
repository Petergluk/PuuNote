import { useState } from 'react';
import { PromptConfig } from './index';
import { Plus, Trash2, Save, Sparkles, Wand2, Zap, BrainCircuit, Lightbulb, MessageSquare, Smile, PenTool, Hash, Star, Edit3, Type, List, FileText, CheckSquare, Search, Flame, Cpu, Code, Target, Rocket, Scissors, Compass, Ghost, Gem, MessageCircle, Mic, Image as ImageIcon, Briefcase, Glasses, Coffee } from 'lucide-react';

const ICONS = {
    Sparkles, Wand2, Zap, BrainCircuit, Lightbulb, MessageSquare,
    Smile, PenTool, Hash, Star, Edit3, Type, List, FileText, 
    CheckSquare, Search, Flame, Cpu, Code, Target, Rocket, 
    Scissors, Compass, Ghost, Gem, MessageCircle, Mic, ImageIcon, 
    Briefcase, Glasses, Coffee
};

function IconPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    
    // Find the current icon component
    const CurrentIcon = ICONS[value as keyof typeof ICONS] || Sparkles;

    return (
        <div className="relative">
            <button 
                onClick={() => setOpen(!open)}
                type="button"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-blue-500 focus:ring-2 focus:ring-blue-500/50 flex flex-row items-center justify-between transition-colors"
                title="Выберите иконку"
            >
                <div className="flex items-center gap-2">
                    <CurrentIcon size={16} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm truncate pr-2 opacity-80">{value}</span>
                </div>
                <div className="text-neutral-400 text-xs text-[10px]">▼</div>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl z-20 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                        {Object.entries(ICONS).map(([key, Icon]) => (
                            <button 
                                key={key}
                                type="button"
                                onClick={() => { onChange(key); setOpen(false); }}
                                className={`p-2 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 transition ${value === key ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-neutral-600 dark:text-neutral-300'}`}
                                title={key}
                            >
                                <Icon size={18} />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export function SettingsComponent() {
    // Import currentPrompts and savePrompts from index inside to avoid circular deps, 
    // or we can just read from localStorage for initialization
    const [prompts, setPrompts] = useState<PromptConfig[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('ai_prompt_configs') || '[]') as PromptConfig[];
        } catch {
            return [];
        }
    });

    const handleAdd = () => {
        setPrompts([...prompts, {
            id: crypto.randomUUID(),
            label: 'Новый промпт',
            iconName: 'Sparkles',
            template: 'Напиши текст: {{text}}',
            isActive: true,
            parseAsMultiple: false
        }]);
    }

    const handleUpdate = (id: string, updates: Partial<PromptConfig>) => {
        setPrompts(prompts.map(p => p.id === id ? { ...p, ...updates } : p));
    }

    const handleDelete = (id: string) => {
        setPrompts(prompts.filter(p => p.id !== id));
    }

    const handleSave = () => {
        localStorage.setItem('ai_prompt_configs', JSON.stringify(prompts));
        window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
        alert('Настройки сохранены');
    }

    return <div className="flex flex-col gap-4 text-app-text-primary">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Настройки промптов</h3>
            </div>
            
            <div className="flex-1 overflow-auto space-y-6">
                {prompts.map(prompt => (
                    <div key={prompt.id} className={`p-4 border border-app-border rounded-xl bg-app-panel flex flex-col gap-3 relative transition-opacity ${prompt.isActive === false ? 'opacity-50 grayscale' : ''}`}>
                        <div className="absolute top-4 right-4 flex items-center justify-end gap-3 z-10 bg-app-panel rounded-bl-xl pl-2 pb-2">
                            <label className="flex items-center gap-2 cursor-pointer" title={prompt.isActive !== false ? "Включен" : "Выключен"}>
                                <span className={`text-xs font-medium ${prompt.isActive !== false ? 'text-app-accent' : 'text-app-text-muted'}`}>
                                    {prompt.isActive !== false ? 'Вкл' : 'Выкл'}
                                </span>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={prompt.isActive !== false} 
                                    onChange={e => handleUpdate(prompt.id, { isActive: e.target.checked })} 
                                />
                            </label>
                            <div className="w-px h-4 bg-app-border"></div>
                            <button onClick={() => handleDelete(prompt.id)} className="text-app-text-muted hover:text-red-500 transition-colors" title="Удалить"><Trash2 size={16}/></button>
                        </div>
                        
                        <div className="flex gap-4 pr-32">
                            <label className="flex-1">
                                <div className="text-xs font-semibold text-app-text-muted mb-1">Название (показать в тултипе)</div>
                                <input value={prompt.label} onChange={e => handleUpdate(prompt.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-card text-app-text-primary focus:outline-app-accent" />
                            </label>
                            <div className="w-40 z-10">
                                <div className="text-xs font-semibold text-app-text-muted mb-1">Иконка</div>
                                <IconPicker 
                                    value={prompt.iconName} 
                                    onChange={(val) => handleUpdate(prompt.id, { iconName: val as keyof typeof ICONS })} 
                                />
                            </div>
                        </div>
                        
                        <label>
                            <div className="text-xs font-semibold text-app-text-muted mb-1">Промпт (используйте {"{{text}}"} для подстановки текста карточки)</div>
                            <textarea value={prompt.template} onChange={e => handleUpdate(prompt.id, { template: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-card text-app-text-primary focus:outline-app-accent resize-none font-mono text-sm" />
                        </label>
                        
                        <div className="flex items-center gap-4 border-t border-app-border pt-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input type="checkbox" checked={prompt.parseAsMultiple} onChange={e => handleUpdate(prompt.id, { parseAsMultiple: e.target.checked })} className="rounded text-app-accent focus:ring-app-accent" />
                                Разбивать ответ на дочерние карточки
                            </label>
                            
                            {prompt.parseAsMultiple && (
                                <select value={prompt.multipleBlockFormat || 'json'} onChange={e => handleUpdate(prompt.id, { multipleBlockFormat: e.target.value as 'json' | 'markdown-headings' })} className="px-2 py-1 text-sm rounded border border-app-border bg-app-card text-app-text-primary focus:outline-app-accent">
                                    <option value="json">Строгий JSON массив</option>
                                    <option value="markdown-headings">Текст (разделение пустыми строками)</option>
                                </select>
                            )}
                        </div>
                    </div>
                ))}
                
                <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-app-border rounded-xl text-app-text-muted hover:text-app-text-primary hover:border-app-text-muted transition flex items-center justify-center gap-2">
                    <Plus size={18} /> Добавить промпт
                </button>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-app-accent text-white transition flex items-center gap-2 font-medium shadow-sm hover:brightness-110">
                    <Save size={16} /> Сохранить
                </button>
            </div>
    </div>;
}
