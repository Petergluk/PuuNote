sed -i '/if (isFirstTime) {/,+3d' src/hooks/useFileSystemInit.ts
sed -i '/fsManager.isHydratingFile = false;/a \
        if (isFirstTime) {\
          useAppStore.setState({ theme: "light" });\
          useAppStore.getState().autoColorRootBranches();\
        }' src/hooks/useFileSystemInit.ts
