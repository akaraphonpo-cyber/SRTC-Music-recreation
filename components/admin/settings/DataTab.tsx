
import React from 'react';
import LoadingSpinner from '../../common/LoadingSpinner';

interface DataTabProps {
    handleDownloadBackup: () => void;
    handleResetSystem: () => void;
    handleFactoryReset: () => void;
    deleteConfirmation: string;
    setDeleteConfirmation: (val: string) => void;
    factoryResetConfirmation: string;
    setFactoryResetConfirmation: (val: string) => void;
    isResetting: boolean;
    resetProgress: string[];
}

const DataTab: React.FC<DataTabProps> = ({ 
    handleDownloadBackup, 
    handleResetSystem, 
    handleFactoryReset,
    deleteConfirmation, 
    setDeleteConfirmation, 
    factoryResetConfirmation,
    setFactoryResetConfirmation,
    isResetting, 
    resetProgress 
}) => {
    const inputClass = "block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2" style={{color: 'rgb(var(--text-danger-rgb))'}}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                โซนอันตราย (Data Management)
            </h3>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                        <h4 className="font-bold" style={{color: 'var(--text-primary)'}}>สำรองข้อมูล (Backup)</h4>
                        <p className="text-sm opacity-70" style={{color: 'var(--text-secondary)'}}>ดาวน์โหลดข้อมูลนักศึกษาทั้งหมดเป็นไฟล์ JSON เก็บไว้</p>
                    </div>
                    <button 
                        onClick={handleDownloadBackup}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
                    >
                        ดาวน์โหลด Backup
                    </button>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-4">
                    <div>
                        <h4 className="font-bold text-red-600">เริ่มเทอมใหม่ (ล้างข้อมูลเก่า)</h4>
                        <p className="text-sm text-red-800 opacity-80">การดำเนินการนี้จะลบข้อมูลนักศึกษา, คะแนน, และการเช็คชื่อทั้งหมด เพื่อเตรียมพร้อมสำหรับเทอมใหม่ <strong>ไม่สามารถกู้คืนได้</strong></p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow w-full">
                            <label className="block text-xs font-medium mb-1 text-red-800">พิมพ์คำว่า "DELETE" เพื่อยืนยัน</label>
                            <input 
                                type="text" 
                                value={deleteConfirmation} 
                                onChange={(e) => setDeleteConfirmation(e.target.value)} 
                                placeholder="DELETE" 
                                className={inputClass} 
                                style={{borderColor: 'red', color: 'black'}} 
                            />
                        </div>
                        <button 
                            onClick={handleResetSystem}
                            disabled={deleteConfirmation !== 'DELETE' || isResetting}
                            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResetting ? 'กำลังล้างข้อมูล...' : 'ยืนยันการล้างข้อมูล'}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-red-900/20 border border-red-900/40 rounded-xl space-y-4">
                    <div>
                        <h4 className="font-bold text-red-700">ล้างระบบทั้งหมด (Factory Reset)</h4>
                        <p className="text-sm text-red-900 opacity-80">การดำเนินการนี้จะลบข้อมูลทุกอย่าง <strong>รวมถึงการตั้งค่าระบบทั้งหมด</strong> กลับสู่ค่าเริ่มต้นเหมือนเพิ่งติดตั้งใหม่</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow w-full">
                            <label className="block text-xs font-medium mb-1 text-red-900">พิมพ์คำว่า "FACTORY RESET" เพื่อยืนยัน</label>
                            <input 
                                type="text" 
                                value={factoryResetConfirmation} 
                                onChange={(e) => setFactoryResetConfirmation(e.target.value)} 
                                placeholder="FACTORY RESET" 
                                className={inputClass} 
                                style={{borderColor: 'darkred', color: 'black'}} 
                            />
                        </div>
                        <button 
                            onClick={handleFactoryReset}
                            disabled={factoryResetConfirmation !== 'FACTORY RESET' || isResetting}
                            className="w-full sm:w-auto px-6 py-2.5 bg-red-800 text-white font-bold rounded-lg shadow-lg hover:bg-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResetting ? 'กำลังล้างระบบ...' : 'ยืนยัน Factory Reset'}
                        </button>
                    </div>
                </div>

                {resetProgress.length > 0 && (
                    <div className="mt-4 p-3 bg-black/80 text-green-400 font-mono text-xs rounded-lg max-h-32 overflow-y-auto">
                        {resetProgress.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataTab;
