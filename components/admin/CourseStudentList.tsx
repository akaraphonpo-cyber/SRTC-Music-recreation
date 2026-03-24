
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StudentWithId, Course, StudentScores, CourseConfig, Schedule } from '../../types';
import { getCourseGradingConfig, getScoresForCourse } from '../../services/courseService';
import { useNotification } from '../../contexts/NotificationContext';
import { calculateTotal, calculateGrade } from '../../utils/grades';
import { getStudentSchedule } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';
import CourseActivities from './CourseActivities';

// --- Reusable UI Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="glass-card p-6 rounded-2xl flex items-center space-x-4 hover:-translate-y-1 transition-transform duration-300">
    <div className="rounded-full p-3" style={{backgroundColor: `rgba(var(--accent-color), 0.1)`, color: `rgba(var(--accent-color), 1)`}}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-shadow" style={{color: 'var(--text-secondary)'}}>{title}</p>
      <p className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>{value}</p>
    </div>
  </div>
);

const BarChart: React.FC<{ data: { [key: string]: number }; title: string }> = ({ data, title }) => {
  const sortedData = Object.entries(data).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  const maxValue = Math.max(...Object.values(data).map(Number), 1);
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-teal-500'];

  return (
    <div className="glass-card p-6 rounded-2xl h-full">
      <h3 className="text-lg font-semibold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>{title}</h3>
      <div className="space-y-4">
        {sortedData.length > 0 ? sortedData.map(([label, value], index) => {
          const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={label}>
              <div className="flex justify-between items-center mb-1 text-shadow">
                <span className="text-sm font-medium truncate pr-2" style={{color: 'var(--text-secondary)'}} title={`เกรด ${label}`}>เกรด {label}</span>
                <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                  {String(value)} คน <span className="text-xs opacity-75">({percentage}%)</span>
                </span>
              </div>
              <div className="w-full bg-black/10 rounded-full h-2.5">
                <div
                  className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${(Number(value) / maxValue) * 100}%` }}
                ></div>
              </div>
            </div>
          );
        }) : (
            <div className="flex items-center justify-center h-48 text-center" style={{color: 'var(--text-muted)'}}>
                <p>ยังไม่มีข้อมูลคะแนน</p>
            </div>
        )}
      </div>
    </div>
  );
};

const SortIcon: React.FC<{ direction: 'asc' | 'desc' | 'none' }> = ({ direction }) => {
    if (direction === 'asc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    if (direction === 'desc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30 group-hover:opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;
};

// --- Main Component ---

interface CourseStudentListProps {
  courseName: string;
  students: StudentWithId[];
  allStudents: StudentWithId[];
  availableSchedules: Schedule[];
}

const CourseStudentList: React.FC<CourseStudentListProps> = ({ courseName, students, allStudents, availableSchedules }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activities'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
  const [courseConfig, setCourseConfig] = useState<CourseConfig | null>(null);
  const [scores, setScores] = useState<Record<string, StudentScores['scores']>>({});
  const [isLoading, setIsLoading] = useState(true);
  const notification = useNotification();

  const fetchCourseData = useCallback(async (course: Course) => {
    setIsLoading(true);
    setCourseConfig(null);
    try {
      const [configRes, scoresRes] = await Promise.all([
        getCourseGradingConfig(course),
        getScoresForCourse(course)
      ]);

      if (configRes.success && configRes.data) {
        setCourseConfig(configRes.data);
      } else {
        notification.addToast({ type: 'error', title: 'Error', message: 'Could not load grading configuration.' });
      }

      if (scoresRes.success && scoresRes.data) {
        const scoresByStudentId = Object.entries(scoresRes.data).reduce((acc, [_, studentScore]) => {
          acc[(studentScore as any).studentId] = (studentScore as any).scores;
          return acc;
        }, {} as Record<string, StudentScores['scores']>);
        setScores(scoresByStudentId);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      notification.addToast({ type: 'error', title: 'Error', message: 'Failed to load course data.' });
    } finally {
      setIsLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    fetchCourseData(courseName as Course);
  }, [courseName, fetchCourseData]);

  const dashboardData = useMemo(() => {
    if (!courseConfig || students.length === 0) {
      return {
        studentScores: [],
        averageScore: 0,
        gradeDistribution: {},
        studentsAtRisk: [],
        passingCount: 0,
        percentageAbove2: '0.0',
      };
    }
    
    const studentScores = students.map(student => {
        const studentScoreData = scores[student.studentId];
        const total = calculateTotal(studentScoreData, courseConfig);
        const grade = calculateGrade(total);
        return { ...student, total, grade };
    });

    const totalScoresSum = studentScores.reduce((sum, s) => sum + s.total, 0);
    const averageScore = students.length > 0 ? totalScoresSum / students.length : 0;

    const gradeDistribution: { [key: string]: number } = {
        '4.0': 0, '3.5': 0, '3.0': 0, '2.5': 0, '2.0': 0, '1.5': 0, '1.0': 0, '0.0': 0
    };
    studentScores.forEach(s => {
        const gradeKey = s.grade.toFixed(1);
        if (gradeDistribution.hasOwnProperty(gradeKey)) {
            gradeDistribution[gradeKey]++;
        }
    });

    const studentsAtRisk = studentScores.filter(s => s.total < 50).sort((a,b) => a.total - b.total);
    const passingCount = studentScores.filter(s => s.total >= 50).length;
    
    const studentsAbove2 = studentScores.filter(s => s.grade >= 2.0).length;
    const percentageAbove2 = students.length > 0 
        ? ((studentsAbove2 / students.length) * 100).toFixed(1) 
        : '0.0';

    return { studentScores, averageScore, gradeDistribution, studentsAtRisk, passingCount, percentageAbove2 };

  }, [students, scores, courseConfig]);

  const handleSort = () => {
    setSortDirection(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const sortedStudents = useMemo(() => {
    const filtered = dashboardData.studentScores.filter(student =>
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.includes(searchTerm)
    );

    if (sortDirection !== 'none') {
        return [...filtered].sort((a, b) => {
            if (sortDirection === 'asc') {
                return a.studentId.localeCompare(b.studentId);
            } else {
                return b.studentId.localeCompare(a.studentId);
            }
        });
    }
    return filtered;
  }, [dashboardData.studentScores, searchTerm, sortDirection]);
  
  const handleExportGrades = () => {
      if (sortedStudents.length === 0) return;

      const headers = ['Student ID', 'Name', 'Department', 'Total Score', 'Grade'];
      const rows = sortedStudents.map(student => [
          `"${student.studentId}"`,
          `"${student.prefix}${student.firstName} ${student.lastName}"`,
          student.department,
          student.total.toFixed(2),
          student.grade.toFixed(1)
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `grades_${courseName}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
  }> = ({ label, isActive, onClick, icon }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all duration-300 border-b-2 ${
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

  const headers = ['ID', 'ชื่อ-สกุล', 'แผนก', 'ตารางสอน', 'เบอร์โทร', 'คะแนนรวม', 'เกรด'];

  const renderDashboardContent = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
            title="จำนวนนักศึกษา" 
            value={students.length} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.28-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.28.24-1.857m11.52 1.857A3 3 0 0014.143 18H9.857a3 3 0 00-2.757 1.857M12 14a4 4 0 110-8 4 4 0 010 8z" /></svg>}
            />
            <StatCard 
            title="คะแนนเฉลี่ย" 
            value={dashboardData.averageScore.toFixed(0)} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
            />
            <StatCard 
            title="นักศึกษาที่ผ่านเกณฑ์" 
            value={`${dashboardData.passingCount} / ${students.length}`} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard 
            title="เกรด >= 2.00" 
            value={`${dashboardData.percentageAbove2}%`} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
        </div>

        {/* Charts & At-Risk Students */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
                <BarChart title="การกระจายของเกรด" data={dashboardData.gradeDistribution} />
            </div>
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>นักศึกษาที่น่าเป็นห่วง (คะแนน &lt; 50)</h3>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                    {dashboardData.studentsAtRisk.length > 0 ? dashboardData.studentsAtRisk.map(student => (
                        <div 
                        key={student.id} 
                        className="flex justify-between items-center p-2 rounded-md border"
                        style={{
                            backgroundColor: 'rgba(var(--text-danger-rgb), 0.1)',
                            borderColor: 'rgba(var(--text-danger-rgb), 0.2)',
                        }}
                        >
                            <div>
                                <p className="text-sm font-medium truncate" style={{color: 'rgb(var(--text-danger-rgb))'}}>{student.prefix}{student.firstName} {student.lastName}</p>
                                <p className="text-xs" style={{color: 'rgba(var(--text-danger-rgb), 0.8)'}}>{student.studentId}</p>
                            </div>
                            <span className="text-sm font-bold" style={{color: 'rgb(var(--text-danger-rgb))'}}>{student.total.toFixed(0)}</span>
                        </div>
                    )) : (
                        <div className="flex items-center justify-center h-48 text-center" style={{color: 'var(--text-muted)'}}>
                            <p>ไม่พบนักศึกษาที่คะแนนต่ำกว่าเกณฑ์</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Full Student List */}
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>
                รายชื่อนักศึกษาทั้งหมด
                </h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                    type="text"
                    placeholder="ค้นหา (ชื่อ, ID)..."
                    className="px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto"
                    style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderColor: 'var(--input-focus-border)'}}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={handleExportGrades}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white shadow-sm hover:opacity-90 transition-all whitespace-nowrap"
                    style={{backgroundColor: 'rgb(var(--text-success-rgb))'}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export เกรด
                </button>
            </div>
            </div>

            <div className="overflow-x-auto">
            {sortedStudents.length === 0 ? (
                <p className="text-center py-10" style={{color: 'var(--text-muted)'}}>ไม่พบข้อมูลนักศึกษา</p>
            ) : (
                <table className="min-w-full">
                <thead className="border-b" style={{borderColor: 'var(--glass-border)'}}>
                    <tr>
                    {headers.map(header => (
                        <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-shadow" style={{color: 'var(--text-secondary)'}}>
                          {header === 'ID' ? (
                            <button onClick={handleSort} className="flex items-center space-x-1 group">
                              <span>{header}</span>
                              <SortIcon direction={sortDirection} />
                            </button>
                          ) : (
                            header
                          )}
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                    {sortedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-black/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.studentId}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.prefix}{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.department}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {(() => {
                            const sched = getStudentSchedule(student, courseName as Course, availableSchedules);
                            return sched.day ? `${sched.day} (${sched.startTime}-${sched.endTime})` : '-';
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{student.phoneNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold" style={{color: 'rgb(var(--color-highlight-rgb))'}}>{student.total.toFixed(0)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold" style={{color: 'rgb(var(--text-success-rgb))'}}>{student.grade.toFixed(1)}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-shadow truncate" style={{color: 'var(--text-primary)'}} title={courseName}>{courseName}</h1>
      
      <div className="border-b" style={{borderColor: 'var(--glass-border)'}}>
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton 
            label="ภาพรวม"
            isActive={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>}
          />
          <TabButton 
            label="กิจกรรมและงาน"
            isActive={activeTab === 'activities'}
            onClick={() => setActiveTab('activities')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
          />
        </nav>
      </div>

      <div className="pt-4">
        {isLoading ? (
            <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>
        ) : (
            <>
                {activeTab === 'dashboard' && renderDashboardContent()}
                {activeTab === 'activities' && courseConfig && (
                    <CourseActivities 
                        courseName={courseName as Course}
                        courseConfig={courseConfig}
                        onDataRefresh={() => fetchCourseData(courseName as Course)}
                        allStudents={allStudents}
                    />
                )}
            </>
        )}
      </div>

    </div>
  );
};

export default CourseStudentList;
