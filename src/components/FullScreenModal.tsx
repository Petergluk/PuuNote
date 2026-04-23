import React, { useState, useRef, useEffect } from 'react';
import { Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { PuuNode } from '../types';
import { AutoSizeTextarea } from './AutoSizeTextarea';

export const FullScreenModal = ({ nodeId, nodes, updateContent, onClose }: { nodeId: string, nodes: PuuNode[], updateContent: (id: string, content: string) => void, onClose: () => void }) => {
  const [localActiveId, setLocalActiveId] = useState(nodeId);
  const targetNode = nodes.find((n: PuuNode) => n.id === nodeId);
  if (!targetNode) return null;

  const columnNodes = nodes.filter((n: PuuNode) => n.parentId === targetNode.parentId);
  
  // Refs to auto-scroll to the initially passed node
  const activeElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (activeElRef.current) {
        activeElRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
     }
  }, []);

  useEffect(() => {
     const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
     }
     window.addEventListener('keydown', handler);
     return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
      <motion.div 
         initial={{ opacity: 0, scale: 0.98 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.98 }}
         transition={{ duration: 0.15 }}
         className="fixed inset-0 z-[100] bg-white dark:bg-[#0a0a0a] flex flex-col outline-none"
      >
         <header className="h-14 border-b shrink-0 border-zinc-200 dark:border-[#222] flex items-center justify-between px-6 bg-zinc-50 dark:bg-[#0f0f0f]">
            <div className="text-[#a3966a] text-xs font-mono tracking-widest uppercase">Focus Mode</div>
            <button onClick={onClose} className="py-1.5 px-3 text-zinc-600 dark:text-[#777] hover:text-zinc-900 dark:hover:text-[#eee] transition-colors bg-white dark:bg-[#111] border border-zinc-200 dark:border-[#333] hover:border-zinc-300 dark:hover:border-[#555] shadow-sm rounded flex items-center gap-2 text-xs font-mono uppercase">
               <span>Close (Esc)</span>
               <Minimize2 size={12} />
            </button>
         </header>
         <div className="flex-1 overflow-auto p-12 lg:p-24 max-w-4xl mx-auto w-full flex flex-col gap-12 relative pb-[50vh]">
            {columnNodes.map((n: PuuNode) => {
               const isLocalActive = n.id === localActiveId;
               return (
                  <div 
                     key={n.id}
                     ref={n.id === nodeId ? activeElRef : null}
                     onClick={() => setLocalActiveId(n.id)}
                     className={`transition-opacity duration-200 cursor-text min-h-[100px] ${isLocalActive ? 'opacity-100' : 'opacity-40 dark:opacity-30 hover:opacity-100 dark:hover:opacity-60'}`}
                  >
                     {isLocalActive ? (
                        <AutoSizeTextarea
                           value={n.content}
                           onChange={(e: any) => updateContent(n.id, e.target.value)}
                           autoFocus
                           placeholder="Type here..."
                           className="w-full h-full resize-none outline-none bg-transparent font-sans text-zinc-900 dark:text-[#eee] leading-relaxed lg:text-xl"
                        />
                     ) : (
                        <div className="prose dark:prose-invert max-w-none prose-lg
                                        prose-headings:font-serif prose-headings:text-zinc-900 dark:prose-headings:text-[#eee] prose-headings:font-normal prose-headings:tracking-tight
                                        prose-p:text-zinc-600 dark:prose-p:text-[#888] prose-p:leading-relaxed 
                                        prose-a:text-[#a3966a] prose-strong:text-zinc-800 dark:prose-strong:text-[#d1d1d1]
                                        prose-ul:text-zinc-600 dark:prose-ul:text-[#888] prose-ol:text-zinc-600 dark:prose-ol:text-[#888]
                                        prose-h1:text-[2.2em] prose-h2:text-[1.8em] prose-h3:text-[1.4em] prose-h4:text-[1.1em] prose-h4:opacity-80
                                        prose-h5:font-sans prose-h5:text-[1em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75
                                        prose-h6:font-mono prose-h6:text-[0.9em] prose-h6:opacity-60
                                        prose-code:text-[#a3966a] prose-code:bg-zinc-100 dark:prose-code:bg-[#222] prose-code:px-1 prose-code:rounded">
                           <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                               {n.content || '*Empty card...*'}
                           </ReactMarkdown>
                        </div>
                     )}
                  </div>
               )
            })}
         </div>
      </motion.div>
  )
}
