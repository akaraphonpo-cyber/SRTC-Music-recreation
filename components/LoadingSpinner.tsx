import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = `border-accent` }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-t-2 border-b-2 ${color}`}
        style={ color === 'border-accent' ? { borderColor: `rgba(var(--accent-color), 1)` } : {}}
      ></div>
    </div>
  );
};

export default LoadingSpinner;