
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'fullscreen';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const isFullscreen = size === 'fullscreen';

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    fullscreen: '', // handled by isFullscreen flag
  };
  
  // Updated z-index from z-50 to z-[150] to appear above WerewolfGame (z-90)
  const backdropClasses = `fixed inset-0 bg-black bg-opacity-40 overflow-y-auto h-full w-full z-[150] flex items-center justify-center ${isFullscreen ? '' : 'p-4'}`;
  
  const modalContainerClasses = `glass-card w-full flex flex-col ${isFullscreen ? 'h-full rounded-none p-4 sm:p-6' : `p-6 rounded-2xl max-h-[90vh] ${sizeClasses[size]}`}`;


  return (
    <div className={backdropClasses}>
      <div className={modalContainerClasses}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-shadow" style={{color: 'rgb(var(--accent-color))'}}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full transition-colors hover:bg-black/10"
            style={{color: 'rgb(var(--accent-color))'}}
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-grow pr-2 -mr-2">
         {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
