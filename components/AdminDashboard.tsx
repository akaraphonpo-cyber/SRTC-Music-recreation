import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentWithId, RegistrationStatus, Course } from '../types';
import { getStudents, getRegistrationStatus, setRegistrationStatus } from '../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';

import Sidebar from './admin/Sidebar';
import Overview from './admin/Overview';
import StudentsManagement from './admin/StudentsManagement';
import Placeholder from './admin/Placeholder';
import CourseStudentList from './admin/CourseStudentList';
import GradingSystem from './admin/GradingSystem';
import GradingConfig from './admin/GradingConfig';
import { SRTC_LOGO_URL } from '../../constants';

interface AdminDashboardProps {
  onLogout: () => void;
}

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regStatus, setRegStatus] = useState<'LOADING' | RegistrationStatus>('LOADING');
  const [activeView, setActiveView] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State for managing grading sub-views
  const [gradingView, setGradingView] = useState<'scores' | 'config'>('scores');
  const [courseForConfig, setCourseForConfig] = useState<Course | null>(null);

  const fetchStudentsData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const response = await getStudents();
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        console.error('Failed to fetch students:', response.message);
        setStudents([]); 
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      Swal.fire({
          title: 'Error', 
          text: `Could not load student data: ${error.message}`, 
          icon: 'error',
          customClass: swalCustomClass
      });
      setStudents([]);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

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
  }, [fetchStudentsData, fetchRegistrationStatus]);

  const uniqueCourses = useMemo(() => {
    const courses = new Set<Course>();
    students.forEach(student => {
        if (student.course) {
            courses.add(student.course);
        }
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
            Swal.fire({
                icon: 'success',
                title: `Registration is now ${newStatus === 'OPEN' ? 'OPEN' : 'CLOSED'}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500,
                timerProgressBar: true,
                customClass: { popup: 'glass-card' }
            });
        } else {
            throw new Error(response.message || 'Failed to update status.');
        }
    } catch (error: any) {
        setRegStatus(originalStatus); // revert on error
        Swal.fire({
            title: 'Error', 
            text: error.message || 'Could not update registration status.', 
            icon: 'error',
            customClass: swalCustomClass
        });
    }
  };
  
  const handleSetActiveView = (view: string) => {
    // Reset grading sub-view when navigating away from the grading section
    if (activeView === 'grading' && view !== 'grading') {
      setGradingView('scores');
      setCourseForConfig(null);
    }
    setActiveView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile navigation
  };
  
  const handleConfigureCourse = (courseName: Course) => {
    setCourseForConfig(courseName);
    setGradingView('config');
  };

  const handleBackToScores = () => {
    setGradingView('scores');
    setCourseForConfig(null);
  };


  const renderContent = () => {
    if (activeView.startsWith('course:')) {
      const courseName = activeView.split(':')[1] as Course;
      const filteredStudents = students.filter(s => s.course === courseName);
      return <CourseStudentList courseName={courseName} students={filteredStudents} />;
    }

    switch(activeView) {
      case 'overview':
        return <Overview students={students} />;
      case 'students':
        return <StudentsManagement 
                  students={students} 
                  isLoading={isLoading} 
                  fetchStudentsData={fetchStudentsData}
                  regStatus={regStatus}
                  onStatusToggle={handleStatusToggle}
                />;
      case 'attendance':
        return <Placeholder title="เช็กชื่อออนไลน์ (Attendance System)" />;
      case 'grading':
        if (gradingView === 'config' && courseForConfig) {
          return <GradingConfig courseName={courseForConfig} onBack={handleBackToScores} />;
        }
        return <GradingSystem students={students} onConfigure={handleConfigureCourse} />;
      case 'announcements':
        return <Placeholder title="ประกาศ / ข่าวสาร (Announcements)" />;
      case 'summary':
        return <Placeholder title="สรุปรายภาค (Final Summary)" />;
      default:
        return <Overview students={students} />;
    }
  };

  return (
    <div className="relative flex h-screen bg-transparent font-sans">
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
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;