# PuuNote 0.4

PuuNote is an innovative horizontal-tree, card-based text editor. Instead of writing in a single, never-ending vertical document, your thoughts are broken down into cards (nodes) that branch out from left to right. This structure naturally maps to how human thought expands—starting with a core premise and branching into logical details.

## 🚀 Features

- **Horizontal Tree Architecture:** Keep the top-level context visible on the left while exploring detailed depths on the right. Columns act independently so adding text to one doesn't break the layout of another.
- **Focus Highlighting:** The active thought path (from the root down to your current node) is vividly highlighted, whilst neighboring nodes fade into the background.
- **Fluid Keyboard Navigation:** Designed to keep your hands on the keyboard.
  - Use `Arrow Keys` to traverse the tree.
  - `Enter` to edit a card.
  - `Shift + Enter` to create a new sibling card.
  - `Tab` to create a new child card in the next column.
- **Robust Markdown Engine:** Full GitHub Flavored Markdown inside of cards. Render links, code blocks, tables, and lists. Safeguarded by `rehype-sanitize` to guarantee XSS protection.
- **Semantic Export & Import:** Markdown isn't just visually parsed. When you export or import `.md` files, PuuNote understands the actual branches of the document, gracefully indenting hierarchy rather than blindly flattening the structure.
- **Timeline View:** Want to read the document linearly? Switch to Timeline View. It traverses the document branch-by-branch (depth-first) to present your thought process coherently.
- **Complete Privacy (Local Storage):** Autosaves all state directly into the browser's `localStorage` ensuring high performance and absolute data privacy.
- **Drag & Drop:** Reorder your thoughts naturally by dragging cards to different nodes or sorting siblings.
- **Full-Screen Focus Mode:** Expand a single node into an immersive distraction-free editor.

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion (motion/react)
- **Icons**: Lucide React
- **Markdown parsing**: react-markdown + remark-gfm + rehype-sanitize 

## 🌐 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` to start mapping your thoughts!

## 🔮 Roadmap / Future Capabilities

- **AI Integration (@google/genai):** Smart autocomplete, brainstorming modes, and branch summarization.
- **Cloud Sync:** Firebase / Supabase for cross-device state preservation.
- **Real-Time Collaboration:** WebSockets / CRDT for multiplayer editing sessions.
