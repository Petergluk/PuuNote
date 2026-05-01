import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

interface SafeMarkdownProps {
  children: string;
  onToggleCheckbox?: (index: number, checked: boolean) => void;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({
  children,
  onToggleCheckbox,
}) => {
  return (
    <div className="markdown-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              tagNames: defaultSchema.tagNames
                ? defaultSchema.tagNames.filter(
                    (tag) =>
                      !["svg", "math", "style", "script", "iframe"].includes(
                        tag,
                      ),
                  )
                : [],
              protocols: {
                ...defaultSchema.protocols,
                src: ["http", "https"],
                href: ["http", "https"], // strict mode without mailto or data
              },
            },
          ],
        ]}
        components={{
          input: ({
            node: _node,
            disabled: _disabled,
            checked,
            readOnly: _readOnly,
            ...props
          }) => {
            return (
              <input
                {...props}
                type="checkbox"
                checked={checked}
                disabled={false}
                readOnly={false}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (onToggleCheckbox) {
                    const container = (e.target as HTMLElement).closest(
                      ".markdown-container",
                    );
                    if (container) {
                      const checkboxes = Array.from(
                        container.querySelectorAll('input[type="checkbox"]'),
                      );
                      const index = checkboxes.indexOf(
                        e.target as HTMLInputElement,
                      );
                      if (index !== -1) {
                        onToggleCheckbox(index, e.target.checked);
                      }
                    }
                  }
                }}
                className={`cursor-pointer ${props.className || ""}`}
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
