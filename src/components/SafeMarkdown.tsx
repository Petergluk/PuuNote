import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

interface SafeMarkdownProps {
  children: string;
  onToggleCheckbox?: (index: number, checked: boolean) => void;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({
  children,
  onToggleCheckbox,
}) => {
  // Prevent accidental Setext headings when users type horizontal rules (e.g. `---`) directly below text.
  // This turns `Text\n---` into `Text\n\n---` which is parsed as a paragraph and a horizontal rule.
  const safeContent = children.replace(/([^\n])\n(-{3,}|={3,})\s*$/gm, '$1\n\n$2');

  return (
    <div className="markdown-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
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
          a: ({ node: _node, href, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.onClick) props.onClick(e);
                }}
              />
            );
          },
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
        {safeContent}
      </ReactMarkdown>
    </div>
  );
};
