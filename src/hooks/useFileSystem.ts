import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { PuuNode } from "../types";

export function useFileSystemInit() {
  const { setNodesRaw, activeFileId, nodes, documents } = useAppStore();

  useEffect(() => {
    let savedDocs: any[] = [];
    try {
      const stored = localStorage.getItem("puu_documents");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) savedDocs = parsed;
      }
    } catch (e) {}
    if (savedDocs.length === 0) {
      savedDocs = [
        { id: "default", title: "New Document", updatedAt: Date.now() },
      ];
    }
    useAppStore.setState({ documents: savedDocs });

    let active = localStorage.getItem("puu_active_file");
    if (!active || !savedDocs.find((d) => d.id === active)) {
      active = savedDocs[0].id;
    }
    useAppStore.setState({ activeFileId: active });

    let newNodes = INITIAL_NODES;
    let savedStr = localStorage.getItem(`puu_file_${active}`);
    if (!savedStr && active === "default") {
      savedStr = localStorage.getItem("scribe_nodes");
    }
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          newNodes = parsed.map((n: any, i: number) => ({
            ...n,
            order: n.order ?? i,
          }));
        }
      } catch (e) {}
    }
    setNodesRaw(newNodes);
    useAppStore.setState({ activeId: newNodes[0]?.id || null });
  }, []);

  useEffect(() => {
    if (!activeFileId || nodes.length === 0) return;
    localStorage.setItem(`puu_file_${activeFileId}`, JSON.stringify(nodes));
    localStorage.setItem("puu_active_file", activeFileId);

    const firstNode =
      nodes.find(
        (n) => n.parentId === null && (n.order === 0 || n.order === undefined),
      ) || nodes[0];
    let newTitle = "Untitled";
    if (firstNode) {
      const lines = firstNode.content.split("\n");
      const firstHeading = lines.find((l) => l.startsWith("# "));
      if (firstHeading) {
        newTitle = firstHeading.replace(/^#\s+/, "").trim();
      } else {
        newTitle =
          firstNode.content.substring(0, 30).trim() +
          (firstNode.content.length > 30 ? "..." : "");
      }
    }
    if (!newTitle) newTitle = "Untitled";

    const docs = useAppStore.getState().documents;
    const existing = docs.find((d) => d.id === activeFileId);
    if (!existing || existing.title !== newTitle) {
      useAppStore.setState({
        documents: docs.map((d) =>
          d.id === activeFileId
            ? { ...d, title: newTitle, updatedAt: Date.now() }
            : d,
        ),
      });
    }
  }, [nodes, activeFileId]);

  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem("puu_documents", JSON.stringify(documents));
    }
  }, [documents]);
}

export function useFileSystemActions() {
  const switchFile = (fileId: string) => {
    const state = useAppStore.getState();
    if (fileId === state.activeFileId) {
      useAppStore.setState({ fileMenuOpen: false });
      return;
    }

    let newNodes = INITIAL_NODES;
    const saved = localStorage.getItem(`puu_file_${fileId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          newNodes = parsed.map((n: PuuNode, i: number) => ({
            ...n,
            order: n.order ?? i,
          }));
        }
      } catch (e) {}
    }
    useAppStore.setState({
      activeFileId: fileId,
      fileMenuOpen: false,
      activeId: newNodes[0]?.id || null,
    });
    state.setNodesRaw(newNodes);
  };

  const createNewFile = () => {
    const newId = generateId();
    const newDoc = { id: newId, title: "New Document", updatedAt: Date.now() };
    const initialNewNodes = [
      {
        id: generateId(),
        content: "# New Document\n\n...",
        parentId: null,
        order: 0,
      },
    ];

    useAppStore.setState((s) => ({
      documents: [newDoc, ...s.documents],
      activeFileId: newId,
      fileMenuOpen: false,
      activeId: initialNewNodes[0].id,
    }));
    useAppStore.getState().setNodesRaw(initialNewNodes);
  };

  const deleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const state = useAppStore.getState();
    const newDocs = state.documents.filter((d) => d.id !== fileId);
    if (newDocs.length === 0) {
      createNewFile();
      useAppStore.setState((s) => ({
        documents: s.documents.filter((d) => d.id !== fileId),
      }));
    } else {
      useAppStore.setState({ documents: newDocs });
      if (state.activeFileId === fileId) {
        switchFile(newDocs[0].id);
      }
    }
    localStorage.removeItem(`puu_file_${fileId}`);
  };

  return { switchFile, createNewFile, deleteFile };
}
