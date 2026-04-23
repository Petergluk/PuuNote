import React, { useContext, useRef, useState, useCallback } from 'react';
import { Plus, Maximize2, Trash2, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { EditorContext } from '../context/EditorContext';
import { PuuNode } from '../types';
import { AutoSizeTextarea } from './AutoSizeTextarea';

export const Card = React.memo(({ node }: { node: PuuNode }) => {
  const { activeId, editingId, activePath, descendantIds, setActive, setEditing, updateContent, addSibling, addChild, deleteNode, cardRefs, setFullScreen, draggedId, setDraggedId, moveNode, cardsCollapsed, splitNode } = useContext(EditorContext)!;

  const isActive = activeId === node.id;
  const isEditing = editingId === node.id;
  const isDescendantFromActive = descendantIds.has(node.id);
  const pathIndex = activePath.indexOf(node.id);
  const activeIndex = activePath.indexOf(activeId as string);
  
  const isInPath = pathIndex !== -1;
  const isAncestor = isInPath && pathIndex < activeIndex;

  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dropTarget, setDropTarget] = useState<'none' | 'top' | 'bottom' | 'right'>('none');

  const setRefs = useCallback((el: HTMLDivElement | null) => {
      cardRef.current = el;
      if (el) {
          cardRefs.current[node.id] = el;
      } else {
          delete cardRefs.current[node.id];
      }
  }, [node.id, cardRefs]);

  const handleSplitNode = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!textareaRef.current) return;
      
      const cursorPosition = textareaRef.current.selectionStart;
      const textPosition = textareaRef.current.value;
      
      const textBefore = textPosition.substring(0, cursorPosition).trimEnd();
      const textAfter = textPosition.substring(cursorPosition).trimStart();
      
      // We only split if there is actual content after the cursor to split into a new node.
      if (textAfter) {
          splitNode(node.id, textBefore, textAfter);
      }
  };

  const isBright = !activeId || isActive || isInPath || isDescendantFromActive;
  const shouldCollapse = cardsCollapsed && !isEditing && !isActive;

  let cardClasses = 'bg-white dark:bg-[#0f0f0f] border border-zinc-200 dark:border-[#1a1a1a] opacity-50 dark:opacity-30 hover:opacity-100 transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-[#111] text-zinc-800 dark:text-[#d1d1d1]';
  if (isActive) {
      cardClasses = 'bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-[#333] border-l-4 !border-l-orange-500 shadow-md dark:shadow-xl opacity-100 transition-all duration-200 transform scale-[1.01] z-50 text-zinc-900 dark:text-white';
  } else if (!activeId) {
      cardClasses = 'bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#222] opacity-100 transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-[#1e1e1e] hover:border-zinc-300 dark:hover:border-[#333] z-20 text-zinc-900 dark:text-[#eee]';
  } else if (isBright) {
      cardClasses = 'bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-[#222] opacity-100 shadow-sm dark:shadow-md transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-[#1e1e1e] hover:border-zinc-400 dark:hover:border-[#444] z-20 text-zinc-900 dark:text-[#eee]';
  }

  if (draggedId === node.id) cardClasses += ' !opacity-30 scale-95';
  if (dropTarget === 'top') cardClasses += ' !border-t-[#a3966a] !border-t-4';
  if (dropTarget === 'bottom') cardClasses += ' !border-b-[#a3966a] !border-b-4';
  if (dropTarget === 'right') cardClasses += ' !border-r-[#a3966a] !border-r-4';

  return (
    <div className={`relative group/card-wrapper`}>
      <div
        ref={setRefs}
        draggable={!isEditing}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('nodeId', node.id);
          setDraggedId(node.id);
        }}
        onDragEnd={() => setDraggedId(null)}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedId === node.id) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const xRatio = (e.clientX - rect.left) / rect.width;
          const yRatio = (e.clientY - rect.top) / rect.height;
          
          let target: 'top' | 'bottom' | 'right' = 'bottom';
          if (xRatio > 0.6) {
            target = 'right';
          } else if (yRatio < 0.5) {
            target = 'top';
          }
          if (dropTarget !== target) setDropTarget(target);
        }}
        onDragLeave={() => setDropTarget('none')}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropTarget('none');
          setDraggedId(null);
          const sourceId = e.dataTransfer.getData('nodeId');
          if (sourceId && sourceId !== node.id) {
             const position = dropTarget === 'right' ? 'child' : dropTarget === 'top' ? 'before' : 'after';
             moveNode(sourceId, node.id, position);
          }
        }}
        className={`w-full shrink-0 px-4 py-3 rounded cursor-text min-h-[40px] flex flex-col ${cardClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive) setActive(node.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isActive) setActive(node.id);
          if (!isEditing) setEditing(node.id);
        }}
      >
        {isEditing ? (
           <div className="relative group/edit w-full">
               <AutoSizeTextarea
                  ref={textareaRef}
                  value={node.content}
                  onChange={(e: any) => updateContent(node.id, e.target.value)}
                  onBlur={() => setEditing(null)}
                  autoFocus
                  className="w-full resize-none outline-none bg-transparent font-sans text-zinc-900 dark:text-[#eee] leading-relaxed min-h-[24px] py-0 m-0"
               />
               <div className="absolute -top-3 -right-2 flex items-center gap-1 opacity-0 group-hover/edit:opacity-100 transition-opacity z-10 shadow-lg bg-white dark:bg-[#222] border border-zinc-200 dark:border-[#333] rounded p-1">
                   <button 
                      onMouseDown={handleSplitNode}
                      className="p-1 rounded text-zinc-500 dark:text-[#888] hover:text-[#a3966a] dark:hover:text-[#a3966a]"
                      title="Split node at cursor"
                   >
                      <Scissors size={12} />
                   </button>
                   <button 
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setFullScreen(node.id); }}
                      className="p-1 rounded text-zinc-500 dark:text-[#888] hover:text-[#a3966a] dark:hover:text-[#a3966a]"
                      title="Expand to full screen"
                   >
                      <Maximize2 size={12} />
                   </button>
               </div>
           </div>
        ) : (
           <div className={`prose prose-sm max-w-none break-words
                           prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight
                           ${isBright ? 'prose-headings:text-zinc-900 dark:prose-headings:text-[#eee] prose-p:text-zinc-800 dark:prose-p:text-[#d1d1d1] prose-li:text-zinc-800 dark:prose-li:text-[#d1d1d1] prose-strong:text-black dark:prose-strong:text-white' : 'prose-headings:text-zinc-500 dark:prose-headings:text-[#666] prose-p:text-zinc-500 dark:prose-p:text-[#666] prose-li:text-zinc-500 dark:prose-li:text-[#666] prose-strong:text-zinc-700 dark:prose-strong:text-[#888]'}
                           prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1
                           prose-ul:my-1.5 prose-li:my-0.5
                           prose-h1:text-[1.8em] prose-h2:text-[1.5em] prose-h3:text-[1.25em] prose-h4:text-[1.05em] prose-h4:opacity-85
                           prose-h5:font-sans prose-h5:text-[0.9em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75
                           prose-h6:font-mono prose-h6:text-[0.8em] prose-h6:opacity-60
                           prose-a:text-[#a3966a]
                           prose-code:text-zinc-800 dark:prose-code:text-[#a3966a] prose-code:bg-zinc-100 dark:prose-code:bg-[#222] prose-code:px-1 prose-code:rounded
                           ${shouldCollapse ? 'max-h-[14em] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]' : ''}`}>
               <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                   {node.content || '*Empty node...*'}
               </ReactMarkdown>
           </div>
        )}
      </div>

      {/* Actions Menu */}
      <AnimatePresence>
        {isActive && !isEditing && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
             <button
                onClick={(e) => { e.stopPropagation(); addSibling(node.id); }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-[#333] text-[#a3966a] rounded-full p-1.5 shadow-lg hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] hover:border-[#a3966a] dark:hover:border-[#a3966a] transition-colors z-20 flex items-center justify-center"
                title="Add Sibling (Shift+Enter)"
             >
                <Plus size={14} />
             </button>

             <button
                onClick={(e) => { e.stopPropagation(); addChild(node.id); }}
                className="absolute top-1/2 -right-4 -translate-y-1/2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-[#333] text-[#a3966a] rounded-full p-1.5 shadow-lg hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] hover:border-[#a3966a] dark:hover:border-[#a3966a] transition-colors z-20 flex items-center justify-center"
                title="Add Child (Tab)"
             >
                <Plus size={14} />
             </button>

             <button
                onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                className="absolute -top-3 -right-3 bg-red-50 dark:bg-[#111] border border-red-200 dark:border-[#333] text-red-600 dark:text-[#995555] rounded-full p-1.5 shadow-lg hover:bg-red-100 dark:hover:bg-[#331111] hover:text-red-700 dark:hover:text-[#ff6666] hover:border-red-300 dark:hover:border-[#662222] transition-colors z-20 flex items-center justify-center"
                title="Delete"
             >
                <Trash2 size={12} />
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
