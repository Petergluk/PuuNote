import React from "react";
import { usePluginUiStore } from "../plugins/uiRegistry";
import { useAppStore } from "../store/useAppStore";
import { ErrorBoundary } from "./ErrorBoundary";

export const PluginOverlays: React.FC = () => {
  const overlaysMap = usePluginUiStore((state) => state.overlays);
  const storeDisabledPlugins = useAppStore((state) => state.disabledPlugins) || [];
  
  const overlays = Object.values(overlaysMap).filter(o => !o.pluginId || !storeDisabledPlugins.includes(o.pluginId));

  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => (
        <div 
          key={overlay.id} 
          style={{
            position: 'fixed',
            zIndex: 9999,
            ...(overlay.position ? overlay.position : {
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none'
            })
          }}
        >
          <ErrorBoundary fallback={null}>
            <overlay.component />
          </ErrorBoundary>
        </div>
      ))}
    </>
  );
};
