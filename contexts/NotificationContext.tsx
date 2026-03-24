
import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Toast from '../components/notifications/Toast';
import Modal from '../components/common/Modal'; // Use existing modal for confirmation
import LoadingOverlay from '../components/notifications/LoadingOverlay';

// Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmButtonColor?: string;
}

interface NotificationContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  showConfirmation: (options: ConfirmationOptions) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationOptions | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showConfirmation = useCallback((options: ConfirmationOptions) => {
    setConfirmation(options);
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(null);
  }, []);

  const handleConfirm = () => {
    if (confirmation) {
      confirmation.onConfirm();
      hideConfirmation();
    }
  };

  const handleCancel = () => {
    if (confirmation) {
      confirmation.onCancel?.();
      hideConfirmation();
    }
  };
  
  const showLoading = useCallback((message: string = 'Loading...') => {
      setLoadingMessage(message);
  }, []);
  
  const hideLoading = useCallback(() => {
      setLoadingMessage(null);
  }, []);


  const value = useMemo(() => ({ addToast, showConfirmation, showLoading, hideLoading }), [addToast, showConfirmation, showLoading, hideLoading]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      {createPortal(
        // Updated z-index from z-[100] to z-[250] to be absolutely on top
        <div className="fixed top-5 right-5 z-[250] w-full max-w-sm space-y-3">
          {toasts.map(toast => (
            <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </div>,
        document.body
      )}
      {/* Confirmation Dialog */}
      {confirmation && createPortal(
        <Modal
          isOpen={!!confirmation}
          onClose={handleCancel}
          title={confirmation.title}
          size="md"
        >
          <div className="p-2">
            <p className="text-sm text-shadow" style={{ color: 'var(--text-secondary)' }}>{confirmation.message}</p>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
                style={{ backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
              >
                {confirmation.cancelText || 'ยกเลิก'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ 
                    backgroundColor: confirmation.confirmButtonColor || `rgb(var(--text-danger-rgb))`,
                    boxShadow: `0 0 0 2px ${confirmation.confirmButtonColor || 'rgba(var(--text-danger-rgb), 0.5)'}`
                }}
              >
                {confirmation.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </Modal>,
        document.body
      )}
      {/* Loading Overlay */}
      {loadingMessage && createPortal(<LoadingOverlay message={loadingMessage} />, document.body)}
    </NotificationContext.Provider>
  );
};
