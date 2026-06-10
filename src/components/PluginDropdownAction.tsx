import { useRef, useState, useEffect } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { GlobalActionHook } from "../plugins/registry";

export function PluginDropdownAction({ 
  action, 
  dropup = false,
  buttonClassName = "hidden sm:flex bg-app-card border border-app-border/50 hover:bg-app-card-hover hover:border-app-border w-8 h-8 rounded transition-colors text-app-text-secondary items-center justify-center"
}: { 
  action: GlobalActionHook; 
  dropup?: boolean;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => {
    if (open) setOpen(false);
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${buttonClassName} ${
          open
            ? "text-app-text-primary bg-app-card-hover border-app-border"
            : ""
        }`}
        title={action.label}
        aria-label={action.label}
        aria-expanded={open}
      >
        <action.icon size={16} />
      </button>
      {open && (
        <div className={`absolute right-0 z-[90] w-48 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl ${dropup ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {action.dropdownItems?.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
            >
              {item.icon && <item.icon size={14} className="text-app-text-muted" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
