import { useState } from 'react';
import { PromptConfig, savePrompts } from './index';
import { Plus, Trash2, Save } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const ICONS = [
    'Sparkles', 'Wand2', 'Zap', 'BrainCircuit', 'Lightbulb', 'MessageSquare',
    'Smile', 'PenTool', 'Hash', 'Star', 'Edit3', 'Type', 'List', 'FileText', 
    'CheckSquare', 'Search', 'Flame', 'Cpu', 'Code', 'Target', 'Rocket', 
    'Scissors', 'Compass', 'Ghost', 'Gem', 'MessageCircle', 'Mic', 'ImageIcon', 
    'Briefcase', 'Glasses', 'Coffee'
];

function IconPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    
    // Find the current icon component
    const CurrentIcon = (LucideIcons as any)[value] || LucideIcons.Sparkles;

    return (
        <div className="relative flex items-center gap-2">
            <div className="flex-1 relative">
                <input 
                    type="text" 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                    placeholder="Название иконки (напр. Sparkles)"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-app-border bg-app-card text-app-text-primary focus:outline-app-accent text-sm"
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-app-text-muted">
                    <CurrentIcon size={16} />
                </div>
            </div>
            
            <button 
                onClick={() => setOpen(!open)}
                type="button"
                className="px-3 py-2 rounded-lg border border-app-border bg-app-card text-app-text-primary focus:outline-app-accent hover:bg-app-card-hover transition-colors"
                title="Библиотека иконок"
            >
               ▼
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-app-panel border border-app-border shadow-xl rounded-xl z-20 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                        {ICONS.map((key) => {
                            const Icon = (LucideIcons as any)[key] || LucideIcons.HelpCircle;
                            return (
                                <button 
                                    key={key}
                                    type="button"
                                    onClick={() => { onChange(key); setOpen(false); }}
                                    className={`p-2 rounded-lg flex items-center justify-center hover:bg-app-card transition ${value === key ? 'bg-app-accent/20 text-app-accent' : 'text-app-text-secondary'}`}
                                    title={key}
                                >
                                    <Icon size={18} />
                                </button>
                            );
                        })}
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
        savePrompts(prompts);
        alert('Настройки сохранены');
    }

    return <div className="flex flex-col gap-4 text-app-text-primary">
            <div className="flex justify-between items-start flex-col gap-2">
                <h3 className="text-lg font-semibold">Настройки промптов</h3>
                <p className="text-sm text-app-text-muted">
                    Для иконок используется библиотека <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="text-app-accent hover:underline">lucide-react</a>. Вы можете скопировать название любой иконки из библиотеки в формате PascalCase.
                </p>
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
                            <div className="w-64 z-10">
                                <div className="text-xs font-semibold text-app-text-muted mb-1">Иконка</div>
                                <IconPicker 
                                    value={prompt.iconName} 
                                    onChange={(val) => handleUpdate(prompt.id, { iconName: val })} 
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
                                Разбивать ответ на дочерние карточки (множественный выбор)
                            </label>
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
