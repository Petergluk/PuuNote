import { useEffect, useRef } from 'react';
import type { CommandItem } from './useAppCommands';

export function useGlobalHotkeys(commands: CommandItem[]) {
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
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.closest('[contenteditable="true"]') !== null
      );
      
      if (isInput) {
        // Exception: if it's explicitly readOnly, we might allow commands unless it was caught above
        if (!(activeElement as HTMLInputElement).readOnly) {
           // We ONLY allow modifiers (ctrl, cmd) through textareas so we don't steal single letter typing
           // But if it's Shift+Delete, we should allow it
           const isShiftDelete = e.shiftKey && e.key === 'Delete';
           if (!e.metaKey && !e.ctrlKey && !e.altKey && !isShiftDelete) {
             return;
           }
        }
      }

      const isMac = navigator?.userAgent?.toLowerCase()?.includes('mac');
      const keys: string[] = [];
      const altKeys: string[] = []; // Alternate mapping for mod

      if (e.metaKey) {
        keys.push('cmd');
        if (isMac) altKeys.push('mod');
      }
      if (e.ctrlKey && !e.metaKey) {
        keys.push('ctrl');
        if (!isMac) altKeys.push('mod');
      }
      if (e.altKey) {
        keys.push('alt');
        altKeys.push('alt');
      }
      if (e.shiftKey) {
        keys.push('shift');
        altKeys.push('shift');
      }
      
      const keyStr = e.key.toLowerCase();
      if (!['alt', 'control', 'shift', 'meta'].includes(keyStr)) {
        keys.push(keyStr);
        altKeys.push(keyStr);
      }

      if (keys.length === 0) return;

      const pressedStr = keys.join('+');
      const pressedAltStr = altKeys.join('+');

      for (const cmd of commands) {
        const userOverride = hotkeysRef.current[cmd.id];
        const activeHotkey = userOverride !== undefined ? userOverride : (cmd.hotkey?.toLowerCase() || "");
        if (activeHotkey === pressedStr || activeHotkey === pressedAltStr) {
          e.preventDefault();
          e.stopPropagation();
          cmd.run();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('puu-hotkeys-changed', handleHotkeysChanged);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [commands]);
}
