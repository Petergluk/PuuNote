import { useState, useCallback } from "react";
import equal from "fast-deep-equal";
export function useHistory<T>(initialValue: T | (() => T), maxHistory = 50) {
  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>(() => {
    const present =
      typeof initialValue === "function"
        ? (initialValue as Function)()
        : initialValue;
    return { past: [], present, future: [] };
  });
  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setHistory((currentState) => {
        const nextPresent =
          typeof value === "function"
            ? (value as Function)(currentState.present)
            : value;
        if (equal(currentState.present, nextPresent)) {
          return currentState;
        }
        const newPast = [...currentState.past, currentState.present];
        if (newPast.length > maxHistory) {
          newPast.shift(); /* remove oldest history entry to respect maxHistory limit */
        }
        return {
          past: newPast,
          present: nextPresent,
          future: [] /* Any new change invalidates the future */,
        };
      });
    },
    [maxHistory],
  );
  const undo = useCallback(() => {
    setHistory((currentState) => {
      if (currentState.past.length === 0) return currentState;
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);
  const redo = useCallback(() => {
    setHistory((currentState) => {
      if (currentState.future.length === 0) return currentState;
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);
  const reset = useCallback((newState: T) => {
    setHistory({ past: [], present: newState, future: [] });
  }, []);
  return [
    history.present,
    set,
    undo,
    redo,
    history.past.length > 0,
    history.future.length > 0,
    reset,
  ] as const;
}
