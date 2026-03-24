
import React, { useState } from 'react';
import { StudentWithId, Course } from '../../types';
import AttendanceManagement from './AttendanceManagement';
import GradingSystem from './GradingSystem';
import ScoreSummary from './ScoreSummary';
import TeacherSchedule from './TeacherSchedule';
import CourseStudentList from './CourseStudentList';
import GradingConfig from './GradingConfig';

interface SubjectManagementProps {
  students: StudentWithId[];
  courses: Course[];
  onDataChange?: () => void;
}

type SubjectView = 'schedule' | 'attendance' | 'grading' | 'summary' | 'courseList';

const SubjectManagement: React.FC<SubjectManagementProps> = ({ students, courses, onDataChange }) => {
  const [activeTab, setActiveTab] = useState<SubjectView>('schedule');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(courses.length > 0 ? courses[0] : null);
  const [gradingView, setGradingView] = useState<'scores' | 'config'>('scores');
  const [courseForConfig, setCourseForConfig] = useState<Course | null>(null);

  const handleConfigureCourse = (courseName: Course) => {
    setCourseForConfig(courseName);
    setGradingView('config');
  };

  const handleBackToScores = () => {
    setGradingView('scores');
    setCourseForConfig(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <TeacherSchedule />;
      case 'attendance':
        return <AttendanceManagement allStudents={students} />;
      case 'grading':
        if (gradingView === 'config' && courseForConfig) {
          return <GradingConfig courseName={courseForConfig} onBack={handleBackToScores} />;
        }
        return <GradingSystem students={students} onConfigure={handleConfigureCourse} />;
      case 'summary':
        return <ScoreSummary allStudents={students} />;
      case 'courseList':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>เลือกรายวิชา:</label>
              <select
                value={selectedCourse || ''}
                onChange={(e) => setSelectedCourse(e.target.value as Course)}
                className="px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2"
                style={{ color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
              >
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            {selectedCourse ? (
              <CourseStudentList 
                courseName={selectedCourse} 
                students={students.filter(s => {
                    const studentCourses: Course[] = (s.courses && Array.isArray(s.courses))
                        ? s.courses
                        : ((s as any).course ? [(s as any).course] : []);
                    return studentCourses.includes(selectedCourse);
                })} 
                allStudents={students} 
              />
            ) : (
              <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>กรุณาเลือกรายวิชา</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const tabs: { id: SubjectView; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'schedule', 
      label: 'ตารางสอน', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> 
    },
    { 
      id: 'attendance', 
      label: 'เช็คชื่อ', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clipRule="evenodd" /></svg> 
    },
    { 
      id: 'grading', 
      label: 'ระบบคะแนน', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> 
    },
    { 
      id: 'summary', 
      label: 'สรุปผลการเรียน', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg> 
    },
    { 
      id: 'courseList', 
      label: 'รายชื่อนักศึกษา', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg> 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-shadow" style={{ color: 'var(--text-primary)' }}>จัดการรายวิชา</h1>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto border-b no-scrollbar" style={{ borderColor: 'var(--glass-border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'grading') {
                    setGradingView('scores');
                    setCourseForConfig(null);
                }
              }}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-semibold transition-all duration-300 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent'
                  : 'border-transparent hover:bg-black/5'
              }`}
              style={{
                color: activeTab === tab.id ? 'rgb(var(--accent-color))' : 'var(--text-secondary)',
                borderColor: activeTab === tab.id ? 'rgb(var(--accent-color))' : 'transparent'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SubjectManagement;
