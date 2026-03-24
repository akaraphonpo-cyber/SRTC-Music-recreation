
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from './Modal';

interface ThemeSwitcherProps {
    variant?: 'modal' | 'inline';
    className?: string;
}

// Icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);
const AutoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
);
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);

const options = [
  { id: 'auto', label: 'Auto', icon: <AutoIcon /> },
  { id: 'light', label: 'Light', icon: <SunIcon /> },
  { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { id: 'tinted', label: 'Tinted', icon: <PaletteIcon /> },
  { id: 'clear', label: 'Clear', icon: <SparklesIcon /> }
];

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ variant = 'modal', className = '' }) => {
  const { theme, setTheme, themeStyle, setThemeStyle, tintColor, setTintColor } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectOption = (id: string) => {
    if (id === 'light' || id === 'dark' || id === 'auto') {
      setTheme(id as any);
      // If switching to a main theme mode, ensure style is reset or kept compatible if needed
      // For now, we keep style as is, but reset to default if it was previously strictly tied
      if (themeStyle !== 'tinted' && themeStyle !== 'clear') {
          setThemeStyle('default');
      }
    } else if (id === 'clear' || id === 'tinted') {
      setThemeStyle(id as any);
    }
  };

  const currentSelection = themeStyle === 'default' ? theme : themeStyle;

  if (variant === 'inline') {
      return (
          <div className={`flex items-center gap-1 bg-black/5 rounded-full p-1 border border-white/10 ${className}`}>
              {options.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                      currentSelection === option.id
                        ? 'bg-white shadow-md text-orange-500 scale-110'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                    }`}
                    style={currentSelection === option.id ? { color: 'rgb(var(--accent-color))' } : {}}
                    title={option.label}
                  >
                      {option.icon}
                  </button>
              ))}
              {themeStyle === 'tinted' && (
                <div className="flex items-center px-1 ml-1 border-l border-gray-300/30 animate-fade-in">
                    <input
                        type="color"
                        value={tintColor}
                        onChange={(e) => setTintColor(e.target.value)}
                        className="w-5 h-5 rounded-full cursor-pointer border-none bg-transparent p-0"
                        title="Choose Tint Color"
                    />
                </div>
              )}
          </div>
      );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`p-2.5 rounded-full hover:bg-black/5 transition-colors active:bg-black/10 group ${className}`}
        aria-label="Change theme"
        style={{ color: 'var(--text-primary)' }}
        title="เปลี่ยนธีม (Change Theme)"
      >
        <PaletteIcon />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Appearance">
        <div className="p-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 border-2 ${
                  currentSelection === option.id
                    ? 'border-accent scale-105 shadow-lg'
                    : 'border-transparent hover:bg-black/5'
                }`}
                style={{
                    backgroundColor: currentSelection === option.id ? 'rgba(var(--accent-color), 0.1)' : 'var(--glass-border)',
                    borderColor: currentSelection === option.id ? 'rgba(var(--accent-color), 1)' : 'transparent',
                    color: 'var(--text-primary)'
                }}
              >
                <div style={{ color: currentSelection === option.id ? 'rgb(var(--accent-color))' : 'var(--text-secondary)' }}>
                    {option.icon}
                </div>
                <span className="ml-2 text-sm font-semibold">{option.label}</span>
              </button>
            ))}
          </div>

          {themeStyle === 'tinted' && (
            <div className="p-4 glass-card rounded-xl animate-fade-in">
              <label htmlFor="tint-color" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Custom Tint Color
              </label>
              <div className="flex items-center gap-3">
                  <input
                    id="tint-color"
                    type="color"
                    value={tintColor}
                    onChange={(e) => setTintColor(e.target.value)}
                    className="w-12 h-12 p-1 bg-transparent border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm font-mono opacity-70" style={{color: 'var(--text-primary)'}}>{tintColor}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ThemeSwitcher;
