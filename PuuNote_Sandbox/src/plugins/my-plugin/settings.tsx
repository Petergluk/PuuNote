import React, { useState } from "react";
import { pluginApi } from "./api";

// Простой React-компонент для настроек плагина
export function MyPluginSettings() {
  const [magic, setMagic] = useState(() => pluginApi?.settings?.get('magic_enabled', false));
  const [apiKey, setApiKey] = useState(() => pluginApi?.settings?.get('api_key', ''));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-app-text-secondary">
        Это демонстрационный компонент настроек плагина. Он вынесен в отдельный файл <code>settings.tsx</code> для наглядности структуры.
        Вы можете использовать любые React хуки (useState, useEffect и т.д.) здесь.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Включить магические функции</label>
        <label className="flex items-center gap-2 text-sm text-app-text-secondary cursor-pointer">
          <input 
            type="checkbox" 
            checked={magic}
            onChange={(e) => {
              setMagic(e.target.checked);
              pluginApi?.settings?.set('magic_enabled', e.target.checked);
            }}
            className="rounded border-app-border bg-app-input-bg text-app-accent focus:ring-app-accent" 
          />
          Сохраняется в api.settings
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">API Ключ</label>
        <input 
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            pluginApi?.settings?.set('api_key', e.target.value);
          }}
          placeholder="API Ключ или параметр..." 
          className="w-full rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-app-accent transition-shadow"
        />
      </div>
    </div>
  );
}
