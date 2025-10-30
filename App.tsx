import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';

import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import StudentPortalPage from './pages/StudentPortalPage';
import { SRTC_LOGO_URL } from './constants';

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <ThemeProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          <nav className="glass-card sticky top-0 z-50 rounded-none border-x-0 border-t-0">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-3">
                <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
                  <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-12 w-12 object-contain bg-white/20 rounded-full p-1" />
                  <div className="flex flex-col">
                    <span className="text-xl font-semibold text-accent-600 text-shadow" style={{color: 'rgb(var(--accent-color))'}}>SRTC Music & Recreation</span>
                    <span className="text-xs text-shadow -mt-1" style={{color: 'var(--text-secondary)'}}>ระบบจัดการชั้นเรียน ชมรมดนตรีและนันทนาการ</span>
                  </div>
                </Link>
                
                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-2">
                  <Link to="/register" className="text-sm font-medium px-3 py-2 rounded-md transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>หน้าลงทะเบียน</Link>
                  <Link to="/student-portal" className="text-sm font-medium px-3 py-2 rounded-md transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>สำหรับนักศึกษา</Link>
                  <Link to="/admin" className="text-sm font-medium px-3 py-2 rounded-md transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>แผงควบคุม (Admin)</Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="focus:outline-none p-2"
                    aria-label="Open main menu"
                    style={{color: 'var(--text-primary)'}}
                  >
                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                      {isMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
              <div className="md:hidden glass-card rounded-t-none border-x-0 border-b-0 absolute w-full left-0 top-full">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  <Link to="/register" onClick={closeMenu} className="block px-3 py-2 rounded-md text-base font-medium transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>หน้าลงทะเบียน</Link>
                  <Link to="/student-portal" onClick={closeMenu} className="block px-3 py-2 rounded-md text-base font-medium transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>สำหรับนักศึกษา</Link>
                  <Link to="/admin" onClick={closeMenu} className="block px-3 py-2 rounded-md text-base font-medium transition-colors hover:bg-black/10" style={{color: 'var(--text-primary)'}}>แผงควบคุม (Admin)</Link>
                </div>
              </div>
            )}
          </nav>

          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<HomePage />} />
              <Route path="/student-portal" element={<StudentPortalPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>

          <footer className="glass-card text-center py-4 rounded-none border-x-0 border-b-0">
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>&copy; {new Date().getFullYear()} พัฒนาระบบโดย P.Akaraphon2025</p>
          </footer>
        </div>
        <ThemeSwitcher />
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;