import React, { useState, useMemo } from 'react';
import { StudentWithId, Course } from '../../types';
import CourseStudentList from './CourseStudentList';
import AttendanceManagement from './AttendanceManagement';
import GradingSystem from './GradingSystem';
import GradingConfig from './GradingConfig';
import ScoreSummary from './ScoreSummary';
import TeacherSchedule from './TeacherSchedule';

interface CourseManagementProps {
  students: StudentWithId[];
  selectedTerm?: string;
  selectedYear?: string;
  availableSchedules?: any[];
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-all duration-300 border-b-2 whitespace-nowrap ${
      isActive
        ? 'border-accent'
        : 'border-transparent hover:bg-black/10'
    }`}
    style={{
      color: isActive ? 'rgb(var(--accent-color))' : 'rgba(var(--accent-color), 0.7)'
    }}
    role="tab"
    aria-selected={isActive}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const CourseManagement: React.FC<CourseManagementProps> = ({ students, selectedTerm, selectedYear, availableSchedules }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'grading' | 'scoreSummary' | 'teacherSchedule' | 'courseData'>('courseData');
  
  // State for grading config
  const [gradingView, setGradingView] = useState<'scores' | 'config'>('scores');
  const [courseForConfig, setCourseForConfig] = useState<Course | null>(null);

  // State for course data
  const [selectedCourse, setSelectedCourse] = useState<Course | ''>('');

  const uniqueCourses = useMemo(() => {
    const courses = new Set<Course>();
    students.forEach(student => {
        const studentCourses: Course[] = (student.courses && Array.isArray(student.courses))
            ? student.courses
            : ((student as any).course ? [(student as any).course] : []);
        studentCourses.forEach(course => courses.add(course));
    });
    return Array.from(courses).sort();
  }, [students]);

  const handleConfigureCourse = (courseName: Course) => {
    setCourseForConfig(courseName);
    setGradingView('config');
  };

  const handleBackToScores = () => {
    setGradingView('scores');
    setCourseForConfig(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'courseData':
        return (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl mb-4">
              <label htmlFor="course-select-main" className="block text-sm font-medium mb-2 text-shadow" style={{color: 'var(--text-secondary)'}}>เลือกรายวิชาเพื่อดูข้อมูล</label>
              <select 
                id="course-select-main" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value as Course | '')} 
                className="block w-full pl-3 pr-10 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                }}
              >
                  <option value="">-- กรุณาเลือกรายวิชา --</option>
                  {uniqueCourses.map(course => <option key={course} value={course}>{course}</option>)}
              </select>
            </div>
            {selectedCourse ? (
              <CourseStudentList 
                courseName={selectedCourse} 
                students={students.filter(s => {
                  const studentCourses: Course[] = (s.courses && Array.isArray(s.courses))
                      ? s.courses
                      : ((s as any).course ? [(s as any).course] : []);
                  return studentCourses.includes(selectedCourse as Course);
                })} 
                allStudents={students} 
                selectedTerm={selectedTerm}
                selectedYear={selectedYear}
                availableSchedules={availableSchedules || []}
              />
            ) : (
              <div className="text-center py-12 glass-card rounded-xl" style={{color: 'var(--text-muted)'}}>
                <p className="font-semibold">กรุณาเลือกรายวิชาเพื่อดูข้อมูลนักศึกษาและกิจกรรม</p>
              </div>
            )}
          </div>
        );
      case 'attendance':
        return <AttendanceManagement allStudents={students} selectedTerm={selectedTerm} selectedYear={selectedYear} availableSchedules={availableSchedules} />;
      case 'grading':
        if (gradingView === 'config' && courseForConfig) {
          return <GradingConfig courseName={courseForConfig} onBack={handleBackToScores} selectedTerm={selectedTerm} selectedYear={selectedYear} />;
        }
        return <GradingSystem students={students} onConfigure={handleConfigureCourse} selectedTerm={selectedTerm} selectedYear={selectedYear} availableSchedules={availableSchedules} />;
      case 'scoreSummary':
        return <ScoreSummary allStudents={students} selectedTerm={selectedTerm} selectedYear={selectedYear} availableSchedules={availableSchedules} />;
      case 'teacherSchedule':
        return <TeacherSchedule selectedTerm={selectedTerm} selectedYear={selectedYear} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการรายวิชา (Course Management)</h1>
      </div>

      <div className="border-b overflow-x-auto custom-scrollbar" style={{borderColor: 'var(--glass-border)'}}>
        <nav className="-mb-px flex space-x-2 min-w-max" aria-label="Tabs">
          <TabButton 
            label="ข้อมูลแต่ละรายวิชา"
            isActive={activeTab === 'courseData'}
            onClick={() => { setActiveTab('courseData'); setGradingView('scores'); }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 8.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 8.56z" /><path d="M3.31 11.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 11.56z" /></svg>}
          />
          <TabButton 
            label="เช็คชื่อออนไลน์"
            isActive={activeTab === 'attendance'}
            onClick={() => { setActiveTab('attendance'); setGradingView('scores'); }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clipRule="evenodd" /></svg>}
          />
          <TabButton 
            label="ระบบคะแนน"
            isActive={activeTab === 'grading'}
            onClick={() => setActiveTab('grading')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
          />
          <TabButton 
            label="สรุปผลการเรียน"
            isActive={activeTab === 'scoreSummary'}
            onClick={() => { setActiveTab('scoreSummary'); setGradingView('scores'); }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>}
          />
          <TabButton 
            label="ตารางสอน"
            isActive={activeTab === 'teacherSchedule'}
            onClick={() => { setActiveTab('teacherSchedule'); setGradingView('scores'); }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
          />
        </nav>
      </div>

      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default CourseManagement;
