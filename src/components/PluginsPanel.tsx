import { X, Blocks, Settings, Keyboard, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { CUSTOM_PLUGINS } from "../plugins/index";
import { useState } from "react";
import { DEFAULT_PROMPT } from "../plugins/voice-fixer/prompts";
import { useAppCommands } from "../hooks/useAppCommands";

function HotkeysList() {
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => {
    return JSON.parse(localStorage.getItem('PUU_COMMAND_HOTKEYS') || '{}');
  });

  const commands = useAppCommands();

  const handleHotkeyChange = (cmdId: string, newHotkey: string) => {
    const updated = { ...hotkeys, [cmdId]: newHotkey };
    if (!newHotkey.trim()) {
      delete updated[cmdId];
    }
    setHotkeys(updated);
    localStorage.setItem('PUU_COMMAND_HOTKEYS', JSON.stringify(updated));
    // Dispatch a custom event so the global hotkey listener can reload
    window.dispatchEvent(new Event('puu-hotkeys-changed'));
  };

  const RESERVED_HOTKEYS = ['cmd+w', 'cmd+t', 'cmd+n', 'ctrl+w', 'ctrl+t', 'ctrl+n', 'cmd+f', 'ctrl+f'];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, cmdId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      handleHotkeyChange(cmdId, '');
      return;
    }
    
    // Ignore just modifiers
    if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) return;

    const keys = [];
    if (e.metaKey) keys.push('cmd');
    if (e.ctrlKey && !e.metaKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    
    keys.push(e.key.toLowerCase());
    
    const pressedStr = keys.join('+');

    if (RESERVED_HOTKEYS.includes(pressedStr)) {
      alert(`Сочетание ${pressedStr} зарезервировано браузером.`);
      return;
    }

    handleHotkeyChange(cmdId, pressedStr);
  };

  if (commands.length === 0) {
    return <div className="text-sm text-app-text-muted mt-4">Нет доступных команд для назначения шорткатов. Убедитесь, что плагины включены.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {commands.map(cmd => (
        <div key={cmd.id} className="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-card">
          <div className="flex items-center gap-2">
            {cmd.icon && <cmd.icon size={16} className="text-app-text-muted" />}
            <span className="text-sm text-app-text-primary">{cmd.label}</span>
          </div>
          <input 
            type="text" 
            placeholder="Нажмите сочетание..."
            value={hotkeys[cmd.id] || ''}
            onKeyDown={(e) => handleKeyDown(e, cmd.id)}
            data-hotkey-input="true"
            readOnly
            className="w-48 rounded bg-app-panel border border-app-border px-2 py-1 text-sm text-center font-mono focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
          />
        </div>
      ))}
    </div>
  );
}

export function PluginsPanel() {
  const { t } = useTranslation();
  const pluginsOpen = useAppStore((state) => state.pluginsOpen);
  const disabledPlugins = useAppStore((state) => state.disabledPlugins);
  const setDisabledPlugins = useAppStore((state) => state.setDisabledPlugins);
  const setPluginsOpen = useAppStore((state) => state.setPluginsOpen);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ai_settings" | "plugins" | "hotkeys">("plugins");

  const togglePlugin = (pluginId: string) => {
    if (disabledPlugins.includes(pluginId)) {
      setDisabledPlugins(disabledPlugins.filter(id => id !== pluginId));
    } else {
      setDisabledPlugins([...disabledPlugins, pluginId]);
    }
  };

  const panelRef = useFocusTrap<HTMLElement>(pluginsOpen, () =>
    setPluginsOpen(false),
  );

  if (!pluginsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm"
      onClick={() => setPluginsOpen(false)}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugins-panel-title"
        tabIndex={-1}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex max-h-[85vh] w-[min(900px,calc(100vw-2rem))] flex-col rounded-xl border border-app-border bg-app-panel shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-app-border px-6 py-4 bg-app-card">
          <h2
            id="plugins-panel-title"
            className="flex items-center gap-2 text-lg font-semibold text-app-text-primary"
          >
            <Blocks className="h-5 w-5" />
            Плагины и Настройки
          </h2>
          <button
            onClick={() => setPluginsOpen(false)}
            className="rounded p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary transition-colors"
            title={t("settings.close")}
            aria-label={t("settings.close")}
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-56 shrink-0 border-r border-app-border bg-app-panel overflow-y-auto p-4 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("plugins")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "plugins"
                  ? "bg-app-accent/10 text-app-accent"
                  : "text-app-text-secondary hover:bg-app-card hover:text-app-text-primary"
              }`}
            >
              <Plug size={18} />
              Плагины
            </button>
            <button
              onClick={() => setActiveTab("ai_settings")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "ai_settings"
                  ? "bg-app-accent/10 text-app-accent"
                  : "text-app-text-secondary hover:bg-app-card hover:text-app-text-primary"
              }`}
            >
              <Settings size={18} />
              Настройки
            </button>
            <button
              onClick={() => setActiveTab("hotkeys")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "hotkeys"
                  ? "bg-app-accent/10 text-app-accent"
                  : "text-app-text-secondary hover:bg-app-card hover:text-app-text-primary"
              }`}
            >
              <Keyboard size={18} />
              Горячие клавиши
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-app-card p-6">
            {activeTab === "ai_settings" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-medium text-app-text-primary mb-1">Глобальные настройки ИИ</h3>
                  <p className="text-sm text-app-text-muted">
                    Здесь вы можете указать ключ доступа к API Gemini, который будет использоваться всеми плагинами для работы с искусственным интеллектом.
                  </p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-app-border bg-app-panel p-4 shadow-sm">
                    <label className="block text-sm font-medium text-app-text-primary mb-1">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      className="w-full max-w-md rounded-md border border-app-border bg-app-card px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow"
                      placeholder={((typeof import.meta !== 'undefined' && 'env' in import.meta ? (import.meta as unknown as { env: Record<string, string> }).env : {}).VITE_GLOBAL_GEMINI_API_KEY) ? "Установлен из .env" : "AIzaSy..."}
                      defaultValue={localStorage.getItem('GLOBAL_GEMINI_API_KEY') || localStorage.getItem('GEMINI_PLUGIN_API_KEY') || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val) {
                          localStorage.setItem('GLOBAL_GEMINI_API_KEY', val);
                        } else {
                          localStorage.removeItem('GLOBAL_GEMINI_API_KEY');
                        }
                      }}
                    />
                    <p className="text-sm text-app-text-muted mt-2">
                       Оставьте пустым для использования ключа окружения (VITE_GLOBAL_GEMINI_API_KEY), локальной заглушки, или введите ваш ключ напрямую для работы всех ИИ-плагинов.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "plugins" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-medium text-app-text-primary mb-1">Ваши плагины</h3>
                  <p className="text-sm text-app-text-muted">
                    Управляйте включенными плагинами и их специфичными настройками.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {CUSTOM_PLUGINS.map((plugin) => (
                    <div key={plugin.id} className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-panel p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                              <span className="font-semibold text-app-text-primary text-base">{plugin.name}</span>
                              <span className="rounded-full bg-app-accent/10 px-2 py-0.5 text-xs font-medium text-app-accent">v{plugin.version}</span>
                          </div>
                          <p className="text-sm text-app-text-secondary mt-1 max-w-xl">{plugin.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => togglePlugin(plugin.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel ${
                              !disabledPlugins.includes(plugin.id) ? "bg-app-accent" : "bg-app-border"
                            }`}
                            role="switch"
                            aria-checked={!disabledPlugins.includes(plugin.id)}
                          >
                            <span className="sr-only">Включить плагин</span>
                            <span
                              className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                                !disabledPlugins.includes(plugin.id) ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <button 
                              onClick={() => setSelectedPluginId(selectedPluginId === plugin.id ? null : plugin.id)}
                              className={`rounded-lg p-2 transition-colors ${
                                selectedPluginId === plugin.id 
                                  ? "bg-app-accent text-white" 
                                  : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                              }`}
                              title="Настройки плагина"
                          >
                              <Settings size={18} />
                          </button>
                        </div>
                      </div>

                      {selectedPluginId === plugin.id && (
                        <div className="mt-4 rounded-lg bg-app-card p-4 border border-app-border animate-in fade-in slide-in-from-top-2 flex flex-col gap-4">
                          {plugin.settingsComponent ? (
                            <plugin.settingsComponent />
                          ) : plugin.id === 'voice-fixer-plugin' ? (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-app-text-primary mb-1">
                                  Модель Gemini
                                </label>
                                <select
                                  className="w-full max-w-md rounded-md border border-app-border bg-app-panel px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow border-r-8 border-transparent"
                                  defaultValue={localStorage.getItem('VOICE_FIXER_MODEL') || 'gemini-3-flash-preview'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      localStorage.setItem('VOICE_FIXER_MODEL', val);
                                    } else {
                                      localStorage.removeItem('VOICE_FIXER_MODEL');
                                    }
                                  }}
                                >
                                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Рекомендуется)</option>
                                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-app-text-primary mb-1">
                                  Системный Промпт (Инструкции)
                                </label>
                                <textarea
                                  className="w-full rounded-md border border-app-border bg-app-panel px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow min-h-[160px] resize-y font-mono"
                                  placeholder={DEFAULT_PROMPT}
                                  defaultValue={localStorage.getItem('VOICE_FIXER_PROMPT') || DEFAULT_PROMPT}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && val !== DEFAULT_PROMPT) {
                                      localStorage.setItem('VOICE_FIXER_PROMPT', val);
                                    } else {
                                      localStorage.removeItem('VOICE_FIXER_PROMPT');
                                    }
                                  }}
                                />
                                <p className="text-sm text-app-text-muted mt-1">Оставьте пустым для использования промпта по умолчанию.</p>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-app-text-muted">У этого плагина нет настроек.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {CUSTOM_PLUGINS.length === 0 && (
                      <div className="text-center p-8 border-2 border-dashed border-app-border rounded-xl">
                        <Plug className="mx-auto h-8 w-8 text-app-text-muted mb-2" />
                        <h3 className="text-sm font-medium text-app-text-primary">Нет доступных плагинов</h3>
                        <p className="text-sm text-app-text-muted mt-1">Здесь появятся установленные плагины.</p>
                      </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "hotkeys" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-medium text-app-text-primary mb-1">Горячие клавиши</h3>
                  <p className="text-sm text-app-text-muted">
                    Здесь вы можете настроить шорткаты для команд (включая команды из плагинов). Нажмите на поле и введите комбинацию (например: cmd+r).
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <HotkeysList />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
