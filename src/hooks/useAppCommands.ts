import { useTranslation } from "react-i18next";
import { Palette, FileText, Search, Plus, Trash2, Combine, Sparkles } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useFileSystemActions } from "./useFileSystemActions";
import { getMergeSelectionState } from "../utils/mergeSelection";
import { PluginRegistry } from "../plugins/registry";
import { toast } from "sonner";
import type { ComponentType } from "react";

export interface CommandItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  hotkey?: string;
  run: () => void | Promise<void>;
  destructive?: boolean;
}

export function useAppCommands(): CommandItem[] {
  const { t } = useTranslation();
  const { createNewFile, deleteFile } = useFileSystemActions();

  return [
    {
      id: "toggle-theme",
      label: t("Toggle Theme"),
      icon: Palette,
      run: () => useAppStore.getState().toggleTheme(),
    },
    {
      id: "toggle-expand",
      label: t("Toggle Expand"),
      icon: FileText,
      run: () => useAppStore.getState().toggleCardsCollapsed(),
    },
    {
      id: "open-timeline",
      label: t("Open Timeline View"),
      icon: Search,
      run: () => useAppStore.getState().setTimelineOpen(true),
    },
    {
      id: "new-document",
      label: t("New Document"),
      icon: Plus,
      run: () => createNewFile(),
    },
    {
      id: "merge-selected-cards",
      label: t("Merge selected cards"),
      icon: Combine,
      run: () => {
        const store = useAppStore.getState();
        const mergeSelection = getMergeSelectionState(
          store.nodes,
          store.activeId,
          store.selectedIds,
        );

        if (!mergeSelection.ok || !mergeSelection.masterId) {
          toast.warning(mergeSelection.reason || "Selected cards cannot be merged.");
          return;
        }

        const { masterId, nodeIdsToMerge, orderedIds } = mergeSelection;
        store.openConfirm(`Merge ${orderedIds.length} selected cards?`, () => {
          useAppStore.getState().mergeNodes(masterId, nodeIdsToMerge);
        });
      },
    },
    {
      id: "add-child-card",
      label: t("Add Child Card (Right)"),
      icon: Plus,
      run: () => {
        const store = useAppStore.getState();
        const targetId = store.activeId;
        if (!targetId) return;
        store.addChild(targetId);
        
        // If zen mode is active, update fullScreenId to track the newly created node
        const newlyAddedId = useAppStore.getState().activeId;
        if (store.fullScreenId && newlyAddedId) {
            useAppStore.getState().setFullScreenId(newlyAddedId);
        }
      }
    },
    {
      id: "add-sibling-card",
      label: t("Add Sibling Card (Below)"),
      icon: Plus,
      run: () => {
        const store = useAppStore.getState();
        const targetId = store.activeId;
        if (!targetId) return;
        store.addSibling(targetId);
        
        const newlyAddedId = useAppStore.getState().activeId;
        if (store.fullScreenId && newlyAddedId) {
            useAppStore.getState().setFullScreenId(newlyAddedId);
        }
      }
    },
    {
      id: "delete-card",
      label: t("Delete Card"),
      icon: Trash2,
      destructive: true,
      run: () => {
        const state = useAppStore.getState();
        const activeId = state.activeId;
        
        if (state.selectedIds.length > 1) {
          state.openConfirm(
            `Delete ${state.selectedIds.length} selected cards and their descendants?`,
            () => {
              state.deleteNodes(state.selectedIds);
              state.clearSelection();
            },
          );
        } else if (activeId) {
          // If we are in zen mode and deleting the active card, we need to clear zen mode
          const willClearZen = state.uiMode === "zen" && state.fullScreenId === activeId;
          
          const doDelete = () => {
              if (willClearZen) {
                state.setUiMode("normal");
                state.setFullScreenId(null);
              }
              state.deleteNode(activeId);
          };

          const hasChildren = state.nodes.some(n => n.parentId === activeId);
          
          if (hasChildren) {
             state.openConfirm(
              t("Delete this card and all its descendants?"),
              () => doDelete()
            );
          } else {
             doDelete();
          }
        }
      }
    },
    {
      id: "delete-file",
      label: t("Delete file"),
      icon: Trash2,
      destructive: true,
      run: () => {
        const activeFileId = useAppStore.getState().activeFileId;
        if (!activeFileId) return;
        useAppStore.getState().openConfirm(
          t("Are you sure you want to delete this document?"),
          () => deleteFile(activeFileId),
        );
      },
    },
    ...PluginRegistry.getCommands().map(cmd => ({
      id: cmd.id,
      label: cmd.label,
      icon: cmd.icon || Sparkles,
      hotkey: cmd.hotkey,
      run: cmd.run || cmd.execute || (() => {}),
      destructive: cmd.destructive,
    }))
  ];
}
