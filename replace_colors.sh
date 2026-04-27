#!/bin/bash
# Replaces specific hardcoded dark/light colors with semantic ones

# Text
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-900 dark:text-\[#eee\]/text-app-text-primary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-800 dark:text-\[#d1d1d1\]/text-app-text-primary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-900 dark:text-white/text-app-text-primary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-black dark:text-white/text-app-text-primary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-600 dark:text-\[#888\]/text-app-text-secondary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-700 dark:text-\[#d1d1d1\]/text-app-text-secondary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-500 dark:text-\[#888\]/text-app-text-secondary/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-500 dark:text-\[#666\]/text-app-text-muted/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/text-zinc-400/text-app-text-muted/g' {} +

# Backgrounds
find src -type f -name "*.tsx" -exec sed -i 's/bg-zinc-50 dark:bg-\[#0a0a0a\]/bg-app-bg/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-white dark:bg-\[#0f0f0f\]/bg-app-panel/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-white dark:bg-\[#111\]/bg-app-card/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-zinc-100 dark:bg-\[#111\]/bg-app-card/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-white dark:bg-\[#1a1a1a\]/bg-app-card/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-zinc-50 dark:bg-\[#1e1e1e\]/bg-app-card-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:bg-zinc-50 dark:hover:bg-\[#1e1e1e\]/hover:bg-app-card-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:bg-zinc-50 dark:hover:bg-\[#1a1a1a\]/hover:bg-app-card-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-zinc-50 dark:bg-\[#1a1a1a\]/bg-app-card-active/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:bg-zinc-100 dark:hover:bg-\[#111\]/hover:bg-app-card-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:bg-zinc-200 dark:hover:bg-\[#222\]/hover:bg-app-card-hover/g' {} +

# Borders
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-200 dark:border-\[#222\]/border-app-border/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-200 dark:border-\[#1a1a1a\]/border-app-border/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-200 dark:border-\[#333\]/border-app-border/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-300 dark:border-\[#222\]/border-app-border/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-300 dark:border-\[#333\]/border-app-border-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-zinc-400 dark:border-\[#444\]/border-app-border-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:border-zinc-300 dark:hover:border-\[#333\]/hover:border-app-border-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/dark:hover:border-\[#444\]/hover:border-app-border-hover/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:border-zinc-300 dark:hover:border-\[#555\]/hover:border-app-border-hover/g' {} +

# Accent
find src -type f -name "*.tsx" -exec sed -i 's/text-\[#a3966a\]/text-app-accent/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/border-\[#a3966a\]/border-app-accent/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/bg-\[#a3966a\]/bg-app-accent/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:text-\[#a3966a\] dark:hover:text-\[#a3966a\]/hover:text-app-accent/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/hover:border-\[#a3966a\] dark:hover:border-\[#a3966a\]/hover:border-app-accent/g' {} +

