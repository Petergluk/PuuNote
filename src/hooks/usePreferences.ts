import { useState, useEffect } from 'react';

export function usePreferences() {
  const [cardsCollapsed, setCardsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('puu_cardsCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('puu_cardsCollapsed', String(cardsCollapsed));
  }, [cardsCollapsed]);

  const [colWidth, setColWidth] = useState<number>(() => {
    return Number(localStorage.getItem('puu_colWidth')) || 357;
  });

  useEffect(() => {
    localStorage.setItem('puu_colWidth', colWidth.toString());
  }, [colWidth]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('puu_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('puu_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  const toggleCardsCollapsed = () => setCardsCollapsed(prev => !prev);

  return {
    theme,
    setTheme,
    toggleTheme,
    colWidth,
    setColWidth,
    cardsCollapsed,
    setCardsCollapsed,
    toggleCardsCollapsed
  };
}
