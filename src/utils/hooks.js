import { useState, useCallback } from 'react';

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('fms-dark-mode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newValue = !prev;
      try { localStorage.setItem('fms-dark-mode', JSON.stringify(newValue)); } catch { /* ignore storage errors */ }
      return newValue;
    });
  }, []);

  return { darkMode, toggleDarkMode };
}
