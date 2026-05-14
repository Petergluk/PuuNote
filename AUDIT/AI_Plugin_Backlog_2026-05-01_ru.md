# Отдельный backlog: AI и plugin platform

Дата: 2026-05-01

Это не список задач для ближайшей стабильной версии. Это отдельная зона проектирования, которую стоит обсуждать отдельно перед реализацией.

## Что уже есть как foundation

- `AiProvider` interface и mock-local provider.
- `JobRunner` с progress/cancel.
- Snapshot перед AI-операцией.
- `buildContextForLLM`.
- Базовый `PluginRegistry` с lifecycle hooks и card action типами.
- Metadata поля для AI/plugin данных.

## Что требует отдельного дизайна

1. Реальные AI providers
   Что: OpenAI, Anthropic, Ollama или другой provider layer.
   Почему отдельно: нужно решить provider API, streaming, retries, structured output, cost/token accounting.

2. API keys и безопасность
   Что: backend proxy, локальное хранение или ручной ввод на сессию.
   Почему отдельно: это security/product decision, а не простой UI checkbox.

3. AI operation preview
   Что: AI должен возвращать patch/diff, который пользователь принимает или отклоняет.
   Почему отдельно: это меняет модель применения AI-изменений.

4. Plugin manifest и lifecycle
   Что: `id`, `version`, `apiVersion`, permissions, contributes, activate/deactivate.
   Почему отдельно: текущий registry внутренний, публичный API должен быть стабильным.

5. Permission model
   Что: `document:read`, `document:write`, `selection:read`, `network`, `ai:provider`, `storage:plugin`, `ui:*`.
   Почему отдельно: внешний plugin не должен иметь полный доступ к локальным документам.

6. Safe transaction API
   Что: плагины работают через ограниченные document transactions, а не напрямую через Zustand.
   Почему отдельно: нужно сохранить undo/redo, validation, snapshots и plugin hooks.

7. Sandbox runtime
   Что: Web Worker или iframe sandbox, postMessage bridge, timeout, restricted globals.
   Почему отдельно: без sandbox внешний или AI-generated код равен полному доступу к данным.

8. Plugin management UI
   Что: Settings -> Plugins, enable/disable, settings, uninstall/recover.
   Почему отдельно: это полноценная продуктовая область.

9. Plugin SDK и документация
   Что: пакет с типами, шаблоны, examples, test harness.
   Почему отдельно: SDK должен следовать после manifest/permissions/transactions.

10. AI-generated plugins
    Что: AI пишет plugin code, система проверяет, показывает diff/permissions и запускает в sandbox.
    Почему отдельно: это финальный слой, который нельзя делать до sandbox и API контракта.

## Предлагаемый порядок обсуждения

1. Сначала зафиксировать, какие AI-команды нужны внутри PuuNote без внешних плагинов.
2. Потом описать patch/diff model для AI-изменений.
3. Затем спроектировать plugin manifest и permissions.
4. Только после этого выбирать sandbox/runtime и SDK формат.

