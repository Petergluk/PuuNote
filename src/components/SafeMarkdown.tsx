import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface SafeMarkdownProps {
  children: string;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ children }) => {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {children}
    </ReactMarkdown>
  );
};
