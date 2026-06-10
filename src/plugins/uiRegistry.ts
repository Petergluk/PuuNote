import { create } from "zustand";
import React from "react";
import { PuuNode } from "../types";

export interface CardWidget {
  id: string;
  pluginId?: string;
  component: React.ComponentType<{ node: PuuNode }>;
  position: "top" | "bottom" | "replace";
}

export interface PluginOverlay {
  id: string;
  pluginId?: string;
  component: React.ComponentType<any>;
  position?: any;
}

interface PluginUiStore {
  cardWidgets: Record<string, CardWidget>;
  overlays: Record<string, PluginOverlay>;
  registerCardWidget: (widget: CardWidget) => void;
  unregisterCardWidget: (id: string) => void;
  addOverlay: (overlay: PluginOverlay) => void;
  removeOverlay: (id: string) => void;
}

export const usePluginUiStore = create<PluginUiStore>((set) => ({
  cardWidgets: {},
  overlays: {},
  registerCardWidget: (widget) =>
    set((state) => ({
      cardWidgets: { ...state.cardWidgets, [widget.id]: widget },
    })),
  unregisterCardWidget: (id) =>
    set((state) => {
      const rest = { ...state.cardWidgets };
      delete rest[id];
      return { cardWidgets: rest };
    }),
  addOverlay: (overlay) =>
    set((state) => ({
      overlays: { ...state.overlays, [overlay.id]: overlay },
    })),
  removeOverlay: (id) =>
    set((state) => {
      const rest = { ...state.overlays };
      delete rest[id];
      return { overlays: rest };
    }),
}));
