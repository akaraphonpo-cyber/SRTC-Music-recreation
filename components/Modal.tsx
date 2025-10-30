import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-shadow" style={{color: 'rgb(var(--accent-color))'}}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full transition-colors hover:bg-black/10"
            style={{color: 'var(--text-muted)'}}
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