import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Trash2, X } from "lucide-react";
import {
  clearDocumentSnapshots,
  getDocumentSnapshots,
  restoreSnapshot,
  takeDocumentSnapshot,
} from "../db/snapshots";
import { DocumentSnapshot } from "../db/db";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface SnapshotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotPanel({ isOpen, onClose }: SnapshotPanelProps) {
  const activeFileId = useAppStore((s) => s.activeFileId);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState("Manual snapshot");
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  // H1 fix: use a ref so async callbacks always read the latest fileId
  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const reloadSnapshots = async (fileId: string | null) => {
    if (!fileId) {
      setSnapshots([]);
      return;
    }
    setIsLoading(true);
    try {
      setSnapshots(await getDocumentSnapshots(fileId));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fileId = activeFileIdRef.current;
    void (async () => {
      const nextSnapshots = fileId ? await getDocumentSnapshots(fileId) : [];
      if (!cancelled) setSnapshots(nextSnapshots);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeFileId]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const fileId = activeFileIdRef.current;
    const name = newSnapshotName.trim() || "Manual snapshot";
    await takeDocumentSnapshot(name);
    await reloadSnapshots(fileId);
  };

  const handleClearAll = () => {
    const fileId = activeFileIdRef.current;
    openConfirm("Delete all snapshots for this document?", async () => {
      if (!fileId) return;
      await clearDocumentSnapshots(fileId);
      await reloadSnapshots(fileId);
    });
  };

  const handleRestore = (snapshot: DocumentSnapshot) => {
    const fileId = activeFileIdRef.current;
    openConfirm("Restore this snapshot?", async () => {
      setIsRestoring(true);
      try {
        await restoreSnapshot(snapshot.id);
        await reloadSnapshots(fileId);
        onClose();
      } finally {
        setIsRestoring(false);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshots-panel-title"
        tabIndex={-1}
        className="absolute bottom-12 right-4 w-[min(420px,calc(100vw-2rem))] rounded border border-app-border bg-app-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <span
            id="snapshots-panel-title"
            className="text-sm font-semibold text-app-text-primary"
          >
            Snapshots
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
            aria-label="Close snapshots panel"
          >
            <X size={16} />
          </button>
        </header>

        {/* UX-4: editable snapshot name */}
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <input
            type="text"
            value={newSnapshotName}
            onChange={(e) => setNewSnapshotName(e.target.value)}
            placeholder="Snapshot name…"
            data-autofocus
            className="flex-1 rounded border border-app-border bg-app-card px-2 py-1 text-xs text-app-text-primary placeholder:text-app-text-muted focus:outline-none focus:ring-1 focus:ring-app-accent"
            aria-label="Snapshot name"
          />
          <button
            onClick={handleCreate}
            disabled={isRestoring}
            className="flex items-center gap-2 rounded border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-secondary hover:bg-app-card-hover disabled:opacity-50"
            aria-label="Create snapshot"
          >
            <Camera size={14} />
            Create
          </button>
          {snapshots.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isRestoring}
              className="flex items-center gap-2 rounded border border-app-border bg-app-card px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              aria-label="Clear all snapshots"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>

        {/* M3: loading state during restore */}
        {isRestoring && (
          <div className="px-3 py-2 text-center text-xs text-app-text-muted border-b border-app-border bg-app-card">
            Restoring snapshot…
          </div>
        )}

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
                  onClick={() => handleRestore(snapshot)}
                  disabled={isRestoring}
                  className="shrink-0 rounded p-1.5 text-app-text-muted hover:bg-app-card hover:text-app-accent disabled:opacity-50"
                  title="Restore snapshot"
                  aria-label={`Restore snapshot: ${snapshot.description || "Snapshot"}`}
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
