import { db } from "./db";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { normalizeNodes } from "../domain/documentService";
import { toast } from "sonner";
import { isQuotaError } from "../utils/storage";

const MAX_SNAPSHOTS_PER_DOCUMENT = 25;

async function pruneDocumentSnapshots(documentId: string) {
  const snapshots = await db.snapshots
    .where("documentId")
    .equals(documentId)
    .sortBy("createdAt");
  const extraCount = snapshots.length - MAX_SNAPSHOTS_PER_DOCUMENT;
  if (extraCount <= 0) return;

  const idsToDelete = snapshots
    .slice(0, extraCount)
    .map((snapshot) => snapshot.id);
  await db.snapshots.bulkDelete(idsToDelete);
}

export async function takeDocumentSnapshot(
  description: string = "Manual Snapshot",
) {
  const state = useAppStore.getState();
  const documentId = state.activeFileId;
  const nodes = state.nodes;

  if (!documentId) return;

  try {
    await db.snapshots.put({
      id: generateId(),
      documentId,
      nodes: [...nodes], // clone
      createdAt: new Date().toISOString(),
      description: `${description} (${nodes.length} cards)`,
    });
    await pruneDocumentSnapshots(documentId);
  } catch (err) {
    if (isQuotaError(err)) {
      toast.error("Storage space is full. Could not save snapshot.");
    } else {
      console.error("Failed to take snapshot", err);
    }
  }
}

export async function getDocumentSnapshots(documentId: string) {
  try {
    const snapshots = await db.snapshots
      .where("documentId")
      .equals(documentId)
      .sortBy("createdAt");
    return snapshots.reverse();
  } catch (err) {
    console.error("Failed to load snapshots", err);
    return [];
  }
}

export async function restoreSnapshot(snapshotId: string) {
  try {
    const snapshot = await db.snapshots.get(snapshotId);
    if (!snapshot) {
      toast.error("Snapshot not found");
      return;
    }

    const activeFileId = useAppStore.getState().activeFileId;
    if (snapshot.documentId !== activeFileId) {
      toast.error("Snapshot belongs to another document.", {
        description: "Open that document before restoring this snapshot.",
      });
      return;
    }

    const validatedNodes = normalizeNodes(snapshot.nodes);
    if (validatedNodes.length === 0) {
      toast.error("Snapshot is invalid and cannot be restored.");
      return;
    }

    useAppStore.getState().setNodesRaw(validatedNodes);
    // Navigate to root node so the board isn't left in a deselected state
    const rootNode = validatedNodes.find((n) => n.parentId === null) ?? validatedNodes[0] ?? null;
    useAppStore.getState().setActiveId(rootNode?.id ?? null);
    useAppStore.getState().setEditingId(null);
    toast.success(`Restored to: ${snapshot.description}`);
  } catch (err) {
    console.error("Failed to restore snapshot", err);
    toast.error("Failed to restore snapshot");
  }
}

export async function clearDocumentSnapshots(documentId: string) {
  try {
    const snapshots = await db.snapshots
      .where("documentId")
      .equals(documentId)
      .toArray();
    const ids = snapshots.map((s) => s.id);
    await db.snapshots.bulkDelete(ids);
  } catch (err) {
    console.error("Failed to clear snapshots", err);
  }
}
