import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AppStore } from "./appStoreTypes";
import { createDocumentSlice } from "./slices/documentSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createSelectionSlice } from "./slices/selectionSlice";
import { createUiSlice } from "./slices/uiSlice";

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...createUiSlice(set, get),
    ...createSelectionSlice(set, get),
    ...createHistorySlice(set, get),
    ...createDocumentSlice(set, get),
  })),
);
