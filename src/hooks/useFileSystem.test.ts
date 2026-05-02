import { afterEach, describe, expect, it, vi } from "vitest";
import type { PuuNode } from "../types";
import { DocumentService } from "../domain/documentService";
import { useAppStore } from "../store/useAppStore";
import {
  flushPendingSave,
  fsManager,
  useFileSystemActions,
} from "./useFileSystem";

const node = (id: string, content: string): PuuNode => ({
  id,
  content,
  parentId: null,
  order: 0,
});

describe("FileSystemManager", () => {
  afterEach(() => {
    fsManager.clearTimer();
    fsManager.fileId = "";
    fsManager.nodes = [];
    fsManager.isHydratingFile = false;
    fsManager.switchController?.abort();
    fsManager.switchController = null;
    useAppStore.setState({
      activeFileId: null,
      confirmDialog: { isOpen: false, message: "" },
      documents: [],
      fileMenuOpen: false,
      nodes: [],
      saveStatus: "saved",
      selectedIds: [],
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses the latest manager state when a delayed save fires", () => {
    vi.useFakeTimers();
    const initialNodes = [node("empty", "")];
    const hydratedNodes = [node("loaded", "Loaded document")];
    const saved: Array<{ fileId: string; nodes: PuuNode[] }> = [];

    fsManager.scheduleSave("doc-a", initialNodes, (fileId, nodes) => {
      saved.push({ fileId, nodes });
    });
    fsManager.nodes = hydratedNodes;

    vi.advanceTimersByTime(1000);

    expect(saved).toEqual([{ fileId: "doc-a", nodes: hydratedNodes }]);
  });

  it("flushes a pending save immediately and marks it saved", async () => {
    vi.useFakeTimers();
    const nodes = [node("loaded", "Loaded document")];
    const storeActiveFileId = vi
      .spyOn(DocumentService, "storeActiveFileId")
      .mockImplementation(() => {});
    const saveNodes = vi
      .spyOn(DocumentService, "saveNodes")
      .mockResolvedValue(undefined);

    fsManager.scheduleSave("doc-a", nodes, () => {
      throw new Error("timer callback should not run after flush");
    });

    await flushPendingSave();

    expect(fsManager.hasTimer()).toBe(false);
    expect(storeActiveFileId).toHaveBeenCalledWith("doc-a");
    expect(saveNodes).toHaveBeenCalledWith("doc-a", nodes);
    expect(useAppStore.getState().saveStatus).toBe("saved");
  });

  it("marks pending save failures as errors", async () => {
    vi.useFakeTimers();
    const nodes = [node("loaded", "Loaded document")];
    vi.spyOn(DocumentService, "storeActiveFileId").mockImplementation(() => {});
    vi.spyOn(DocumentService, "saveNodes").mockRejectedValue(
      new Error("save failed"),
    );

    fsManager.scheduleSave("doc-a", nodes, () => {
      throw new Error("timer callback should not run after flush");
    });

    await flushPendingSave();

    expect(fsManager.hasTimer()).toBe(false);
    expect(useAppStore.getState().saveStatus).toBe("error");
  });

  it("does not remove a file from UI state when storage deletion fails", async () => {
    vi.spyOn(DocumentService, "deleteDocument").mockRejectedValue(
      new Error("delete failed"),
    );
    const originalDocuments = [
      { id: "doc-a", title: "Doc A", updatedAt: 1 },
      { id: "doc-b", title: "Doc B", updatedAt: 2 },
    ];
    useAppStore.setState({
      documents: originalDocuments,
      activeFileId: "doc-a",
      fileMenuOpen: true,
    });

    await useFileSystemActions().deleteFile("doc-a");

    expect(useAppStore.getState().documents).toEqual(originalDocuments);
    expect(useAppStore.getState().activeFileId).toBe("doc-a");
    expect(useAppStore.getState().fileMenuOpen).toBe(true);
  });

  it("flushes the active file before switching to another file", async () => {
    vi.useFakeTimers();
    const activeNodes = [node("active", "Unsaved active document")];
    const nextNodes = [node("next", "Loaded next document")];
    const calls: string[] = [];

    vi.spyOn(DocumentService, "storeActiveFileId").mockImplementation(() => {});
    vi.spyOn(DocumentService, "saveNodes").mockImplementation(
      async (fileId) => {
        calls.push(`save:${fileId}`);
      },
    );
    vi.spyOn(DocumentService, "loadNodes").mockImplementation(
      async (fileId) => {
        calls.push(`load:${fileId}`);
        return nextNodes;
      },
    );

    useAppStore.setState({
      activeFileId: "doc-a",
      documents: [
        { id: "doc-a", title: "Doc A", updatedAt: 1 },
        { id: "doc-b", title: "Doc B", updatedAt: 2 },
      ],
      nodes: activeNodes,
      saveStatus: "unsaved",
    });
    fsManager.scheduleSave("doc-a", activeNodes, () => {
      throw new Error("timer callback should not run after switch flush");
    });

    await useFileSystemActions().switchFile("doc-b");

    expect(calls).toEqual(["save:doc-a", "load:doc-b"]);
    expect(useAppStore.getState().activeFileId).toBe("doc-b");
    expect(useAppStore.getState().nodes).toEqual(nextNodes);
    expect(useAppStore.getState().saveStatus).toBe("saved");
  });

  it("keeps the current file open when switching target cannot be read", async () => {
    const activeNodes = [node("active", "Still visible")];
    vi.spyOn(DocumentService, "loadNodes").mockResolvedValue(null);

    useAppStore.setState({
      activeFileId: "doc-a",
      documents: [
        { id: "doc-a", title: "Doc A", updatedAt: 1 },
        { id: "doc-b", title: "Doc B", updatedAt: 2 },
      ],
      nodes: activeNodes,
      selectedIds: ["active"],
    });

    await useFileSystemActions().switchFile("doc-b");

    expect(useAppStore.getState().activeFileId).toBe("doc-a");
    expect(useAppStore.getState().nodes).toEqual(activeNodes);
    expect(useAppStore.getState().confirmDialog.isOpen).toBe(true);
  });

  it("switches to the next file only after active file deletion succeeds", async () => {
    const nextNodes = [node("next", "Next document")];
    vi.spyOn(DocumentService, "deleteDocument").mockResolvedValue(undefined);
    vi.spyOn(DocumentService, "loadNodes").mockResolvedValue(nextNodes);
    vi.spyOn(DocumentService, "storeActiveFileId").mockImplementation(() => {});

    useAppStore.setState({
      activeFileId: "doc-a",
      documents: [
        { id: "doc-a", title: "Doc A", updatedAt: 1 },
        { id: "doc-b", title: "Doc B", updatedAt: 2 },
      ],
      nodes: [node("active", "Delete me")],
    });

    await useFileSystemActions().deleteFile("doc-a");

    expect(DocumentService.deleteDocument).toHaveBeenCalledWith("doc-a");
    expect(useAppStore.getState().activeFileId).toBe("doc-b");
    expect(useAppStore.getState().nodes).toEqual(nextNodes);
    expect(useAppStore.getState().documents.map((doc) => doc.id)).toEqual([
      "doc-b",
    ]);
  });
});
