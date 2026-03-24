
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Deprecated, forcing orange theme
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text, className = '' }) => {
  // Dimensions: Height expands from 32px to 40px. Width is approx 50px.
  const scaleMap = {
    sm: 0.4, // Good for buttons (~16px height)
    md: 0.8, // Standard (~32px height)
    lg: 1.2, // Large overlay (~48px height)
  };
  const scale = scaleMap[size];

  const styles = `
    .loader-wrapper {
      position: relative;
      width: 60px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .jimu-primary-loading:before,
    .jimu-primary-loading:after {
      position: absolute;
      top: 0;
      content: '';
    }

    .jimu-primary-loading:before {
      left: -19.992px;
    }

    .jimu-primary-loading:after {
      left: 19.992px;
      -webkit-animation-delay: 0.32s !important;
      animation-delay: 0.32s !important;
    }

    .jimu-primary-loading:before,
    .jimu-primary-loading:after,
    .jimu-primary-loading {
      background: #f97316; /* Orange-500 */
      -webkit-animation: loading-keys-app-loading 0.8s infinite ease-in-out;
      animation: loading-keys-app-loading 0.8s infinite ease-in-out;
      width: 13.6px;
      height: 32px;
    }

    .jimu-primary-loading {
      text-indent: -9999em;
      margin: auto;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      -webkit-animation-delay: 0.16s !important;
      animation-delay: 0.16s !important;
    }

    @-webkit-keyframes loading-keys-app-loading {
      0%, 80%, 100% {
        opacity: .75;
        box-shadow: 0 0 #f97316;
        height: 32px;
      }
      40% {
        opacity: 1;
        box-shadow: 0 -8px #f97316;
        height: 40px;
      }
    }

    @keyframes loading-keys-app-loading {
      0%, 80%, 100% {
        opacity: .75;
        box-shadow: 0 0 #f97316;
        height: 32px;
      }
      40% {
        opacity: 1;
        box-shadow: 0 -8px #f97316;
        height: 40px;
      }
    }
  `;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-label="loading">
      <style>{styles}</style>
      <div style={{ transform: `scale(${scale})` }} className="loader-wrapper">
        <div className="jimu-primary-loading"></div>
      </div>
      {text && <span className="mt-2 text-sm font-medium text-orange-500 animate-pulse">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
