import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (
              id.includes("/node_modules/@tiptap/pm/") ||
              id.includes("/node_modules/prosemirror-")
            ) {
              return "prosemirror";
            }
            if (
              id.includes("/node_modules/@tiptap/") ||
              id.includes("/node_modules/tiptap-markdown/")
            ) {
              return "tiptap";
            }
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/")
            ) {
              return "react-vendor";
            }
            if (id.includes("/node_modules/dexie/")) return "storage";
            if (id.includes("/node_modules/zod/")) return "validation";
            if (
              id.includes("/node_modules/i18next/") ||
              id.includes("/node_modules/react-i18next/") ||
              id.includes("/node_modules/i18next-browser-languagedetector/")
            ) {
              return "i18n";
            }
            if (id.includes("/node_modules/sonner/")) return "toast";
            if (
              id.includes("/node_modules/react-markdown/") ||
              id.includes("/node_modules/rehype-sanitize/") ||
              id.includes("/node_modules/remark-gfm/")
            ) {
              return "markdown";
            }
            if (id.includes("/node_modules/fuse.js/")) return "search";
            if (id.includes("/node_modules/react-virtuoso/")) {
              return "virtualization";
            }
            if (id.includes("/node_modules/react-textarea-autosize/")) {
              return "autosize";
            }
            if (id.includes("/node_modules/zustand/")) return "state";
            if (id.includes("/node_modules/lucide-react/")) return "ui-icons";
            if (id.includes("/node_modules/motion/")) return "motion";
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
