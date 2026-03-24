import React, { useState, useEffect } from 'react';
import { SystemConfig, Course, RegistrationDay, TeacherScheduleEntry } from '../../types';
import { getSystemConfig, setSystemConfig } from '../../services/googleSheetService';
import { getCourseCatalog } from '../../services/courseService';
import { useNotification } from '../../contexts/NotificationContext';
import { COURSE_OPTIONS, REGISTRATION_DAY_OPTIONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

const TeacherSchedule: React.FC = () => {
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableCourses, setAvailableCourses] = useState<string[]>([]);
    const [courseCatalog, setCourseCatalog] = useState<any[]>([]);
    const notification = useNotification();

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<Partial<TeacherScheduleEntry>>({
        course: COURSE_OPTIONS[0],
        day: REGISTRATION_DAY_OPTIONS[0],
        startTime: '08:30',
        endTime: '10:30',
        room: '',
        groupAlias: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            const [configRes, coursesRes] = await Promise.all([
                getSystemConfig(),
                getCourseCatalog()
            ]);
            
            if (configRes.success && configRes.data) {
                setConfig(configRes.data);
            }
            if (coursesRes.success && coursesRes.data) {
                setCourseCatalog(coursesRes.data);
                const activeCourses = coursesRes.data.filter(c => c.isActive).map(c => c.name);
                setAvailableCourses(activeCourses);
                if (activeCourses.length > 0) {
                    setCurrentEntry(prev => ({ ...prev, course: activeCourses[0] as Course }));
                }
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const handleSaveSchedule = async () => {
        if (!config) return;
        setIsSaving(true);
        const response = await setSystemConfig(config);
        if (response.success) {
            notification.addToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'อัปเดตตารางสอนเรียบร้อยแล้ว' });
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
        }
        setIsSaving(false);
    };

    const handleAddEntry = () => {
        if (!config) return;
        
        // Validate
        if (!currentEntry.course || !currentEntry.day || !currentEntry.startTime || !currentEntry.endTime) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
            return;
        }

        const courseData = courseCatalog.find(c => c.name === currentEntry.course);
        const defaultRoom = courseData?.room || config.roomMapping[currentEntry.course as Course] || '';

        const newEntry: TeacherScheduleEntry = {
            id: currentEntry.id || Date.now().toString(),
            course: currentEntry.course as Course,
            day: currentEntry.day as RegistrationDay,
            startTime: currentEntry.startTime!,
            endTime: currentEntry.endTime!,
            room: currentEntry.room || defaultRoom,
            groupAlias: currentEntry.groupAlias || ''
        };

        const currentSchedule = config.teacherSchedule || [];
        
        let updatedSchedule;
        if (isEditing) {
            updatedSchedule = currentSchedule.map(entry => entry.id === newEntry.id ? newEntry : entry);
        } else {
            updatedSchedule = [...currentSchedule, newEntry];
        }

        setConfig({
            ...config,
            teacherSchedule: updatedSchedule
        });

        // Reset form
        setCurrentEntry({
            course: (availableCourses[0] || COURSE_OPTIONS[0]) as Course,
            day: REGISTRATION_DAY_OPTIONS[0],
            startTime: '08:30',
            endTime: '10:30',
            room: '',
            groupAlias: ''
        });
        setIsEditing(false);
    };

    const handleEditEntry = (entry: TeacherScheduleEntry) => {
        setCurrentEntry(entry);
        setIsEditing(true);
    };

    const handleDeleteEntry = (id: string) => {
        if (!config || !config.teacherSchedule) return;
        setConfig({
            ...config,
            teacherSchedule: config.teacherSchedule.filter(entry => entry.id !== id)
        });
    };

    const handleCancelEdit = () => {
        setCurrentEntry({
            course: (availableCourses[0] || COURSE_OPTIONS[0]) as Course,
            day: REGISTRATION_DAY_OPTIONS[0],
            startTime: '08:30',
            endTime: '10:30',
            room: '',
            groupAlias: ''
        });
        setIsEditing(false);
    };

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>;
    if (!config) return <div className="text-center p-10 text-red-500">ไม่สามารถโหลดข้อมูลได้</div>;

    const schedule = config.teacherSchedule || [];
    
    // Sort schedule by day then time
    const dayOrder = {
        'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัสบดี': 4, 'ศุกร์': 5, 'เสาร์': 6, 'อาทิตย์': 7
    };
    
    const sortedSchedule = [...schedule].sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.startTime.localeCompare(b.startTime);
    });

    const inputClass = "block w-full px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดตารางสอน (Teaching Schedule)</h2>
                <button 
                    onClick={handleSaveSchedule} 
                    disabled={isSaving}
                    className="btn-accent font-semibold py-2 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center"
                >
                    {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            บันทึกตารางสอน
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 rounded-2xl sticky top-6">
                        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                            {isEditing ? 'แก้ไขคาบเรียน' : 'เพิ่มคาบเรียน'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>รายวิชา</label>
                                <select 
                                    value={currentEntry.course} 
                                    onChange={e => setCurrentEntry({...currentEntry, course: e.target.value as Course})}
                                    className={inputClass}
                                    style={inputStyle}
                                >
                                    {(availableCourses.length > 0 ? availableCourses : COURSE_OPTIONS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>วัน</label>
                                <select 
                                    value={currentEntry.day} 
                                    onChange={e => setCurrentEntry({...currentEntry, day: e.target.value as RegistrationDay})}
                                    className={inputClass}
                                    style={inputStyle}
                                >
                                    {REGISTRATION_DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เวลาเริ่ม</label>
                                    <input 
                                        type="time" 
                                        value={currentEntry.startTime} 
                                        onChange={e => setCurrentEntry({...currentEntry, startTime: e.target.value})}
                                        className={inputClass}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เวลาสิ้นสุด</label>
                                    <input 
                                        type="time" 
                                        value={currentEntry.endTime} 
                                        onChange={e => setCurrentEntry({...currentEntry, endTime: e.target.value})}
                                        className={inputClass}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>ห้องเรียน (เว้นว่างเพื่อใช้ค่าเริ่มต้น)</label>
                                <input 
                                    type="text" 
                                    value={currentEntry.room} 
                                    onChange={e => setCurrentEntry({...currentEntry, room: e.target.value})}
                                    placeholder={courseCatalog.find(c => c.name === currentEntry.course)?.room || config.roomMapping[currentEntry.course as Course] || 'ระบุห้องเรียน'}
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>กลุ่มเรียน (Optional)</label>
                                <input 
                                    type="text" 
                                    value={currentEntry.groupAlias} 
                                    onChange={e => setCurrentEntry({...currentEntry, groupAlias: e.target.value})}
                                    placeholder="เช่น ปวส.1 กลุ่ม 1"
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </div>
                            
                            <div className="pt-4 flex gap-2">
                                <button 
                                    onClick={handleAddEntry}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    {isEditing ? 'อัปเดต' : 'เพิ่มลงตาราง'}
                                </button>
                                {isEditing && (
                                    <button 
                                        onClick={handleCancelEdit}
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schedule Display Section */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>รายการตารางสอน</h3>
                        
                        {sortedSchedule.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/10">
                                ยังไม่มีข้อมูลตารางสอน
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {REGISTRATION_DAY_OPTIONS.map(day => {
                                    const dayEntries = sortedSchedule.filter(e => e.day === day);
                                    if (dayEntries.length === 0) return null;
                                    
                                    return (
                                        <div key={day} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                            <div className="bg-black/20 px-4 py-2 font-semibold" style={{color: 'var(--text-primary)'}}>
                                                {day}
                                            </div>
                                            <div className="divide-y divide-white/10">
                                                {dayEntries.map(entry => {
                                                    const courseData = courseCatalog.find(c => c.name === entry.course);
                                                    const credits = courseData?.credits || config.courseCredits?.[entry.course] || { theory: 0, practice: 0, credit: 0 };
                                                    const courseCode = courseData?.code || config.courseCodes?.[entry.course] || '';
                                                    const defaultRoom = courseData?.room || config.roomMapping[entry.course] || '-';
                                                    return (
                                                        <div key={entry.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/5 transition-colors">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{entry.startTime} - {entry.endTime}</span>
                                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                                                        ห้อง {entry.room || defaultRoom}
                                                                    </span>
                                                                </div>
                                                                <div className="font-medium" style={{color: 'var(--text-secondary)'}}>
                                                                    {courseCode ? `${courseCode} ` : ''}{entry.course}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-sm">
                                                                    <span className="text-gray-400">ท-ป-น: <span className="text-gray-300">{credits.theory}-{credits.practice}-{credits.credit}</span></span>
                                                                    {entry.groupAlias && (
                                                                        <span className="text-amber-400">กลุ่ม: {entry.groupAlias}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <button 
                                                                    onClick={() => handleEditEntry(entry)}
                                                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                                                                    style={{color: 'var(--text-primary)'}}
                                                                >
                                                                    แก้ไข
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors text-sm"
                                                                >
                                                                    ลบ
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherSchedule;
