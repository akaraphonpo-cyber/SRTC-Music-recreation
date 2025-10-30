import React, { useState } from 'react';
import { signInAdmin } from '../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import LoadingSpinner from './LoadingSpinner';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const commonInputClass = "appearance-none rounded-lg relative block w-full px-3 py-3.5 pr-10 shadow-sm focus:outline-none sm:text-sm transition-all duration-300 ease-in-out";
  const style = {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    placeholderColor: 'var(--text-muted)'
  };
  const focusStyle: React.CSSProperties = {
      borderColor: 'var(--input-focus-border)',
      boxShadow: `0 0 0 3px rgba(var(--accent-color), 0.3)`,
      transform: 'scale(1.02)',
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await signInAdmin(email, password);
      if (response.success) {
        onLoginSuccess();
      } else {
        const errorMessage = response.message || 'An error occurred.';
        setError(errorMessage);
      }
    } catch (err: any) {
        const errorMessage = err.message || 'An unexpected error occurred.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => Object.assign(e.target.style, focusStyle);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'var(--input-border)';
      e.target.style.boxShadow = 'none';
      e.target.style.transform = 'scale(1)';
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-shadow" style={{color: 'rgb(var(--accent-color))'}}>
            เข้าสู่ระบบผู้ดูแล
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={commonInputClass}
                    style={style}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={commonInputClass}
                  style={style}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                  style={{color: 'var(--text-muted)'}}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2 2 0 012.828 2.828l1.515 1.515a4 4 0 00-5.858-5.858zM10 13a3 3 0 01-3-3l7.536 7.536A9.955 9.955 0 0110 17c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 012.782-4.471l1.442 1.442A4 4 0 0010 13z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" style={{color: 'rgb(var(--text-danger-rgb))'}} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm" style={{color: 'rgb(var(--text-danger-rgb))'}}>{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-accent disabled:opacity-50 transition-all transform hover:scale-105"
            >
              {isLoading ? <LoadingSpinner size="sm" color="border-white" /> : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
