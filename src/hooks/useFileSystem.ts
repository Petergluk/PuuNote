import { useState, useEffect } from 'react';
import { PuuDocument, PuuNode } from '../types';
import { INITIAL_NODES } from '../constants';
import { useHistory } from './useHistory';

const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);

export function useFileSystem(setActiveId: (id: string | null) => void) {
  const [documents, setDocuments] = useState<PuuDocument[]>(() => {
    const saved = localStorage.getItem('puu_documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse documents");
      }
    }
    return [{ id: 'default', title: 'New Document', updatedAt: Date.now() }];
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return localStorage.getItem('puu_active_file') || 'default';
  });

  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  // Load from local storage or use initial
  const [nodes, setNodes, undo, redo, canUndo, canRedo, resetHistory] = useHistory<PuuNode[]>(() => {
    let saved = localStorage.getItem(`puu_file_${activeFileId}`);
    if (!saved && activeFileId === 'default') {
       // Legacy fallback
       saved = localStorage.getItem('scribe_nodes');
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
           return parsed.map((n: PuuNode, i: number) => ({ ...n, order: n.order ?? i }));
        }
      } catch (e) {
        console.error("Failed to parse nodes from local storage");
      }
    }
    return INITIAL_NODES;
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(`puu_file_${activeFileId}`, JSON.stringify(nodes));
    localStorage.setItem('puu_active_file', activeFileId);
    
    // Update the document title and updatedAt in the list automatically based on the first heading
    setDocuments(prev => {
       const firstNode = nodes.find(n => n.parentId === null && (n.order === 0 || n.order === undefined)) || nodes[0];
       let newTitle = 'Untitled';
       if (firstNode) {
          const lines = firstNode.content.split('\n');
          const firstHeading = lines.find(l => l.startsWith('# '));
          if (firstHeading) {
             newTitle = firstHeading.replace(/^#\s+/, '').trim();
          } else {
             newTitle = firstNode.content.substring(0, 30).trim() + (firstNode.content.length > 30 ? '...' : '');
          }
       }
       if (!newTitle) newTitle = 'Untitled';

       return prev.map(d => d.id === activeFileId ? { ...d, title: newTitle, updatedAt: Date.now() } : d);
    });
  }, [nodes, activeFileId]);

  useEffect(() => {
     localStorage.setItem('puu_documents', JSON.stringify(documents));
  }, [documents]);

  const switchFile = (fileId: string) => {
     if (fileId === activeFileId) {
        setFileMenuOpen(false);
        return;
     }
     
     const saved = localStorage.getItem(`puu_file_${fileId}`);
     let newNodes = INITIAL_NODES;
     if (saved) {
       try {
         const parsed = JSON.parse(saved);
         if (Array.isArray(parsed) && parsed.length > 0) {
            newNodes = parsed.map((n: PuuNode, i: number) => ({ ...n, order: n.order ?? i }));
         }
       } catch (e) {}
     }
     setActiveFileId(fileId);
     resetHistory(newNodes);
     setActiveId(newNodes[0]?.id || null);
     setFileMenuOpen(false);
  };

  const createNewFile = () => {
     const newId = generateId();
     const newDoc = { id: newId, title: 'New Document', updatedAt: Date.now() };
     setDocuments(prev => [newDoc, ...prev]);
     
     const initialNewNodes = [{ id: generateId(), content: '# New Document\n\n...', parentId: null, order: 0 }];
     setActiveFileId(newId);
     resetHistory(initialNewNodes);
     setActiveId(initialNewNodes[0].id);
     setFileMenuOpen(false);
  };

  const deleteFile = (e: React.MouseEvent, fileId: string) => {
     e.stopPropagation();
     const newDocs = documents.filter(d => d.id !== fileId);
     if (newDocs.length === 0) {
        // Can't delete the last file, or create a new default one
        createNewFile();
        setDocuments(prev => prev.filter(d => d.id !== fileId)); // filter out the just deleted one
     } else {
        setDocuments(newDocs);
        if (activeFileId === fileId) {
           switchFile(newDocs[0].id);
        }
     }
     localStorage.removeItem(`puu_file_${fileId}`);
  };

  return {
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
  };
}
