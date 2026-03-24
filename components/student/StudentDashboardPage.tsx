
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getStudentByStudentId, uploadStudentProfilePicture, updateStudent } from '../../services/studentService';
import { getScoresForStudent, getCourseGradingConfig, getAttendanceForStudent, getCourseCatalog } from '../../services/courseService';
import { getTournamentsForStudent } from '../../services/gameService';
import { getSystemConfig, setGlobalTermYear } from '../../services/configService';
import { StudentWithId, Course, StudentScores, CourseConfig, TournamentWithId, AttendanceRecord, UserGamificationStats, Badge, AttendanceStatus, Quest, CardTheme, SystemConfig } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import StudentCourseView from './StudentCourseView';
import StudentAnnouncementsView from './StudentAnnouncementsView';
import StudentTournamentView from './StudentTournamentView';
import StudentAttendanceView from './StudentAttendanceView';
import GameHub from '../game/GameHub';
import Marketplace from '../game/Marketplace'; // Import Marketplace
import { calculateTotal, calculateGrade } from '../../utils/grades';
import { calculateGamificationStats, GAME_ITEMS, CRAFTING_RECIPES, getRandomDrop, getDailyQuests, CARD_THEMES } from '../../utils/gamification';
import { useNotification } from '../../contexts/NotificationContext';
import { getOptimizedImage } from '../../utils/imageUtils';
import Modal from '../common/Modal';
import WeatherWidget from '../common/WeatherWidget';


interface StudentDashboardPageProps {
  studentId: string;
  onLogout?: () => void; // Make optional for admin preview mode
  initialStudentData?: StudentWithId; // New prop for admin preview to save reads
}

interface CourseData {
    scores: StudentScores | null;
    config: CourseConfig | null;
}

// --- Profile Image Upload Component ---
const ProfileImageUpload: React.FC<{ studentId: string; currentUrl?: string; onUploadSuccess: (url: string) => void; readOnly?: boolean }> = ({ studentId, currentUrl, onUploadSuccess, readOnly = false }) => {
    const [isUploading, setIsUploading] = useState(false);
    const notification = useNotification();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            notification.addToast({ type: 'warning', title: 'ไฟล์ไม่ถูกต้อง', message: 'กรุณาเลือกไฟล์รูปภาพ' });
            return;
        }

        setIsUploading(true);

        try {
            const imageBitmap = await createImageBitmap(file);
            const MAX_SIZE = 500;
            let width = imageBitmap.width;
            let height = imageBitmap.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            ctx.drawImage(imageBitmap, 0, 0, width, height);

            canvas.toBlob(async (blob) => {
                if (!blob) {
                     setIsUploading(false);
                     notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถประมวลผลรูปภาพได้' });
                     return;
                }

                const response = await uploadStudentProfilePicture(studentId, blob);
                
                if (response.success && response.data) {
                    onUploadSuccess(response.data);
                    notification.addToast({ type: 'success', title: 'อัปโหลดสำเร็จ', message: 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว' });
                } else {
                    notification.addToast({ type: 'error', title: 'อัปโหลดล้มเหลว', message: response.message });
                }
                setIsUploading(false);

            }, 'image/jpeg', 0.8);

        } catch (error) {
            console.error(error);
            setIsUploading(false);
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอัปโหลดรูปภาพได้' });
        }
    };

    return (
        <div className="relative group mx-auto sm:mx-0">
            <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 ${currentUrl ? 'border-white/20' : 'border-dashed border-white/40'} shadow-lg bg-white/10 flex items-center justify-center relative transition-all duration-300`}>
                 {currentUrl ? (
                     <img src={getOptimizedImage(currentUrl, 300)} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                     <div className="flex flex-col items-center text-white/70 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">เพิ่มรูป</span>
                     </div>
                 )}
                 {isUploading && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                         <LoadingSpinner size="sm" color="border-white" />
                     </div>
                 )}
                 {!readOnly && (
                    <label 
                        htmlFor="profile-upload-overlay" 
                        className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300 ${currentUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 hover:opacity-100'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white text-xs font-bold">แก้ไขรูป</span>
                    </label>
                 )}
            </div>
            {!readOnly && (
                <label 
                    htmlFor="profile-upload-fab" 
                    className="absolute bottom-0 right-0 bg-white text-gray-800 p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-transform hover:scale-110 border-2 border-gray-100 z-10" 
                    title="เปลี่ยนรูปโปรไฟล์"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    {!currentUrl && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </label>
            )}
            {!readOnly && (
                <>
                    <input id="profile-upload-overlay" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                    <input id="profile-upload-fab" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                </>
            )}
        </div>
    );
};

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-lg transition-all duration-300 text-sm font-semibold text-center ${
        isActive
          ? 'bg-accent/20 text-accent shadow-md'
          : 'hover:bg-black/10'
      }`}
      style={{color: isActive ? 'rgb(var(--accent-color))' : 'var(--text-secondary)'}}
      role="tab"
      aria-selected={isActive}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
);

// --- Digital ID Card Component (Updated Animations) ---
const DigitalIdCard: React.FC<{ 
    student: StudentWithId; 
    gamification: UserGamificationStats | null; 
    onCustomize?: () => void;
    onExpandQr?: () => void;
}> = ({ student, gamification, onCustomize, onExpandQr }) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${student.studentId}`;
    const unlockedBadges = gamification?.badges.filter(b => b.isUnlocked).slice(0, 3) || [];
    
    const themeId = student.activeTheme || 'default';
    const theme = CARD_THEMES[themeId] || CARD_THEMES['default'];

    const themeStyles = `
        @keyframes shine { 
            0% { left: -100%; opacity: 0; } 
            20% { left: 100%; opacity: 0.5; } 
            100% { left: 100%; opacity: 0; } 
        }
        @keyframes diamond-sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes prism-move {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes scanline { 
            0% { top: -20%; opacity: 0; } 
            50% { opacity: 1; }
            100% { top: 120%; opacity: 0; } 
        }
        @keyframes hologram { 
            0% { background-position: 0% 50%; filter: hue-rotate(0deg); } 
            50% { background-position: 100% 50%; } 
            100% { background-position: 0% 50%; filter: hue-rotate(360deg); } 
        }
        @keyframes float-card { 
            0%, 100% { transform: translateY(0); } 
            50% { transform: translateY(-5px); } 
        }
        @keyframes spark-1 {
            to { stroke-dashoffset: -1000; }
        }
        @keyframes spark-2 {
            to { stroke-dashoffset: -500; }
        }
        @keyframes fly-up {
            0% { opacity:0; transform:translateY(0) scale(0.2); }
            5% { opacity:1; transform:translateY(-1.5rem) scale(0.4);}
            10%,100%{ opacity:0; transform:translateY(-3rem) scale(0.2);}
        }
        @keyframes fly-down {
            0% { opacity:0; transform:translateY(0) scale(0.2); }
            5% { opacity:1; transform:translateY(1.5rem) scale(0.4);}
            10%,100%{ opacity:0; transform:translateY(3rem) scale(0.2);}
        }
        
        .effect-shine::before {
            content: '';
            position: absolute;
            top: 0;
            width: 50%;
            height: 100%;
            background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent);
            transform: skewX(-20deg);
            animation: shine 4s infinite ease-in-out;
            pointer-events: none;
            z-index: 20;
        }

        .effect-diamond-prism {
            background: linear-gradient(45deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 60%),
                        linear-gradient(135deg, rgba(0,255,255,0.2) 0%, rgba(255,0,255,0.2) 100%);
            background-size: 200% 200%;
            animation: prism-move 5s ease infinite;
        }
        
        .sparkle-icon {
            position: absolute;
            font-size: 1.5rem;
            animation: diamond-sparkle 2s infinite ease-in-out;
            z-index: 30;
            pointer-events: none;
        }
        
        .effect-scanline::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            height: 5px;
            background: rgba(0, 255, 0, 0.5);
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
            animation: scanline 3s infinite linear;
            pointer-events: none;
            z-index: 20;
        }
        
        .effect-hologram {
            animation: hologram 8s infinite linear;
            background-size: 200% 200%;
        }
        
        .card-floating {
            animation: float-card 6s ease-in-out infinite;
        }

        /* Platinum Elite Specifics */
        .platinum-svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 20;
            overflow: visible;
        }
        .platinum-svg path {
            fill: none;
            stroke-width: 3px;
            stroke-dasharray: 100 300; 
            stroke-linecap: round;
            filter: url(#platinum-glow);
            vector-effect: non-scaling-stroke;
        }
        .platinum-line-1 {
            stroke: #f6de8d;
            stroke-dashoffset: 0;
            animation: spark-1 3s linear infinite;
        }
        .platinum-line-2 {
            stroke: #6bfeff;
            stroke-dashoffset: 500;
            animation: spark-2 3s linear infinite;
        }
        .platinum-dot {
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            position: absolute;
            opacity: 0;
            z-index: 21;
            box-shadow: 0 0 5px #fff, 0 0 10px #f6de8d;
        }
        .p-dot-1 { top:10%; left:20%; animation: fly-up 3s linear infinite; }
        .p-dot-2 { top:10%; left:55%; animation: fly-up 3s linear infinite 0.5s; }
        .p-dot-3 { top:10%; left:80%; animation: fly-up 3s linear infinite 1s; }
        .p-dot-4 { bottom:10%; left:30%; animation: fly-down 3s linear infinite 2.5s; }
        .p-dot-5 { bottom:10%; left:65%; animation: fly-down 3s linear infinite 1.5s; }
    `;

    return (
        <div className="flex flex-col items-center">
            <style>{themeStyles}</style>
            
            {/* SVG Filter for Platinum Glow */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <filter id="platinum-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </svg>

            {/* Main Card Wrapper (No Overflow Hidden to allow effects to spill out) */}
            <div className={`relative w-full max-w-[340px] mx-auto transition-transform hover:scale-[1.02] flex flex-col rounded-3xl ${themeId === 'maestro' ? 'card-floating' : ''} ${theme.styleClass}`}>
                
                {/* 1. Background Clipper (Clips internal patterns to rounded corners) */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden z-0">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)' }}></div>
                    
                    {themeId === 'gold_rockstar' && <div className="absolute inset-0 effect-shine z-10 pointer-events-none"></div>}
                    
                    {themeId === 'neon_cyber' && (
                        <>
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
                            <div className="absolute inset-0 effect-scanline z-10 pointer-events-none"></div>
                        </>
                    )}

                    {themeId === 'legendary_vip' && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-20 mix-blend-overlay effect-hologram"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-20"></div>
                        </>
                    )}

                    {themeId === 'maestro' && (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 animate-pulse-slow"></div>
                    )}

                    {themeId === 'platinum_elite' && (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aluminium.png')] opacity-30 mix-blend-overlay"></div>
                    )}

                    {themeId === 'diamond_prism' && (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    )}
                </div>

                {/* 2. Unclipped Effects Layer (Z-Index 20) */}
                {themeId === 'platinum_elite' && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-visible">
                        <svg className="platinum-svg" viewBox="0 0 340 480" preserveAspectRatio="none">
                            <path d="M24,3 L316,3 C327.59798,3 337,12.4020203 337,24 L337,456 C337,467.59798 327.59798,477 316,477 L24,477 C12.4020203,477 3,467.59798 3,456 L3,24 C3,12.4020203 12.4020203,3 24,3 Z" className="platinum-line-1" vectorEffect="non-scaling-stroke"></path>
                            <path d="M24,3 L316,3 C327.59798,3 337,12.4020203 337,24 L337,456 C337,467.59798 327.59798,477 316,477 L24,477 C12.4020203,477 3,467.59798 3,456 L3,24 C3,12.4020203 12.4020203,3 24,3 Z" className="platinum-line-2" vectorEffect="non-scaling-stroke" style={{animationDelay: '1.5s'}}></path>
                        </svg>
                        <div className="absolute inset-0">
                           <div className="platinum-dot p-dot-1"></div>
                           <div className="platinum-dot p-dot-2"></div>
                           <div className="platinum-dot p-dot-3"></div>
                           <div className="platinum-dot p-dot-4"></div>
                           <div className="platinum-dot p-dot-5"></div>
                        </div>
                    </div>
                )}

                {themeId === 'diamond_prism' && (
                    <div className="absolute -inset-4 z-30 pointer-events-none overflow-visible">
                        <div className="absolute inset-0 effect-diamond-prism mix-blend-overlay opacity-60 rounded-3xl"></div>
                        <div className="sparkle-icon top-0 left-0 text-cyan-200">✨</div>
                        <div className="sparkle-icon bottom-8 right-6 text-purple-200" style={{animationDelay: '1s'}}>✨</div>
                        <div className="sparkle-icon top-1/2 right-[-10px] text-white" style={{animationDelay: '0.5s'}}>✦</div>
                    </div>
                )}

                {/* Top Decoration (Z-Index 20) */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 z-20 rounded-t-3xl ${themeId === 'gold_rockstar' ? 'bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200' : themeId === 'platinum_elite' ? 'bg-gradient-to-r from-white via-slate-300 to-white' : themeId === 'diamond_prism' ? 'bg-gradient-to-r from-cyan-200 via-purple-200 to-white' : 'bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-500'}`}></div>
                
                {/* Customize Button */}
                {onCustomize && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCustomize(); }}
                        className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors z-30 border border-white/20"
                        title="แต่งบัตร"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                )}

                {/* 3. Main Content Area (Relative to stack above background) */}
                <div className={`relative z-10 flex flex-col items-center pt-8 pb-6 px-6 flex-grow ${themeId === 'diamond_prism' ? 'text-slate-800' : 'text-white'}`}>
                    
                    {/* Header: Level & Org */}
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-md shadow-sm border ${themeId === 'diamond_prism' ? 'bg-slate-900/10 border-slate-900/10 text-slate-800' : 'bg-white/20 border-white/10 text-white'}`}>
                                <span className="text-lg">🎵</span>
                            </div>
                            <span className="text-xs font-bold tracking-widest uppercase opacity-90 drop-shadow-sm">SRTC MUSIC</span>
                        </div>
                        {gamification && (
                            <div className="flex flex-col items-end mr-8">
                                <span className="text-[9px] opacity-70 uppercase tracking-wider">Level</span>
                                <span className={`text-2xl font-black leading-none text-transparent bg-clip-text filter drop-shadow-sm ${themeId === 'gold_rockstar' ? 'bg-gradient-to-b from-yellow-100 to-yellow-400' : themeId === 'diamond_prism' || themeId === 'platinum_elite' ? 'bg-gradient-to-b from-slate-200 to-white' : 'bg-gradient-to-b from-white to-white/70'}`}>
                                    {gamification.level}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile Section */}
                    <div className="relative mb-5 group cursor-pointer" onClick={onCustomize}>
                        <div className={`w-28 h-28 rounded-full p-1 shadow-xl relative z-10 ${themeId === 'gold_rockstar' ? 'bg-gradient-to-tr from-yellow-300 via-yellow-500 to-yellow-200' : themeId === 'platinum_elite' ? 'bg-gradient-to-tr from-slate-200 via-slate-400 to-slate-100' : themeId === 'diamond_prism' ? 'bg-gradient-to-tr from-cyan-200 via-white to-purple-200' : 'bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-cyan-500'}`}>
                            <div className={`w-full h-full rounded-full border-4 overflow-hidden ${themeId === 'diamond_prism' || themeId === 'platinum_elite' ? 'border-white bg-slate-800' : 'border-slate-900 bg-slate-800'}`}>
                                <img 
                                    src={getOptimizedImage(student.photoUrl, 300) || "https://via.placeholder.com/150?text=SRTC"} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        {/* Rank Star */}
                        {gamification && gamification.level >= 5 && (
                            <div className={`absolute -bottom-1 -right-1 text-lg w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-md z-20 ${themeId === 'diamond_prism' ? 'bg-slate-800 text-yellow-400 border-white' : 'bg-amber-400 text-slate-900 border-slate-900'}`}>
                                ⭐
                            </div>
                        )}
                        <div className={`absolute inset-0 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full ${themeId === 'neon_cyber' ? 'bg-green-500' : themeId === 'platinum_elite' ? 'bg-blue-400' : 'bg-fuchsia-500'}`}></div>
                    </div>

                    {/* Identity Section */}
                    <div className="text-center mb-6 w-full">
                        <h2 className="text-xl font-bold mb-1.5 text-shadow-sm truncate px-2" style={{fontFamily: "'Prompt', sans-serif"}}>{student.firstName} {student.lastName}</h2>
                        <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full border backdrop-blur-sm ${themeId === 'diamond_prism' ? 'bg-white/40 border-white/40 text-slate-900' : 'bg-black/30 border-white/10 text-white'}`}>
                            <span className={`w-2 h-2 rounded-full animate-pulse box-shadow-glow ${themeId === 'neon_cyber' ? 'bg-green-400' : 'bg-green-400'}`}></span>
                            <p className="text-sm font-mono tracking-widest opacity-90">{student.studentId}</p>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="w-full grid grid-cols-2 gap-3 mb-6">
                        <div className={`backdrop-blur-md rounded-xl p-3 border flex flex-col items-center justify-center text-center h-full hover:bg-white/20 transition-colors ${themeId === 'diamond_prism' ? 'bg-slate-900/5 border-slate-900/10' : 'bg-white/10 border-white/10'}`}>
                            <span className="text-[9px] opacity-60 uppercase mb-1 tracking-wider">Department</span>
                            <span className="text-xs font-bold leading-tight">{student.department}</span>
                        </div>
                        <div className={`backdrop-blur-md rounded-xl p-3 border flex flex-col items-center justify-center text-center h-full hover:bg-white/20 transition-colors ${themeId === 'diamond_prism' ? 'bg-slate-900/5 border-slate-900/10' : 'bg-white/10 border-white/10'}`}>
                            <span className="text-[9px] opacity-60 uppercase mb-1 tracking-wider">Class Level</span>
                            <span className="text-sm font-bold">{student.classLevel}</span>
                        </div>
                    </div>

                    {/* Badges - Compact Row */}
                    <div className="flex justify-center gap-2 h-8">
                        {unlockedBadges.length > 0 ? unlockedBadges.map(badge => (
                            <div key={badge.id} className={`w-8 h-8 rounded-full border flex items-center justify-center text-lg shadow-md backdrop-blur-sm ${themeId === 'diamond_prism' ? 'bg-white/60 border-white/40' : 'bg-slate-900/60 border-white/20'}`} title={badge.name}>
                                {badge.icon}
                            </div>
                        )) : (
                            <span className="text-[10px] opacity-40 italic mt-2">Collect badges to show here</span>
                        )}
                    </div>
                </div>

                {/* Smart Footer (QR) */}
                <div 
                    className="relative z-20 bg-white text-slate-900 p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors mt-auto rounded-b-3xl"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpandQr?.();
                    }}
                >
                    <div className="bg-slate-900 p-1 rounded-lg flex-shrink-0">
                        <img src={qrCodeUrl} alt="QR" className="w-12 h-12 object-contain rounded-md bg-white" />
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">MEMBER ID</p>
                        <p className="text-sm font-mono font-bold text-slate-800 tracking-widest truncate">{student.studentId.substring(0,3)} • {student.studentId.substring(3,7)} • {student.studentId.substring(7)}</p>
                    </div>
                    <div className="text-slate-300 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Quest Widget ---
const QuestWidget: React.FC<{ quests: Quest[] }> = ({ quests }) => {
    return (
        <div className="glass-card p-4 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                    <span>📜</span> ภารกิจ (Quests)
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent">
                    {quests.filter(q => q.isCompleted).length}/{quests.length} สำเร็จ
                </span>
            </div>
            <div className="space-y-3">
                {quests.map(quest => (
                    <div key={quest.id} className={`p-3 rounded-xl border transition-all ${quest.isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{quest.icon}</span>
                                <div>
                                    <p className={`text-sm font-bold ${quest.isCompleted ? 'text-green-600 line-through' : 'text-primary'}`} style={{color: quest.isCompleted ? undefined : 'var(--text-primary)'}}>
                                        {quest.title}
                                    </p>
                                    {/* Description as a distinct visual hint */}
                                    <div className="flex items-start gap-1.5 mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mt-0.5 opacity-60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: 'var(--text-secondary)'}}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-[10px] leading-tight opacity-80" style={{color: 'var(--text-secondary)'}}>{quest.description}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-amber-500">+{quest.rewardXP} XP</span>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                            <div 
                                className={`absolute top-0 left-0 h-full transition-all duration-500 ${quest.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[10px] mt-1 opacity-60" style={{color: 'var(--text-muted)'}}>
                            <span>Progress</span>
                            <span>{quest.progress} / {quest.target}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Achievements & Inventory View ---
const AchievementsView: React.FC<{ 
    gamification: UserGamificationStats, 
    student: StudentWithId, 
    onCraft: (recipeId: string) => void 
}> = ({ gamification, student, onCraft }) => {
    const { level, currentXP, nextLevelXP, badges } = gamification;
    const progressPercent = (currentXP / nextLevelXP) * 100;
    const inventory = student.inventory || {};

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Level Header */}
            <div className="glass-card p-6 rounded-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <h3 className="text-4xl font-extrabold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Level {level}</h3>
                <p className="text-sm text-gray-500 mb-4">Member Class</p>
                
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-2 mx-auto max-w-md shadow-inner">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
                <p className="text-xs font-medium text-gray-500">{currentXP} / {nextLevelXP} XP to next level</p>
            </div>

            {/* Inventory Section */}
            <div>
                <h4 className="text-xl font-bold mb-4 text-shadow px-2 flex items-center" style={{color: 'var(--text-primary)'}}>
                    <span className="mr-2">🎒</span> กระเป๋าของสะสม
                </h4>
                {Object.keys(inventory).length === 0 ? (
                    <div className="glass-card p-6 rounded-xl text-center text-gray-500">
                        ยังไม่มีไอเท็ม (เข้าเรียนเพื่อรับของรางวัล)
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {Object.entries(inventory).map(([itemId, count]) => {
                            const item = GAME_ITEMS[itemId];
                            if (!item) return null;
                            return (
                                <div key={itemId} className="glass-card p-3 rounded-xl flex flex-col items-center text-center relative group hover:bg-white/20 transition-colors">
                                    <div className="text-3xl mb-1 transform group-hover:scale-110 transition-transform">{item.icon}</div>
                                    <span className="text-xs font-bold truncate w-full" style={{color: 'var(--text-primary)'}}>{item.name}</span>
                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                        {count}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Crafting Section */}
            <div>
                <h4 className="text-xl font-bold mb-4 text-shadow px-2 flex items-center" style={{color: 'var(--text-primary)'}}>
                    <span className="mr-2">⚒️</span> ผสมของ (Crafting)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CRAFTING_RECIPES.map(recipe => {
                        const resultItem = GAME_ITEMS[recipe.resultItemId];
                        const canCraft = recipe.ingredients.every(ing => (inventory[ing.itemId] || 0) >= ing.count);
                        
                        return (
                            <div key={recipe.id} className={`glass-card p-4 rounded-xl flex items-center justify-between ${canCraft ? 'border-2 border-green-400/50' : 'opacity-80'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-black/5 flex items-center justify-center text-2xl">
                                        {resultItem.icon}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-sm" style={{color: 'var(--text-primary)'}}>{resultItem.name}</h5>
                                        <div className="flex gap-1 mt-1 text-xs text-gray-500">
                                            {recipe.ingredients.map(ing => {
                                                const has = inventory[ing.itemId] || 0;
                                                const ingItem = GAME_ITEMS[ing.itemId];
                                                const isEnough = has >= ing.count;
                                                return (
                                                    <span key={ing.itemId} className={isEnough ? 'text-green-600' : 'text-red-500'}>
                                                        {ingItem.icon} {has}/{ing.count}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onCraft(recipe.id)}
                                    disabled={!canCraft}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        canCraft 
                                        ? 'bg-green-500 text-white hover:scale-105 shadow-md' 
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Craft
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Badges Grid */}
            <div>
                <h4 className="text-xl font-bold mb-4 text-shadow px-2" style={{color: 'var(--text-primary)'}}>เหรียญตราความสำเร็จ ({badges.filter(b => b.isUnlocked).length}/{badges.length})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {badges.map(badge => (
                        <div 
                            key={badge.id} 
                            className={`glass-card p-4 rounded-xl flex flex-col items-center text-center transition-all duration-300 ${badge.isUnlocked ? 'border-2 border-yellow-400/50 shadow-lg bg-gradient-to-b from-white/20 to-yellow-100/10' : 'opacity-60 grayscale'}`}
                        >
                            <div className={`text-4xl mb-3 filter ${badge.isUnlocked ? 'drop-shadow-md scale-110' : 'grayscale blur-[1px]'}`}>
                                {badge.icon}
                            </div>
                            <h5 className={`font-bold text-sm mb-1 ${badge.isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>{badge.name}</h5>
                            <p className="text-xs text-gray-500 line-clamp-2">{badge.description}</p>
                            {badge.isUnlocked && <div className="mt-2 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Unlocked</div>}
                            {!badge.isUnlocked && <div className="mt-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Locked</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ studentId, onLogout, initialStudentData }) => {
  const [studentData, setStudentData] = useState<StudentWithId | null>(initialStudentData || null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [courseData, setCourseData] = useState<Record<string, CourseData>>({});
  const [tournaments, setTournaments] = useState<TournamentWithId[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(!initialStudentData);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [showIdCard, setShowIdCard] = useState(false);
  const [showLootModal, setShowLootModal] = useState(false);
  const [newDrops, setNewDrops] = useState<string[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  // Gamification State
  const [gamificationStats, setGamificationStats] = useState<UserGamificationStats | null>(null);
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
  const [courseCatalog, setCourseCatalog] = useState<any[]>([]);
  
  const notification = useNotification();
  const isAdminView = !!initialStudentData; // Flag to check if viewed by admin

  const refreshTournaments = useCallback(async () => {
      try {
        const tournamentResponse = await getTournamentsForStudent(studentId);
        if (tournamentResponse.success && tournamentResponse.data) {
            setTournaments(tournamentResponse.data);
        }
      } catch (err) {
          console.error("Failed to refresh tournaments", err);
      }
  }, [studentId]);

  useEffect(() => {
    const fetchAllData = async () => {
        // Only show loading if we don't have initial data
        if (!initialStudentData) setIsLoading(true);
        setError(null);
        try {
            // Fetch SystemConfig first to set initial term/year if not set
            if (!selectedTerm || !selectedYear) {
                const [configRes, coursesRes] = await Promise.all([
                    getSystemConfig(),
                    getCourseCatalog()
                ]);
                if (configRes.success && configRes.data) {
                    const term = configRes.data.term || '2';
                    const year = configRes.data.year || '2568';
                    setSelectedTerm(term);
                    setSelectedYear(year);
                    setGlobalTermYear(term, year);
                    setSystemConfig(configRes.data);
                }
                if (coursesRes.success && coursesRes.data) {
                    setCourseCatalog(coursesRes.data);
                }
            } else {
                 setGlobalTermYear(selectedTerm, selectedYear);
                 const coursesRes = await getCourseCatalog();
                 if (coursesRes.success && coursesRes.data) {
                     setCourseCatalog(coursesRes.data);
                 }
            }

            let currentStudent = studentData;

            // 1. Fetch Student Profile (if not provided initially)
            if (!currentStudent) {
                const studentResponse = await getStudentByStudentId(studentId);
                if (!studentResponse.success || !studentResponse.data) {
                    throw new Error(studentResponse.message || "Could not find your data.");
                }
                currentStudent = studentResponse.data;
                // @ts-ignore - Legacy check
                if (currentStudent.course && (!currentStudent.courses || currentStudent.courses.length === 0)) {
                    // @ts-ignore
                    currentStudent.courses = [currentStudent.course];
                }
                setStudentData(currentStudent);
            } else {
                 // Ensure courses array exists even if provided via props (legacy data safety)
                 // @ts-ignore
                 if (currentStudent.course && (!currentStudent.courses || currentStudent.courses.length === 0)) {
                    // @ts-ignore
                    currentStudent = { ...currentStudent, courses: [currentStudent.course] };
                    setStudentData(currentStudent);
                }
            }
            
            setCurrentView('dashboard');

            // 2. Load related data (Tournaments, Attendance, Scores, SystemConfig)
            let fetchedAttendance: AttendanceRecord[] = [];
            let fetchedTournaments: TournamentWithId[] = [];

            await Promise.all([
                getTournamentsForStudent(studentId).then(res => {
                    if (res.success && res.data) fetchedTournaments = res.data;
                }),
                getAttendanceForStudent(studentId).then(res => {
                    if (res.success && res.data) fetchedAttendance = res.data;
                })
            ]);
            
            setTournaments(fetchedTournaments);
            setAttendance(fetchedAttendance);

            const courseDataMap: Record<string, CourseData> = {};
            if (currentStudent && currentStudent.courses && currentStudent.courses.length > 0) {
                // Fetch course data in parallel
                await Promise.all(currentStudent.courses.map(async (courseName) => {
                    const [scoresRes, configRes] = await Promise.all([
                        getScoresForStudent(currentStudent!.studentId, courseName),
                        getCourseGradingConfig(courseName)
                    ]);
                    courseDataMap[courseName] = {
                        scores: (scoresRes.success && scoresRes.data) ? scoresRes.data : null,
                        config: (configRes.success && configRes.data) ? configRes.data : null,
                    };
                }));
                setCourseData(courseDataMap);
            }

            // 3. Calculate Gamification Stats & Quests
            if (currentStudent) {
                const stats = calculateGamificationStats(currentStudent, fetchedAttendance, fetchedTournaments, courseDataMap);
                setGamificationStats(stats);
                setDailyQuests(getDailyQuests(currentStudent, fetchedAttendance));

                // 4. Check for Drop Logic (Only if not admin preview)
                if (!isAdminView) {
                    // Count "Present" or "Late" as attending for drop logic
                    const actualPresentCount = fetchedAttendance.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
                    
                    const lastClaimed = currentStudent.lastClaimedAttendanceCount || 0;
                    
                    if (actualPresentCount > lastClaimed) {
                        const dropsToGive = actualPresentCount - lastClaimed;
                        const drops: string[] = [];
                        const newInventory = { ...(currentStudent.inventory || {}) };

                        for (let i = 0; i < dropsToGive; i++) {
                            const drop = getRandomDrop();
                            drops.push(drop);
                            newInventory[drop] = (newInventory[drop] || 0) + 1;
                        }

                        // Update student data locally and remotely
                        const updatedStudent = {
                            ...currentStudent,
                            inventory: newInventory,
                            lastClaimedAttendanceCount: actualPresentCount
                        };
                        setStudentData(updatedStudent);
                        setNewDrops(drops);
                        setShowLootModal(true);

                        // Persist to Firestore (Silent update)
                        // Use catch to prevent crashing if permissions are missing
                        updateStudent(updatedStudent).catch(err => console.error("Failed to save drop:", err));
                    }
                }
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    fetchAllData();
  }, [studentId, initialStudentData, selectedTerm, selectedYear]); // Removed refreshTournaments from deps to avoid loop
  
  const handleProfileUpdate = (url: string) => {
      if (studentData) {
          setStudentData({ ...studentData, photoUrl: url });
      }
  };

  const handleCraft = async (recipeId: string) => {
      if (!studentData) return;
      
      const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return;

      const inventory = { ...(studentData.inventory || {}) };
      
      // Check resources
      const canCraft = recipe.ingredients.every(ing => (inventory[ing.itemId] || 0) >= ing.count);
      if (!canCraft) {
          notification.addToast({type: 'error', title: 'วัตถุดิบไม่พอ', message: 'คุณมีไอเท็มไม่ครบตามสูตร'});
          return;
      }

      // Deduct ingredients
      recipe.ingredients.forEach(ing => {
          inventory[ing.itemId] -= ing.count;
          if (inventory[ing.itemId] <= 0) delete inventory[ing.itemId];
      });

      // Add Result
      inventory[recipe.resultItemId] = (inventory[recipe.resultItemId] || 0) + 1;

      // Update State & DB
      const updatedStudent = { ...studentData, inventory };
      setStudentData(updatedStudent);
      
      const res = await updateStudent(updatedStudent);
      if (res.success) {
          notification.addToast({
              type: 'success', 
              title: 'ผสมสำเร็จ!', 
              message: `ได้รับ ${GAME_ITEMS[recipe.resultItemId].name}`
          });
          // Re-calculate badges and quests
          if (gamificationStats) {
             const updatedStats = calculateGamificationStats(updatedStudent, attendance, tournaments, courseData);
             setGamificationStats(updatedStats);
             setDailyQuests(getDailyQuests(updatedStudent, attendance));
          }
      } else {
          notification.addToast({type:'error', title:'เกิดข้อผิดพลาด', message: 'บันทึกข้อมูลไม่สำเร็จ'});
      }
  };
  
  const handleChangeTheme = async (themeId: string) => {
      if (!studentData) return;
      
      const updatedStudent = { ...studentData, activeTheme: themeId };
      setStudentData(updatedStudent);
      
      const res = await updateStudent(updatedStudent);
      if (res.success) {
          notification.addToast({ type: 'success', title: 'เปลี่ยนธีมสำเร็จ' });
          // Re-calculate badges (Fashionista)
          if (gamificationStats) {
             const updatedStats = calculateGamificationStats(updatedStudent, attendance, tournaments, courseData);
             setGamificationStats(updatedStats);
          }
      } else {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
      }
  };
  
  const renderDashboard = () => {
    if (!studentData) return null;
    
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Weather Widget and Quest Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WeatherWidget className="lg:col-span-1 h-full min-h-[130px]" />
                <div className="lg:col-span-2">
                    <QuestWidget quests={dailyQuests} />
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StudentAnnouncementsView student={studentData} summaryMode={true} onViewAll={() => setCurrentView('announcements')} />

                {/* Course Grades */}
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-4" style={{color: 'var(--text-primary)'}}>ภาพรวมเกรด</h3>
                    <div className="space-y-4">
                        {(studentData.courses || []).map(course => {
                             const data = courseData[course];
                             if (!data) return null;
                             const totalScore = calculateTotal(data.scores?.scores, data.config);
                             const grade = calculateGrade(totalScore);
                             return (
                                <button key={course} onClick={() => setCurrentView(`course:${course}`)} className="w-full text-left p-4 rounded-lg hover:bg-black/10 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                                            {courseCatalog.find(c => c.name === course)?.code ? `${courseCatalog.find(c => c.name === course)?.code} ` : (systemConfig?.courseCodes?.[course as Course] ? `${systemConfig.courseCodes[course as Course]} ` : '')}{course}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>คะแนน: <span className="font-bold" style={{color: 'rgb(var(--accent-color))'}}>{totalScore.toFixed(0)}</span></p>
                                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>เกรด: <span className="font-bold" style={{color: 'rgb(var(--text-success-rgb))'}}>{grade.toFixed(1)}</span></p>
                                        </div>
                                    </div>
                                </button>
                             )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
  };
  
  const renderContent = () => {
    if (currentView === 'dashboard') {
        return renderDashboard();
    }
    if (currentView === 'achievements') {
        if (!gamificationStats || !studentData) return null;
        return <AchievementsView gamification={gamificationStats} student={studentData} onCraft={handleCraft} />;
    }
    if (currentView === 'game') {
        if (!studentData) return null;
        return <GameHub student={studentData} onUpdateStudent={setStudentData} />;
    }
    if (currentView === 'marketplace') {
        if (!studentData) return null;
        return <Marketplace student={studentData} onUpdateStudent={setStudentData} />;
    }
    if (currentView === 'announcements') {
        if (!studentData) return null;
        return <StudentAnnouncementsView student={studentData} />;
    }
    if (currentView === 'attendance') {
        return <StudentAttendanceView attendanceRecords={attendance} />;
    }
    if (currentView === 'tournaments') {
        return <StudentTournamentView studentId={studentId} tournaments={tournaments} onRefresh={refreshTournaments} />;
    }
    if (currentView.startsWith('course:')) {
        const courseName = currentView.split(':')[1];
        const dataForCourse = courseData[courseName];
        if (dataForCourse) {
            return <StudentCourseView courseData={dataForCourse} courseName={courseName as Course} />;
        }
    }
    return <div className="text-center p-8" style={{color: 'var(--text-muted)'}}>กำลังโหลดข้อมูล...</div>;
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="text-center bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg relative" role="alert"><strong className="font-bold">An Error Occurred: </strong><span className="block sm:inline">{error}</span></div>;
  if (!studentData) return <div className="text-center" style={{color: 'var(--text-muted)'}}>Could not load student data.</div>;

  // Name handling for dynamic sizing
  const fullName = `${studentData.prefix}${studentData.firstName} ${studentData.lastName}`;
  const nameLength = fullName.length;
  // Font size logic: smaller font for longer names (Mobile Optimized)
  const nameSizeClass = nameLength > 25 ? 'text-lg sm:text-3xl' : nameLength > 15 ? 'text-xl sm:text-4xl' : 'text-2xl sm:text-5xl';

  const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
      { id: 'achievements', label: 'ความสำเร็จ', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> },
      { id: 'game', label: 'มินิเกม', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0 1 1 0 002 0zm-2 2a1 1 0 100-2 1 1 0 000 2zm3 1a1 1 0 100-2 1 1 0 000 2zm-1 3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> },
      { id: 'marketplace', label: 'ตลาดซื้อขาย', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg> },
      { id: 'announcements', label: 'ประกาศ', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L4 6.424V12a1 1 0 001 1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l3.553-2.091A1 1 0 0018 3z" clipRule="evenodd" /></svg> },
      { id: 'attendance', label: 'การเข้าเรียน', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clipRule="evenodd" /></svg> },
  ];
  if (tournaments.length > 0) {
      navItems.push({ id: 'tournaments', label: 'ทัวร์นาเมนต์', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-2.293 2.293a1 1 0 000 1.414L15.586 13H13a1 1 0 100 2h4a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-4.293-4.293A1 1 0 0012.586 4H11V3z" /><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h3a1 1 0 001-1v-2a1 1 0 00-1-1H6V6h2a1 1 0 001-1V4a1 1 0 00-1-1H5z" /></svg> });
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in flex flex-col min-h-[calc(100vh-10rem)]">
        <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-sm">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>เทอม:</label>
                <select 
                    value={selectedTerm} 
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="input-field py-1 px-2 text-sm bg-white/50"
                >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3 (ฤดูร้อน)</option>
                </select>
                <label className="text-sm font-medium ml-2" style={{ color: 'var(--text-secondary)' }}>ปีการศึกษา:</label>
                <input 
                    type="text" 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="input-field py-1 px-2 text-sm w-20 bg-white/50"
                    placeholder="2568"
                />
            </div>
        </div>
        {isAdminView && (
            <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Viewing as Student (Admin Mode)
            </div>
        )}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-between gap-4 pb-6 text-center sm:text-left">
            <div className="flex-shrink-0 mx-auto sm:mx-0 relative">
                <ProfileImageUpload 
                    studentId={studentData.studentId} 
                    currentUrl={studentData.photoUrl}
                    onUploadSuccess={handleProfileUpdate} 
                    readOnly={isAdminView}
                />
            </div>
            <div className="flex-grow w-full overflow-hidden">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-semibold text-shadow" style={{ color: 'var(--text-secondary)' }}>
                        ข้อมูลการเรียน
                    </h1>
                    {/* Level Badge Moved Here */}
                    {gamificationStats && (
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/20 animate-pulse-fast">
                            LV. {gamificationStats.level}
                        </span>
                    )}
                    {/* Coin Display */}
                    <div className="flex items-center bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-500/30">
                        <span className="text-lg mr-1">🪙</span>
                        <span className="text-yellow-400 font-bold text-sm sm:text-base">{studentData.coins || 0}</span>
                    </div>
                </div>
                <h2 className={`${nameSizeClass} font-bold text-shadow mt-1 whitespace-nowrap overflow-x-auto no-scrollbar pb-1`} style={{ fontFamily: "'Prompt', sans-serif", color: 'var(--text-primary)' }}>
                  {fullName}
                </h2>
                <p className="text-md mt-2" style={{ color: 'var(--text-muted)', fontFamily: "'Prompt', sans-serif" }}>
                    {studentData.studentId} | {studentData.department} | {studentData.classLevel}
                </p>
            </div>
            <div className="flex-shrink-0 mt-4 sm:mt-0">
                <button 
                    onClick={() => setShowIdCard(true)}
                    className="group flex flex-col items-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <span className="text-xs font-bold">Digital ID Card</span>
                </button>
            </div>
        </div>
        
        <div className="glass-card p-2 rounded-xl mb-6 overflow-x-auto custom-scrollbar">
            <nav className="flex flex-nowrap gap-2 min-w-max" aria-label="Tabs">
                {navItems.map(item => (
                    <NavButton key={item.id} {...item} isActive={currentView === item.id} onClick={() => setCurrentView(item.id)} />
                ))}
            </nav>
        </div>
        
        <div className="flex-grow">
            {renderContent()}
        </div>

        {onLogout && (
            <div className="mt-12 text-center">
                <button 
                onClick={onLogout} 
                className="btn-logout font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap"
                >
                    {isAdminView ? 'ปิดหน้าต่าง' : 'ออกจากระบบ'}
                </button>
            </div>
        )}

        <Modal isOpen={showIdCard} onClose={() => setShowIdCard(false)} title="" size="md">
            <DigitalIdCard 
                student={studentData} 
                gamification={gamificationStats} 
                onCustomize={!isAdminView ? () => { setShowIdCard(false); setShowThemeModal(true); } : undefined}
                onExpandQr={() => setShowQrModal(true)}
            />
        </Modal>

        {/* Expanded QR Modal */}
        <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="QR Code สำหรับสแกน" size="sm">
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${studentData.studentId}`} 
                    alt="Expanded QR Code" 
                    className="w-64 h-64 object-contain mb-4" 
                />
                <p className="text-2xl font-bold text-gray-800 tracking-wider font-mono">{studentData.studentId}</p>
                <p className="text-gray-600 mt-1">{studentData.prefix}{studentData.firstName} {studentData.lastName}</p>
            </div>
        </Modal>

        {/* Theme Selection Modal */}
        <Modal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} title="ปรับแต่งบัตรประจำตัว">
            <div className="p-2">
                <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                    เลือกธีมบัตรที่คุณชอบ (ปลดล็อกด้วยไอเท็ม)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.values(CARD_THEMES).map(theme => {
                        const isUnlocked = theme.id === 'default' || (studentData.inventory && studentData.inventory[theme.requiredItemId!] > 0);
                        const isActive = (studentData.activeTheme || 'default') === theme.id;
                        const requiredItemName = theme.requiredItemId ? GAME_ITEMS[theme.requiredItemId]?.name : '';

                        return (
                            <button
                                key={theme.id}
                                onClick={() => { if(isUnlocked) handleChangeTheme(theme.id); }}
                                disabled={!isUnlocked}
                                className={`relative rounded-xl p-4 text-left transition-all border-2 overflow-hidden group ${
                                    isActive ? 'border-accent ring-2 ring-accent/30' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: 'var(--input-bg)' }}
                            >
                                <div className={`h-24 w-full rounded-lg mb-3 shadow-inner ${theme.styleClass} opacity-80`}></div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-sm" style={{color: 'var(--text-primary)'}}>{theme.name}</h4>
                                        <p className="text-xs opacity-70" style={{color: 'var(--text-secondary)'}}>{theme.description}</p>
                                    </div>
                                    {isActive && <span className="text-green-500 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">ใช้อยู่</span>}
                                </div>
                                
                                {!isUnlocked && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                                        <div className="text-center text-white p-2">
                                            <p className="text-xs font-bold">Locked 🔒</p>
                                            <p className="text-[10px]">ต้องมี: {requiredItemName}</p>
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={() => setShowThemeModal(false)} className="btn-accent px-4 py-2 rounded-lg text-sm font-bold">ปิด</button>
                </div>
            </div>
        </Modal>

        {/* Loot Box Modal */}
        <Modal isOpen={showLootModal} onClose={() => setShowLootModal(false)} title="🎁 รางวัลเข้าเรียน!" size="sm">
            <div className="text-center p-4">
                <p className="text-gray-600 mb-4">ยินดีด้วย! คุณได้รับไอเท็มจากการเข้าเรียน</p>
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                    {newDrops.map((itemId, index) => {
                        const item = GAME_ITEMS[itemId];
                        return (
                            <div key={index} className="animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                                <div className="text-5xl mb-2">{item?.icon}</div>
                                <div className="text-sm font-bold" style={{color: 'var(--text-primary)'}}>{item?.name}</div>
                            </div>
                        );
                    })}
                </div>
                <button 
                    onClick={() => setShowLootModal(false)}
                    className="btn-accent w-full py-2 rounded-lg font-bold shadow-md"
                >
                    เก็บใส่กระเป๋า
                </button>
            </div>
        </Modal>
    </div>
  );
};

export default StudentDashboardPage;
