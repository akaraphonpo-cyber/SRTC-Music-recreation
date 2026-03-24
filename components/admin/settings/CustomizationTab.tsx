import React from 'react';
import { SystemConfig } from '../../../types';
import LoadingSpinner from '../../common/LoadingSpinner';

interface CustomizationTabProps {
    config: SystemConfig;
    onUpdateConfig: (newConfig: SystemConfig) => void;
    handleSave: () => void;
    isSaving: boolean;
}

const CustomizationTab: React.FC<CustomizationTabProps> = ({ config, onUpdateConfig, handleSave, isSaving }) => {
    const gradingScale = config.gradingScale || {
        a: 80,
        bp: 75,
        b: 70,
        cp: 65,
        c: 60,
        dp: 55,
        d: 50
    };

    const branding = config.branding || {
        primaryColor: '#3b82f6',
        announcementBanner: '',
        maintenanceMode: false
    };

    const handleGradingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onUpdateConfig({
            ...config,
            gradingScale: {
                ...gradingScale,
                [name]: Number(value)
            }
        });
    };

    const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        onUpdateConfig({
            ...config,
            branding: {
                ...branding,
                [name]: val
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">การปรับแต่ง (Customization)</h3>
                    <p className="text-sm text-gray-400">ปรับแต่งเกณฑ์การตัดเกรด และรูปแบบของระบบ</p>
                </div>
            </div>

            {/* Grading Scale */}
            <div className="bg-black/20 p-6 rounded-xl border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    เกณฑ์การตัดเกรดมาตรฐาน (Global Grading Scale)
                </h4>
                <p className="text-sm text-gray-400 mb-6">ตั้งค่าช่วงคะแนนตัดเกรดส่วนกลาง เพื่อให้ทุกวิชาดึงไปใช้เป็นค่าเริ่มต้น</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                        { label: 'เกรด 4', name: 'a', value: gradingScale.a, color: 'text-green-400' },
                        { label: 'เกรด 3.5', name: 'bp', value: gradingScale.bp, color: 'text-emerald-400' },
                        { label: 'เกรด 3', name: 'b', value: gradingScale.b, color: 'text-blue-400' },
                        { label: 'เกรด 2.5', name: 'cp', value: gradingScale.cp, color: 'text-indigo-400' },
                        { label: 'เกรด 2', name: 'c', value: gradingScale.c, color: 'text-yellow-400' },
                        { label: 'เกรด 1.5', name: 'dp', value: gradingScale.dp, color: 'text-orange-400' },
                        { label: 'เกรด 1', name: 'd', value: gradingScale.d, color: 'text-red-400' },
                    ].map((grade) => (
                        <div key={grade.name} className="flex flex-col items-center p-3 bg-black/30 rounded-lg border border-white/5">
                            <span className={`font-bold text-lg mb-2 ${grade.color}`}>{grade.label}</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">&ge;</span>
                                <input
                                    type="number"
                                    name={grade.name}
                                    value={grade.value}
                                    onChange={handleGradingChange}
                                    className="w-16 bg-black/50 border border-white/10 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-accent"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Branding & Maintenance */}
            <div className="bg-black/20 p-6 rounded-xl border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                    การปรับแต่งหน้าตาและความปลอดภัย (Branding & Security)
                </h4>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">ข้อความประกาศ (Announcement Banner)</label>
                        <p className="text-xs text-gray-400 mb-2">แสดงข้อความประกาศที่ด้านบนของหน้านักศึกษา</p>
                        <textarea
                            name="announcementBanner"
                            value={branding.announcementBanner}
                            onChange={handleBrandingChange}
                            rows={2}
                            placeholder="เช่น ยินดีต้อนรับสู่ภาคเรียนที่ 2/2568"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div>
                            <h5 className="font-semibold text-red-400">โหมดปิดปรับปรุงระบบ (Maintenance Mode)</h5>
                            <p className="text-sm text-gray-400">ปิดไม่ให้นักศึกษาเข้าใช้งานชั่วคราวระหว่างที่อาจารย์กำลังเคลียร์ข้อมูลหรือคำนวณเกรด</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="maintenanceMode"
                                checked={branding.maintenanceMode}
                                onChange={handleBrandingChange}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-accent font-semibold py-2.5 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                    {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : 'บันทึกการปรับแต่ง'}
                </button>
            </div>
        </div>
    );
};

export default CustomizationTab;
