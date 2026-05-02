import React, { useEffect } from "react";
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
} from "lucide-react";

interface WysiwygEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  initialValue,
  onChange,
  onBlur,
  autoFocus,
  className,
}) => {
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
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onChange(markdown);
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus("end");
    }
  }, [editor, autoFocus]);

  if (!editor) return null;

  return (
    <div className="relative w-full">
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex bg-app-card border border-app-border rounded-lg shadow-xl overflow-hidden pointer-events-auto z-[99999]"
        >
          <div onMouseDown={(e) => e.preventDefault()} className="flex items-center">
            <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 1 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 2 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 3 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Heading3 size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("heading", { level: 4 }) ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Heading4 size={16} />
          </button>
          <div className="w-px bg-app-border mx-1 my-2" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("bold") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("italic") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("strike") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <Strikethrough size={16} />
          </button>
          <div className="w-px bg-app-border mx-1 my-2" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("bulletList") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("orderedList") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt("URL");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }
            }}
            className={`p-2 hover:bg-app-card-hover transition-colors ${editor.isActive("link") ? "text-app-accent bg-app-card-hover" : "text-app-text-secondary"}`}
          >
            <LinkIcon size={16} />
          </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
