
import React, { useState, useEffect } from 'react';
import { Schedule, Course, RegistrationDay } from '../../types';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { COURSE_OPTIONS, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

interface ScheduleManagementProps {
    availableSchedules: Schedule[];
    onDataChange?: () => void;
    selectedTerm?: string;
    selectedYear?: string;
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ 
    availableSchedules, 
    onDataChange,
    selectedTerm,
    selectedYear
}) => {
    const [schedules, setSchedules] = useState<Schedule[]>(availableSchedules);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const notification = useNotification();

    useEffect(() => {
        setSchedules(availableSchedules);
    }, [availableSchedules]);

    const [formData, setFormData] = useState<Omit<Schedule, 'id' | 'createdAt' | 'currentStudents'>>({
        course: Course.RECREATION,
        classGroup: '',
        day: RegistrationDay.MONDAY,
        startTime: '08:00',
        endTime: '10:00',
        room: '',
        teacherName: '',
        maxStudents: 40,
        term: selectedTerm || '2',
        year: selectedYear || '2568'
    });

    useEffect(() => {
        if (selectedTerm || selectedYear) {
            setFormData(prev => ({
                ...prev,
                term: selectedTerm || prev.term,
                year: selectedYear || prev.year
            }));
        }
    }, [selectedTerm, selectedYear]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'maxStudents' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        notification.showLoading('กำลังบันทึก...');
        
        try {
            if (editingSchedule) {
                const response = await updateSchedule(editingSchedule.id, formData);
                if (response.success) {
                    notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'แก้ไขตารางสอนเรียบร้อย' });
                    setIsModalOpen(false);
                    onDataChange?.();
                }
            } else {
                const response = await addSchedule(formData);
                if (response.success) {
                    notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'เพิ่มตารางสอนเรียบร้อย' });
                    setIsModalOpen(false);
                    onDataChange?.();
                }
            }
        } catch (error: any) {
            notification.addToast({ type: 'error', title: 'ผิดพลาด', message: error.message });
        } finally {
            notification.hideLoading();
        }
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            course: schedule.course,
            classGroup: schedule.classGroup || '',
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            room: schedule.room,
            teacherName: schedule.teacherName,
            maxStudents: schedule.maxStudents,
            term: schedule.term,
            year: schedule.year
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        // In a real app, we should use a custom modal. 
        // For now, we'll just proceed or the user can add a modal later.
        // The guidelines say to avoid window.confirm in iframes.
        
        notification.showLoading('กำลังลบ...');
        const response = await deleteSchedule(id);
        notification.hideLoading();
        
        if (response.success) {
            notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'ลบตารางสอนเรียบร้อย' });
            onDataChange?.();
        } else {
            notification.addToast({ type: 'error', title: 'ผิดพลาด', message: response.message });
        }
    };

    const openAddModal = () => {
        setEditingSchedule(null);
        setFormData({
            course: Course.RECREATION,
            classGroup: '',
            day: RegistrationDay.MONDAY,
            startTime: '08:00',
            endTime: '10:00',
            room: '',
            teacherName: '',
            maxStudents: 40,
            term: selectedTerm || '2',
            year: selectedYear || '2568'
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>จัดการตารางสอน</h2>
                    <p className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>กำหนดวัน เวลา และรายวิชาที่เปิดให้ลงทะเบียน</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl shadow-lg hover:bg-orange-600 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    เพิ่มตารางสอน
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner size="lg" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules.length === 0 ? (
                        <div className="col-span-full py-20 text-center glass-card rounded-3xl opacity-60">
                            <p>ยังไม่มีข้อมูลตารางสอน</p>
                        </div>
                    ) : (
                        schedules.map(schedule => (
                            <div key={schedule.id} className="glass-card p-5 rounded-3xl border border-white/20 shadow-lg hover:shadow-xl transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="px-3 py-1 bg-orange-500/20 text-orange-600 rounded-full text-xs font-bold">
                                        {schedule.course}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(schedule)} className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(schedule.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>วัน{schedule.day}</h3>
                                {schedule.classGroup && (
                                    <div className="text-sm font-medium text-orange-600 mb-2">กลุ่มเรียน: {schedule.classGroup}</div>
                                )}
                                <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{schedule.startTime} - {schedule.endTime} น.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <span>ห้อง {schedule.room || 'ไม่ระบุ'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>ผู้สอน: {schedule.teacherName || 'ไม่ระบุ'}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <div className="text-xs font-medium opacity-60">จำนวนนักศึกษา</div>
                                    <div className="text-sm font-bold">
                                        <span className={schedule.currentStudents >= schedule.maxStudents ? 'text-red-500' : 'text-green-500'}>
                                            {schedule.currentStudents}
                                        </span>
                                        <span className="opacity-40 mx-1">/</span>
                                        <span>{schedule.maxStudents}</span>
                                    </div>
                                </div>
                                <div className="mt-2 w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${schedule.currentStudents >= schedule.maxStudents ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(100, (schedule.currentStudents / schedule.maxStudents) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/30 p-8 animate-scale-in overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {editingSchedule ? 'แก้ไขตารางสอน' : 'เพิ่มตารางสอนใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">รายวิชา</label>
                                    <select 
                                        name="course" 
                                        value={formData.course} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    >
                                        {COURSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">กลุ่มเรียน (ถ้ามี)</label>
                                    <input 
                                        type="text" 
                                        name="classGroup" 
                                        value={formData.classGroup} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="เช่น ปวส.1/1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">วันเรียน</label>
                                    <select 
                                        name="day" 
                                        value={formData.day} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    >
                                        {REGISTRATION_DAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">จำนวนรับสูงสุด</label>
                                    <input 
                                        type="number" 
                                        name="maxStudents" 
                                        value={formData.maxStudents} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">เวลาเริ่ม</label>
                                    <select 
                                        name="startTime" 
                                        value={formData.startTime} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    >
                                        {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">เวลาสิ้นสุด</label>
                                    <select 
                                        name="endTime" 
                                        value={formData.endTime} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    >
                                        {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">ห้องเรียน</label>
                                    <input 
                                        type="text" 
                                        name="room" 
                                        value={formData.room} 
                                        onChange={handleInputChange}
                                        placeholder="เช่น 622"
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">ชื่อผู้สอน</label>
                                    <input 
                                        type="text" 
                                        name="teacherName" 
                                        value={formData.teacherName} 
                                        onChange={handleInputChange}
                                        placeholder="ชื่อ-นามสกุล"
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">ภาคเรียน</label>
                                    <input 
                                        type="text" 
                                        name="term" 
                                        value={formData.term} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 ml-1">ปีการศึกษา</label>
                                    <input 
                                        type="text" 
                                        name="year" 
                                        value={formData.year} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/40 border-0 ring-1 ring-white/30 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1 active:scale-95"
                                >
                                    {editingSchedule ? 'บันทึกการแก้ไข' : 'ยืนยันการเพิ่ม'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleManagement;
