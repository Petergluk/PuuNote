import { db } from "./db";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { toast } from "sonner";

export async function takeDocumentSnapshot(description: string = "Manual Snapshot") {
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
      description,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "QuotaExceededError" || err.message.includes("Quota"))) {
      toast.error("Storage space is full. Could not save snapshot.");
    } else {
      console.error("Failed to take snapshot", err);
    }
  }
}

export async function getDocumentSnapshots(documentId: string) {
  try {
    return await db.snapshots
      .where("documentId")
      .equals(documentId)
      .reverse()
      .sortBy("createdAt");
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

    useAppStore.getState().setNodesRaw(snapshot.nodes);
    useAppStore.getState().setActiveId(null);
    toast.success(`Restored to: ${snapshot.description}`);
  } catch (err) {
    console.error("Failed to restore snapshot", err);
    toast.error("Failed to restore snapshot");
  }
}

export async function clearDocumentSnapshots(documentId: string) {
  try {
    const snapshots = await db.snapshots.where("documentId").equals(documentId).toArray();
    const ids = snapshots.map((s) => s.id);
    await db.snapshots.bulkDelete(ids);
  } catch (err) {
    console.error("Failed to clear snapshots", err);
  }
}
