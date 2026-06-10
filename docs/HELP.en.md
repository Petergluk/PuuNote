<!-- puunote-format: 1 -->
# PuuNote: Complete Guide

PuuNote is a horizontal tree-based editor for texts, scripts, outlines, ideas, and complex structures.

The main idea stays on the left, while clarifications and details branch out to the right. This allows you to keep the overall context in view instead of turning the document into one long text wall.

---

    ## Philosophy

    A typical document forces you to read and write top-to-bottom. But thoughts often develop differently: an elaboration, example, question, counter-argument, or alternative version appears.

    In PuuNote, such branches become separate cards.

---

        ### Horizontal Thinking

        Each column to the right represents the next level of detail.

---

            #### Left Column

            Contains major topics, sections, or main concepts.

---

            #### Right Column

            Contains child thoughts: explanations, steps, examples, questions, materials.

---

        ### Focus without losing context

        When a card is focused, its active branch is highlighted, and the rest of the tree becomes quiet.

---

            #### Dim branches

            Inactive cards remain in place but visually fade into the background.

---

            #### Hide branches

            Inactive branches are temporarily hidden to leave only the active working corridor.

---

        ### Where it's useful

        PuuNote is especially useful where structure is more important than linear reading.

---

            #### Writing and Editing

            The outline of an article, book, course, or script can be expanded into levels and rearranged in chunks.

---

            #### Working with Methodologies

            Scripts, questions, answer options, and comments are easily kept as separate cards.

---

            #### Brainstorming & Research

            Facts, hypotheses, sources, and conclusions can be separated into branches without mixing levels.

---

# Navigation

---

    ## Selecting a Card

    Clicking a card makes it active. The active card gets a bright left border and becomes the center of the current branch.

---

        ### Clearing Focus

        Click on an empty space between cards to unselect the active card and see the full tree again.

---

        ### Moving Deeper

        The right arrow selects the first child card of the active node.

---

        ### Moving Back

        The left arrow returns to the parent of the active card.

---

        ### Moving Between Siblings

        The up and down arrows move the focus between cards of the same level and parent.

---

    ## Multi-selection, Copy, and Cut

    You can select multiple specific cards using Shift or Control/Command and move only them.

---

        ### Single Active Card

        If one card is active and you press Copy or Cut, the entire branch is copied or cut: the card itself and all its child cards.

---

        ### Multiple Selected Cards

        If multiple cards are selected, only those specific cards are copied. Child cards that were not explicitly selected are not copied.

---

        ### What happens on Cut

        When cutting multiple selected cards, unselected children are not deleted. They are promoted one level up, attaching to the nearest remaining parent.

---

    ## Creating Cards

---

        ### Tab

        Creates a child card to the right of the active one.

---

            #### When to use

            To clarify, add an example, subtask, question, or separate thought that elaborates on the current card.

---

        ### Shift + Enter

        Creates a sibling card below the active one.

---

            #### When to use

            For a new point on the same level: the next step, thesis, section, or variant.

---

        ### Enter

        Opens the active card for editing.

---

        ### Esc or Ctrl + Enter

        Finishes editing and returns focus to the tree.

---

    ## Drag and Drop

    Cards can be rearranged using the mouse.

---

        ### Top zone

        Drag a card onto the upper part of another card to place it before it.

---

        ### Bottom zone

        Drag a card onto the lower part of another card to place it after it.

---

        ### Right zone

        Drag a card onto the right part of another card to make it a child.

---

# Editing

---

    ## Markdown Mode

    By default, a card is edited as Markdown text. You manually type `#`, `**bold**`, lists, links, and other formatting elements. Formatting capabilities are quite rich.

---

        ### Basic text formatting

        - **Bold text**
        - *Italic*
        - ***Bold and Italic***
        - ~~Strikethrough~~

---

        ### Headings

        Up to six levels of headings are supported:
        # Heading 1
        ## Heading 2 
        ### Heading 3 
        #### Heading 4
    	##### Heading 5
    	###### Heading 6

---

        ### Lists

        **Bullet list:**
        - Item 1
        - Item 2
          - Nested item

        **Numbered list:**
        1. First step
        2. Second step

---

        ### Task Lists (Checkboxes)

        You can create interactive task lists. Checkboxes can be toggled directly in view mode.
        - [ ] Pending task
        - [x] Completed task

---

        ### Code Blocks and Inline Code

        To format an inline code snippet, use a single backtick: `code snippet`.

        For multi-line code blocks, use three backticks — this allows you to insert entire snippets:
        ```javascript
        function hello() {
          console.log("Hello, world!");
        }
        ```

---

        ### Links and Images

        **Link:**
        [OpenAI](https://openai.com)

        **Image:**
        ![Example Image](https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=800&auto=format&fit=crop)

---

        ### Blockquotes

        > Primary quote
        >> Nested quote
        (Use the `>` sign before the text).

---

        ### Tables

        | Column 1 | Column 2 |
        |---|---|
        | Value A | Value B |
        | Value C | Value D |

---

        ### Separators and HTML

        To create a horizontal line, use three dashes: `---` on an empty line.

        For compatibility with standard Markdown, basic styling via HTML is supported (e.g., colored text): 
        <span style="color: red;">Red text</span>

---

    ## Visual Editor Mode

    In settings, you can enable "Visual" mode which is based on Tiptap (ProseMirror).

    It is convenient for basic formatting: headings, bold/italic, strikethrough, lists, tasks, and links.

    Note: Visual mode is not a complete replacement for Markdown mode. Complex tables, custom layouts, and advanced GitHub Flavored Markdown are safer edited in Markdown mode.

---

        ### Floating toolbar

        Highlight text in an active card in visual mode, and a compact formatting toolbar will appear above it.

---

        ### How visual mode works (developer notes)

        The Visual mode (`WysiwygEditor`) works together with Markdown parsing. On changes, the content is serialized back to Markdown because cards are internally stored as Markdown text.

---

    ## Focus Mode

    The expand button on an active card opens the focused editor.

---

        ### Single card

        In settings, you can choose to focus only on a single card.

---

        ### Branch level

        You can show neighboring cards of the same parent to edit a snippet in context.

---

        ### Full column

        You can open the entire document depth level to see more adjacent elements.

---

# Views

---

    ## Tree View

    The main mode: cards are arranged in columns, from left to right.

---

        ### Column Width

        There is a width control at the bottom. You can quickly fit the screen for 2, 3, or more columns.

---

        ### Compact Mode

        The collapse button makes inactive cards shorter for easier viewing of large documents.

---

    ## Linear View

    Linear view gathers the tree into a single readable top-to-bottom flow.

---

        ### Outline

        An outline based on card titles is built on the left.

---

        ### Editing

        Clicking on a fragment makes it active and opens it for editing.

---

        ### Copy All

        A button to copy the entire document as standard continuous text.

---

# Files and Data

---

    ## Document Manager

    The folder icon opens the document list.

---

        ### Multiple projects

        You can store several independent documents and switch between them.

---

        ### Local storage

        Documents are saved in the browser via IndexedDB. PuuNote does not send your text to a server.

---

    ## Import

    Loads a Markdown or PuuNote JSON file and turns it into a new document.

---

        ### Simple Markdown

        If it's a regular `.md` file, the parser builds the tree based on headings and lists.

---

        ### PuuNote JSON

        JSON export saves document structure perfectly: card IDs, order, relations, and metadata.

---

    ## Export

    The document can be downloaded back.

---

        ### Markdown

        Exports the tree as pure `.md`: card levels become heading levels.

---

        ### JSON

        Lossless JSON saves the document, metadata, and node structure for exact restore.

---

# Settings and Service features

---

    ## Themes

    Switches between light, dark, blue, brown, or monochrome themes.

---

    ## Inactive branches

    Choose what to do with inactive branches: dim them or hide them.

---

    ## Editor mode

    Choose between Markdown Editor or Visual WYSIWYG editor.

---

    ## Undo and Redo

    Buttons in the header and hotkeys (Ctrl+Z / Ctrl+Shift+Z) undo/redo changes. Typing is grouped automatically.

---

    ## Snapshots

    The snapshots panel at the bottom saves intermediate versions of the document. Useful before large edits or AI operations.

---

    ## Command Palette

    Search in the header (or `Ctrl+K` / `Cmd+K`) opens quick commands and full-text search across cards.

---

# Good to know

---

    ## AI-commands are experimental

    The AI commands are a foundation. By default, keys are fetched locally. Ensure you do not input production billing keys in the browser.

---

    ## Plugins (PuuExtend)

    A local plugin registry is built-in (`PuuExtend`, Voice recorder). It runs entirely on the client.
    PuuExtend allows you to create custom AI actions. You can use the following variables in templates (they will be replaced with actual document text):
    - `{{card}}` — text of the currently selected card
    - `{{document}}` — text of the entire document
    - `{{level_branch}}` — sibling cards (same parent)
    - `{{level_all}}` — all cards at the same depth level
    - `{{branch_parent}}` — vertical branch from root to the selected card
    - `{{branch_children}}` — all descendants of the current card to the lowest branches
    - `{{branch_1}}`, `{{branch_2}}` — card + descendants 1 or 2 generations down
    - `{{branch_-1}}`, `{{branch_-2}}` — card + ancestors 1 or 2 generations up

---

# Keyboard Shortcuts

- `Arrows` — navigation.
- `Enter` — edit card.
- `Esc` or `Ctrl+Enter` — save edit.
- `Shift+Enter` — new sibling card.
- `Tab` — new child card.
- `Ctrl+C / Ctrl+X / Ctrl+V` — branch copy/cut/paste.
- `Delete` — delete active card.
- `Ctrl+Z` / `Ctrl+Shift+Z` — Undo / Redo.
- `Ctrl+K` — Command Palette.
