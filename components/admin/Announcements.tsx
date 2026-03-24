
import React, { useState, useEffect, useCallback } from 'react';
import { AnnouncementWithId, Announcement, AnnouncementImportance, Course, Department } from '../../types';
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { ANNOUNCEMENT_IMPORTANCE_OPTIONS, COURSE_OPTIONS, DEPARTMENT_OPTIONS } from '../../constants';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

const emptyAnnouncement: Omit<Announcement, 'createdAt' | 'updatedAt'> = {
  title: '',
  content: '',
  importance: AnnouncementImportance.NORMAL,
  isPinned: false,
  targetCourses: 'ALL',
  targetDepartments: 'ALL',
};

const Announcements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<AnnouncementWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Create/Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<AnnouncementWithId>>(emptyAnnouncement);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const notification = useNotification();

    const fetchData = useCallback(async (showLoading = true) => {
        // Always yield to avoid synchronous update in effect
        await Promise.resolve();
        
        if (showLoading) {
            setIsLoading(true);
        }
        const response = await getAnnouncements();
        if (response.success && response.data) {
            setAnnouncements(response.data);
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message || 'ไม่สามารถโหลดประกาศได้' });
        }
        setIsLoading(false);
    }, [notification]);

    useEffect(() => {
        void fetchData(false);
    }, [fetchData]);

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentAnnouncement(emptyAnnouncement);
        setIsModalOpen(true);
    };

    const openEditModal = (ann: AnnouncementWithId) => {
        setIsEditing(true);
        setCurrentAnnouncement(ann);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // @ts-ignore
        const checked = e.target.checked;
        setCurrentAnnouncement(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
    };

    const handleMultiCheckboxChange = (field: 'targetCourses' | 'targetDepartments', value: Course | Department) => {
        setCurrentAnnouncement(prev => {
            const currentSelection = prev[field];
            if (currentSelection === 'ALL') {
                return { ...prev, [field]: [value] };
            }
            const newSelection = [...(currentSelection || [])];
            const index = newSelection.indexOf(value);
            if (index > -1) {
                newSelection.splice(index, 1);
            } else {
                newSelection.push(value);
            }
            // If all are selected, or none are selected, treat as ALL
            const allOptions = field === 'targetCourses' ? COURSE_OPTIONS : DEPARTMENT_OPTIONS;
            if(newSelection.length === 0 || newSelection.length === allOptions.length) {
                return {...prev, [field]: 'ALL'};
            }
            return { ...prev, [field]: newSelection };
        });
    };
    
    const handleSelectAll = (field: 'targetCourses' | 'targetDepartments') => {
        setCurrentAnnouncement(prev => ({...prev, [field]: 'ALL'}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAnnouncement.title || !currentAnnouncement.content) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหัวข้อและเนื้อหา' });
            return;
        }

        setIsSubmitting(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, ...dataToSave } = currentAnnouncement;

        let response;
        if (isEditing && id) {
            response = await updateAnnouncement(id, dataToSave);
        } else {
            response = await addAnnouncement(dataToSave as Announcement);
        }

        if (response.success) {
            closeModal();
            fetchData();
            notification.addToast({ type: 'success', title: 'สำเร็จ', message: response.message });
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
        }
        setIsSubmitting(false);
    };

    const handleDelete = (ann: AnnouncementWithId) => {
        notification.showConfirmation({
            title: 'ยืนยันการลบ?',
            message: `คุณต้องการลบประกาศ "${ann.title}" ใช่หรือไม่?`,
            confirmText: 'ใช่, ลบเลย',
            onConfirm: async () => {
                const res = await deleteAnnouncement(ann.id);
                if (res.success) {
                    fetchData();
                    notification.addToast({ type: 'success', title: 'ลบสำเร็จ!' });
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
            }
        });
    };
    
    const handleShareClick = (ann: AnnouncementWithId) => {
        const appUrl = window.location.href.split('#')[0]; 
        // Truncate content to prevent 400 Bad Request due to URL length limits
        const content = ann.content.length > 500 ? ann.content.substring(0, 497) + '...' : ann.content;
        
        const message = `📢 *ประกาศจากชมรม (SRTC)*\n\n📌 **${ann.title}**\n\n${content}\n\n⚠️ ความสำคัญ: ${ann.importance}\n\n🔗 เข้าสู่ระบบเพื่อดูรายละเอียดเพิ่มเติม:\n${appUrl}#/student-portal`;
        
        setShareMessage(message);
        setIsShareModalOpen(true);
    };

    const handleCopyShare = () => {
        navigator.clipboard.writeText(shareMessage).then(() => {
            notification.addToast({ type: 'success', title: 'คัดลอกแล้ว', message: 'นำไปวางใน LINE PC ได้เลย' });
        });
    };

    const handleConfirmShare = () => {
        const encodedMessage = encodeURIComponent(shareMessage);
        // Use /share?text= which is the modern and safer endpoint for sharing text+links
        const lineUrl = `https://line.me/R/share?text=${encodedMessage}`;
        window.open(lineUrl, '_blank');
        setIsShareModalOpen(false);
    };
    
    const getImportanceStyles = (importance: AnnouncementImportance) => {
        switch(importance) {
            case AnnouncementImportance.URGENT: return { badge: 'bg-red-500/30 text-red-300', border: 'border-red-500/50' };
            case AnnouncementImportance.IMPORTANT: return { badge: 'bg-accent/30 text-accent', border: 'border-accent/50' };
            default: return { badge: 'bg-slate-500/20 text-slate-300', border: 'border-transparent' };
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div>;
        if (announcements.length === 0) return <p className="text-center py-8" style={{color: 'var(--text-muted)'}}>ยังไม่มีประกาศ</p>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.map(ann => {
                    const styles = getImportanceStyles(ann.importance);
                    return (
                        <div key={ann.id} className={`glass-card p-5 rounded-xl flex flex-col justify-between border-l-4 ${styles.border}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg pr-2 text-shadow" style={{color: 'var(--text-primary)'}}>{ann.title}</h3>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      {ann.isPinned && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{color: 'rgb(var(--accent-color))'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V4a1 1 0 011-1zm-7 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                      )}
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.badge}`}>{ann.importance}</span>
                                    </div>
                                </div>
                                <p className="text-sm line-clamp-3 mb-3" style={{color: 'var(--text-secondary)'}}>{ann.content}</p>
                                <p className="text-xs" style={{color: 'var(--text-muted)'}}>สร้างเมื่อ: {new Date(ann.createdAt).toLocaleDateString('th-TH')}</p>
                            </div>
                            <div className="flex justify-between items-center border-t pt-3 mt-4" style={{borderColor: 'var(--glass-border)'}}>
                                <button 
                                    onClick={() => handleShareClick(ann)} 
                                    className="flex items-center text-xs font-bold px-3 py-1.5 rounded-full transition-transform hover:scale-105 bg-[#06C755] text-white shadow-md"
                                    title="แชร์ลงกลุ่ม LINE"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                                        <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                                    </svg>
                                    แชร์
                                </button>
                                <div className="flex space-x-3">
                                    <button onClick={() => openEditModal(ann)} className="text-sm font-medium" style={{color: 'rgb(var(--accent-color))'}}>แก้ไข</button>
                                    <button onClick={() => handleDelete(ann)} className="text-sm font-medium" style={{color: 'rgb(var(--text-danger-rgb))'}}>ลบ</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const commonInputClass = "mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>ประกาศ / ข่าวสาร</h2>
                <button onClick={openAddModal} className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:scale-105">+ สร้างประกาศใหม่</button>
            </div>
            {renderContent()}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'} size="fullscreen">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>หัวข้อ</label>
                        <input type="text" name="title" id="title" value={currentAnnouncement.title || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>เนื้อหา</label>
                        <textarea name="content" id="content" value={currentAnnouncement.content || ''} onChange={handleInputChange} required rows={6} className={commonInputClass} style={inputStyle}></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="importance" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>ระดับความสำคัญ</label>
                            <select name="importance" id="importance" value={currentAnnouncement.importance || ''} onChange={handleInputChange} className={commonInputClass} style={inputStyle}>
                                {ANNOUNCEMENT_IMPORTANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end pb-2">
                             <div className="flex items-center">
                                <input type="checkbox" name="isPinned" id="isPinned" checked={!!currentAnnouncement.isPinned} onChange={handleInputChange} className="h-5 w-5 rounded" style={{accentColor: 'rgb(var(--accent-color))'}} />
                                <label htmlFor="isPinned" className="ml-2 text-sm font-medium" style={{color: 'var(--text-secondary)'}}>ปักหมุดประกาศนี้</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เป้าหมาย (รายวิชา)</label>
                        <button type="button" onClick={() => handleSelectAll('targetCourses')} className={`text-xs px-2 py-1 rounded-md mr-2 ${currentAnnouncement.targetCourses === 'ALL' ? 'btn-accent' : ''}`} style={currentAnnouncement.targetCourses !== 'ALL' ? {backgroundColor: 'var(--glass-border)'} : {}}>ทั้งหมด</button>
                        {COURSE_OPTIONS.map(course => (
                            <button type="button" key={course} onClick={() => handleMultiCheckboxChange('targetCourses', course)} className={`text-xs px-2 py-1 rounded-md mr-2 mb-1 ${currentAnnouncement.targetCourses !== 'ALL' && currentAnnouncement.targetCourses?.includes(course) ? 'btn-accent' : ''}`} style={currentAnnouncement.targetCourses !== 'ALL' && !currentAnnouncement.targetCourses?.includes(course) ? {backgroundColor: 'var(--glass-border)'} : {}}>
                                {course}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เป้าหมาย (แผนกวิชา)</label>
                        <button type="button" onClick={() => handleSelectAll('targetDepartments')} className={`text-xs px-2 py-1 rounded-md mr-2 ${currentAnnouncement.targetDepartments === 'ALL' ? 'btn-accent' : ''}`} style={currentAnnouncement.targetDepartments !== 'ALL' ? {backgroundColor: 'var(--glass-border)'} : {}}>ทั้งหมด</button>
                        {DEPARTMENT_OPTIONS.map(dept => (
                             <button type="button" key={dept} onClick={() => handleMultiCheckboxChange('targetDepartments', dept)} className={`text-xs px-2 py-1 rounded-md mr-2 mb-1 ${currentAnnouncement.targetDepartments !== 'ALL' && currentAnnouncement.targetDepartments?.includes(dept) ? 'btn-accent' : ''}`} style={currentAnnouncement.targetDepartments !== 'ALL' && !currentAnnouncement.targetDepartments?.includes(dept) ? {backgroundColor: 'var(--glass-border)'} : {}}>
                                {dept}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm" style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}>ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting} className="btn-accent px-4 py-2 text-sm font-medium rounded-lg shadow-sm disabled:opacity-50">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </div>
                </form>
            </Modal>

            {/* Share Preview Modal */}
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="แชร์ลง LINE" size="lg">
                <div className="space-y-4">
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        คุณสามารถแก้ไขข้อความด้านล่างก่อนที่จะแชร์ได้
                    </p>
                    <textarea 
                        value={shareMessage} 
                        onChange={(e) => setShareMessage(e.target.value)} 
                        rows={10}
                        className="w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border transition-all"
                        style={{
                            color: 'var(--text-primary)', 
                            backgroundColor: 'var(--input-bg)', 
                            borderColor: 'var(--input-border)'
                        }}
                    />
                    <div className="flex justify-end space-x-3 pt-2">
                        <button 
                            onClick={handleCopyShare} 
                            className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-gray-200 text-gray-700 hover:bg-gray-300" 
                        >
                            คัดลอก (Copy)
                        </button>
                        <button 
                            onClick={handleConfirmShare} 
                            className="flex items-center px-6 py-2 text-sm font-bold rounded-lg text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 bg-[#06C755]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                                <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                            </svg>
                            ยืนยันการแชร์
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Announcements;
