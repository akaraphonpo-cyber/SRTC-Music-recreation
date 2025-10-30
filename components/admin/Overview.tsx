import React, { useMemo } from 'react';
import { StudentWithId, Department, Course } from '../../types';

interface OverviewProps {
  students: StudentWithId[];
}

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
  const sortedData = Object.entries(data).sort(([, a], [, b]) => Number(b) - Number(a));
  const maxValue = Math.max(...Object.values(data).map(Number), 1);
  const colors = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-teal-500'];

  return (
    <div className="glass-card p-6 rounded-2xl h-full">
      <h3 className="text-lg font-semibold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>{title}</h3>
      <div className="space-y-4">
        {sortedData.length > 0 ? sortedData.map(([label, value], index) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1 text-shadow">
              <span className="text-sm font-medium truncate pr-2" title={label} style={{color: 'var(--text-secondary)'}}>{label}</span>
              <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>{String(value)}</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-2.5">
              <div
                className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${(Number(value) / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        )) : (
            <div className="flex items-center justify-center h-48 text-center" style={{color: 'var(--text-muted)'}}>
                <p>ไม่มีข้อมูล</p>
            </div>
        )}
      </div>
    </div>
  );
};

const DonutChart: React.FC<{ data: { [key: string]: number }; title: string }> = ({ data, title }) => {
    const sortedData = Object.entries(data).sort(([, a], [, b]) => Number(b) - Number(a));
    const total = sortedData.reduce((sum, [, value]) => sum + Number(value), 0);
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
                                const percentage = (Number(value) / total) * 100;
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
                                    {String(value)} <span className="font-normal" style={{color: 'var(--text-muted)'}}>({((Number(value) / total) * 100).toFixed(1)}%)</span>
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


const Overview: React.FC<OverviewProps> = ({ students }) => {

  const stats = useMemo(() => {
    const departmentCounts: { [key in Department]?: number } = {};
    const courseCounts: { [key in Course]?: number } = {};
    const courses = new Set<Course>();

    students.forEach(student => {
        if (student.department) {
            departmentCounts[student.department] = (departmentCounts[student.department] || 0) + 1;
        }
        if (student.course) {
            courseCounts[student.course] = (courseCounts[student.course] || 0) + 1;
            courses.add(student.course);
        }
    });

    return {
        totalStudents: students.length,
        totalCourses: courses.size,
        departmentCounts: departmentCounts as { [key: string]: number },
        courseCounts: courseCounts as { [key: string]: number },
    };
  }, [students]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-shadow mb-6" style={{color: 'var(--text-primary)'}}>ภาพรวม (Overview)</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="จำนวนนักศึกษาทั้งหมด" 
          value={stats.totalStudents} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.28-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.28.24-1.857m11.52 1.857A3 3 0 0014.143 18H9.857a3 3 0 00-2.757 1.857M12 14a4 4 0 110-8 4 4 0 010 8z" /></svg>}
        />
        <StatCard 
          title="จำนวนวิชาที่เปิด" 
          value={stats.totalCourses} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-9-5.747h18" /></svg>}
        />
        <StatCard 
          title="งานที่ส่งแล้ว (วันนี้)" 
          value="N/A" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          title="ขาดเรียน (วันนี้)" 
          value="N/A" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        />
      </div>
      
      {/* Charts */}
      <h2 className="text-2xl font-bold text-shadow mb-6" style={{color: 'var(--text-primary)'}}>สถิติ</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart title="นักศึกษาตามแผนกวิชา" data={stats.departmentCounts} />
          <DonutChart title="สัดส่วนรายวิชาที่ลงทะเบียน" data={stats.courseCounts} />
      </div>

    </div>
  );
};

export default Overview;