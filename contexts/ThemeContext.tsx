import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';

type Theme = 'light' | 'dark';
type ThemeStyle = 'default' | 'tinted' | 'clear';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  tintColor: string;
  setTintColor: (color: string) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app-theme') as Theme) || 'light');
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() => (localStorage.getItem('app-theme-style') as ThemeStyle) || 'default');
  const [tintColor, setTintColor] = useState<string>(() => localStorage.getItem('app-theme-tint') || '#6366f1'); // default indigo-500

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Clear previous classes/attributes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme-style');

    // Apply new theme class and style attribute
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    if(themeStyle !== 'default'){
        root.setAttribute('data-theme-style', themeStyle);
    }

    // Handle tinted style
    if (themeStyle === 'tinted') {
        const rgb = hexToRgb(tintColor);
        if (rgb) {
            root.style.setProperty('--glass-bg', `rgba(${rgb}, ${theme === 'dark' ? '0.2' : '0.1'})`);
            root.style.setProperty('--glass-border', `rgba(${rgb}, ${theme === 'dark' ? '0.3' : '0.2'})`);
        }
    } else {
        // Reset to default when not tinted
        root.style.removeProperty('--glass-bg');
        root.style.removeProperty('--glass-border');
    }

    // Persist to local storage
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-theme-style', themeStyle);
    localStorage.setItem('app-theme-tint', tintColor);

  }, [theme, themeStyle, tintColor]);

  const value = useMemo(() => ({
    theme, setTheme,
    themeStyle, setThemeStyle,
    tintColor, setTintColor
  }), [theme, themeStyle, tintColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
