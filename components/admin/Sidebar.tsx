
import React from 'react';
import { SRTC_LOGO_URL } from '../../constants';
import { Course } from '../../types';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  courses: Course[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isDanger?: boolean;
}> = ({ icon, label, isActive, onClick, isDanger = false }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
            isActive
                ? 'shadow-lg'
                : isDanger
                ? 'hover:bg-red-500/20'
                : 'hover:bg-white/10'
        }`}
        style={{ 
            backgroundColor: isActive ? 'rgb(var(--accent-color))' : 'transparent',
            color: isActive ? '#ffffff' : isDanger ? 'rgb(var(--text-danger-rgb))' : 'var(--text-secondary)' 
        }}
    >
        <span 
            className={isActive ? '' : 'group-hover:scale-110 transition-transform'} 
            style={!isActive && !isDanger ? { color: 'rgba(var(--accent-color), 1)' } : { color: 'currentColor' }}
        >
            {icon}
        </span>
        <span className="ml-3 truncate" title={label}>{label}</span>
    </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="px-4 mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider opacity-60" style={{color: 'var(--text-muted)'}}>
        {title}
    </h3>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, courses, isSidebarOpen, setIsSidebarOpen }) => {
    
    const handleNavigation = (view: string) => {
        setActiveView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 glass-card m-4 rounded-2xl p-4 flex flex-col transition-transform duration-300 ease-in-out md:relative md:m-4 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'}`}>
            <div className="flex items-center justify-between px-2 mb-4">
                <div className="flex items-center space-x-3">
                    <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-10 w-10 object-contain bg-white/20 rounded-full p-1" />
                    <span className="text-lg font-semibold text-shadow" style={{color: 'var(--text-primary)'}}>SRTC Admin</span>
                </div>
                <button className="p-1 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                
                <SectionHeader title="ACADEMIC (การเรียนการสอน)" />
                <NavLink 
                    label="ภาพรวม (Overview)" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} 
                    isActive={activeView === 'overview'} 
                    onClick={() => handleNavigation('overview')} 
                />
                <NavLink 
                    label="จัดการนักศึกษา" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} 
                    isActive={activeView === 'students'} 
                    onClick={() => handleNavigation('students')} 
                />
                <NavLink 
                    label="จัดการรายวิชา" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 8.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 8.56z" /><path d="M3.31 11.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 11.56z" /></svg>} 
                    isActive={activeView === 'courses'} 
                    onClick={() => handleNavigation('courses')} 
                />
                <NavLink 
                    label="จัดการตารางสอน" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} 
                    isActive={activeView === 'schedules'} 
                    onClick={() => handleNavigation('schedules')} 
                />

                <SectionHeader title="ACTIVITIES (กิจกรรม)" />
                <NavLink 
                    label="จัดการกิจกรรม" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} 
                    isActive={activeView === 'activities'} 
                    onClick={() => handleNavigation('activities')} 
                />

                <SectionHeader title="COMMUNITY & CONTENT" />
                <NavLink 
                    label="ข่าวสาร / ประกาศ" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>} 
                    isActive={activeView === 'announcements'} 
                    onClick={() => handleNavigation('announcements')} 
                />
                <NavLink 
                    label="จัดการผลงานและสื่อ" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>} 
                    isActive={activeView === 'mediaAndPortfolio'} 
                    onClick={() => handleNavigation('mediaAndPortfolio')} 
                />
                <NavLink 
                    label="เกม & ร้านค้า (Game Center)" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>} 
                    isActive={activeView === 'games'} 
                    onClick={() => handleNavigation('games')} 
                />

                <SectionHeader title="SYSTEM" />
                <NavLink 
                    label="ตั้งค่าระบบ (Settings)" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>} 
                    isActive={activeView === 'settings'} 
                    onClick={() => handleNavigation('settings')} 
                />
            </nav>

            <div className="pt-4 border-t mt-4" style={{borderColor: 'var(--glass-border)'}}>
                <NavLink 
                    label="ออกจากระบบ" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>} 
                    isActive={false} 
                    onClick={onLogout} 
                    isDanger={true}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
