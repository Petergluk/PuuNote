import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import { AUTOSIZE_DEBOUNCE_MS } from "../constants";

export const AutoSizeTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    autoFocus?: boolean;
    className?: string;
    placeholder?: string;
  }
>(
  (
    { value, onChange, onBlur, autoFocus, className, placeholder },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(
      forwardedRef,
      () => internalRef.current as HTMLTextAreaElement,
    );
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external value initially, or when it changes outside
    useEffect(() => {
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
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(val);
      }, AUTOSIZE_DEBOUNCE_MS);
    };

    const handleBlur = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onChange(localValue);
      if (onBlur) onBlur();
    };

    return (
      <textarea
        ref={internalRef}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        autoFocus={autoFocus}
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
    );
  },
);
