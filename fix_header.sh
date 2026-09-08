sed -i 's/title="Open files menu"/title={t("Documents")}/g' src/components/Header.tsx
sed -i 's/title="Manage documents"/title={t("Documents")}/g' src/components/Header.tsx
sed -i 's/aria-label="Manage documents"/aria-label={t("Documents")}/g' src/components/Header.tsx
sed -i 's/title="Command Palette (Cmd\/Ctrl+K)"/title={`${t("Command Palette")} (Cmd/Ctrl+K)`}/g' src/components/Header.tsx
sed -i 's/aria-label="Command Palette"/aria-label={t("Command Palette")}/g' src/components/Header.tsx
sed -i 's/title="Undo (Ctrl+Z)"/title={t("Undo")}/g' src/components/Header.tsx
sed -i 's/aria-label="Undo"/aria-label={t("Undo shortcut")}/g' src/components/Header.tsx
sed -i 's/title="Redo (Ctrl+Shift+Z)"/title={t("Redo")}/g' src/components/Header.tsx
sed -i 's/aria-label="Redo"/aria-label={t("Redo shortcut")}/g' src/components/Header.tsx
sed -i 's/title="Toggle Fullscreen"/title={t("Fullscreen")}/g' src/components/Header.tsx
sed -i 's/aria-label="Toggle fullscreen"/aria-label={t("Fullscreen")}/g' src/components/Header.tsx
sed -i 's/title="Toggle Expand\/Collapse"/title={t("Toggle Expand")}/g' src/components/Header.tsx
sed -i 's/aria-label="Toggle card collapse"/aria-label={t("Toggle Expand")}/g' src/components/Header.tsx
sed -i 's/title="Toggle theme"/title={t("Toggle Theme")}/g' src/components/Header.tsx
sed -i 's/aria-label="Toggle theme"/aria-label={t("Toggle Theme")}/g' src/components/Header.tsx
sed -i 's/title="Plugins"/title={t("Plugins")}/g' src/components/Header.tsx
sed -i 's/aria-label="Plugins"/aria-label={t("Plugins")}/g' src/components/Header.tsx
sed -i 's/title="Settings"/title={t("settings.title")}/g' src/components/Header.tsx
sed -i 's/aria-label="Settings"/aria-label={t("settings.title")}/g' src/components/Header.tsx
