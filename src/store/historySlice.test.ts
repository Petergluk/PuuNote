import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./useAppStore";

const initialNodes = [
  { id: "a", parentId: null, order: 0, content: "A" },
  { id: "b", parentId: null, order: 1, content: "B" },
];

describe("history slice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    useAppStore.getState().setNodesRaw(initialNodes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups fast text edits in one undo step", () => {
    const store = useAppStore.getState();

    store.updateContent("a", "A1");
    vi.advanceTimersByTime(200);
    store.updateContent("a", "A12");
    vi.advanceTimersByTime(200);
    store.updateContent("a", "A123");

    expect(useAppStore.getState().past).toHaveLength(1);
    expect(useAppStore.getState().nodes[0].content).toBe("A123");

    useAppStore.getState().undo();

    expect(useAppStore.getState().nodes[0].content).toBe("A");
  });

  it("starts a new undo step after the text edit grouping window", () => {
    const store = useAppStore.getState();

    store.updateContent("a", "A1");
    vi.advanceTimersByTime(1600);
    store.updateContent("a", "A12");

    expect(useAppStore.getState().past).toHaveLength(2);

    useAppStore.getState().undo();

    expect(useAppStore.getState().nodes[0].content).toBe("A1");
  });

  it("keeps structural operations as separate undo steps", () => {
    const store = useAppStore.getState();

    store.updateContent("a", "A1");
    vi.advanceTimersByTime(200);
    store.addChild("a");

    expect(useAppStore.getState().past).toHaveLength(2);
  });
});
