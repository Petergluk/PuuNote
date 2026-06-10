export const editorFocusTracker = {
  lastFocusedNodeId: null as string | null,
  lastFocusedElement: null as HTMLTextAreaElement | HTMLElement | null,
  lastSelectionStart: 0,
  lastSelectionEnd: 0,
  lastValue: "",
  
  update(element: HTMLTextAreaElement | HTMLElement, nodeId: string, start: number, end: number, value: string) {
    this.lastFocusedElement = element;
    this.lastFocusedNodeId = nodeId;
    this.lastSelectionStart = start;
    this.lastSelectionEnd = end;
    this.lastValue = value;
  },
  
  clear() {
    this.lastFocusedNodeId = null;
    this.lastFocusedElement = null;
  }
};
