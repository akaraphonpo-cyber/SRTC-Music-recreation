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
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
            isActive
                ? 'btn-accent text-white shadow-lg'
                : 'hover:bg-white/10'
        }`}
        style={{ color: isActive ? 'var(--text-inverted)' : 'var(--text-secondary)' }}
    >
        <span className={isActive ? '' : 'group-hover:scale-110 transition-transform'}>{icon}</span>
        <span className="ml-3 truncate" title={label}>{label}</span>
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, courses, isSidebarOpen, setIsSidebarOpen }) => {
    const navItems: { id: string; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'ภาพรวม', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
        { id: 'students', label: 'จัดการนักศึกษา', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
        { id: 'attendance', label: 'เช็กชื่อ', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
        { id: 'grading', label: 'ระบบคะแนน', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> },
        { id: 'announcements', label: 'ประกาศ', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L4 6.424V12a1 1 0 001 1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l3.553-2.091A1 1 0 0018 3z" clipRule="evenodd" /></svg> },
        { id: 'summary', label: 'สรุปรายภาค', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg> },
    ];

    const handleNavigation = (view: string) => {
        setActiveView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 glass-card m-4 rounded-2xl p-4 flex flex-col transition-transform duration-300 ease-in-out md:relative md:m-4 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'}`}>
            <div className="flex items-center justify-between px-2 mb-6">
                <div className="flex items-center space-x-3">
                    <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-10 w-10 object-contain bg-white/20 rounded-full p-1" />
                    <span className="text-lg font-semibold text-shadow" style={{color: 'var(--text-primary)'}}>SRTC Admin</span>
                </div>
                <button className="p-1 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto pr-2 -mr-2">
              {navItems.map(item => (
                <NavLink 
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    isActive={activeView === item.id}
                    onClick={() => handleNavigation(item.id)}
                />
              ))}

               {courses.length > 0 && (
                <div className="pt-4 mt-4 border-t border-white/10">
                  <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider" style={{color: 'var(--text-muted)'}}>
                    รายวิชา
                  </h3>
                  <div className="space-y-1">
                    {courses.map(course => (
                      <NavLink
                        key={course}
                        label={course}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0114.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" /></svg>}
                        isActive={activeView === `course:${course}`}
                        onClick={() => handleNavigation(`course:${course}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </nav>
            <div className="mt-auto">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg btn-logout transition-colors duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-3">ออกจากระบบ</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;