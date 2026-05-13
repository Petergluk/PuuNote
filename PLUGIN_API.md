# PuuNote Plugin API Documentation

Welcome to the PuuNote Plugin Developer Guide. This document provides everything you need to know to write a plugin for the application.

## Overview

Plugins in PuuNote are objects implementing the `PluginDefinition` interface. They are registered during app initialization. 

A plugin can:
- Execute logic on initialization (`init`) or teardown (`unload`).
- Register custom Commands for the Command Palette (`commands`).
- Register context actions on Cards (`cardActions`).
- Hook into node lifecycle events (`hooks.onNodeCreated`, `hooks.onNodeUpdated`, `hooks.onNodeDeleted`).
- Provide long-running background tasks via the **Job Panel**.
- Call Google's Gemini Models via the provided API.
- Read and modify the Document Tree (the application's data structure).

---

## 1. Plugin Structure

```typescript
import type { PluginDefinition, PluginAPI } from "../registry";
// You can use Lucide icons for your commands
import { Sparkles, Replace } from "lucide-react";

export const myPlugin: PluginDefinition = {
  id: "my-unique-plugin-id",
  name: "My Awesome Plugin",
  version: "1.0.0",

  async init(api: PluginAPI) {
    console.log("Plugin initialized!");
    // You can store `api` in a module-level variable to use it anywhere
  },
  
  async unload() {
    console.log("Plugin unloaded!");
  },

  commands: [
    {
      id: "my-plugin-command",
      label: "Run My Plugin Action",
      icon: Sparkles,
      run: async () => {
        // Command action logic here
      }
    }
  ],

  cardActions: [
    {
      id: "my-card-action",
      label: "Process Card",
      icon: <Replace size={16} />,
      isVisible: (nodeId: string) => true, // Determine if the action should be shown for this node
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

**Installation**: Export your plugin and add it to the `CUSTOM_PLUGINS` array in `src/plugins/custom/index.ts`.

---

## 2. Testing Constraints

Since plugins are loaded quickly inside the local preview:
- You do NOT need to modify the main application compilation outside of `src/plugins/custom/index.ts`
- Avoid directly mutating the `nodes` raw array in Zustand unless using standard `useAppStore` mutations (e.g. `setNodes`).
- The `PuuNode` is the basic data block.

### Node Structure (`PuuNode`)

```typescript
export interface PuuNode {
  id: string; // Unique UUID
  parentId: string | null; 
  content: string; // Markdown text of the node
  createdAt: number;
  updatedAt: number;
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

*Note: The store handles History (Undo/Redo) automatically when you use `store.setNodes(updater)`*.

### 3.2 Using the Job Panel

If you have a multi-step operation (like parsing or calling AI multiple times), you should report progress:

```typescript
try {
  const jobId = api.addJob("Structuring Document...");
  
  // Step 1: Analyzing...
  api.updateJobProgress(jobId, 10, "Extracting themes...");
  await doWork();

  // Step 2: Processing...
  api.updateJobProgress(jobId, 50, "Generating new branches...");
  await doWork();
  
  // Finish
  api.updateJobProgress(jobId, 100, "Done");
  api.completeJob(jobId, "View Results", () => {
     // Optional click handler on the result button
     console.log("User investigated results");
  });

} catch(err) {
  api.failJob(jobId, String(err));
}
```

### 3.3 Accessing AI

This application doesn't prescribe a specific AI library for plugins. You can use standard `fetch` to ping internal/external services, or include your own AI SDK inside your plugin folder.

---

## Example Idea: "Tidy Up" Structuring Plugin

To implement the Structuring agent discussed by the creator, you would:

1. Create `src/plugins/custom/structure_plugin.ts`.
2. Register a command "Clean up document".
3. Write an asynchronous task that:
   - Fetches all descendants of the current root.
   - Pushes them into an `AI` context prompt: "Here are random notes. Please return a JSON array containing categories."
   - Waits for response. Updates the UI on progress.
   - Creates new parent nodes for the categories, and updates the `parentId` of the existing notes to move them inside.
   - Use `api.getState().setNodes()` to commit the transaction.
4. Export and register it in `src/plugins/custom/index.ts`.
