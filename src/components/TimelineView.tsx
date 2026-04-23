import React, { useState, useMemo, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Copy, Check } from 'lucide-react';
import { PuuNode } from '../types';
import { EditorContext } from '../context/EditorContext';
import { AutoSizeTextarea } from './AutoSizeTextarea';

export const TimelineView = ({ nodes }: { nodes: PuuNode[] }) => {
  const { activeId, setActive, updateContent } = useContext(EditorContext)!;
  const [copied, setCopied] = useState(false);

  // Use useMemo to prevent unnecessary calculations and mutations inside render
  const orderedNodes = useMemo(() => {
    const result: PuuNode[] = [];
    const traverse = (parentId: string | null) => {
      const children = nodes.filter((n: PuuNode) => n.parentId === parentId).sort((a: PuuNode, b: PuuNode) => (a.order || 0) - (b.order || 0));
      for (const child of children) {
        result.push(child);
        traverse(child.id);
      }
    };
    traverse(null);
    return result;
  }, [nodes]);

  // Extract outline (headings) from nodes
  const outline = useMemo(() => {
    const items: { id: string; nodeId: string; title: string; level: number }[] = [];
    let hId = 0;
    orderedNodes.forEach(n => {
       const lines = n.content.split('\n');
       lines.forEach(line => {
          const match = line.match(/^(#{1,3})\s+(.*)$/);
          if (match) {
             items.push({ id: `h-${hId++}`, nodeId: n.id, title: match[2], level: match[1].length });
          }
       });
    });
    return items;
  }, [orderedNodes]);

  const scrollToNode = (nodeId: string) => {
     const element = document.getElementById(`tl-node-${nodeId}`);
     if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(nodeId);
     }
  };

  const handleCopyAll = (e: React.MouseEvent) => {
     e.stopPropagation();
     const fullText = orderedNodes.map(n => n.content).join('\n\n');
     navigator.clipboard.writeText(fullText);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full relative flex justify-center p-8 lg:p-16 col-spacer" onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
       
       <div className="absolute top-8 right-8 lg:top-16 lg:right-12 z-20">
           <button 
               onClick={handleCopyAll} 
               className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-[#333] rounded-full shadow-sm hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] transition font-medium text-sm text-zinc-700 dark:text-[#ccc]"
           >
               {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
               {copied ? 'Скопировано!' : 'Скопировать всё'}
           </button>
       </div>

       {outline.length > 0 && (
          <div className="absolute left-8 lg:left-12 top-8 lg:top-16 bottom-0 hidden xl:block w-56 xl:w-64 z-10 pointer-events-none">
             <aside className="sticky top-8 lg:top-16 self-start max-h-[80vh] overflow-y-auto hide-scrollbar border-l border-zinc-200 dark:border-[#222] pl-6 pointer-events-auto">
                <div className="text-xs font-mono tracking-widest uppercase text-zinc-400 mb-6 font-bold">Outline</div>
                <ul className="flex flex-col gap-3">
                   {outline.map(item => (
                      <li 
                         key={item.id} 
                         className="cursor-pointer text-sm text-zinc-600 dark:text-[#888] hover:text-[#4a90e2] dark:hover:text-[#4a90e2] transition-colors truncate"
                         style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                         onClick={() => scrollToNode(item.nodeId)}
                         title={item.title}
                      >
                        {item.title}
                      </li>
                   ))}
                </ul>
             </aside>
          </div>
       )}

       <div className="w-full max-w-3xl flex flex-col gap-8 pb-[20vh] min-w-0">
          {orderedNodes.length === 0 ? (
              <div className="text-zinc-500 italic">Document is empty...</div>
            ) : orderedNodes.map((n) => {
               const isLocalActive = n.id === activeId;
               return (
                 <div 
                    id={`tl-node-${n.id}`}
                    key={n.id}
                    onClick={() => setActive(n.id)}
                    className={`transition-all duration-200 cursor-text rounded-lg border-2 ${isLocalActive ? 'p-4 border-[#a3966a] bg-white dark:bg-[#111] shadow-sm' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-[#111]'}`}
                 >
                    {isLocalActive ? (
                       <AutoSizeTextarea
                          value={n.content}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateContent(n.id, e.target.value)}
                          autoFocus
                          placeholder="Empty node..."
                          className="w-full h-full resize-none outline-none bg-transparent font-sans text-zinc-900 dark:text-[#eee] leading-relaxed lg:text-lg"
                       />
                    ) : (
                       <div className="prose dark:prose-invert max-w-none prose-lg
                                       prose-headings:font-serif prose-headings:text-zinc-900 dark:prose-headings:text-[#eee] prose-headings:font-normal prose-headings:tracking-tight
                                       prose-p:text-zinc-700 dark:prose-p:text-[#d1d1d1] prose-p:leading-relaxed 
                                       prose-a:text-[#a3966a] prose-strong:text-black dark:prose-strong:text-white
                                       prose-ul:text-zinc-700 dark:prose-ul:text-[#d1d1d1] prose-ol:text-zinc-700 dark:prose-ol:text-[#d1d1d1]
                                       prose-li:text-zinc-700 dark:prose-li:text-[#d1d1d1]
                                       prose-h1:text-[2.2em] prose-h2:text-[1.8em] prose-h3:text-[1.4em] prose-h4:text-[1.1em] prose-h4:opacity-80
                                       prose-h5:font-sans prose-h5:text-[1em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75
                                       prose-h6:font-mono prose-h6:text-[0.9em] prose-h6:opacity-60
                                       prose-code:text-zinc-800 dark:prose-code:text-[#a3966a] prose-code:bg-transparent dark:prose-code:bg-transparent prose-code:px-1 prose-code:rounded">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                              {n.content || '*Empty node...*'}
                          </ReactMarkdown>
                       </div>
                  )}
                 </div>
               );
            })}
         </div>
    </div>
  );
};
