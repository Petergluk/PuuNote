// This file implements the "Visual" editor mode using Tiptap.
// The application supports two parallel editing experiences:
// raw Markdown and this rich text visual editor.
// Preserving this file ensures users who prefer WYSIWYG editing
// maintain that capability.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Check,
  X,
} from "lucide-react";
import { normalizeEditorLinkHref } from "../utils/link";

interface WysiwygEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export interface WysiwygEditorHandle {
  getSplitMarkdown: () => { textBefore: string; textAfter: string } | null;
}

type MarkdownStorage = {
  markdown?: {
    getMarkdown?: () => string;
    serializer?: {
      serialize?: (content: unknown) => string;
    };
  };
};

const getMarkdown = (editor: { storage: unknown }) => {
  const storage = editor.storage as MarkdownStorage;
  return storage.markdown?.getMarkdown?.() ?? "";
};

const serializeMarkdown = (editor: { storage: unknown }, content: unknown) => {
  const storage = editor.storage as MarkdownStorage;
  return storage.markdown?.serializer?.serialize?.(content) ?? "";
};

export const WysiwygEditor = forwardRef<
  WysiwygEditorHandle,
  WysiwygEditorProps
>(({ initialValue, onChange, onBlur, autoFocus, className }, ref) => {
  const isApplyingExternalValueRef = useRef(false);
  const lastEmittedMarkdownRef = useRef(initialValue);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
    ],
    content: initialValue,
    parseOptions: {
      preserveWhitespace: "full",
    },
    editorProps: {
      attributes: {
        class:
          className ||
          "prose prose-sm xl:prose-base dark:prose-invert max-w-none focus:outline-none w-full min-h-[24px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (isApplyingExternalValueRef.current) return;
      const markdown = getMarkdown(editor);
      lastEmittedMarkdownRef.current = markdown;
      onChange(markdown);
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus();
    }
  }, [editor, autoFocus]);

  useImperativeHandle(
    ref,
    () => ({
      getSplitMarkdown: () => {
        if (!editor) return null;
        const { doc, selection } = editor.state;
        const cursorPosition = selection.from;
        const textBefore = serializeMarkdown(
          editor,
          doc.slice(0, cursorPosition).content,
        ).trimEnd();
        const textAfter = serializeMarkdown(
          editor,
          doc.slice(cursorPosition, doc.content.size).content,
        ).trimStart();
        return { textBefore, textAfter };
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    if (initialValue === lastEmittedMarkdownRef.current) return;
    if (initialValue === getMarkdown(editor)) return;

    isApplyingExternalValueRef.current = true;
    try {
      editor.commands.setContent(initialValue, {
        emitUpdate: false,
        parseOptions: { preserveWhitespace: "full" },
      });
      lastEmittedMarkdownRef.current = initialValue;
    } finally {
      isApplyingExternalValueRef.current = false;
    }
  }, [editor, initialValue]);

  useEffect(() => {
    if (linkEditorOpen) {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  }, [linkEditorOpen]);

  if (!editor) return null;

  const openLinkEditor = () => {
    const href = editor.getAttributes("link").href;
    setLinkInput(typeof href === "string" ? href : "");
    setLinkEditorOpen(true);
  };

  const closeLinkEditor = () => {
    setLinkEditorOpen(false);
    setLinkInput("");
  };

  const applyLink = () => {
    const href = normalizeEditorLinkHref(linkInput);
    if (!href) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    closeLinkEditor();
  };

  const unsetLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkEditor();
  };

  return (
    <div className="relative w-full">
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex bg-app-card border border-app-border rounded-lg shadow-xl overflow-hidden pointer-events-auto z-[99999]"
        >
          <div
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                e.preventDefault();
              }
            }}
            className="flex items-center"
          >
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 1 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Heading 1"
              aria-label="Heading 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 2 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Heading 2"
              aria-label="Heading 2"
            >
              <Heading2 size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 3 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Heading 3"
              aria-label="Heading 3"
            >
              <Heading3 size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              }
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 4 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Heading 4"
              aria-label="Heading 4"
            >
              <Heading4 size={16} />
            </button>
            <div className="w-px bg-app-border mx-1 my-2" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("bold") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Bold"
              aria-label="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("italic") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Italic"
              aria-label="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("strike") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={16} />
            </button>
            <div className="w-px bg-app-border mx-1 my-2" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("bulletList") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Bullet list"
              aria-label="Bullet list"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("orderedList") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Ordered list"
              aria-label="Ordered list"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onClick={openLinkEditor}
              className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("link") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
              title="Edit link"
              aria-label="Edit link"
            >
              <LinkIcon size={16} />
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                onClick={unsetLink}
                className="p-2 text-app-text-secondary hover:bg-app-card-hover hover:text-app-accent transition-colors"
                title="Remove link"
                aria-label="Remove link"
              >
                <Unlink size={16} />
              </button>
            )}
            {linkEditorOpen && (
              <div className="flex items-center gap-1 border-l border-app-border pl-1">
                <input
                  ref={linkInputRef}
                  value={linkInput}
                  onChange={(event) => setLinkInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      closeLinkEditor();
                    }
                  }}
                  className="h-8 w-44 bg-app-panel px-2 text-xs text-app-text-primary outline-none placeholder:text-app-text-muted"
                  placeholder="https://..."
                  aria-label="Link URL"
                />
                <button
                  type="button"
                  onClick={applyLink}
                  disabled={!normalizeEditorLinkHref(linkInput)}
                  className="p-2 text-app-text-secondary hover:bg-app-card-hover hover:text-app-accent disabled:opacity-40"
                  title="Apply link"
                  aria-label="Apply link"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={closeLinkEditor}
                  className="p-2 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
                  title="Cancel"
                  aria-label="Cancel link editing"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});

WysiwygEditor.displayName = "WysiwygEditor";
