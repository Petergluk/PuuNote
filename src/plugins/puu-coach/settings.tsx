import { useState } from "react";
import {
  getSysPrompt,
  getArchPrompt,
  getArchitectFrequency,
  getArchitectContext,
  getMaxCards,
  getCoachModel,
  getArchModel
} from "./config";

export function CoachSettings({ api }: { api: any }) {
  const [sysPrompt, setSysPrompt] = useState(getSysPrompt());
  const [archPrompt, setArchPrompt] = useState(getArchPrompt());
  const [freq, setFreq] = useState(getArchitectFrequency().toString());
  const [contextSize, setContextSize] = useState(getArchitectContext().toString());
  const [maxCards, setMaxCards] = useState(getMaxCards().toString());
  const [coachModel, setCoachModel] = useState(getCoachModel());
  const [archModel, setArchModel] = useState(getArchModel());

  const save = () => {
    localStorage.setItem('puucoach_sys_prompt', sysPrompt);
    localStorage.setItem('puucoach_arch_prompt', archPrompt);
    localStorage.setItem('puucoach_arch_freq', freq);
    localStorage.setItem('puucoach_arch_context', contextSize);
    localStorage.setItem('puucoach_max_cards', maxCards);
    localStorage.setItem('puucoach_coach_model', coachModel);
    localStorage.setItem('puucoach_arch_model', archModel);
    api.toast?.("Настройки коуча сохранены", "success");
  };

  return (
    <div className="flex flex-col gap-4 text-app-text-primary">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Модель для Коуча (если пустая - по умолчанию)</label>
          <input 
            type="text"
            className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
            value={coachModel} 
            onChange={e => setCoachModel(e.target.value)} 
            placeholder="например, gemini-2.5-pro"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Модель Архитектора (если пустая - по умолчанию)</label>
          <input 
            type="text"
            className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
            value={archModel} 
            onChange={e => setArchModel(e.target.value)} 
            placeholder="например, gemini-3-flash-preview"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Системный промпт Коуча</label>
        <textarea 
          className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
          rows={3} 
          value={sysPrompt} 
          onChange={e => setSysPrompt(e.target.value)} 
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Промпт Архитектора (создающего карточки)</label>
        <textarea 
          className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
          rows={3} 
          value={archPrompt} 
          onChange={e => setArchPrompt(e.target.value)} 
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Архитектор вмешивается (каждое N сообщение)</label>
          <input 
            type="number"
            className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
            value={freq} 
            onChange={e => setFreq(e.target.value)} 
            min="1"
            max="20"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Размер контекста (сообщений назад)</label>
          <input 
            type="number"
            className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
            value={contextSize} 
            onChange={e => setContextSize(e.target.value)} 
            min="1"
            max="100"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Макс. идей добавлять (0 = решает ИИ)</label>
          <input 
            type="number"
            className="w-full bg-app-input-bg border border-app-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent"
            value={maxCards} 
            onChange={e => setMaxCards(e.target.value)} 
            min="0"
            max="100"
          />
        </div>
      </div>
      <button onClick={save} className="px-4 py-2 bg-app-accent text-white rounded-lg self-start hover:opacity-90 transition-opacity">Сохранить</button>
    </div>
  );
}
