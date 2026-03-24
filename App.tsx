
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ThemeSwitcher from './components/common/ThemeSwitcher';
import ErrorBoundary from './components/common/ErrorBoundary';
import CookieConsent from './components/common/CookieConsent'; // Import CookieConsent

import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import StudentPortalPage from './pages/StudentPortalPage';
import { SRTC_LOGO_URL } from './constants';
import { incrementVisitorCount, getVisitorCount, initSystemConfig } from './services/configService';

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const loadConfigAndVisitorCount = async () => {
      try {
        await initSystemConfig();
        setIsConfigLoaded(true);
        
        const hasVisited = sessionStorage.getItem('srtc_has_visited');

        if (!hasVisited) {
          await incrementVisitorCount();
          sessionStorage.setItem('srtc_has_visited', 'true');
        }

        const count = await getVisitorCount();
        setVisitorCount(count);
      } catch (error) {
        console.error("Failed to load config or visitor count", error);
        setIsConfigLoaded(true); // Proceed even if error
      }
    };

    loadConfigAndVisitorCount();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Check if current path is dashboard to adjust padding if needed (optional)
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/student-portal');

  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col relative overflow-x-hidden">
          
          {/* Floating Header */}
          <nav className="glass-card fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 rounded-full border border-white/30 shadow-xl backdrop-blur-xl transition-all duration-300">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-2">
                <Link to="/" className="flex items-center space-x-3 group" onClick={closeMenu}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 blur-md opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-300"></div>
                    <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110 bg-white/20 rounded-full p-1" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-medium tracking-widest text-shadow bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-600" 
                          style={{fontFamily: "'RushDriver', sans-serif", color: 'rgb(var(--accent-color))'}}>
                      SRTC Music & Recreation
                    </span>
                    <span className="text-[10px] sm:text-xs font-medium opacity-80 -mt-0.5 sm:-mt-1" style={{color: 'var(--text-secondary)', fontFamily: "'Prompt', sans-serif"}}>
                      ระบบจัดการชั้นเรียน ชมรมดนตรีและนันทนาการ
                    </span>
                  </div>
                </Link>
                
                <div className="flex items-center gap-2">
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-1">
                      <Link to="/register" className="text-sm font-medium px-5 py-2.5 rounded-full transition-all hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>หน้าลงทะเบียน</Link>
                      <Link to="/student-portal" className="text-sm font-medium px-5 py-2.5 rounded-full transition-all hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>สำหรับนักศึกษา</Link>
                      <Link to="/admin" className="text-sm font-medium px-5 py-2.5 rounded-full transition-all hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>แผงควบคุม (Admin)</Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="focus:outline-none p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20"
                        aria-label="Open main menu"
                        style={{color: 'rgb(var(--accent-color))'}}
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
            </div>
          </nav>

          {/* Mobile Menu Dropdown (Separate Floating Card) */}
          {isMenuOpen && (
            <div className="fixed top-20 left-3 right-3 z-40 md:hidden animate-fade-in">
               <div className="glass-card rounded-3xl border border-white/30 shadow-2xl backdrop-blur-xl p-2 flex flex-col gap-1">
                  <Link to="/register" onClick={closeMenu} className="block px-4 py-3 rounded-2xl text-base font-medium transition-colors hover:bg-black/5 active:bg-black/10" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>
                    📝 หน้าลงทะเบียน
                  </Link>
                  <Link to="/student-portal" onClick={closeMenu} className="block px-4 py-3 rounded-2xl text-base font-medium transition-colors hover:bg-black/5 active:bg-black/10" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>
                    🎓 สำหรับนักศึกษา
                  </Link>
                  <Link to="/admin" onClick={closeMenu} className="block px-4 py-3 rounded-2xl text-base font-medium transition-colors hover:bg-black/5 active:bg-black/10" style={{color: 'var(--text-primary)', fontFamily: "'Prompt', sans-serif"}}>
                    ⚙️ แผงควบคุม (Admin)
                  </Link>
               </div>
            </div>
          )}

          <main className="flex-grow pt-28 pb-36 px-4 sm:px-6" style={{fontFamily: "'Prompt', sans-serif"}}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<HomePage />} />
              <Route path="/student-portal" element={<StudentPortalPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>

          {/* Floating Footer */}
          <footer className="glass-card fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 rounded-[2rem] border border-white/30 shadow-xl backdrop-blur-xl py-3 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between z-40 transition-transform duration-300 hover:-translate-y-1 gap-3">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4 text-center md:text-left">
                <div>
                    <p className="text-sm font-medium tracking-wide" style={{color: 'var(--text-secondary)', fontFamily: "'RushDriver', sans-serif"}}>
                    &copy; {new Date().getFullYear()} SRTC Music & Recreation
                    </p>
                </div>
                <span className="hidden md:inline-block w-px h-4 bg-gray-400/50"></span>
                <p className="text-[10px] sm:text-xs opacity-70" style={{color: 'var(--text-muted)', fontFamily: "'Prompt', sans-serif"}}>
                พัฒนาระบบโดย P.Akaraphon2025
                </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Theme Switcher (Inline - No Modal) */}
                <ThemeSwitcher variant="inline" />

                {/* Divider */}
                <div className="w-px h-5 bg-gray-400/30 hidden sm:block"></div>

                {/* Visitor Badge */}
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full transition-all duration-300 hover:bg-white/10 cursor-default border border-white/10 bg-black/5" 
                     style={{
                       color: 'var(--text-secondary)'
                     }}>
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-semibold" style={{fontFamily: "'Prompt', sans-serif"}}>
                      เข้าชม: <span style={{fontVariantNumeric: 'tabular-nums'}}>{visitorCount.toLocaleString()}</span>
                    </span>
                </div>

                {showInstallBtn && (
                    <button 
                        onClick={handleInstallClick}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 border shadow-sm animate-pulse-fast group"
                        style={{
                            backgroundColor: 'rgb(var(--accent-color))', 
                            borderColor: 'rgb(var(--accent-color))',
                            color: 'white',
                            fontFamily: "'Prompt', sans-serif"
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-xs font-bold">ติดตั้ง</span>
                    </button>
                )}
            </div>
          </footer>
          
          {/* Cookie Consent Banner */}
          <CookieConsent />
          
        </div>
      </NotificationProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
