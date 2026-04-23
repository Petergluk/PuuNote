import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Upload, Download, Keyboard, Sun, Moon, Undo2, Redo2, Network, ScrollText, File, Trash2, Plus, X, FoldVertical, UnfoldVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { PuuNode, PuuDocument } from './types';
import { INITIAL_NODES } from './constants';
import { EditorContext } from './context/EditorContext';
import { Card } from './components/Card';
import { FullScreenModal } from './components/FullScreenModal';
import { TimelineView } from './components/TimelineView';
import { useHistory } from './hooks/useHistory';
import { exportNodesToMarkdown, parseMarkdownToNodes } from './utils/markdownParser';

import { useFileSystem } from './hooks/useFileSystem';
import { usePreferences } from './hooks/usePreferences';

const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const {
    documents,
    activeFileId,
    fileMenuOpen,
    setFileMenuOpen,
    nodes,
    setNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    switchFile,
    createNewFile,
    deleteFile
  } = useFileSystem(setActiveId);

  const {
    theme,
    toggleTheme,
    colWidth,
    setColWidth,
    cardsCollapsed,
    toggleCardsCollapsed
  } = usePreferences();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullScreenId, setFullScreenId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState<boolean>(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Focus the first node initially if activeId is null
  useEffect(() => {
    if (!activeId && nodes.length > 0) {
       setActiveId(nodes[0].id);
    }
  }, [nodes, activeId]);

  // Global Paste Handler for adding nodes via Command+V when focused but not editing
  useEffect(() => {
     const handleGlobalPaste = (e: ClipboardEvent) => {
         if (activeId && !editingId) {
             const text = e.clipboardData?.getData('text');
             if (!text) return;

             // Check if the user is focusing an input elsewhere (just in case)
             const target = e.target as HTMLElement;
             if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
                 return;
             }

             // Split by lines containing only '---' (possibly surrounded by whitespace)
             const parts = text.split(/^\s*---\s*$/m).map(p => p.trim()).filter(p => p.length > 0);
             if (parts.length === 0) return;

             e.preventDefault();

             setNodes(prev => {
                 const siblings = prev.filter(n => n.parentId === activeId);
                 let maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order || 0)) : -1;
                 
                 const newNodes: PuuNode[] = parts.map(part => {
                     maxOrder++;
                     return {
                         id: generateId(),
                         content: part,
                         parentId: activeId,
                         order: maxOrder
                     };
                 });
                 return [...prev, ...newNodes];
             });
         }
     };

     document.addEventListener('paste', handleGlobalPaste);
     return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [activeId, editingId, setNodes]);

  const activePath = useMemo(() => {
    if (!activeId) return [];
    
    // Go UP to root
    const pathUp = [];
    let currUp: string | null = activeId;
    while (currUp) {
      pathUp.push(currUp);
      const node = nodes.find(n => n.id === currUp);
      currUp = node?.parentId || null;
    }
    pathUp.reverse(); // Now from root to activeId
    
    // Go DOWN to leaves (always picking the first child)
    const pathDown = [];
    let currDown = activeId;
    while (true) {
      const children = nodes.filter(n => n.parentId === currDown);
      if (children.length === 0) break;
      currDown = children[0].id;
      pathDown.push(currDown);
    }
    
    // Combine path upwards, then activeId, then path downwards
    // pathUp includes activeId at the end, so let's pop it off first
    // actually, let's just make it a single unique list
    return Array.from(new Set([...pathUp, ...pathDown]));
  }, [activeId, nodes]);

  // Recursively fetch all children for active logic to hide those not in active path
  const descendantIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    const ids = new Set<string>();
    const queue = [activeId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr !== activeId) ids.add(curr);
      const children = nodes.filter(n => n.parentId === curr);
      queue.push(...children.map(n => n.id));
    }
    return ids;
  }, [activeId, nodes]);

  const updateContent = useCallback((id: string, content: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
  }, []);

  const splitNode = useCallback((id: string, textBefore: string, textAfter: string) => {
    const newId = generateId();
    setNodes(prev => {
       const targetNode = prev.find(n => n.id === id);
       if (!targetNode) return prev;
       
       const next = prev.map(n => {
          if (n.id === id) return { ...n, content: textBefore };
          if (n.parentId === targetNode.parentId && (n.order || 0) > (targetNode.order || 0)) {
             return { ...n, order: (n.order || 0) + 1 };
          }
          return n;
       });

       return [...next, {
          id: newId,
          content: textAfter,
          parentId: targetNode.parentId,
          order: (targetNode.order || 0) + 1
       }];
    });
    setActiveId(newId);
    setEditingId(newId);
  }, []);

  const addSibling = useCallback((targetId: string) => {
    const newId = generateId();
    setNodes(prev => {
      const targetNode = prev.find(n => n.id === targetId);
      if (!targetNode) return prev;
      
      const parentId = targetNode.parentId;
      const targetOrder = targetNode.order || 0;
      
      // Update order of all siblings that come AFTER the target
      const next = prev.map(n => {
        if (n.parentId === parentId && (n.order || 0) > targetOrder) {
           return { ...n, order: (n.order || 0) + 1 };
        }
        return n;
      });
      
      const newNode: PuuNode = {
        id: newId,
        content: '',
        parentId,
        order: targetOrder + 1
      };
      
      return [...next, newNode];
    });
    setActiveId(newId);
    setEditingId(newId);
  }, []);

  const addChild = useCallback((parentId: string | null) => {
    const newId = generateId();
    setNodes(prev => {
       const siblings = prev.filter(n => n.parentId === parentId);
       const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order || 0)) : -1;
       return [
         ...prev,
         { id: newId, content: '', parentId, order: maxOrder + 1 }
       ];
    });
    setActiveId(newId);
    setEditingId(newId);
  }, []);

  const deleteNode = useCallback((id: string) => {
    let parentFallback: string | null = null;
    setNodes(prev => {
      const idsToRemove = new Set<string>();
      const queue = [id];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        idsToRemove.add(curr);
        const children = prev.filter(n => n.parentId === curr);
        for (const c of children) queue.push(c.id);
      }
      
      // Calculate fallback parent from actual state
      parentFallback = prev.find(n => n.id === id)?.parentId || null;
      
      return prev.filter(n => !idsToRemove.has(n.id));
    });
    
    // Use functional state for setActiveId to safely check if we were active
    setActiveId(prevActive => {
       if (prevActive === id) return parentFallback;
       return prevActive;
    });
  }, [setActiveId, setNodes]);

  const moveNode = useCallback((sourceId: string, targetId: string, position: 'before' | 'after' | 'child') => {
    setNodes(prev => {
      const isDescendant = (childId: string, parentId: string) => {
        let curr = prev.find(n => n.id === childId);
        while(curr) {
          if (curr.parentId === parentId) return true;
          curr = prev.find(n => n.id === curr.parentId);
        }
        return false;
      };

      if (sourceId === targetId || isDescendant(targetId, sourceId)) {
        setDraggedId(null);
        return prev;
      }

      // Deep copy array and objects to avoid mutating history logic
      const copy = prev.map(n => ({...n}));
      
      const targetNode = copy.find(n => n.id === targetId);
      if (!targetNode) {
          setDraggedId(null);
          return prev;
      }

      const sourceIdx = copy.findIndex(n => n.id === sourceId);
      if (sourceIdx === -1) {
          setDraggedId(null);
          return prev;
      }
      
      const source = copy[sourceIdx];
      // Remove source from its current position
      copy.splice(sourceIdx, 1);

      let newParentId = targetNode.parentId;
      
      if (position === 'child') {
        newParentId = targetId;
        const destSiblings = copy.filter(n => n.parentId === newParentId).sort((a,b) => (a.order||0) - (b.order||0));
        source.parentId = newParentId;
        source.order = destSiblings.length > 0 ? (destSiblings[destSiblings.length - 1].order || 0) + 1 : 0;
        copy.push(source);
      } else {
        newParentId = targetNode.parentId;
        source.parentId = newParentId;
        
        const destSiblings = copy.filter(n => n.parentId === newParentId).sort((a,b) => (a.order||0) - (b.order||0));
        const targetIdx = destSiblings.findIndex(n => n.id === targetId);
        
        destSiblings.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, source);
        
        // Re-assign orders for consistency purely on copy objects
        destSiblings.forEach((n, i) => {
           n.order = i;
           const objInCopy = copy.find(x => x.id === n.id);
           if (objInCopy) objInCopy.order = i;
           if (n.id === source.id) source.order = i; // Ensure source gets the new order too
        });
        
        copy.push(source);
      }
      return copy;
    });
    setActiveId(sourceId);
    setDraggedId(null);
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const isZ = e.key.toLowerCase() === 'z';
        const isY = e.key.toLowerCase() === 'y';

        if (isZ || isY) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
              return; // Let native element handle generic text undo
          }

          const isRedoAction = (isZ && e.shiftKey) || isY;
          const isUndoAction = isZ && !e.shiftKey;

          if (isUndoAction && canUndo) {
            e.preventDefault();
            undo();
            setActiveId(null);
          } else if (isRedoAction && canRedo) {
            e.preventDefault();
            redo();
            setActiveId(null);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (fullScreenId || timelineOpen) return;
    
    // Do not intercept if the user is typing in a generic input that isn't the active card being edited
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

    if (editingId || isTyping) {
      if (editingId) {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          setEditingId(null);
          // Force focus back to the main app container so subsequent key presses (like Shift+Enter) work
          setTimeout(() => {
             const appContainer = document.getElementById('puunote-app-container');
             if (appContainer) appContainer.focus();
          }, 0);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setEditingId(null);
          addChild(editingId);
          setTimeout(() => {
             const appContainer = document.getElementById('puunote-app-container');
             if (appContainer) appContainer.focus();
          }, 50);
        } else if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          setEditingId(null);
          addSibling(editingId);
          setTimeout(() => {
             const appContainer = document.getElementById('puunote-app-container');
             if (appContainer) appContainer.focus();
          }, 50);
        }
      }
      return;
    }

    if (!activeId) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        addSibling(activeId);
      } else {
        setEditingId(activeId);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      addChild(activeId);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const children = nodes.filter(n => n.parentId === activeId);
      if (children.length > 0) setActiveId(children[0].id);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const node = nodes.find(n => n.id === activeId);
      if (node?.parentId) setActiveId(node.parentId);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const node = nodes.find(n => n.id === activeId);
      if (node) {
        const siblings = nodes.filter(n => n.parentId === node.parentId);
        const idx = siblings.findIndex(n => n.id === activeId);
        if (idx >= 0 && idx < siblings.length - 1) setActiveId(siblings[idx + 1].id);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const node = nodes.find(n => n.id === activeId);
      if (node) {
        const siblings = nodes.filter(n => n.parentId === node.parentId);
        const idx = siblings.findIndex(n => n.id === activeId);
        if (idx > 0) setActiveId(siblings[idx - 1].id);
      }
      return;
    }
  };

  // Build column arrays
  const columns = useMemo(() => {
    const cols: PuuNode[][] = [];
    let currentLevel = nodes.filter(n => n.parentId === null).sort((a,b) => (a.order || 0) - (b.order || 0));

    if (currentLevel.length === 0) {
      cols.push([]);
      return cols;
    }

    while (currentLevel.length > 0) {
      cols.push(currentLevel);
      
      const nextLevel: PuuNode[] = [];
      for (const parent of currentLevel) {
        const children = nodes.filter(n => n.parentId === parent.id).sort((a,b) => (a.order || 0) - (b.order || 0));
        nextLevel.push(...children);
      }
      currentLevel = nextLevel;
    }
    
    return cols;
  }, [nodes]);

  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const initializedCols = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      colRefs.current.forEach((col, index) => {
        if (col && !initializedCols.current.has(index)) {
          const innerFlex = col.children[0];
          const firstCard = innerFlex && (innerFlex.children[0] as HTMLElement);
          if (firstCard) {
             col.scrollTop = firstCard.offsetTop - 64;
             initializedCols.current.add(index);
          }
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [columns]);

  // Center the active path vertically and horizontally when the active node changes
  useEffect(() => {
    let r1: number;
    let r2: number;
    
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        if (!activeId) return;
        
        const activeEl = cardRefs.current[activeId];
      if (!activeEl) return;

      if (timelineOpen) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
      }
      
      // Horizontal Scroll onto active column
      const mainScroller = document.getElementById('main-scroller');
      const activeCol = activeEl.closest('.overflow-y-auto') as HTMLElement;
      if (mainScroller && activeCol) {
         const scrollerRect = mainScroller.getBoundingClientRect();
         const colRect = activeCol.getBoundingClientRect();
         const hDiff = (colRect.left + activeCol.offsetWidth / 2) - (scrollerRect.left + mainScroller.clientWidth / 2);
         if (Math.abs(hDiff) > 2) {
            mainScroller.scrollTo({ left: mainScroller.scrollLeft + hDiff, behavior: 'smooth' });
         }
      }
      
      // Vertical Alignment for all path items
      for (const pathId of activePath) {
        const el = cardRefs.current[pathId];
        if (el) {
          const col = el.closest('.overflow-y-auto');
          if (col) {
             const elRect = el.getBoundingClientRect();
             const colRect = col.getBoundingClientRect();
             
             // Cap vertical scrolling so large boxes don't bleed above the screen
             const desiredTop = Math.max(
                colRect.top + 32, 
                colRect.top + col.clientHeight / 2 - el.offsetHeight / 2
             );
             
             const diff = elRect.top - desiredTop;
             if (Math.abs(diff) > 2) {
               col.scrollTo({ top: col.scrollTop + diff, behavior: 'smooth' });
             }
          }
        }
      }
      });
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [activeId, activePath, timelineOpen]); // Run when activePath is rebuilt

  // Export text to Markdown logic
  const exportToMarkdown = () => {
    let filename = 'puunote-export';
    if (nodes.length > 0) {
       const rootNodes = nodes.filter((n: PuuNode) => !n.parentId);
       if (rootNodes.length > 0) {
          const firstNodeContent = rootNodes[0].content;
          const match = firstNodeContent.match(/^#{1,6}\s+(.*)$/m);
          if (match && match[1]) {
             filename = match[1].trim().replace(/[^a-zA-Z0-9_\-\u0400-\u04FF\s]/g, '').trim().replace(/\s+/g, '-');
          } else {
             const words = firstNodeContent.split('\n')[0].trim().replace(/[^a-zA-Z0-9_\-\u0400-\u04FF\s]/g, '').trim().split(/\s+/).slice(0, 3).join('-');
             if (words) filename = words;
          }
       }
    }
    
    filename = filename || 'puunote-export';

    const md = exportNodesToMarkdown(nodes);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const mdText = event.target?.result as string;
      if (!mdText) return;

      const imported = parseMarkdownToNodes(mdText);

      if (imported.length > 0) {
        setNodes(imported);
        setActiveId(imported[0].id);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const wordCount = useMemo(() => {
    return nodes.reduce((acc, n) => {
      const words = n.content.trim().split(/\s+/).filter(w => w.length > 0);
      return acc + words.length;
    }, 0);
  }, [nodes]);

  const contextValue = useMemo(() => ({
    activeId, editingId, activePath, descendantIds, fullScreenId, cardRefs, draggedId, setDraggedId, moveNode, setActive: setActiveId, setEditing: setEditingId, setFullScreen: setFullScreenId, updateContent, addSibling, addChild, deleteNode, cardsCollapsed, splitNode
  }), [activeId, editingId, activePath, descendantIds, fullScreenId, draggedId, cardsCollapsed, moveNode, updateContent, addSibling, addChild, deleteNode, splitNode]);

  return (
    <EditorContext.Provider value={contextValue}>
      <div 
        id="puunote-app-container"
        className="min-h-screen h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-[#d1d1d1] font-sans flex flex-col overflow-hidden outline-none transition-colors duration-300"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          // If clicked directly on the main background areas (not on cards)
          if ((e.target as HTMLElement).id === 'puunote-app-container' || (e.target as HTMLElement).id === 'main-scroller' || (e.target as HTMLElement).classList.contains('col-spacer')) {
              setActiveId(null);
          }
        }}
      >
        <header className="h-14 border-b shrink-0 border-zinc-200 dark:border-[#222] flex items-center justify-between px-6 bg-white dark:bg-[#0f0f0f] transition-colors duration-300">
          <div className="flex items-center gap-6">
            <span className="font-sans font-semibold text-xl tracking-wide flex items-center gap-3 relative">
              <span className="cursor-pointer" onClick={() => setFileMenuOpen(!fileMenuOpen)} title="Open files menu">
                 <span className="text-zinc-500 dark:text-[#8f9ba8]">Puu</span><span className="text-[#4a90e2]">Note.</span>
              </span>
              <button 
                onClick={() => setFileMenuOpen(!fileMenuOpen)}
                className="text-xs tracking-wider bg-zinc-100 hover:bg-zinc-200 dark:bg-[#111] dark:hover:bg-[#222] border border-zinc-200 dark:border-[#333] px-2 py-1 rounded text-zinc-500 font-medium transition-colors ml-2 flex items-center gap-2"
                title="Manage documents"
              >
                FILES <span className="opacity-50">▾</span>
              </button>
            </span>
            <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-[#666]">
              <button 
                onClick={() => setTimelineOpen(!timelineOpen)}
                className="p-1.5 rounded transition-colors bg-zinc-100 hover:bg-zinc-200 dark:bg-[#111] dark:hover:bg-[#222] text-[#4a90e2]"
                title="Toggle View Mode"
              >
                {timelineOpen ? <Network size={16} /> : <ScrollText size={16} />}
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-[#333] pr-3 sm:pr-4">
              <button 
                onClick={() => { undo(); setActiveId(null); }} disabled={!canUndo}
                className="p-1.5 text-zinc-500 dark:text-[#666] hover:text-zinc-900 dark:hover:text-[#eee] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button 
                onClick={() => { redo(); setActiveId(null); }} disabled={!canRedo}
                className="p-1.5 text-zinc-500 dark:text-[#666] hover:text-zinc-900 dark:hover:text-[#eee] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>
            <button 
              onClick={() => setCardsCollapsed(!cardsCollapsed)}
              className="bg-zinc-100 dark:bg-[#111] border border-zinc-200 dark:border-[#333] hover:bg-zinc-200 dark:hover:bg-[#222] px-2 sm:px-3 py-1.5 rounded transition-colors text-zinc-600 dark:text-[#888] font-medium flex items-center justify-center gap-2"
              title="Toggle Expand/Collapse"
            >
              {cardsCollapsed ? <UnfoldVertical size={14} /> : <FoldVertical size={14} />}
            </button>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="bg-zinc-100 dark:bg-[#111] border border-zinc-200 dark:border-[#333] hover:bg-zinc-200 dark:hover:bg-[#222] px-2 sm:px-3 py-1.5 rounded transition-colors text-zinc-600 dark:text-[#888] font-medium flex items-center justify-center gap-2"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <label className="cursor-pointer bg-zinc-100 dark:bg-[#111] border border-zinc-200 dark:border-[#333] hover:bg-zinc-200 dark:hover:bg-[#222] px-3 py-1.5 rounded transition-colors text-zinc-600 dark:text-[#888] font-medium flex items-center gap-2" title="Import .md">
              <Download size={14} />
              <span className="hidden sm:inline font-mono tracking-wider">.md</span>
              <input type="file" accept=".md" className="hidden" onChange={handleImport} />
            </label>
            <button 
              onClick={exportToMarkdown}
              className="bg-zinc-100 dark:bg-[#111] border border-zinc-200 dark:border-[#333] hover:bg-zinc-200 dark:hover:bg-[#222] px-3 py-1.5 rounded transition-colors text-zinc-600 dark:text-[#888] font-medium flex items-center gap-2"
              title="Export .md"
            >
              <Upload size={14} />
              <span className="hidden sm:inline font-mono tracking-wider">.md</span>
            </button>
          </div>
        </header>

        <main 
          id="main-scroller" 
          className={`flex-1 overflow-x-auto w-full flex items-start relative bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300 ${!timelineOpen ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
        >
          {!timelineOpen ? (
              <div className="flex flex-row items-start gap-0 px-4 py-0 min-h-full h-full w-max relative col-spacer" onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}>
               {columns.map((colNodes, colIndex) => {
                 return (
                   <div
                     key={colIndex}
                     ref={el => { colRefs.current[colIndex] = el; }}
                     style={{ width: `${colWidth}px` }}
                     className="h-full shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar scroll-smooth px-2 transition-all duration-200 col-spacer"
                     onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
                   >
                       <div 
                         style={{ width: `${colWidth - 16}px` }}
                         className="relative flex flex-col gap-3 pt-[50vh] pb-[50vh] mx-auto transition-all duration-200 col-spacer"
                         onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
                       >
                         {colNodes.map(node => (
                           <Card key={node.id} node={node} />
                         ))}
                         {/* Add node placeholder block ONLY for empty application */}
                         {colNodes.length === 0 && colIndex === 0 && (
                            <div 
                               onClick={() => addChild(null)}
                               className="bg-white dark:bg-[#111] border border-dashed border-zinc-300 dark:border-[#222] p-6 rounded flex justify-center items-center h-min group cursor-pointer hover:border-[#a3966a] transition-colors shadow-sm"
                            >
                               <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-[#444] group-hover:text-[#a3966a] transition-colors">+ Add Fragment</span>
                            </div>
                         )}
                       </div>
                   </div>
                 );
               })}
            </div>
          ) : (
            <TimelineView nodes={nodes} />
          )}
        </main>
        
        <footer className="h-10 shrink-0 border-t border-zinc-200 dark:border-[#222] bg-white dark:bg-[#0f0f0f] px-6 flex items-center justify-between z-50 transition-colors duration-300">
          <div className="flex gap-6 text-[10px] text-zinc-500 dark:text-[#555] font-mono tracking-widest uppercase hidden lg:flex">
             <span>CARDS: {nodes.length}</span>
             <span>WORDS: {wordCount}</span>
             {activeId && <span>DEPTH: {activePath.length}</span>}
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] text-zinc-500 dark:text-[#555] font-mono tracking-widest uppercase">
             <div className="flex items-center gap-2 border-r border-zinc-200 dark:border-[#333] pr-4 mr-2 hidden sm:flex">
                <span>Col Width</span>
                <input 
                   type="range" 
                   min="220" 
                   max="680" 
                   value={colWidth} 
                   onChange={(e) => setColWidth(Number(e.target.value))}
                   className="w-20 lg:w-24 accent-[#a3966a] cursor-pointer"
                   title="Adjust column width"
                />
             </div>
             <div className="flex items-center gap-2" title="Navigation"><Keyboard size={12}/><span className="hidden sm:inline">Arrows: Navigate</span></div>
             <div><strong className="text-zinc-600 dark:text-[#888]">Enter/DblClick:</strong> <span className="hidden sm:inline">Edit</span></div>
             <div><strong className="text-zinc-600 dark:text-[#888]">Shift+Enter:</strong> <span className="hidden sm:inline">Add Sibling</span></div>
             <div><strong className="text-zinc-600 dark:text-[#888]">Tab:</strong> <span className="hidden sm:inline">Add Child</span></div>
             <button
               onClick={() => {
                 setNodes(INITIAL_NODES.map((n, i) => ({...n, order: n.order ?? i})));
                 setActiveId(INITIAL_NODES[0]?.id || null);
               }}
               className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-[#222] hover:bg-zinc-300 dark:hover:bg-[#333] text-zinc-500 dark:text-[#888] font-bold text-xs transition-colors shadow-inner"
               title="Help / Reset to initial tutorial (Use Ctrl+Z to undo)"
             >
               ?
             </button>
          </div>
        </footer>

        <AnimatePresence>
          {fullScreenId && (
            <FullScreenModal 
               nodeId={fullScreenId} 
               nodes={nodes} 
               updateContent={updateContent} 
               onClose={() => setFullScreenId(null)} 
            />
          )}
          {fileMenuOpen && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               transition={{ duration: 0.15 }}
               className="absolute inset-0 z-[100] bg-black/20 dark:bg-black/50 backdrop-blur-sm"
               onClick={() => setFileMenuOpen(false)}
             >
                <motion.div 
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute top-0 bottom-0 left-0 w-80 bg-white dark:bg-[#111] shadow-2xl border-r border-zinc-200 dark:border-[#222] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                   <header className="h-14 border-b shrink-0 border-zinc-200 dark:border-[#222] flex items-center justify-between px-6">
                      <span className="font-sans font-semibold text-sm tracking-wide text-zinc-900 dark:text-[#eee]">Your Documents</span>
                      <button onClick={() => setFileMenuOpen(false)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded">
                         <X size={16} />
                      </button>
                   </header>
                   <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                       <button
                          onClick={createNewFile}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-[#4a90e2]/10 hover:bg-[#4a90e2]/20 text-[#4a90e2] border border-[#4a90e2]/20 rounded-lg transition-colors font-medium mb-4"
                       >
                          <Plus size={16} />
                          New Document
                       </button>
                       {documents.map(doc => {
                          const isActive = doc.id === activeFileId;
                          return (
                            <div 
                               key={doc.id}
                               onClick={() => switchFile(doc.id)}
                               className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-[#4a90e2]/5 border-[#4a90e2]/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-[#222] hover:border-zinc-200 dark:hover:border-[#333]'}`}
                            >
                               <div className="flex items-center gap-3 min-w-0">
                                  <File size={16} className={isActive ? 'text-[#4a90e2]' : 'text-zinc-400'} />
                                  <div className="flex flex-col min-w-0">
                                     <span className={`text-sm font-medium truncate ${isActive ? 'text-[#4a90e2]' : 'text-zinc-700 dark:text-[#ccc]'}`}>
                                        {doc.title}
                                     </span>
                                     <span className="text-[10px] text-zinc-400 capitalize">
                                        {new Date(doc.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(doc.updatedAt).toLocaleDateString()}
                                     </span>
                                  </div>
                               </div>
                               <button 
                                 onClick={(e) => deleteFile(e, doc.id)}
                                 className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                 title="Delete file"
                               >
                                 <Trash2 size={14} />
                               </button>
                            </div>
                          );
                       })}
                   </div>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EditorContext.Provider>
  );
}
