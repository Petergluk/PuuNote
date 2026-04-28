import { useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { toggleCheckboxContent } from "../utils/markdownParser";

export function useToggleCheckbox() {
  const updateContent = useAppStore((s) => s.updateContent);

  return useCallback((nodeId: string, content: string, index: number, newValue: boolean) => {
    const newContent = toggleCheckboxContent(content || "", index, newValue);
    if (newContent !== content) {
      updateContent(nodeId, newContent);
    }
  }, [updateContent]);
}
