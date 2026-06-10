import type { PluginDefinition } from './registry';

// Автоматически находим все плагины в подпапках, у которых есть index.ts или index.tsx
const pluginModules = import.meta.glob('./*/index.{tsx,ts}', { eager: true });

export const CUSTOM_PLUGINS: PluginDefinition[] = [];

for (const path in pluginModules) {
  const mod = pluginModules[path] as Record<string, unknown>;
  // Перебираем все экспорты в найденном файле
  for (const key in mod) {
    const exported = mod[key];
    // Проверяем, похож ли экспорт на PluginDefinition
    if (
      exported &&
      typeof exported === 'object' &&
      'id' in exported &&
      'name' in exported
    ) {
      const plugin = exported as PluginDefinition;
      if (!CUSTOM_PLUGINS.some(p => p.id === plugin.id)) {
        CUSTOM_PLUGINS.push(plugin);
      }
    }
  }
}
