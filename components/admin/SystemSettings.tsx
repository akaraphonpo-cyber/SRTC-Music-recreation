
import React, { useState, useEffect } from 'react';
import { SystemConfig, Course } from '../../types';
import { getSystemConfig, setSystemConfig, resetSystemForNewTerm, getAllStudents } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

// Import Tabs
import GeneralTab from './settings/GeneralTab';
import CourseCatalogTab from './settings/CourseCatalogTab';
import NotificationsTab from './settings/NotificationsTab';
import RecruitmentTab from './settings/RecruitmentTab';
import DataTab from './settings/DataTab';

interface SystemSettingsProps {
    onDataChange?: () => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ onDataChange }) => {
    const [config, setConfig] = useState<SystemConfig>({
        term: '',
        year: '',
        teacherName: '',
        roomMapping: {},
        lineChannelAccessToken: '',
        lineDefaultTargetId: '',
        groupLineTargetIds: {},
        classGroupAliases: {}
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [resetProgress, setResetProgress] = useState<string[]>([]);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'general' | 'courseCatalog' | 'notifications' | 'recruitment' | 'data'>('general');
    
    // QR Code State
    const [qrTarget, setQrTarget] = useState<'register' | 'landing'>('register');
    
    const notification = useNotification();

    useEffect(() => {
        const fetchConfig = async () => {
            const response = await getSystemConfig();
            if (response.success && response.data) {
                setConfig(response.data);
            }
            setIsLoading(false);
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleRoomChange = (course: Course, room: string) => {
        setConfig(prev => ({
            ...prev,
            roomMapping: {
                ...prev.roomMapping,
                [course]: room
            }
        }));
    };

    const handleCourseCodeChange = (course: Course, code: string) => {
        setConfig(prev => ({
            ...prev,
            courseCodes: {
                ...prev.courseCodes,
                [course]: code
            }
        }));
    };

    const handleCreditChange = (course: Course, field: 'theory' | 'practice' | 'credit', value: number) => {
        setConfig(prev => {
            const currentCredits = prev.courseCredits?.[course] || { theory: 0, practice: 0, credit: 0 };
            return {
                ...prev,
                courseCredits: {
                    ...prev.courseCredits,
                    [course]: {
                        ...currentCredits,
                        [field]: value
                    }
                }
            };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const response = await setSystemConfig(config);
        if (response.success) {
            notification.addToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'ตั้งค่าระบบเรียบร้อยแล้ว' });
            onDataChange?.();
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
        }
        setIsSaving(false);
    };
    
    // Wrapper for child components to update config state
    const updateConfigState = async (newConfig: SystemConfig) => {
        setConfig(newConfig);
    };
    
    // Wrapper for child components to save directly
    const handleSaveFromChild = async () => {
        await handleSave();
    };

    const handleQuickSetup2_2568 = () => {
        setConfig(prev => ({
            ...prev,
            term: '2',
            year: '2568',
            teacherName: 'นายอัครพนธ์ ป้องจันทา',
            roomMapping: {
                [Course.RECREATION]: '622',
                [Course.LEADERSHIP]: '231',
                [Course.QUALITY_MANAGEMENT]: '231',
                [Course.DANCE_AEROBICS]: '' 
            }
        }));
        notification.addToast({ type: 'info', title: 'โหลดค่าเรียบร้อย', message: 'กรุณากดบันทึกเพื่อยืนยันการตั้งค่า' });
    };

    const handleDownloadBackup = async () => {
        notification.showLoading("กำลังเตรียมไฟล์ Backup...");
        try {
            const response = await getAllStudents();
            if(response.success && response.data) {
                const jsonString = JSON.stringify(response.data, null, 2);
                const blob = new Blob([jsonString], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `srtc_student_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                notification.addToast({ type: 'success', title: 'ดาวน์โหลดสำเร็จ' });
            } else {
                throw new Error("ไม่สามารถดึงข้อมูลได้");
            }
        } catch (error) {
            notification.addToast({ type: 'error', title: 'Error', message: 'การสำรองข้อมูลล้มเหลว' });
        } finally {
            notification.hideLoading();
        }
    };

    const handleResetSystem = () => {
        if (deleteConfirmation !== 'DELETE') {
            notification.addToast({ type: 'warning', title: 'คำยืนยันไม่ถูกต้อง', message: 'กรุณาพิมพ์คำว่า DELETE เพื่อยืนยัน' });
            return;
        }

        notification.showConfirmation({
            title: 'ยืนยันการล้างระบบ?',
            message: 'คุณกำลังจะลบข้อมูลนักศึกษา คะแนน และการเช็คชื่อทั้งหมด เพื่อเริ่มเทอมใหม่ ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้! (แนะนำให้กด Backup ข้อมูลก่อน)',
            confirmText: 'ยืนยันการลบทั้งหมด',
            confirmButtonColor: 'rgb(220, 38, 38)',
            onConfirm: async () => {
                setIsResetting(true);
                setResetProgress([]);
                const res = await resetSystemForNewTerm((msg) => setResetProgress(prev => [...prev, msg]));
                if(res.success) {
                    // Clear cache
                    sessionStorage.removeItem('srtc_admin_students_cache');
                    
                    notification.addToast({ type: 'success', title: 'รีเซ็ตสำเร็จ', message: 'ระบบพร้อมสำหรับการลงทะเบียนเทอมใหม่แล้ว' });
                    setDeleteConfirmation('');
                    
                    // Trigger data refresh in parent
                    if (onDataChange) onDataChange();
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
                setIsResetting(false);
            }
        });
    };

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>;

    const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap min-w-[120px] ${activeTab === id ? 'bg-white shadow text-accent' : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
            style={activeTab === id ? { color: 'rgb(var(--accent-color))' } : { color: 'var(--text-secondary)' }}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>ตั้งค่าระบบ (System Settings)</h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 rounded-xl bg-black/5 p-1.5 overflow-x-auto border border-white/10 no-scrollbar">
                <TabButton 
                    id="general" 
                    label="ข้อมูลทั่วไป" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
                />
                <TabButton 
                    id="courseCatalog" 
                    label="รายวิชาหลัก" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 8.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 8.56z" /><path d="M3.31 11.56l-1.22-.524a1 1 0 00-1.097 1.638l7 3a1 1 0 001.014 0l7-3a1 1 0 00-1.097-1.638l-1.22.524-5.183 2.221a1 1 0 01-.788 0L3.31 11.56z" /></svg>}
                />
                <TabButton 
                    id="notifications" 
                    label="การแจ้งเตือน (LINE)" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg>}
                />
                <TabButton 
                    id="recruitment" 
                    label="รับสมัคร" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>}
                />
                <TabButton 
                    id="data" 
                    label="จัดการข้อมูล" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 8a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2v-4a2 2 0 00-2-2H4zm6-8a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zm0 8a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2z" clipRule="evenodd" /></svg>}
                />
            </div>

            {/* Content Area */}
            <div className="glass-card p-6 rounded-2xl animate-fade-in">
                {activeTab === 'general' && (
                    <GeneralTab 
                        config={config} 
                        handleChange={handleChange} 
                        handleRoomChange={handleRoomChange} 
                        handleCreditChange={handleCreditChange}
                        handleCourseCodeChange={handleCourseCodeChange}
                        handleSave={handleSave} 
                        handleQuickSetup={handleQuickSetup2_2568}
                        isSaving={isSaving}
                    />
                )}

                {activeTab === 'courseCatalog' && (
                    <CourseCatalogTab />
                )}
                
                {activeTab === 'notifications' && (
                    <>
                        <NotificationsTab 
                            config={config} 
                            handleChange={handleChange} 
                            onUpdateConfig={updateConfigState}
                            isSaving={isSaving}
                        />
                        <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
                            <button 
                                onClick={handleSaveFromChild} 
                                disabled={isSaving}
                                className="btn-accent font-semibold py-2.5 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                            >
                                {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : 'บันทึกการตั้งค่า LINE'}
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'recruitment' && (
                    <RecruitmentTab 
                        qrTarget={qrTarget} 
                        setQrTarget={setQrTarget} 
                    />
                )}

                {activeTab === 'data' && (
                    <DataTab 
                        handleDownloadBackup={handleDownloadBackup} 
                        handleResetSystem={handleResetSystem} 
                        deleteConfirmation={deleteConfirmation} 
                        setDeleteConfirmation={setDeleteConfirmation} 
                        isResetting={isResetting} 
                        resetProgress={resetProgress} 
                    />
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
