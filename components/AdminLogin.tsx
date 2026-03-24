import React, { useState } from 'react';
import { signInAdmin } from '../services/authService';
import LoadingSpinner from './common/LoadingSpinner';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/40 backdrop-blur-xl bg-white/10 animate-float">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100/20 mb-4 backdrop-blur-sm shadow-inner border border-white/20">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
               </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-shadow bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
              Admin Portal
            </h2>
            <p className="mt-2 text-sm text-shadow" style={{color: 'var(--text-secondary)'}}>
              เข้าสู่ระบบเพื่อจัดการข้อมูล
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div className="group relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                    </div>
                    <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full pl-10 pr-3 py-3.5 border-none rounded-xl bg-white/40 backdrop-blur-sm focus:bg-white/60 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:shadow-lg transition-all duration-300"
                        placeholder="อีเมลผู้ดูแลระบบ"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="group relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="block w-full pl-10 pr-10 py-3.5 border-none rounded-xl bg-white/40 backdrop-blur-sm focus:bg-white/60 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:shadow-lg transition-all duration-300"
                        placeholder="รหัสผ่าน"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none text-gray-400 hover:text-orange-500 transition-colors"
                        disabled={isLoading}
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2 2 0 012.828 2.828l1.515 1.515a4 4 0 00-5.858-5.858zM10 13a3 3 0 01-3-3l7.536 7.536A9.955 9.955 0 0110 17c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 012.782-4.471l1.442 1.442A4 4 0 0010 13z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-lg hover:shadow-orange-500/30 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner size="sm" color="border-white" /> : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;