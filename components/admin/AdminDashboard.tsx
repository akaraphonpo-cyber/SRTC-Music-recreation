
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentWithId, RegistrationStatus, Course } from '../../types';
import { getAllStudents, getRegistrationStatus, setRegistrationStatus, checkForUnmigratedData, getSchedules, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

import Sidebar from './Sidebar';
import Overview from './Overview';
import StudentsManagement from './StudentsManagement';
import Placeholder from './Placeholder';
import Announcements from './Announcements';
import DataMigration from './DataMigration';
import SystemSettings from './SystemSettings';
import GameManagement from './GameManagement';
import CourseManagement from './CourseManagement';
import ScheduleManagement from './ScheduleManagement';
import ActivityManagement from './ActivityManagement';
import MediaAndPortfolioManagement from './MediaAndPortfolioManagement';
import { SRTC_LOGO_URL } from '../../constants';
import { Schedule, SystemConfig } from '../../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

const CACHE_KEY = 'srtc_admin_students_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [regStatus, setRegStatus] = useState<'LOADING' | RegistrationStatus>('LOADING');
  const [activeView, setActiveView] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const notification = useNotification();

  // State for student management pagination
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);

  const fetchStudentsData = useCallback(async (forceRefresh = false) => {
    // Only show loading spinner if we don't have data or we are forcing a refresh
    if (forceRefresh || students.length === 0) {
        setIsLoading(true);
    }
    
    try {
        // 1. Check Cache if not forcing refresh
        if (!forceRefresh) {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                        setStudents(parsed.data);
                        setStudentCurrentPage(1);
                        
                        // Even if we have students, we still need schedules and config
                        const [schedulesRes, configRes] = await Promise.all([
                            getSchedules(),
                            getSystemConfig()
                        ]);

                        if (schedulesRes.success && schedulesRes.data) {
                            setAvailableSchedules(schedulesRes.data);
                        }

                        if (configRes.success && configRes.data) {
                            setSystemConfig(configRes.data);
                        }

                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Error parsing cache", e);
                }
            }
        }

        // 2. Fetch from Network
        const [studentsRes, schedulesRes, configRes] = await Promise.all([
            getAllStudents(),
            getSchedules(),
            getSystemConfig()
        ]);

        if (studentsRes.success && studentsRes.data) {
            setStudents(studentsRes.data);
            setStudentCurrentPage(1); // Reset page on every data refresh
            
            // 3. Save to Cache
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: studentsRes.data
                }));
            } catch (e) {
                console.warn("Failed to save to session storage", e);
            }
        } else {
            throw new Error(studentsRes.message || "Failed to fetch students.");
        }

        if (schedulesRes.success && schedulesRes.data) {
            setAvailableSchedules(schedulesRes.data);
        }

        if (configRes.success && configRes.data) {
            setSystemConfig(configRes.data);
        }
    } catch (error: any) {
        console.error("Fetch error:", error);
        notification.addToast({
            type: 'error',
            title: 'Error Loading Data',
            message: `Could not load student data: ${error.message}`,
        });
        setStudents([]); // Ensure students array is empty on error
    } finally {
        setIsLoading(false);
    }
  }, [notification]); // removed students from dependency to prevent stale closure issues

  const fetchRegistrationStatus = useCallback(async () => {
    try {
        const response = await getRegistrationStatus();
        if (response.success && response.data?.status) {
            setRegStatus(response.data.status);
        } else {
            setRegStatus('CLOSED'); 
            console.error('Could not fetch registration status. Defaulting to CLOSED.');
        }
    } catch (error: any) {
        setRegStatus('CLOSED');
        console.error(`Could not fetch registration status: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchStudentsData();
    fetchRegistrationStatus();
    
    const checkMigrationStatus = async () => {
        const response = await checkForUnmigratedData();
        if (response.success && response.data?.needsMigration) {
            setNeedsMigration(true);
        }
    };
    checkMigrationStatus();

  }, [fetchStudentsData, fetchRegistrationStatus]);

  const uniqueCourses = useMemo(() => {
    const courses = new Set<Course>();
    students.forEach(student => {
        // FIX: Correctly gather unique courses from both new `courses` array and legacy `course` property.
        const studentCourses: Course[] = (student.courses && Array.isArray(student.courses))
            ? student.courses
            : ((student as any).course ? [(student as any).course] : []);
        studentCourses.forEach(course => courses.add(course));
    });
    return Array.from(courses).sort();
  }, [students]);

  const handleStatusToggle = async () => {
    if (regStatus === 'LOADING') return;
    const newStatus: RegistrationStatus = regStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const originalStatus = regStatus;
    setRegStatus('LOADING'); 

    try {
        const response = await setRegistrationStatus(newStatus);
        if (response.success) {
            setRegStatus(newStatus);
            notification.addToast({
                type: 'success',
                title: `Registration is now ${newStatus === 'OPEN' ? 'OPEN' : 'CLOSED'}`,
            });
        } else {
            throw new Error(response.message || 'Failed to update status.');
        }
    } catch (error: any) {
        setRegStatus(originalStatus); // revert on error
        notification.addToast({
            type: 'error',
            title: 'Error', 
            message: error.message || 'Could not update registration status.', 
        });
    }
  };
  
  const handleSetActiveView = (view: string) => {
    setActiveView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile navigation
  };

  // --- Optimistic UI Updates ---
  const updateCache = useCallback((data: StudentWithId[]) => {
     try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (e) {
        console.warn("Failed to update cache", e);
    }
  }, []);

  const handleStudentAdded = (newStudent: StudentWithId) => {
      // Add new student to top of list
      const updated = [newStudent, ...students];
      setStudents(updated);
      updateCache(updated);
  };

  const handleStudentUpdated = (updatedStudent: StudentWithId) => {
      const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updated);
      updateCache(updated);
  };

  const handleStudentDeleted = (id: string) => {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      updateCache(updated);
  };


  const renderContent = () => {
    switch(activeView) {
      case 'overview':
        return <Overview allStudents={students} />;
      case 'students':
        return <StudentsManagement 
                  students={students}
                  availableSchedules={availableSchedules}
                  systemConfig={systemConfig}
                  isLoading={isLoading}
                  onDataChange={() => fetchStudentsData(true)} 
                  onStudentAdded={handleStudentAdded}
                  onStudentUpdated={handleStudentUpdated}
                  onStudentDeleted={handleStudentDeleted}
                  regStatus={regStatus}
                  onStatusToggle={handleStatusToggle}
                  currentPage={studentCurrentPage}
                  setCurrentPage={setStudentCurrentPage}
                />;
      case 'courses':
        return <CourseManagement 
                  students={students} 
                  availableSchedules={availableSchedules} 
                  selectedTerm={systemConfig?.term}
                  selectedYear={systemConfig?.year}
                />;
      case 'schedules':
        return <ScheduleManagement 
                  availableSchedules={availableSchedules}
                  onDataChange={() => fetchStudentsData(true)}
                  selectedTerm={systemConfig?.term}
                  selectedYear={systemConfig?.year}
                />;
      case 'activities':
        return <ActivityManagement students={students} availableSchedules={availableSchedules} />;
      case 'mediaAndPortfolio':
        return <MediaAndPortfolioManagement />;
      case 'announcements':
        return <Announcements />;
      case 'settings':
        return <SystemSettings onDataChange={() => fetchStudentsData(true)} />;
      case 'games':
        return <GameManagement />;
      case 'summary':
        return <Placeholder title="สรุปรายภาค (Final Summary)" />;
      case 'migration': // Add case for the new view
        return <DataMigration onMigrationComplete={() => fetchStudentsData(true)} />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="relative flex h-screen bg-transparent">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <Sidebar 
        activeView={activeView} 
        setActiveView={handleSetActiveView} 
        onLogout={onLogout} 
        courses={uniqueCourses} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex md:hidden items-center justify-between p-4 m-4 mb-0 rounded-2xl glass-card">
          <button
              className="p-1"
              onClick={() => setIsSidebarOpen(true)}
              style={{ color: 'var(--text-primary)' }}
              aria-label="Open sidebar"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-10 w-10 object-contain bg-white/20 rounded-full p-1" />
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 sm:p-6">
          {needsMigration && (
            <div className="p-4 mb-6 rounded-2xl border-2 animate-pulse-fast" style={{ borderColor: 'rgba(var(--text-danger-rgb), 0.5)', backgroundColor: 'rgba(var(--text-danger-rgb), 0.1)' }}>
                <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" style={{ color: 'rgb(var(--text-danger-rgb))' }} viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <h3 className="font-bold" style={{ color: 'rgba(var(--text-danger-rgb), 1)' }}>คำเตือน: พบข้อมูลที่ต้องทำการย้าย (Migration)</h3>
                        <p className="text-sm mt-1" style={{ color: 'rgba(var(--text-danger-rgb), 0.9)' }}>นักศึกษาอาจไม่สามารถเข้าระบบได้จนกว่าจะทำการย้ายข้อมูล กรุณาไปที่หน้า "ย้ายข้อมูลนักศึกษา" เพื่อแก้ไข</p>
                    </div>
                </div>
                <div className="mt-3 text-right">
                    <button onClick={() => handleSetActiveView('migration')} className="text-sm font-semibold py-1.5 px-4 rounded-lg shadow-md hover:opacity-80" style={{ backgroundColor: 'rgb(var(--text-danger-rgb))', color: 'var(--text-inverted)' }}>
                        ไปที่หน้าย้ายข้อมูล
                    </button>
                </div>
            </div>
          )}
          {isLoading ? <div className="flex justify-center items-center h-full"><LoadingSpinner size="lg" /></div> : renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
