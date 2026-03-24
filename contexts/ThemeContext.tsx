
import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type ThemeStyle = 'default' | 'tinted' | 'clear';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  tintColor: string;
  setTintColor: (color: string) => void;
  resolvedTheme: 'light' | 'dark'; // Expose the actual active theme
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'dark' instead of 'light'
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app-theme') as Theme) || 'dark');
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() => (localStorage.getItem('app-theme-style') as ThemeStyle) || 'default');
  const [tintColor, setTintColor] = useState<string>(() => localStorage.getItem('app-theme-tint') || '#6366f1'); // default indigo-500
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
        let activeTheme: 'light' | 'dark';

        if (theme === 'auto') {
            const hours = new Date().getHours();
            // Dark mode from 18:00 (6 PM) to 06:00 (6 AM)
            if (hours >= 18 || hours < 6) {
                activeTheme = 'dark';
            } else {
                activeTheme = 'light';
            }
        } else {
            activeTheme = theme;
        }

        setResolvedTheme(activeTheme);

        // Clear previous classes/attributes
        root.classList.remove('light', 'dark');
        root.removeAttribute('data-theme-style');

        // Apply new theme class and style attribute
        root.classList.add(activeTheme);
        root.setAttribute('data-theme', activeTheme);
        
        if (themeStyle !== 'default') {
            root.setAttribute('data-theme-style', themeStyle);
        }

        // Handle tinted style
        if (themeStyle === 'tinted') {
            const rgb = hexToRgb(tintColor);
            if (rgb) {
                root.style.setProperty('--glass-bg', `rgba(${rgb}, ${activeTheme === 'dark' ? '0.2' : '0.1'})`);
                root.style.setProperty('--glass-border', `rgba(${rgb}, ${activeTheme === 'dark' ? '0.3' : '0.2'})`);
            }
        } else {
            // Reset to default when not tinted
            root.style.removeProperty('--glass-bg');
            root.style.removeProperty('--glass-border');
        }
    };

    applyTheme();

    // If auto, check every minute to switch automatically
    let interval: any;
    if (theme === 'auto') {
        interval = setInterval(applyTheme, 60000);
    }

    // Persist to local storage
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-theme-style', themeStyle);
    localStorage.setItem('app-theme-tint', tintColor);

    return () => {
        if (interval) clearInterval(interval);
    };

  }, [theme, themeStyle, tintColor]);

  const value = useMemo(() => ({
    theme, setTheme,
    themeStyle, setThemeStyle,
    tintColor, setTintColor,
    resolvedTheme
  }), [theme, setTheme, themeStyle, setThemeStyle, tintColor, setTintColor, resolvedTheme]);

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
