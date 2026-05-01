import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import ReactTextareaAutosize from "react-textarea-autosize";
import { AUTOSIZE_DEBOUNCE_MS } from "../constants";
import { registerPendingTextareaFlush } from "./textareaFlushRegistry";

type AutosizeStyle = React.ComponentProps<typeof ReactTextareaAutosize>["style"];

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
    style?: AutosizeStyle;
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
      style,
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(
      forwardedRef,
      () => internalRef.current as HTMLTextAreaElement,
    );
    const [localValue, setLocalValue] = useState(value);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingChangeRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const flushPendingChange = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingChangeRef.current !== null) {
        const val = pendingChangeRef.current;
        pendingChangeRef.current = null;
        onChangeRef.current(val);
      }
    }, []);

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
      const unregister = registerPendingTextareaFlush(flushPendingChange);
      return () => {
        unregister();
        flushPendingChange();
      };
    }, [flushPendingChange]);

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

    const handleBlur = () => {
      flushPendingChange();
      if (onBlur) onBlur();
    };

    const textareaStyle: AutosizeStyle = {
      outline: "none",
      boxShadow: "none",
      ...style,
    };

    return (
      <ReactTextareaAutosize
        ref={internalRef}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        data-autofocus={dataAutoFocus || undefined}
        placeholder={placeholder || "Type something... (Markdown supported)"}
        className={
          className ||
          "w-full resize-none outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
        }
        style={textareaStyle}
        onFocus={(e) => {
          // move cursor to end
          const length = e.target.value.length;
          e.target.setSelectionRange(length, length);
        }}
      />
    );
  },
);
