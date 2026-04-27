import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
export const AutoSizeTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (e: any) => void;
    onBlur?: (e: any) => void;
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
    const timeoutRef = useRef<any>(null);
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
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(e.target.value); /* Debounce the global update */
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const val = e.target.value;
      timeoutRef.current = setTimeout(() => {
        onChange({ target: { value: val } });
      }, 400);
    };
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onChange(e); /* Ensure the latest value is saved immediately on blur */
      if (onBlur) onBlur(e);
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
          const v = e.target.value;
          e.target.value = "";
          e.target.value = v;
        }}
      />
    );
  },
);
