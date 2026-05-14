import { useEffect, useRef } from 'react';
import { PluginRegistry } from '../plugins/registry';

export function useGlobalHotkeys() {
  const hotkeysRef = useRef<Record<string, string>>({});

  const reloadHotkeys = () => {
    hotkeysRef.current = JSON.parse(localStorage.getItem('PUU_COMMAND_HOTKEYS') || '{}');
  };

  useEffect(() => {
    reloadHotkeys();

    const handleHotkeysChanged = () => {
      reloadHotkeys();
    };

    window.addEventListener('puu-hotkeys-changed', handleHotkeysChanged);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      
      if (activeElement && activeElement.hasAttribute('data-hotkey-input')) {
        return;
      }

      // Don't trigger hotkeys if user is focused on an input/textarea
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // Exception: if it's explicitly readOnly, we might allow commands unless it was caught above
        if (!(activeElement as HTMLInputElement).readOnly) {
           // We ONLY allow modifiers (ctrl, cmd) through textareas so we don't steal single letter typing
           if (!e.metaKey && !e.ctrlKey && !e.altKey) {
             return;
           }
        }
      }

      const keys: string[] = [];
      if (e.metaKey) keys.push('cmd');
      if (e.ctrlKey && !e.metaKey) keys.push('ctrl');
      if (e.altKey) keys.push('alt');
      if (e.shiftKey) keys.push('shift');
      
      const keyStr = e.key.toLowerCase();
      if (!['alt', 'control', 'shift', 'meta'].includes(keyStr)) {
        keys.push(keyStr);
      }

      if (keys.length === 0) return;

      const pressedStr = keys.join('+');

      for (const [cmdId, hotkey] of Object.entries(hotkeysRef.current)) {
        if (hotkey === pressedStr) {
          const commands = PluginRegistry.getCommands();
          const cmd = commands.find((c: any) => c.id === cmdId);
          if (cmd) {
            e.preventDefault();
            e.stopPropagation();
            cmd.run();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('puu-hotkeys-changed', handleHotkeysChanged);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
