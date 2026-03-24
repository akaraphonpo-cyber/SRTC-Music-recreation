
import React, { useState, useEffect } from 'react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('srtc_cookie_consent');
    if (!consent) {
      // Show banner after a small delay for animation effect
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('srtc_cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 flex justify-center animate-fade-in">
      <div className="glass-card max-w-4xl w-full p-4 sm:p-6 rounded-2xl shadow-2xl border border-white/20 bg-slate-900/90 text-white flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex p-3 bg-white/10 rounded-full text-2xl shrink-0">
            🍪
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1 text-orange-400">เว็บไซต์นี้มีการจัดเก็บข้อมูล (Cookies & Storage)</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              เราใช้เทคโนโลยีเช่น LocalStorage เพื่อจดจำการตั้งค่าธีม, สถานะการล็อกอิน, และข้อมูลการเล่นเกมของคุณ เพื่อให้คุณใช้งานเว็บไซต์ได้อย่างต่อเนื่องและราบรื่น 
              <span className="opacity-60 ml-1">(เราไม่มีการเก็บข้อมูลส่วนตัวเพื่อการโฆษณา)</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button 
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
