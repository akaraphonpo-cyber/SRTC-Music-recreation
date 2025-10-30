import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, themeStyle, setThemeStyle, tintColor, setTintColor } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleThemeStyleChange = (style: 'default' | 'tinted' | 'clear') => {
    if (style === 'default') {
      setTheme(theme === 'dark' ? 'dark' : 'light');
      setThemeStyle('default');
    } else {
      setThemeStyle(style);
    }
  };

  const currentSelection = themeStyle === 'default' ? theme : themeStyle;

  const options = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'clear', label: 'Clear' },
    { id: 'tinted', label: 'Tinted' }
  ];

  const handleSelectOption = (id: string) => {
    if (id === 'light' || id === 'dark') {
      setTheme(id);
      setThemeStyle('default');
    } else if (id === 'clear' || id === 'tinted') {
      setThemeStyle(id as 'clear' | 'tinted');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-5 right-5 z-50 glass-card h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200"
        aria-label="Change theme"
        style={{ color: 'var(--text-primary)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Select Theme">
        <div className="p-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 border-2 ${
                  currentSelection === option.id
                    ? 'border-accent scale-105'
                    : 'border-transparent hover:bg-black/10'
                }`}
                style={{
                    backgroundColor: currentSelection === option.id ? 'rgba(var(--accent-color), 0.1)' : 'var(--glass-border)',
                    borderColor: currentSelection === option.id ? 'rgba(var(--accent-color), 1)' : 'transparent',
                    color: 'var(--text-primary)'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {themeStyle === 'tinted' && (
            <div className="p-4 glass-card rounded-lg mt-4 animate-fade-in">
              <label htmlFor="tint-color" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Tint Color
              </label>
              <input
                id="tint-color"
                type="color"
                value={tintColor}
                onChange={(e) => setTintColor(e.target.value)}
                className="w-full h-10 p-1 bg-transparent border-none rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ThemeSwitcher;
