import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link,
  List,
  Strikethrough,
} from "lucide-react";

import { AUTOSIZE_DEBOUNCE_MS } from "../constants";
import { useAppStore } from "../store/useAppStore";

export const AutoSizeTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    autoFocus?: boolean;
    dataAutoFocus?: boolean;
    className?: string;
    placeholder?: string;
  }
>(
  (
    {
      value,
      onChange,
      onBlur,
      autoFocus,
      dataAutoFocus,
      className,
      placeholder,
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(
      forwardedRef,
      () => internalRef.current as HTMLTextAreaElement,
    );
    const [localValue, setLocalValue] = useState(value);
    const editorMode = useAppStore((state) => state.editorMode);
    const [toolbarState, setToolbarState] = useState<{
      visible: boolean;
      top: number;
      left: number;
    }>({ visible: false, top: 0, left: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingChangeRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Sync external value initially, or when it changes outside
    useEffect(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingChangeRef.current = null;
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.style.height = "auto";
        internalRef.current.style.height =
          internalRef.current.scrollHeight + "px";
      }
    }, [localValue]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (pendingChangeRef.current !== null) {
          onChangeRef.current(pendingChangeRef.current);
          pendingChangeRef.current = null;
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      pendingChangeRef.current = val;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (pendingChangeRef.current !== null) {
          onChange(pendingChangeRef.current);
          pendingChangeRef.current = null;
        }
      }, AUTOSIZE_DEBOUNCE_MS);
    };

    const commitValue = (nextValue: string) => {
      setLocalValue(nextValue);
      pendingChangeRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onChange(nextValue);
    };

    const replaceRange = (
      start: number,
      end: number,
      replacement: string,
      nextSelection: { start: number; end: number },
    ) => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.setRangeText(replacement, start, end, "preserve");
      commitValue(textarea.value);
      setToolbarState((state) => ({ ...state, visible: false }));
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextSelection.start, nextSelection.end);
      });
    };

    const updateToolbarPosition = () => {
      const textarea = internalRef.current;
      if (!textarea || editorMode !== "visual") {
        setToolbarState((state) =>
          state.visible ? { ...state, visible: false } : state,
        );
        return;
      }

      const hasSelection = textarea.selectionEnd > textarea.selectionStart;
      if (!hasSelection || document.activeElement !== textarea) {
        setToolbarState((state) =>
          state.visible ? { ...state, visible: false } : state,
        );
        return;
      }

      const rect = textarea.getBoundingClientRect();
      setToolbarState({
        visible: true,
        top: Math.max(8, rect.top - 42),
        left: rect.left + rect.width / 2,
      });
    };

    const wrapSelection = (
      before: string,
      after = before,
      fallback = "text",
    ) => {
      const textarea = internalRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = localValue.slice(start, end) || fallback;
      replaceRange(start, end, before + selected + after, {
        start: start + before.length,
        end: start + before.length + selected.length,
      });
    };

    const addLink = () => {
      const textarea = internalRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = localValue.slice(start, end) || "link";
      replaceRange(start, end, `[${selected}](https://)`, {
        start: start + selected.length + 3,
        end: start + selected.length + 11,
      });
    };

    const formatSelectedLines = (formatter: (line: string) => string) => {
      const textarea = internalRef.current;
      if (!textarea) return;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const lineStart = localValue.lastIndexOf("\n", selectionStart - 1) + 1;
      const nextLineBreak = localValue.indexOf("\n", selectionEnd);
      const lineEnd = nextLineBreak === -1 ? localValue.length : nextLineBreak;
      const selectedBlock = localValue.slice(lineStart, lineEnd);
      const replacement = selectedBlock
        .split("\n")
        .map((line) => (line.trim().length === 0 ? line : formatter(line)))
        .join("\n");
      replaceRange(lineStart, lineEnd, replacement, {
        start: lineStart,
        end: lineStart + replacement.length,
      });
    };

    const setHeading = (level: 1 | 2 | 3 | 4) => {
      formatSelectedLines((line) => {
        const content = line.replace(/^\s{0,3}#{1,6}\s+/, "").trimStart();
        return `${"#".repeat(level)} ${content}`;
      });
    };

    const toggleList = () => {
      formatSelectedLines((line) => {
        if (/^\s*[-*+]\s+/.test(line)) {
          return line.replace(/^(\s*)[-*+]\s+/, "$1");
        }
        return line.replace(/^(\s*)/, "$1- ");
      });
    };

    const handleBlur = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingChangeRef.current !== null) {
        pendingChangeRef.current = null;
      }
      onChange(localValue);
      if (onBlur) onBlur();
      setTimeout(() => {
        if (document.activeElement !== internalRef.current) {
          setToolbarState((state) => ({ ...state, visible: false }));
        }
      }, 0);
    };

    return (
      <>
        {editorMode === "visual" && toolbarState.visible && (
          <div
            className="fixed z-[120] flex -translate-x-1/2 items-center gap-1 rounded border border-app-border bg-app-panel p-1 shadow-xl"
            style={{ top: toolbarState.top, left: toolbarState.left }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              onClick={() => wrapSelection("**")}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Bold"
              aria-label="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("*")}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Italic"
              aria-label="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("~~")}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>
            <button
              type="button"
              onClick={addLink}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Link"
              aria-label="Link"
            >
              <Link size={14} />
            </button>
            <span className="mx-0.5 h-5 w-px bg-app-border" />
            <button
              type="button"
              onClick={() => setHeading(1)}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Heading 1"
              aria-label="Heading 1"
            >
              <Heading1 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setHeading(2)}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Heading 2"
              aria-label="Heading 2"
            >
              <Heading2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setHeading(3)}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Heading 3"
              aria-label="Heading 3"
            >
              <Heading3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setHeading(4)}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="Heading 4"
              aria-label="Heading 4"
            >
              <Heading4 size={14} />
            </button>
            <button
              type="button"
              onClick={toggleList}
              className="rounded p-1.5 text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              title="List"
              aria-label="List"
            >
              <List size={14} />
            </button>
          </div>
        )}
        <textarea
          ref={internalRef}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onMouseUp={updateToolbarPosition}
          onKeyUp={updateToolbarPosition}
          onSelect={updateToolbarPosition}
          autoFocus={autoFocus}
          data-autofocus={dataAutoFocus || undefined}
          placeholder={placeholder || "Type something... (Markdown supported)"}
          className={
            className ||
            "w-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
          }
          rows={1}
          onFocus={(e) => {
            // move cursor to end
            const length = e.target.value.length;
            e.target.setSelectionRange(length, length);
          }}
        />
      </>
    );
  },
);
