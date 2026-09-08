sed -i 's/title="Add Sibling (Shift+Enter)"/title={`${t("Add Sibling")} (Shift+Enter)`}/g' src/components/FloatingCardActions.tsx
sed -i 's/title="Add Child (Tab)"/title={`${t("Add Child")} (Tab)`}/g' src/components/FloatingCardActions.tsx
sed -i 's/title="Delete"/title={t("Delete")}/g' src/components/FloatingCardActions.tsx

sed -i 's/title="More actions"/title={t("More actions")}/g' src/components/Card.tsx
sed -i 's/title="Split node at cursor"/title={t("Split node at cursor")}/g' src/components/Card.tsx
sed -i 's/title="Expand to full screen"/title={t("Expand to full screen")}/g' src/components/Card.tsx

sed -i 's/title="Toggle theme"/title={t("Toggle Theme")}/g' src/components/ThemeMenu.tsx
sed -i 's/title="Theme settings"/title={t("Theme settings")}/g' src/components/ThemeMenu.tsx
sed -i 's/title="Сбросить настройки текущей темы"/title={t("Reset theme tuning")}/g' src/components/ThemeMenu.tsx
sed -i 's/title="Скопировать настройки тем"/title={t("Copy theme settings")}/g' src/components/ThemeMenu.tsx

sed -i 's/title="Двойной клик: ввести значение"/title={t("Double click to enter value")}/g' src/components/MiniSlider.tsx

sed -i 's/title="Copy Markdown"/title={t("Copy Markdown")}/g' src/components/FullScreenModal.tsx
sed -i 's/title="Export as Markdown"/title={t("Export as Markdown")}/g' src/components/FullScreenModal.tsx
sed -i 's/title="Close Focus Mode (Esc)"/title={`${t("Close Focus Mode")} (Esc)`}/g' src/components/FullScreenModal.tsx

