import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Tema do app (escuro/claro). O valor vai para <html data-theme>, e os tokens
// de index.css fazem o resto. Salvo no navegador — o index.html aplica o valor
// salvo antes do React montar, então não há flash de tema errado.

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'trader_afk_theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#181818', light: '#fafafa' };

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch { /* storage indisponível: usa o padrão */ }
  return 'dark';
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* ignora */ }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
