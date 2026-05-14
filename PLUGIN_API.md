# PuuNote Plugin API Documentation

Welcome to the PuuNote Plugin Developer Guide. This document provides everything you need to know to write a plugin for the application.

## Overview

Plugins in PuuNote are objects implementing the `PluginDefinition` interface. They are registered dynamically during app initialization. 

A plugin can:
- Execute logic on initialization (`init`) or teardown (`unload`).
- Register custom Commands for the Command Palette (`commands`).
- Register context actions on Cards (`cardActions`).
- Hook into node lifecycle events (`hooks.onNodeCreated`, `hooks.onNodeUpdated`, `hooks.onNodeDeleted`).
- Provide long-running background tasks via the **Job Panel**.
- Integrate with API Keys from `.env` (locally/hosting) or local storage (through the UI).
- Read and modify the Document Tree (the application's data structure).

---

## 1. Plugin Structure

Each plugin should reside in its own separate directory inside `src/plugins/`. This avoids cluttering and keeps related files (like prompts, UI dialogs, and utilities) together.

Example structure:
```
src/plugins/
  registry.ts
  init.ts
  index.ts                     ← Central barrel exporting active plugins
  my-awesome-plugin/           ← Directory for your plugin
    manifest.ts                ← id, name, version, description
    index.tsx                  ← main export plugin logic (PluginDefinition)
    utils.ts                   ← utility functions
    YourCustomModal.tsx        ← UI component (if needed)
```

### 1.1 The Manifest (`manifest.ts`)

```typescript
export const myPluginManifest = {
  id: "my-unique-plugin-id",
  name: "My Awesome Plugin",
  version: "1.0.0",
  description: "Demonstrates how to build a basic plugin."
};
```

### 1.2 Main Plugin File (`index.tsx`)

```tsx
import type { PluginDefinition, PluginAPI } from "../../registry";
import { Sparkles, Replace } from "lucide-react";
import { myPluginManifest } from "./manifest";

let pluginApi: PluginAPI | null = null;

export const myAwesomePlugin: PluginDefinition = {
  ...myPluginManifest,

  async init(api: PluginAPI) {
    pluginApi = api;
    console.log("Plugin initialized!");
  },
  
  async unload() {
    console.log("Plugin unloaded!");
  },

  commands: [
    {
      id: "my-plugin-command",
      label: "Run My Plugin Action",
      icon: () => <Sparkles size={16} />,
      run: async () => {
        // Command action logic here
      }
    }
  ],

  cardActions: [
    {
      id: "my-card-action",
      label: "Process Card",
      icon: () => <Replace size={16} />,
      isVisible: (nodeId: string) => true,
      onClick: (nodeId: string) => {
        // Context action logic here
      }
    }
  ],

  hooks: {
    onNodeCreated: (node) => {
      console.log("New node added: ", node.id);
    }
  }
};
```

**Installation**: Export your plugin and add it to the `CUSTOM_PLUGINS` array in `src/plugins/index.ts`.

---

## 2. Testing Constraints

Since plugins are loaded quickly inside the local preview:
- You do NOT need to modify the main application compilation outside of `src/plugins/index.ts`
- Avoid directly mutating the `nodes` raw array in Zustand unless using standard `useAppStore` mutations (e.g. `setNodes`).

### Node Structure (`PuuNode`)

```typescript
export interface PuuNode {
  id: string; // Unique UUID
  parentId: string | null; 
  content: string; // Markdown text of the node
  createdAt: number;
  updatedAt: number;
  width?: number;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}
```

---

## 3. The `PluginAPI`

The `api` object provided to `init(api)` contains the primary interface to the app.

```typescript
export interface PluginAPI {
  // 1. Get the current AppStore state (Redux/Zustand pattern)
  getState: () => AppStore; 
  
  // 2. Job Panel: Run background tasks and display their progress
  addJob: (title: string) => string; // Returns the Job ID
  updateJobProgress: (id: string, progress: number, statusText?: string) => void;
  completeJob: (id: string, resultLabel: string, onClick?: () => void) => void;
  failJob: (id: string, error: string) => void;
  
  // 3. UI Toasts
  toast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}
```

### 3.1 Manipulating the Tree (via Zustand Store)

You can get the current cards (nodes) via `api.getState().nodes`. 
You can modify the tree using functions in the store:

```typescript
const store = api.getState();

// Add a new sibling or child
store.addChild(parentNodeId);
store.addSibling(siblingNodeId);

// You can manually push state updates doing:
store.setNodes((prevNodes) => {
  return [...prevNodes, {
    id: "new-id",
    parentId: "parent-id",
    content: "My new content text",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }];
});
```

### 3.2 Using the Job Panel

If you have a multi-step operation (like parsing or calling AI multiple times), you should report progress:

```typescript
try {
  const jobId = api.addJob("Structuring Document...");
  
  api.updateJobProgress(jobId, 10, "Extracting themes...");
  await doWork();

  api.updateJobProgress(jobId, 100, "Done");
  api.completeJob(jobId, "View Results", () => {
     console.log("User investigated results");
  });
} catch(err) {
  api.failJob(jobId, String(err));
}
```

### 3.3 Accessing Environment Variables & User Keys

To ensure the best UX across Local, Cloud hosting (like Render), and Google Studio Preview plugins should access sensitive keys via:
1. Environment Key (e.g. `import.meta.env.VITE_GEMINI_PLUGIN_API_KEY`)
2. Saved state in `localStorage`
3. Optional Stubbing (e.g., if rendering in AI Studio without a key, you may fallback to simulated processing to show the UI working)

You can allow users to modify this in the **Plugins Panel**.
