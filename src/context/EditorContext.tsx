import { createContext } from 'react';
import { EditorContextType } from '../types';

export const EditorContext = createContext<EditorContextType | null>(null);
