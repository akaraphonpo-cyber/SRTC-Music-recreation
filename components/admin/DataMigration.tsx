import React, { useState } from 'react';
import { migrateStudentData } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';

interface DataMigrationProps {
    onMigrationComplete: () => void;
}

const DataMigration: React.FC<DataMigrationProps> = ({ onMigrationComplete }) => {
    const [isMigrating, setIsMigrating] = useState(false);
    const [progressLog, setProgressLog] = useState<string[]>([]);
    const notification = useNotification();

    const handleProgress = (message: string) => {
        setProgressLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleStartMigration = () => {
        notification.showConfirmation({
            title: 'ยืนยันการย้ายข้อมูล?',
            message: 'กระบวนการนี้จะเปลี่ยนโครงสร้างข้อมูลนักศึกษาเพื่อเพิ่มประสิทธิภาพและลดค่าใช้จ่าย ไม่สามารถย้อนกลับได้ แต่ข้อมูลทั้งหมดจะยังอยู่ครบถ้วน',
            confirmText: 'ใช่, เริ่มเลย!',
            onConfirm: async () => {
                setIsMigrating(true);
                setProgressLog([]);
                const response = await migrateStudentData(handleProgress);
                if (response.success) {
                    notification.addToast({ type: 'success', title: 'การย้ายข้อมูลสำเร็จ!', message: 'ข้อมูลนักศึกษาทั้งหมดอยู่ในรูปแบบใหม่แล้ว' });
                    onMigrationComplete(); // Refresh student list in dashboard
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด!', message: `การย้ายข้อมูลล้มเหลว: ${response.message}` });
                }
                setIsMigrating(false);
            },
        });
    };

    return (
        <div className="glass-card p-6 rounded-2xl max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-shadow" style={{ color: 'rgb(var(--text-danger-rgb))' }}>
                    เครื่องมือย้ายข้อมูลนักศึกษา (Data Migration)
                </h2>
                <p className="mt-2 text-shadow" style={{ color: 'var(--text-secondary)' }}>
                    เครื่องมือนี้ใช้สำหรับแก้ไขโครงสร้างข้อมูลนักศึกษาเพื่อแก้ปัญหาเรื่องค่าใช้จ่าย (Reads) ที่สูง
                </p>
                <p className="mt-1 text-sm text-shadow" style={{ color: 'var(--text-muted)' }}>
                    **คำเตือน:** ควรทำเพียงครั้งเดียวเท่านั้น หลังจากทำเสร็จแล้ว ระบบจะทำงานได้เต็มประสิทธิภาพ
                </p>
            </div>

            <div className="mt-6 flex justify-center">
                <button
                    onClick={handleStartMigration}
                    disabled={isMigrating}
                    className="btn-accent font-bold py-3 px-6 rounded-lg shadow-lg text-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'rgb(var(--text-danger-rgb))' }}
                >
                    {isMigrating ? 'กำลังดำเนินการ...' : 'Start Student Data Migration'}
                </button>
            </div>

            {progressLog.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>สถานะการทำงาน:</h3>
                    <div
                        className="mt-2 p-4 glass-card rounded-lg bg-black/20 max-h-64 overflow-y-auto font-mono text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {progressLog.map((log, index) => (
                            <p key={index}>{log}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataMigration;