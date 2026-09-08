sed -i '/if (active) updateDocumentMetadataInStore(active, newNodes);/a \
        if (isFirstTime) {\
          useAppStore.setState({ theme: "light" });\
          useAppStore.getState().autoColorRootBranches();\
        }' src/hooks/useFileSystemInit.ts
