import { useEffect, useState } from "react";
import { Camera, RotateCcw, Trash2, X } from "lucide-react";
import {
  clearDocumentSnapshots,
  getDocumentSnapshots,
  restoreSnapshot,
  takeDocumentSnapshot,
} from "../db/snapshots";
import { DocumentSnapshot } from "../db/db";
import { useAppStore } from "../store/useAppStore";

interface SnapshotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotPanel({ isOpen, onClose }: SnapshotPanelProps) {
  const activeFileId = useAppStore((s) => s.activeFileId);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reloadSnapshots = async () => {
    if (!activeFileId) {
      setSnapshots([]);
      return;
    }
    setIsLoading(true);
    try {
      setSnapshots(await getDocumentSnapshots(activeFileId));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const nextSnapshots = activeFileId
        ? await getDocumentSnapshots(activeFileId)
        : [];
      if (!cancelled) setSnapshots(nextSnapshots);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeFileId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute bottom-12 right-4 w-[min(420px,calc(100vw-2rem))] rounded border border-app-border bg-app-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <span className="text-sm font-semibold text-app-text-primary">
            Snapshots
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <button
            onClick={async () => {
              await takeDocumentSnapshot("Manual snapshot");
              await reloadSnapshots();
            }}
            className="flex items-center gap-2 rounded border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-secondary hover:bg-app-card-hover"
          >
            <Camera size={14} />
            Create
          </button>
          {snapshots.length > 0 && (
            <button
              onClick={() =>
                openConfirm(
                  "Delete all snapshots for this document?",
                  async () => {
                    if (!activeFileId) return;
                    await clearDocumentSnapshots(activeFileId);
                    await reloadSnapshots();
                  },
                )
              }
              className="flex items-center gap-2 rounded border border-app-border bg-app-card px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-app-text-muted">
              Loading...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-app-text-muted">
              No snapshots yet
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between gap-3 rounded px-3 py-2 hover:bg-app-card-hover"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-app-text-primary">
                    {snapshot.description || "Snapshot"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-app-text-muted">
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() =>
                    openConfirm("Restore this snapshot?", async () => {
                      await restoreSnapshot(snapshot.id);
                      await reloadSnapshots();
                      onClose();
                    })
                  }
                  className="shrink-0 rounded p-1.5 text-app-text-muted hover:bg-app-card hover:text-app-accent"
                  title="Restore snapshot"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
