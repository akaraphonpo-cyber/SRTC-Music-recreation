
import React, { useMemo, useState } from 'react';
import { AttendanceRecord, AttendanceStatus, Course } from '../../types';

interface StatCardProps {
    label: string;
    value: number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
    <div className="glass-card p-3 rounded-lg flex-1 min-w-[80px]">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
);

interface AttendanceDonutChartProps {
    percentage: number;
}

const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({ percentage }) => {
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const color = percentage >= 80 
        ? 'rgb(var(--text-success-rgb))' 
        : percentage >= 60 
        ? 'rgb(var(--accent-color))' 
        : 'rgb(var(--text-danger-rgb))';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    className="stroke-current"
                    style={{ color: 'var(--glass-border)' }}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="stroke-current transition-all duration-1000 ease-out"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        strokeDasharray: `${circumference} ${circumference}`,
                        strokeDashoffset: offset,
                    }}
                />
            </svg>
            <span className="absolute text-2xl font-bold" style={{ color }}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
};


const StudentAttendanceView: React.FC<{ attendanceRecords: AttendanceRecord[] }> = ({ attendanceRecords }) => {
    const [openCourse, setOpenCourse] = useState<string | null>(null);
    
    const groupedByCourse = useMemo(() => {
        return attendanceRecords.reduce((acc, record) => {
            (acc[record.course] = acc[record.course] || []).push(record);
            return acc;
        }, {} as Record<Course, AttendanceRecord[]>);
    }, [attendanceRecords]);

    const getStatusStyle = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.PRESENT: return { text: 'text-green-400', bg: 'bg-green-500/20' };
            case AttendanceStatus.LATE: return { text: 'text-yellow-400', bg: 'bg-yellow-500/20' };
            case AttendanceStatus.ABSENT: return { text: 'text-red-400', bg: 'bg-red-500/20' };
            case AttendanceStatus.LEAVE: return { text: 'text-gray-400', bg: 'bg-gray-500/20' };
            default: return { text: 'text-gray-400', bg: 'bg-gray-500/20' };
        }
    };

    const toggleCourseDetails = (courseName: string) => {
        setOpenCourse(prev => (prev === courseName ? null : courseName));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-shadow px-2" style={{ color: 'var(--text-primary)' }}>
                ข้อมูลการเข้าเรียน
            </h3>

            {Object.keys(groupedByCourse).length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                    <p className="text-shadow" style={{ color: 'var(--text-secondary)' }}>ยังไม่มีข้อมูลการเข้าเรียน</p>
                </div>
            ) : (
                Object.entries(groupedByCourse).map(([course, records]: [string, AttendanceRecord[]]) => {
                    const stats = {
                        [AttendanceStatus.PRESENT]: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
                        [AttendanceStatus.LATE]: records.filter(r => r.status === AttendanceStatus.LATE).length,
                        [AttendanceStatus.ABSENT]: records.filter(r => r.status === AttendanceStatus.ABSENT).length,
                        [AttendanceStatus.LEAVE]: records.filter(r => r.status === AttendanceStatus.LEAVE).length,
                    };
                    
                    const totalForPercent = stats[AttendanceStatus.PRESENT] + stats[AttendanceStatus.LATE] + stats[AttendanceStatus.ABSENT];
                    const attended = stats[AttendanceStatus.PRESENT] + stats[AttendanceStatus.LATE];
                    const percentage = totalForPercent > 0 ? (attended / totalForPercent) * 100 : 100;
                    
                    // Advanced Calculations
                    const effectiveAbsence = stats[AttendanceStatus.ABSENT] + Math.floor(stats[AttendanceStatus.LEAVE] / 2);
                    const isBanned = effectiveAbsence > 4;
                    const scoreDeduction = stats[AttendanceStatus.LATE] + stats[AttendanceStatus.ABSENT];

                    const isExpanded = openCourse === course;

                    return (
                        <div key={course} className="glass-card rounded-2xl p-6 transition-all duration-300">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex flex-col items-center sm:items-start">
                                    <h4 className="text-lg font-bold mb-4" style={{ color: `rgb(var(--accent-color))` }}>{course}</h4>
                                    <AttendanceDonutChart percentage={percentage} />
                                </div>
                                <div className="flex-1 w-full">
                                    <h5 className="font-semibold mb-3 text-shadow" style={{ color: 'var(--text-primary)' }}>สถิติการมาเรียน</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                                        <StatCard label="มาเรียน" value={stats[AttendanceStatus.PRESENT]} color="text-green-400" />
                                        <StatCard label="มาสาย" value={stats[AttendanceStatus.LATE]} color="text-yellow-400" />
                                        <StatCard label="ขาดเรียน" value={stats[AttendanceStatus.ABSENT]} color="text-red-400" />
                                        <StatCard label="ลา" value={stats[AttendanceStatus.LEAVE]} color="text-gray-400" />
                                    </div>
                                    
                                    <div className="p-3 rounded-xl bg-black/5 border border-black/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>สถานะสิทธิ์สอบ:</span>
                                            {isBanned ? (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/20 text-red-500">หมดสิทธิ์สอบ</span>
                                            ) : (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-green-500/20 text-green-500">มีสิทธิ์สอบ</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm" style={{color: 'var(--text-secondary)'}}>ขาด (สุทธิ):</span>
                                            <span className={`font-bold ${effectiveAbsence > 4 ? 'text-red-500' : 'text-gray-600'}`}>{effectiveAbsence} ครั้ง</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm" style={{color: 'var(--text-secondary)'}}>หักคะแนนจิตพิสัย:</span>
                                            <span className="text-red-500 font-bold">-{scoreDeduction} คะแนน</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                                <p className="text-[10px] text-gray-400 mb-3">
                                    * เกณฑ์: ขาดได้ไม่เกิน 4 ครั้ง (ลา 2 ครั้ง = ขาด 1 ครั้ง), มาสาย/ขาด หักครั้งละ 1 คะแนน
                                </p>
                                <button onClick={() => toggleCourseDetails(course)} className="w-full text-sm font-medium p-2 rounded-lg flex justify-between items-center hover:bg-black/10" aria-expanded={isExpanded}>
                                    <span style={{color: 'var(--text-secondary)'}}>ดูรายละเอียดรายวัน</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} style={{color: 'var(--text-muted)'}} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {isExpanded && (
                                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2 animate-fade-in custom-scrollbar">
                                        {records.map(record => (
                                            <div key={record.id} className={`flex justify-between items-center p-3 rounded-lg ${getStatusStyle(record.status).bg}`}>
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {new Date(record.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                                </p>
                                                <p className={`font-bold text-sm ${getStatusStyle(record.status).text}`}>{record.status}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default StudentAttendanceView;
