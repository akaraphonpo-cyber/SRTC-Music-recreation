
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

interface LoadingOverlayProps {
    message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
    return (
        // Updated z-index from z-[110] to z-[210] to be above CookieConsent (z-200) and Modals
        <div className="fixed inset-0 bg-black/50 z-[210] flex flex-col items-center justify-center animate-fade-in">
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-lg font-semibold text-shadow" style={{ color: 'var(--text-primary)' }}>{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
