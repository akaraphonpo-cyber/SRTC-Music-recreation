
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OverviewStatistics, StudentWithId, Course, SystemConfig } from '../../types';
import { getCourseGradingConfig, getScoresForCourse } from '../../services/courseService';
import { getSystemConfig } from '../../services/configService';
import { useNotification } from '../../contexts/NotificationContext';
import { calculateTotal, calculateGrade } from '../../utils/grades';
import LoadingSpinner from '../common/LoadingSpinner';
import WeatherWidget from '../common/WeatherWidget'; // Import WeatherWidget

const SummaryCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="glass-card p-6 rounded-2xl flex items-center space-x-4 h-full hover:-translate-y-1 transition-transform duration-300">
        <div className="rounded-full p-3 bg-opacity-10" style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)', color: 'rgba(var(--accent-color), 1)' }}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-shadow" style={{ color: 'var(--text-secondary)' }}>{title}</p>
            <p className="text-3xl font-bold text-shadow" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
    </div>
);

const DepartmentList: React.FC<{ data: { [key: string]: number } }> = ({ data }) => {
    const sortedData = Object.entries(data).sort(([, a], [, b]) => Number(b || 0) - Number(a || 0));
    const maxValue = Math.max(...Object.values(data).map(v => Number(v || 0)), 1);
    const colors = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-teal-500'];

    return (
        <div className="glass-card p-6 rounded-2xl h-full">
            <h3 className="text-lg font-semibold text-shadow mb-4" style={{ color: 'var(--text-primary)' }}>นักศึกษาตามแผนกวิชา</h3>
            <div className="space-y-4">
                {sortedData.length > 0 ? sortedData.map(([label, value], index) => (
                    <div key={label}>
                        <div className="flex justify-between items-center mb-1 text-shadow">
                            <span className="text-sm font-medium truncate pr-2" title={label} style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{Number(value || 0)}</span>
                        </div>
                        <div className="w-full bg-black/10 rounded-full h-2.5">
                            <div
                                className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                                style={{ width: `${(Number(value || 0) / maxValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <div className="flex items-center justify-center h-48 text-center" style={{ color: 'var(--text-muted)' }}>
                        <p>ไม่มีข้อมูล</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DonutChart: React.FC<{ data: { [key: string]: number }; title: string }> = ({ data, title }) => {
    const sortedData = Object.entries(data).sort(([, a], [, b]) => Number(b || 0) - Number(a || 0));
    const total = sortedData.reduce((sum, [, value]) => sum + Number(value || 0), 0);
    const colors = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-teal-500'];
    const textColors = ['text-sky-500', 'text-amber-500', 'text-emerald-500', 'text-indigo-500', 'text-rose-500', 'text-teal-500'];

    let accumulatedOffset = 0;

    return (
        <div className="glass-card p-6 rounded-2xl h-full">
            <h3 className="text-lg font-semibold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>{title}</h3>
            {total > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto">
                        <svg viewBox="0 0 36 36" className="transform -rotate-90">
                            <circle cx="18" cy="18" r="15.915" className="stroke-current text-black/10" strokeWidth="3" fill="transparent" />
                            {sortedData.map(([label, value], index) => {
                                const percentage = total > 0 ? (Number(value || 0) / total) * 100 : 0;
                                const strokeDasharray = `${percentage} ${100 - percentage}`;
                                const strokeDashoffset = -accumulatedOffset;
                                accumulatedOffset += percentage;
                                return <circle 
                                    key={label} 
                                    cx="18" 
                                    cy="18" 
                                    r="15.915" 
                                    className={`stroke-current ${textColors[index % textColors.length]}`} 
                                    strokeWidth="3" 
                                    fill="transparent" 
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                                />;
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-shadow">
                            <span className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>{total}</span>
                            <span className="text-sm" style={{color: 'var(--text-muted)'}}>รวม</span>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-shadow">
                        {sortedData.map(([label, value], index) => (
                            <div key={label} className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 ${colors[index % colors.length]}`}></span>
                                    <span className="truncate" title={label} style={{color: 'var(--text-secondary)'}}>{label}</span>
                                </div>
                                <div className="font-semibold" style={{color: 'var(--text-primary)'}}>
                                    {String(Number(value || 0))} <span className="font-normal" style={{color: 'var(--text-muted)'}}>({(total > 0 ? (Number(value || 0) / total) * 100 : 0).toFixed(1)}%)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-48 text-center" style={{color: 'var(--text-muted)'}}>
                    <p>ไม่มีข้อมูล</p>
                </div>
            )}
        </div>
    );
};


interface OverviewProps {
    allStudents?: StudentWithId[];
    selectedTerm?: string;
    selectedYear?: string;
}

const Overview: React.FC<OverviewProps> = ({ allStudents = [], selectedTerm, selectedYear }) => {
  const [stats, setStats] = useState<OverviewStatistics | null>(null);
  const [gradeStats, setGradeStats] = useState<{ totalGrades: number, gradesAbove2: number, percentage: string } | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculatingGrades, setIsCalculatingGrades] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const notification = useNotification();

  const upcomingHolidays = useMemo(() => {
    if (!systemConfig?.academicCalendar?.holidays) return [];
    const today = new Date().toISOString().split('T')[0];
    return systemConfig.academicCalendar.holidays
        .map(h => typeof h === 'string' ? { date: h, description: 'วันหยุดนักขัตฤกษ์' } : h)
        .filter(h => h.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
  }, [systemConfig]);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    
    try {
        if (!allStudents) {
            setStats(null);
            return;
        }

        const departmentCounts: { [key: string]: number } = {};
        const courseCounts: { [key: string]: number } = {};
        const uniqueCourses = new Set<string>();

        allStudents.forEach(student => {
            // Department counts
            if (student.department) {
                departmentCounts[student.department] = (departmentCounts[student.department] || 0) + 1;
            }

            // Course counts
            const studentCourses = (student.courses && Array.isArray(student.courses)) ? student.courses : ((student as any).course ? [(student as any).course] : []);
            studentCourses.forEach(course => {
                courseCounts[course] = (courseCounts[course] || 0) + 1;
                uniqueCourses.add(course);
            });
        });

        const calculatedStats: OverviewStatistics = {
            totalStudents: allStudents.length,
            totalCourses: uniqueCourses.size,
            departmentCounts,
            courseCounts,
            lastUpdated: new Date().toISOString()
        };

        setStats(calculatedStats);
    } catch (error: any) {
        console.error("Error calculating stats:", error);
        notification.addToast({
            type: 'error',
            title: 'Error Loading Stats',
            message: 'Could not calculate overview statistics.',
        });
    } finally {
        if (isRefresh) {
            setIsRefreshing(false);
        } else {
            setIsLoading(false);
        }
    }
  }, [allStudents, notification]);

  const calculateGradeStats = useCallback(async () => {
      if (!allStudents || allStudents.length === 0) return;
      setIsCalculatingGrades(true);
      try {
          const uniqueCourses = new Set<Course>();
          allStudents.forEach(s => {
              const studentCourses = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
              studentCourses.forEach(c => uniqueCourses.add(c));
          });

          let totalGrades = 0;
          let gradesAbove2 = 0;
          
          const studentGrades: Record<string, { totalGradePoints: number, totalCredits: number }> = {};

          const coursePromises = Array.from(uniqueCourses).map(async (course) => {
              const [configRes, scoresRes] = await Promise.all([
                  getCourseGradingConfig(course),
                  getScoresForCourse(course, selectedTerm, selectedYear)
              ]);

              if (configRes.success && configRes.data && scoresRes.success && scoresRes.data) {
                  const courseConfig = configRes.data;
                  const scoresMap = scoresRes.data;

                  const courseStudents = allStudents.filter(s => {
                      const studentCourses = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
                      return studentCourses.includes(course);
                  });

                  courseStudents.forEach(student => {
                      const studentScores = scoresMap[student.studentId]?.scores;
                      if (studentScores) {
                          const total = calculateTotal(studentScores, courseConfig);
                          const grade = calculateGrade(total);
                          
                          if (!studentGrades[student.studentId]) {
                              studentGrades[student.studentId] = { totalGradePoints: 0, totalCredits: 0 };
                          }
                          
                          // Assuming each course is 3 credits for now if not specified in config
                          const credits = courseConfig.credits || 3;
                          studentGrades[student.studentId].totalGradePoints += grade * credits;
                          studentGrades[student.studentId].totalCredits += credits;
                      }
                  });
              }
          });

          await Promise.all(coursePromises);

          let studentsAbove2 = 0;
          let totalStudentsWithGrades = 0;

          Object.values(studentGrades).forEach(stats => {
              if (stats.totalCredits > 0) {
                  totalStudentsWithGrades++;
                  const gpa = stats.totalGradePoints / stats.totalCredits;
                  if (gpa >= 2.0) {
                      studentsAbove2++;
                  }
              }
          });

          const percentage = totalStudentsWithGrades > 0 ? ((studentsAbove2 / totalStudentsWithGrades) * 100).toFixed(1) : '0.0';
          setGradeStats({ totalGrades: totalStudentsWithGrades, gradesAbove2: studentsAbove2, percentage });

      } catch (error) {
          console.error("Error calculating grade stats:", error);
      } finally {
          setIsCalculatingGrades(false);
      }
  }, [allStudents, selectedTerm, selectedYear]);

  useEffect(() => {
    fetchStats();
    const fetchConfig = async () => {
        const res = await getSystemConfig();
        if (res.success && res.data) {
            setSystemConfig(res.data);
        }
    };
    fetchConfig();
  }, [fetchStats]);

  useEffect(() => {
      calculateGradeStats();
  }, [calculateGradeStats]);

  const renderHeader = () => (
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>ภาพรวม (Overview)</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
                onClick={() => fetchStats(true)}
                disabled={isRefreshing}
                className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap w-full sm:w-auto transform hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                style={{ backgroundColor: `rgba(var(--text-link-rgb), 1)`, color: `var(--text-inverted)` }}
                aria-label="Refresh statistics"
            >
                {isRefreshing ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                )}
                {isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
        </div>
      </div>
  );

  if (isLoading) {
      return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (stats === null) {
       return (
        <div>
            {renderHeader()}
            <div className="glass-card p-8 rounded-2xl text-center animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold text-shadow mb-2" style={{ color: 'var(--text-primary)' }}>ไม่มีข้อมูลสถิติ</h2>
                <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    ไม่พบข้อมูลสถิติสำหรับเทอมและปีการศึกษาที่เลือก
                </p>
            </div>
        </div>
       );
  }

  return (
    <div>
      {renderHeader()}
      
      {stats && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="glass-card p-6 rounded-2xl flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-transform duration-300 flex-grow">
                        <div className="rounded-full p-4 mb-3" style={{backgroundColor: `rgba(var(--accent-color), 0.1)`, color: `rgba(var(--accent-color), 1)`}}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.28-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.28.24-1.857m11.52 1.857A3 3 0 0014.143 18H9.857a3 3 0 00-2.757 1.857M12 14a4 4 0 110-8 4 4 0 010 8z" /></svg>
                        </div>
                        <p className="text-lg font-semibold text-shadow" style={{color: 'var(--text-secondary)'}}>จำนวนนักศึกษาทั้งหมด</p>
                        <p className="text-6xl font-bold text-shadow my-2" style={{color: 'var(--text-primary)'}}>{stats.totalStudents ?? 0}</p>
                    </div>
                    {/* Insert Weather Widget Here */}
                    <WeatherWidget />
                    
                    {upcomingHolidays.length > 0 && (
                        <div className="glass-card p-6 rounded-2xl flex flex-col hover:-translate-y-1 transition-transform duration-300">
                            <h3 className="text-lg font-semibold text-shadow mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                วันหยุดที่กำลังจะถึง
                            </h3>
                            <div className="space-y-3">
                                {upcomingHolidays.map((holiday, idx) => (
                                    <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{holiday.description}</span>
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {new Date(holiday.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {holiday.date === new Date().toISOString().split('T')[0] && (
                                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">วันนี้</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <SummaryCard 
                    title="จำนวนแผนกวิชา" 
                    value={Object.keys(stats.departmentCounts || {}).length} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18h16.5M2.25 12h17.25m-12.75 6h10.5M2.25 6h13.5m-13.5 12v-6m17.25-6v6m0 6v-6m0-6v6" /></svg>}
                    />
                    <SummaryCard 
                    title="จำนวนรายวิชา" 
                    value={stats.totalCourses ?? 0} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
                    />
                    <SummaryCard 
                    title="นักศึกษาที่เกรดเฉลี่ยรวม >= 2.00" 
                    value={
                        isCalculatingGrades ? (
                            <span className="text-sm text-gray-400">กำลังคำนวณ...</span>
                        ) : gradeStats ? (
                            <span>
                                {gradeStats.gradesAbove2} <span className="text-lg text-gray-400 font-normal">/ {gradeStats.totalGrades} ({gradeStats.percentage}%)</span>
                            </span>
                        ) : (
                            "0"
                        )
                    } 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    {/* Move Charts here for better layout on large screens */}
                    <DepartmentList data={stats.departmentCounts || {}} />
                    <DonutChart title="สัดส่วนรายวิชา" data={stats.courseCounts || {}} />
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Overview;
