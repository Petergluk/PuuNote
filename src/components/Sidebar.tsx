import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { PluginRegistry } from "../plugins/registry";
import { ErrorBoundary } from "./ErrorBoundary";

export const Sidebar = () => {
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const activeSidebarPluginId = useAppStore((s) => s.activeSidebarPluginId);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);

  const [pluginComponent, setPluginComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!isSidebarOpen || !activeSidebarPluginId) {
      setPluginComponent(null);
      return;
    }
    const plugins = PluginRegistry.getPlugins();
    const plugin = plugins.find((p) => p.id === activeSidebarPluginId);
    if (plugin && plugin.sidebarComponent) {
      setPluginComponent(() => plugin.sidebarComponent!);
    } else {
      setPluginComponent(null);
    }
  }, [isSidebarOpen, activeSidebarPluginId]);

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = Math.max(200, Math.min(e.clientX, window.innerWidth - 200));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    // Add class to body to prevent text selection and show resize cursor everywhere
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

  if (!isSidebarOpen) return null;

  return (
    <div 
      className="flex flex-shrink-0 h-full relative" 
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="flex-1 w-full h-full bg-app-card border-r border-app-border overflow-hidden">
        {pluginComponent ? (
          <ErrorBoundary>
            {React.createElement(pluginComponent)}
          </ErrorBoundary>
        ) : (
          <div className="p-4 text-app-text-muted flex items-center justify-center h-full">
            No active plugin selected.
          </div>
        )}
      </div>
      
      {/* Resizer Handle */}
      <div 
        ref={resizeRef}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-app-accent active:bg-app-accent z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};
