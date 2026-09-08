<!-- puunote-format: 1 -->
# PuuNote: Complete Guide
PuuNote is a horizontal tree-based editor for texts, scripts, notes, ideas, and complex structures.
The main thought stays on the left, while clarifications and details expand to the right. This keeps the overall context visible without turning the document into an endless scrolling page.
---
    ## Philosophy
    A typical document forces you to read and write top-to-bottom. But thoughts often develop differently: clarifications, examples, questions, or alternative versions appear.
    In PuuNote, such branches become separate cards.
---
        ### Horizontal Thinking
        Each column to the right represents the next level of detail.
---
            #### Left Column
            Contains major themes, sections, or main thesis points.
---
            #### Right Column
            Contains child thoughts: explanations, steps, examples, questions, materials.
---
        ### Focus Without Losing Context
        When a card is selected, the active branch is highlighted, and the rest of the tree becomes quieter (fades or dims based on your settings).
---
# Appearance & Themes
PuuNote allows flexible visual customization to create the perfect workspace.
---
    ## Color Themes
    Use the top bar to switch basic color themes: from high-contrast light to cozy dark. Adapt the interface to your lighting and mood.
---
    ## Branch Styling (Make it beautiful)
    The paintbrush icon in the header allows you to colorize branches! You can set custom colors for each branch, tweak transparency, intensity, thickness, and border brightness.
    The "Make it beautiful" button automatically applies harmonious colors to all root branches.
    Click the paintbrush to access advanced sliders (gradient, fill, corner radius). The corner radius slider adjusts the shape of cards across the entire document.
---
# How it works
---
    ## Editor Mode
    In settings, you can choose between a Markdown editor and a Visual editor (WYSIWYG) with a floating toolbar.
---
    ## Focus Mode (Zen)
    Double-click a card or click the expand icon to enter Focus Mode. It hides everything unnecessary. In settings, you can define the scope: focus on a single card, the entire active branch, or siblings of the current level.
    Anchor scrolling ensures you stay exactly where you were when you exit Zen mode.
---
    ## Undo and Redo
    Header buttons and hotkeys (Ctrl+Z / Ctrl+Shift+Z) undo and redo changes.
    Fast typing is batched, while structural actions — create, delete, move, split, and merge — remain separate history steps.
---
    ## Snapshots
    The snapshots panel at the bottom lets you save intermediate document states and restore them.
    They are useful before major edits, imports, massive card moves, or AI operations.
---
    ## Audio Recording (Voice)
    The command palette and card actions menu contain dictation buttons. You can record audio, and AI will automatically transcribe it into the card's text.
---
    ## Plugins (PuuExtend)
    The plugins menu (stars icon) allows you to apply custom AI-based actions to selected cards (e.g., proofreading, translation, improvement).
    In plugin settings, you can create your own prompts using variables:
    - `{{card}}` — text of the current card.
    - `{{document}}` — entire document text.
    - `{{level_branch}}` — sibling cards (same parent).
    - `{{level_all}}` — all cards at the same depth level.
    - `{{branch_parent}}` — path from the root to the selected card.
    - `{{branch_children}}` — all descendants of the current card.
---
    ## Command Palette
    The search in the header (or `Ctrl+K` / `Cmd+K`) opens quick commands and full-text search.
---
# Important to Know
---
    ## Data is stored locally
    PuuNote saves documents in your browser's IndexedDB. Notes are not sent to any server unless you explicitly use AI plugins that interact with neural networks (Gemini API).
---
    ## Known Limitations
---
        ### Very large documents
        Lags are possible on thousands of cards, especially during drag and drop and active branch focusing.
---
        ### Visual mode and complex Markdown
        Visual mode is convenient for text, lists, and links, but complex tables and non-standard Markdown are better edited in Markdown mode.
---
# Keyboard Shortcuts
The app supports many hotkeys to speed up your workflow without a mouse.
---
    ## Navigation
    - `Up/Down arrows` — move between sibling cards.
    - `Right arrow` — go to the first child card.
    - `Left arrow` — return to the parent card.
---
    ## Editing
    - `Enter` — edit the selected card.
    - `Esc` or `Ctrl + Enter` / `Cmd + Enter` — finish editing.
    - `Shift + Enter` — create a new sibling card (below).
    - `Tab` — create a new child card.
---
    ## Branch Operations
    - `Ctrl + C` / `Cmd + C` — copy the active branch.
    - `Ctrl + X` / `Cmd + X` — cut the active branch.
    - `Ctrl + V` / `Cmd + V` — paste copied cards.
    - `Delete` or `Backspace` — delete the active card (and its branch).
---
    ## Undo and Redo
    - `Ctrl + Z` / `Cmd + Z` — undo the last action.
    - `Ctrl + Shift + Z` / `Cmd + Shift + Z` — redo the undone action.
---
    ## Global Functions
    - `Ctrl + K` / `Cmd + K` — open the Command Palette and search.
