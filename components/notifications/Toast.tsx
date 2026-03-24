import React, { useEffect, useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../../contexts/NotificationContext';

interface ToastProps extends ToastMessage {
  onDismiss: () => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  info: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  warning: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
};

const COLORS: Record<ToastType, { text: string }> = {
  success: { text: 'text-green-400' },
  error: { text: 'text-red-400' },
  info: { text: 'text-sky-400' },
  warning: { text: 'text-amber-400' },
};

const Toast: React.FC<ToastProps> = ({ type, title, message, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300); // Wait for animation to finish
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const colors = COLORS[type];

  return (
    <div
      className={`glass-card p-4 rounded-xl flex items-start w-full transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <div className={`flex-shrink-0 ${colors.text}`}>{ICONS[type]}</div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-bold text-shadow" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {message && <p className="mt-1 text-sm text-shadow" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
      </div>
      <button onClick={handleDismiss} className="ml-4 flex-shrink-0 rounded-full p-1 transition hover:bg-black/20" style={{ color: 'var(--text-muted)' }}>
        <span className="sr-only">Close</span>
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
    </div>
  );
};

export default Toast;
