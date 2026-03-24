
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WeeklyActivityLog, WeeklyActivityLogWithId, Course, Department, ClassLevel } from '../../types';
import { getWeeklyActivityLogsForWeek, addWeeklyActivityLog, updateWeeklyActivityLog, deleteWeeklyActivityLog } from '../../services/googleSheetService';
import { getCourseCatalog } from '../../services/courseService';
import { useNotification } from '../../contexts/NotificationContext';
import { COURSE_OPTIONS, DEPARTMENT_OPTIONS, CLASS_LEVEL_OPTIONS, TIME_OPTIONS } from '../../constants';
import { toYYYYMMDD, getStartOfWeek, getWeekDateRangeText } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

const emptyLog: Omit<WeeklyActivityLog, 'weekStartDate'> = {
  course: Course.RECREATION,
  department: Department.IT,
  classLevel: ClassLevel.PVS1,
  activityDescription: '',
  activityDate: new Date().toISOString().split('T')[0], // Default to today
  startTime: '08:30',
  endTime: '10:00',
};

interface WeeklyActivitiesProps {
    selectedTerm?: string;
    selectedYear?: string;
}

const WeeklyActivities: React.FC<WeeklyActivitiesProps> = ({ selectedTerm, selectedYear }) => {
    const [logs, setLogs] = useState<WeeklyActivityLogWithId[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return getStartOfWeek(today);
    });
    const [isLoading, setIsLoading] = useState(true);
    const [availableCourses, setAvailableCourses] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentLog, setCurrentLog] = useState<Partial<WeeklyActivityLogWithId>>(emptyLog);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notification = useNotification();

    const fetchLogs = useCallback(async (weekStart: Date) => {
        await Promise.resolve();
        setIsLoading(true);
        const startDateString = toYYYYMMDD(weekStart);
        const [response, coursesRes] = await Promise.all([
            getWeeklyActivityLogsForWeek(startDateString, selectedTerm, selectedYear),
            getCourseCatalog()
        ]);
        if (response.success && response.data) {
            setLogs(response.data);
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลกิจกรรมได้' });
        }
        if (coursesRes.success && coursesRes.data) {
            const activeCourses = coursesRes.data.filter(c => c.isActive).map(c => c.name);
            setAvailableCourses(activeCourses);
        }
        setIsLoading(false);
    }, [notification, selectedTerm, selectedYear]);

    useEffect(() => {
        void fetchLogs(currentWeekStart);
    }, [currentWeekStart, fetchLogs]);

    const groupedLogs = useMemo(() => {
        const grouped = logs.reduce((acc, log) => {
            (acc[log.course] = acc[log.course] || []).push(log);
            return acc;
        }, {} as Record<Course, WeeklyActivityLogWithId[]>);

        // Sort logs within each course group by date and time
        for (const course in grouped) {
            grouped[course as Course].sort((a, b) => {
                const dateA = new Date(a.activityDate || 0).getTime();
                const dateB = new Date(b.activityDate || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.startTime || '').localeCompare(b.startTime || '');
            });
        }

        return grouped;
    }, [logs]);

    const handlePrevWeek = () => {
        setCurrentWeekStart(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            return newDate;
        });
    };

    const handleNextWeek = () => {
         setCurrentWeekStart(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            return newDate;
        });
    };
    
    // --- Modal Handlers ---
    const openAddModal = () => {
        setIsEditing(false);
        setCurrentLog({
            ...emptyLog,
            activityDate: new Date().toISOString().split('T')[0] // Ensure default is today
        });
        setIsModalOpen(true);
    };

    const openEditModal = (log: WeeklyActivityLogWithId) => {
        setIsEditing(true);
        setCurrentLog(log);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentLog(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!currentLog.course || !currentLog.department || !currentLog.classLevel || !currentLog.activityDescription?.trim() || !currentLog.activityDate || !currentLog.startTime || !currentLog.endTime) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
            return;
        }

        if (currentLog.startTime >= currentLog.endTime) {
            notification.addToast({ type: 'warning', title: 'เวลาไม่ถูกต้อง', message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' });
            return;
        }

        setIsSubmitting(true);
        
        let response;
        const weekStartDate = toYYYYMMDD(currentWeekStart);
        
        if (isEditing && currentLog.id) {
            const { id, createdAt, updatedAt, ...dataToUpdate } = currentLog;
            response = await updateWeeklyActivityLog(id, dataToUpdate);
        } else {
            const dataToAdd: WeeklyActivityLog = {
                weekStartDate,
                course: currentLog.course!,
                department: currentLog.department!,
                classLevel: currentLog.classLevel!,
                activityDescription: currentLog.activityDescription!,
                activityDate: currentLog.activityDate,
                startTime: currentLog.startTime,
                endTime: currentLog.endTime,
            };
            response = await addWeeklyActivityLog(dataToAdd);
        }
        
        if (response.success) {
            closeModal();
            fetchLogs(currentWeekStart);
            notification.addToast({ type: 'success', title: 'สำเร็จ!', message: response.message });
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
        }
        
        setIsSubmitting(false);
    };

    const handleDelete = (log: WeeklyActivityLogWithId) => {
        notification.showConfirmation({
            title: 'ยืนยันการลบ?',
            message: `คุณต้องการลบบันทึกของห้อง ${log.department} - ${log.classLevel} ใช่หรือไม่?`,
            confirmText: 'ใช่, ลบเลย',
            onConfirm: async () => {
                const res = await deleteWeeklyActivityLog(log.id);
                if (res.success) {
                    fetchLogs(currentWeekStart);
                    notification.addToast({ type: 'success', title: 'ลบสำเร็จ!' });
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
            }
        });
    };
    
    const commonInputClass = "mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 glass-card rounded-2xl">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>บันทึกกิจกรรมรายสัปดาห์</h2>
                    <p className="font-semibold" style={{color: 'rgb(var(--accent-color))'}}>{getWeekDateRangeText(currentWeekStart)}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handlePrevWeek} className="p-2 rounded-lg hover:bg-black/10 transition-colors" style={{color: 'var(--text-secondary)'}} aria-label="Previous week">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={handleNextWeek} className="p-2 rounded-lg hover:bg-black/10 transition-colors" style={{color: 'var(--text-secondary)'}} aria-label="Next week">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={openAddModal} className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:scale-105">+ เพิ่มบันทึก</button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div>
            ) : Object.keys(groupedLogs).length > 0 ? (
                <div className="space-y-8">
                    {/* FIX: Explicitly type `courseLogs` to resolve potential type inference issues with `Object.entries`. */}
                    {Object.entries(groupedLogs).map(([course, courseLogs]: [string, WeeklyActivityLogWithId[]]) => (
                        <div key={course}>
                            <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{color: `rgb(var(--accent-color))`, borderColor: 'var(--glass-border)'}}>{course}</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courseLogs.map(log => (
                                    <div key={log.id} className="glass-card p-5 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{log.department} - {log.classLevel}</h4>
                                            <div className="text-xs my-2 font-semibold p-2 rounded-md" style={{color: 'var(--text-secondary)', backgroundColor: 'var(--input-bg)'}}>
                                                <p>วันที่: {new Date(log.activityDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                <p>เวลา: {log.startTime} - {log.endTime} น.</p>
                                            </div>
                                            <p className="text-sm my-2 whitespace-pre-wrap" style={{color: 'var(--text-secondary)'}}>{log.activityDescription}</p>
                                        </div>
                                        <div className="flex justify-end space-x-3 border-t pt-3 mt-4" style={{borderColor: 'var(--glass-border)'}}>
                                            <button onClick={() => openEditModal(log)} className="text-sm font-medium" style={{color: 'rgb(var(--accent-color))'}}>แก้ไข</button>
                                            <button onClick={() => handleDelete(log)} className="text-sm font-medium" style={{color: 'rgb(var(--text-danger-rgb))'}}>ลบ</button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 glass-card rounded-2xl">
                    <p className="text-lg font-semibold" style={{color: 'var(--text-secondary)'}}>ไม่พบข้อมูลกิจกรรมในสัปดาห์นี้</p>
                    <p style={{color: 'var(--text-muted)'}}>คลิก "เพิ่มบันทึก" เพื่อเริ่มต้น</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขบันทึก' : 'เพิ่มบันทึกกิจกรรม'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="course" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>รายวิชา</label>
                        <select name="course" id="course" value={currentLog.course || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                            {(availableCourses.length > 0 ? availableCourses : COURSE_OPTIONS).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>แผนกวิชา</label>
                            <select name="department" id="department" value={currentLog.department || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                                {DEPARTMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="classLevel" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>ระดับชั้น</label>
                            <select name="classLevel" id="classLevel" value={currentLog.classLevel || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                                {CLASS_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor="activityDate" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>วันที่</label>
                            <input type="date" name="activityDate" id="activityDate" value={currentLog.activityDate || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}/>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="startTime" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>เวลาเริ่มต้น</label>
                             <select name="startTime" id="startTime" value={currentLog.startTime || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                                <option value="">เลือกเวลา</option>
                                {TIME_OPTIONS.map(opt => <option key={`start-${opt}`} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="endTime" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>เวลาสิ้นสุด</label>
                            <select name="endTime" id="endTime" value={currentLog.endTime || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                                <option value="">เลือกเวลา</option>
                                {TIME_OPTIONS.map(opt => <option key={`end-${opt}`} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

                     <div>
                        <label htmlFor="activityDescription" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>รายละเอียดกิจกรรม</label>
                        <textarea name="activityDescription" id="activityDescription" value={currentLog.activityDescription || ''} onChange={handleInputChange} required rows={5} className={commonInputClass} style={inputStyle}></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm" style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}>ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting} className="btn-accent px-4 py-2 text-sm font-medium rounded-lg shadow-sm disabled:opacity-50">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default WeeklyActivities;
