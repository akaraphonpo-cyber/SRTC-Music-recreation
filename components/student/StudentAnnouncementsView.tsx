
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentWithId, AnnouncementWithId, AnnouncementImportance, Course, Department } from '../../types';
import { getAnnouncements } from '../../services/contentService';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import { useNotification } from '../../contexts/NotificationContext';

interface StudentAnnouncementsViewProps {
    student: StudentWithId;
    summaryMode?: boolean;
    onViewAll?: () => void;
}

const StudentAnnouncementsView: React.FC<StudentAnnouncementsViewProps> = ({ student, summaryMode = false, onViewAll }) => {
    const [allAnnouncements, setAllAnnouncements] = useState<AnnouncementWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [importanceFilter, setImportanceFilter] = useState<AnnouncementImportance | 'ALL'>('ALL');
    
    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareMessage, setShareMessage] = useState('');
    
    const notification = useNotification();

    const fetchAnnouncements = useCallback(async () => {
        setIsLoading(true);
        const response = await getAnnouncements();
        if (response.success && response.data) {
            setAllAnnouncements(response.data);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const filteredAnnouncements = useMemo(() => {
        let announcements = allAnnouncements
            .filter(ann => { // Student visibility filter
                const studentCourses = student.courses || [];
                const courseMatch = ann.targetCourses === 'ALL' || (Array.isArray(ann.targetCourses) && studentCourses.some(sc => ann.targetCourses.includes(sc)));
                const departmentMatch = ann.targetDepartments === 'ALL' || (Array.isArray(ann.targetDepartments) && ann.targetDepartments.includes(student.department));
                return courseMatch && departmentMatch;
            });
        
        if (summaryMode) {
            return announcements.slice(0, 2);
        }

        return announcements
            .filter(ann => { // Importance filter
                if (importanceFilter === 'ALL') return true;
                return ann.importance === importanceFilter;
            })
            .filter(ann => { // Search term filter
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return ann.title.toLowerCase().includes(lowerSearch) || ann.content.toLowerCase().includes(lowerSearch);
            });
    }, [allAnnouncements, student, importanceFilter, searchTerm, summaryMode]);
    
    const getImportanceStyles = (importance: AnnouncementImportance) => {
        switch(importance) {
            case AnnouncementImportance.URGENT: return { badge: 'bg-red-500/30 text-red-300', border: 'border-red-500/50' };
            case AnnouncementImportance.IMPORTANT: return { badge: 'bg-accent/30 text-accent', border: 'border-accent/50' };
            default: return { badge: 'bg-slate-500/20 text-slate-300', border: 'border-transparent' };
        }
    };

    const handleShareClick = (ann: AnnouncementWithId) => {
        const appUrl = window.location.href.split('#')[0]; 
        // Truncate content for URL safety (approx 500 chars)
        const content = ann.content.length > 500 ? ann.content.substring(0, 497) + '...' : ann.content;
        
        const message = `📢 *${ann.title}*\n\n${content}\n\nอ่านต่อที่: ${appUrl}#/student-portal`;
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
        // Use modern share link
        window.open(`https://line.me/R/share?text=${encodedMessage}`, '_blank');
        setIsShareModalOpen(false);
    };

    const renderAnnouncementsList = () => {
        if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner size="md" /></div>;
        if (filteredAnnouncements.length === 0) return <p className="text-center py-8" style={{color: 'var(--text-muted)'}}>ไม่พบประกาศ</p>;
        
        return (
             <div className="space-y-4">
                {filteredAnnouncements.map(ann => {
                    const styles = getImportanceStyles(ann.importance);
                    return (
                        <div key={ann.id} className={`glass-card p-5 rounded-xl border-l-4 ${styles.border} transition-transform hover:-translate-y-1`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-md pr-2 text-shadow" style={{color: 'var(--text-primary)'}}>{ann.title}</h3>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                    {ann.isPinned && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{color: 'rgb(var(--accent-color))'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V4a1 1 0 011-1zm-7 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    )}
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>{ann.importance}</span>
                                </div>
                            </div>
                            <p className="text-xs mb-3" style={{color: 'var(--text-muted)'}}>ประกาศเมื่อ: {new Date(ann.createdAt).toLocaleString('th-TH')}</p>
                            <div className={`prose prose-sm max-w-none text-shadow ${summaryMode ? 'line-clamp-2' : ''}`} style={{color: 'var(--text-secondary)'}} dangerouslySetInnerHTML={{ __html: ann.content.replace(/\n/g, '<br />') }} />
                            
                            {!summaryMode && (
                                <div className="mt-4 flex justify-end">
                                    <button 
                                        onClick={() => handleShareClick(ann)} 
                                        className="flex items-center text-xs font-bold px-3 py-1.5 rounded-full transition-transform hover:scale-105 bg-[#06C755] text-white shadow-sm opacity-90 hover:opacity-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                                            <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                                        </svg>
                                        แชร์
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };
    
    if (summaryMode) {
        return (
             <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>ประกาศล่าสุด</h3>
                    {onViewAll && <button onClick={onViewAll} className="text-sm font-semibold" style={{color: 'rgb(var(--accent-color))'}}>ดูทั้งหมด</button>}
                </div>
                <div className="flex-grow">
                    {renderAnnouncementsList()}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <h3 className="text-2xl font-bold text-shadow px-2" style={{ color: 'var(--text-primary)' }}>
                ประกาศ / ข่าวสาร
            </h3>
            <div className="glass-card p-4 rounded-xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหาในประกาศ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                        style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}
                    />
                    <select
                        value={importanceFilter}
                        onChange={e => setImportanceFilter(e.target.value as any)}
                         className="w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                        style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}
                    >
                        <option value="ALL">แสดงทุกระดับความสำคัญ</option>
                        {Object.values(AnnouncementImportance).map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>
            </div>
            {renderAnnouncementsList()}

            {/* Share Preview Modal */}
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="แชร์ลง LINE" size="md">
                <div className="space-y-4">
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        คุณสามารถแก้ไขข้อความด้านล่างก่อนที่จะแชร์ได้
                    </p>
                    <textarea 
                        value={shareMessage} 
                        onChange={(e) => setShareMessage(e.target.value)} 
                        rows={8}
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

export default StudentAnnouncementsView;
