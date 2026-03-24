
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentWithId, Course, CourseConfig, StudentScores, SystemConfig } from '../../types';
import { getCourseGradingConfig, getScoresForCourse, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { calculateTotal, calculateGrade, flattenGradingConfig, FlatGradingItem, getDisplayColumnsWithGroups, calculateGroupScore } from '../../utils/grades';
import { generateScoreReportPDF } from '../../utils/pdfGenerator';
import { DEPARTMENT_OPTIONS, CLASS_LEVEL_OPTIONS, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../../constants';
import { studentMatchesScheduleFilter, getCustomGroupOptions } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';

interface ScoreSummaryProps {
    allStudents: StudentWithId[];
    availableSchedules?: any[];
}

const ScoreSummary: React.FC<ScoreSummaryProps> = ({ allStudents, availableSchedules }) => {
    const [selectedCourse, setSelectedCourse] = useState<Course | ''>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    
    // NEW: Submission Filters
    const [filterItemKey, setFilterItemKey] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'MISSING'>('ALL');
    
    const [courseConfig, setCourseConfig] = useState<CourseConfig | null>(null);
    const [scores, setScores] = useState<Record<string, StudentScores['scores']>>({});
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const notification = useNotification();

    // Fetch System Config for PDF Signatures & Groups
    useEffect(() => {
        const fetchSysConfig = async () => {
            const res = await getSystemConfig();
            if (res.success && res.data) setSystemConfig(res.data);
        };
        fetchSysConfig();
    }, []);

    const uniqueCourses = useMemo(() => {
        const courses = new Set<Course>();
        allStudents.forEach(s => {
            const studentCourses = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
            studentCourses.forEach(c => courses.add(c));
        });
        return Array.from(courses).sort();
    }, [allStudents]);

    // Custom Group Aliases
    const customGroupOptions = useMemo(() => {
        return getCustomGroupOptions(allStudents, systemConfig, selectedCourse, availableSchedules);
    }, [allStudents, systemConfig, selectedCourse, availableSchedules]);

    const handleCustomGroupChange = (key: string) => {
        if (!key) return;
        // Key format: Dept|Level|Day|Time
        const [dept, level, day, time] = key.split('|');
        setSelectedDepartment(dept || '');
        setSelectedClassLevel(level || '');
        setSelectedDay(day || '');
        setSelectedTimeSlot(time || '');
    };

    const fetchData = useCallback(async () => {
        if (!selectedCourse) return;
        setIsLoading(true);
        try {
            const [configRes, scoresRes] = await Promise.all([
                getCourseGradingConfig(selectedCourse),
                getScoresForCourse(selectedCourse)
            ]);

            if (configRes.success && configRes.data) {
                setCourseConfig(configRes.data);
            }
            if (scoresRes.success && scoresRes.data) {
                const scoresMap = Object.values(scoresRes.data).reduce((acc, curr: any) => {
                    acc[curr.studentId] = curr.scores;
                    return acc;
                }, {} as Record<string, StudentScores['scores']>);
                setScores(scoresMap);
            }
        } catch (error) {
            console.error(error);
            notification.addToast({ type: 'error', title: 'Error', message: 'ไม่สามารถโหลดข้อมูลคะแนนได้' });
        } finally {
            setIsLoading(false);
        }
    }, [selectedCourse, notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset filters when course changes
    useEffect(() => {
        setFilterItemKey('');
        setFilterStatus('ALL');
    }, [selectedCourse]);

    // Use the new helper to get columns including Group Totals
    const displayColumns = useMemo(() => {
        if (!courseConfig?.gradingConfig || !courseConfig.gradingConfigOrder) return [];
        return getDisplayColumnsWithGroups(courseConfig.gradingConfig, courseConfig.gradingConfigOrder);
    }, [courseConfig]);

    // Used for Filter Dropdown (Leaves only)
    const flatLeafItems = useMemo(() => {
        return displayColumns.filter(c => c.isLeaf);
    }, [displayColumns]);

    // Data Processing
    const processedData = useMemo(() => {
        if (!selectedCourse || !courseConfig) return [];

        // 1. Filter Students
        let filtered = allStudents.filter(s => {
            const studentCourses = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
            return studentCourses.includes(selectedCourse);
        });

        if (selectedDepartment) filtered = filtered.filter(s => s.department === selectedDepartment);
        if (selectedClassLevel) filtered = filtered.filter(s => s.classLevel === selectedClassLevel);
        
        // Filter by Day & Time
        filtered = filtered.filter(s => studentMatchesScheduleFilter(s, selectedCourse, selectedDay, selectedTimeSlot, availableSchedules));

        // NEW: Filter by Submission Status
        if (filterItemKey && filterStatus !== 'ALL') {
            filtered = filtered.filter(s => {
                const studentScores = scores[s.studentId];
                const rawVal = studentScores ? studentScores[filterItemKey] : undefined;
                const hasScore = rawVal !== undefined && rawVal !== null && rawVal !== '';

                if (filterStatus === 'SUBMITTED') return hasScore;
                if (filterStatus === 'MISSING') return !hasScore;
                return true;
            });
        }

        // 2. Map Scores (Includes Group Total Calculation)
        return filtered.map(student => {
            const studentScores = scores[student.studentId];
            const total = calculateTotal(studentScores, courseConfig);
            const grade = calculateGrade(total);
            
            const itemScores: Record<string, number | string> = {};
            
            displayColumns.forEach(col => {
                if (col.isGroupTotal) {
                    // Extract real key from "GROUP_TOTAL::realKey"
                    const realKey = col.key.split('::')[1];
                    // Find component in config tree to pass to calculator
                    const findComp = (cfg: any, keyPath: string[]): any => {
                        let current = cfg;
                        for(const k of keyPath) {
                            if(!current || !current[k]) return null;
                            if(keyPath.indexOf(k) === keyPath.length - 1) return current[k];
                            current = current[k].subComponents;
                        }
                    };
                    const component = findComp(courseConfig.gradingConfig, realKey.split('.'));
                    if (component) {
                         const groupScore = calculateGroupScore(studentScores, component, realKey);
                         itemScores[col.key] = groupScore.toFixed(1); // Format to 1 decimal for group totals
                    } else {
                        itemScores[col.key] = '-';
                    }

                } else {
                    // Leaf Item
                    const val = studentScores ? studentScores[col.key] : undefined;
                    itemScores[col.key] = val !== undefined && val !== null ? Number(val) : '';
                }
            });

            return {
                ...student,
                totalScore: total,
                grade: grade,
                itemScores
            };
        }).sort((a, b) => a.studentId.localeCompare(b.studentId));

    }, [allStudents, selectedCourse, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, scores, courseConfig, displayColumns, filterItemKey, filterStatus, availableSchedules]);

    const stats = useMemo(() => {
        let sum = 0;
        let max = 0;
        let min = 100;
        let passed = 0;
        let gradeAboveOrEqual2 = 0;

        processedData.forEach(d => {
            sum += d.totalScore;
            if (d.totalScore > max) max = d.totalScore;
            if (d.totalScore < min) min = d.totalScore;
            if (d.grade >= 1) passed++;
            if (d.grade >= 2) gradeAboveOrEqual2++;
        });

        const avg = processedData.length > 0 ? sum / processedData.length : 0;
        const gradeAboveOrEqual2Percentage = processedData.length > 0 ? ((gradeAboveOrEqual2 / processedData.length) * 100).toFixed(1) : '0.0';
        if (processedData.length === 0) min = 0;

        return { avg, max, min, passed, total: processedData.length, gradeAboveOrEqual2Percentage };
    }, [processedData]);

    const handleExportPDF = async () => {
        if (!selectedCourse || !courseConfig || processedData.length === 0) return;
        setIsExporting(true);
        notification.showLoading('กำลังสร้างรายงาน PDF...');
        
        let groupName = 'รวมทุกกลุ่ม';
        if (selectedDepartment) groupName = `${selectedDepartment}`;
        if (selectedClassLevel) groupName += ` ${selectedClassLevel}`;
        if (selectedDay) groupName += ` (${selectedDay} ${selectedTimeSlot})`;
        if (filterStatus === 'MISSING') groupName += ' (ค้างส่งงาน)';

        // Map display columns back to flat items format for PDF generator if needed
        // For now, PDF generator uses leaf nodes. To support group headers in PDF would require update to generator.
        // We will pass leaf nodes to keep PDF simple for now, or update generator later.
        // Let's filter leafs for PDF.
        const pdfColumns: FlatGradingItem[] = displayColumns
            .filter(c => c.isLeaf)
            .map(c => ({ key: c.key, label: c.label, max: c.max, isHeader: false, level: 0 }));

        try {
            await generateScoreReportPDF(
                selectedCourse,
                pdfColumns, 
                processedData,
                systemConfig,
                stats,
                groupName
            );
            notification.addToast({ type: 'success', title: 'ดาวน์โหลดสำเร็จ' });
        } catch (e: any) {
            console.error(e);
            notification.addToast({ type: 'error', title: 'Error', message: 'ไม่สามารถสร้าง PDF ได้' });
        } finally {
            notification.hideLoading();
            setIsExporting(false);
        }
    };

    const handleExportCSV = () => {
        if (processedData.length === 0) return;
        
        const headers = [
            'No.',
            'Student ID',
            'Prefix',
            'First Name',
            'Last Name',
            'Department',
            'Class Level',
            ...displayColumns.map(item => `${item.label} (Max: ${item.max})`), // Export all visible columns including totals
            'Total Score',
            'Grade'
        ];

        const rows = processedData.map((student, index) => [
            index + 1,
            `"${student.studentId}"`,
            student.prefix,
            student.firstName,
            student.lastName,
            student.department,
            student.classLevel,
            ...displayColumns.map(item => student.itemScores[item.key]),
            student.totalScore.toFixed(0),
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
        
        let filename = `ScoreSheet_${selectedCourse}`;
        if (selectedDepartment) filename += `_${selectedDepartment}`;
        if (selectedClassLevel) filename += `_${selectedClassLevel}`;
        filename += `_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        notification.addToast({ type: 'success', title: 'ดาวน์โหลด Excel/CSV สำเร็จ' });
    };

    const labelClass = "block text-sm font-medium mb-1 text-shadow";
    const selectClass = "block w-full pl-3 pr-10 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm";
    const formStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-shadow mb-6" style={{color: 'var(--text-primary)'}}>สรุปผลการเรียน (Score Summary)</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 glass-card rounded-lg bg-white/5">
                    <div className="md:col-span-3">
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกรายวิชา (จำเป็น)</label>
                        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value as Course)} className={selectClass} style={formStyle}>
                            <option value="">-- กรุณาเลือก --</option>
                            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-3 border-t border-white/10 pt-4 mt-2">
                        <label className={labelClass} style={{color: 'rgb(var(--accent-color))'}}>⭐ เลือกกลุ่มเรียนด่วน (Saved Groups)</label>
                        <select onChange={(e) => handleCustomGroupChange(e.target.value)} disabled={!selectedCourse} className={selectClass} style={{...formStyle, borderColor: 'rgb(var(--accent-color))', borderWidth: '2px'}}>
                            <option value="">-- เลือกกลุ่มที่ตั้งชื่อไว้ --</option>
                            {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                        </select>
                    </div>
                    {/* Filters... (Same as before) */}
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>แผนกวิชา</label>
                        <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className={selectClass} style={formStyle} disabled={!selectedCourse}>
                            <option value="">ทั้งหมด</option>
                            {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>ระดับชั้น</label>
                        <select value={selectedClassLevel} onChange={e => setSelectedClassLevel(e.target.value)} className={selectClass} style={formStyle} disabled={!selectedCourse}>
                            <option value="">ทั้งหมด</option>
                            {CLASS_LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>วันเรียน</label>
                        <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className={selectClass} style={formStyle} disabled={!selectedCourse}>
                            <option value="">ทั้งหมด</option>
                            {REGISTRATION_DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>เวลาเรียน</label>
                        <select value={selectedTimeSlot} onChange={e => setSelectedTimeSlot(e.target.value)} className={selectClass} style={formStyle} disabled={!selectedCourse}>
                            <option value="">ทั้งหมด</option>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    
                    {/* NEW SUBMISSION FILTERS */}
                     <div className="md:col-span-3 border-t border-white/10 pt-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{color: 'var(--text-primary)'}}>📦 กรองตามงาน (Filter by Item)</label>
                            <select 
                                value={filterItemKey} 
                                onChange={e => setFilterItemKey(e.target.value)} 
                                className={selectClass} 
                                style={formStyle} 
                                disabled={!selectedCourse}
                            >
                                <option value="">-- ไม่กรอง (แสดงทั้งหมด) --</option>
                                {flatLeafItems.map(item => (
                                    <option key={item.key} value={item.key}>{item.label} (เต็ม {item.max})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} style={{color: 'var(--text-primary)'}}>สถานะการส่ง (Status)</label>
                            <select 
                                value={filterStatus} 
                                onChange={e => setFilterStatus(e.target.value as any)} 
                                className={selectClass} 
                                style={{...formStyle, backgroundColor: filterStatus === 'MISSING' ? 'rgba(239, 68, 68, 0.1)' : formStyle.backgroundColor }} 
                                disabled={!filterItemKey}
                            >
                                <option value="ALL">ทั้งหมด (All)</option>
                                <option value="SUBMITTED">✅ ส่งแล้ว (Submitted)</option>
                                <option value="MISSING">❌ ยังไม่ส่ง / ไม่มีคะแนน (Missing)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isLoading ? <div className="py-10 flex justify-center"><LoadingSpinner size="lg"/></div> : selectedCourse && courseConfig ? (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-end mb-4 gap-4">
                            <div className="flex flex-wrap gap-4 text-sm font-medium p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-green-500">ผ่าน: {stats.passed}</div>
                                <div className="text-red-500">ไม่ผ่าน: {stats.total - stats.passed}</div>
                                <div className="text-blue-400">เฉลี่ย: {stats.avg.toFixed(2)}</div>
                                <div className="text-yellow-400">สูงสุด: {stats.max.toFixed(0)}</div>
                                <div className="text-purple-400">เกรด &gt;= 2.00: {stats.gradeAboveOrEqual2Percentage}%</div>
                                {filterStatus !== 'ALL' && <div className="text-white font-bold ml-2 border-l pl-2 border-white/20">รายการที่แสดง: {stats.total} คน</div>}
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleExportCSV} 
                                    disabled={processedData.length === 0}
                                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg font-bold flex items-center transition-transform hover:scale-105 disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Export Excel (CSV)
                                </button>
                                <button 
                                    onClick={handleExportPDF} 
                                    disabled={isExporting || processedData.length === 0}
                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg font-bold flex items-center transition-transform hover:scale-105 disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    Export PDF
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border" style={{borderColor: 'var(--glass-border)'}}>
                            <table className="min-w-full divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                <thead className="bg-black/10">
                                    <tr>
                                        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-white/10 w-10">ที่</th>
                                        <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-white/10">รหัสนักศึกษา / ชื่อ-สกุล</th>
                                        
                                        {/* Dynamic Header Row 1: Names */}
                                        {displayColumns.map(item => (
                                            <th key={item.key} className={`px-2 py-1 text-center text-[10px] font-bold border-r border-white/10 truncate max-w-[100px] ${filterItemKey === item.key ? 'bg-yellow-500/20 text-yellow-200' : ''} ${item.isGroupTotal ? 'bg-blue-500/10 text-blue-200' : ''}`} title={item.label}>
                                                {item.label}
                                            </th>
                                        ))}
                                        
                                        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-green-400 border-l border-white/10 w-16">รวม</th>
                                        <th rowSpan={2} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-yellow-400 w-16">เกรด</th>
                                    </tr>
                                    <tr>
                                        {/* Dynamic Header Row 2: Max Scores */}
                                        {displayColumns.map(item => (
                                            <th key={`max-${item.key}`} className={`px-2 py-1 text-center text-[10px] text-gray-400 border-r border-white/10 border-t border-white/10 ${filterItemKey === item.key ? 'bg-yellow-500/20' : ''} ${item.isGroupTotal ? 'bg-blue-500/10' : ''}`}>
                                                ({item.max})
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                    {processedData.length === 0 ? (
                                        <tr><td colSpan={displayColumns.length + 4} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                                    ) : (
                                        processedData.map((student, idx) => (
                                            <tr key={student.studentId} className="hover:bg-black/5 transition-colors">
                                                <td className="px-2 py-2 text-center text-xs border-r border-white/10">{idx + 1}</td>
                                                <td className="px-4 py-2 text-xs border-r border-white/10">
                                                    <div className="font-mono font-bold">{student.studentId}</div>
                                                    <div>{student.prefix}{student.firstName} {student.lastName}</div>
                                                </td>
                                                
                                                {displayColumns.map(item => (
                                                    <td key={item.key} className={`px-2 py-2 text-center text-xs border-r border-white/10 ${filterItemKey === item.key ? 'bg-yellow-500/10 font-bold text-white' : ''} ${item.isGroupTotal ? 'bg-blue-500/10 font-bold text-blue-200' : ''}`}>
                                                        {student.itemScores[item.key]}
                                                    </td>
                                                ))}

                                                <td className="px-4 py-2 text-center text-sm font-bold text-green-400 border-l border-white/10">{student.totalScore.toFixed(0)}</td>
                                                <td className={`px-4 py-2 text-center text-sm font-bold ${student.grade < 1 ? 'text-red-500' : 'text-yellow-400'}`}>{student.grade.toFixed(1)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                        กรุณาเลือกรายวิชาเพื่อดูข้อมูล
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScoreSummary;
