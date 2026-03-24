import React from 'react';
import { SystemConfig } from '../../../types';
import LoadingSpinner from '../../common/LoadingSpinner';

interface CalendarTabProps {
    config: SystemConfig;
    onUpdateConfig: (newConfig: SystemConfig) => void;
    handleSave: () => void;
    isSaving: boolean;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ config, onUpdateConfig, handleSave, isSaving }) => {
    const calendar = config.academicCalendar || {
        startDate: '',
        endDate: '',
        holidays: [],
        timeLockDate: ''
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onUpdateConfig({
            ...config,
            academicCalendar: {
                ...calendar,
                [name]: value
            }
        });
    };

    const handleAddHoliday = () => {
        onUpdateConfig({
            ...config,
            academicCalendar: {
                ...calendar,
                holidays: [...calendar.holidays, { date: '', description: '' }]
            }
        });
    };

    const handleHolidayChange = (index: number, field: 'date' | 'description', value: string) => {
        const newHolidays = [...calendar.holidays];
        const current = newHolidays[index];
        
        if (typeof current === 'string') {
            newHolidays[index] = { 
                date: field === 'date' ? value : current, 
                description: field === 'description' ? value : '' 
            };
        } else {
            newHolidays[index] = { ...current, [field]: value };
        }

        onUpdateConfig({
            ...config,
            academicCalendar: {
                ...calendar,
                holidays: newHolidays
            }
        });
    };

    const handleRemoveHoliday = (index: number) => {
        const newHolidays = calendar.holidays.filter((_, i) => i !== index);
        onUpdateConfig({
            ...config,
            academicCalendar: {
                ...calendar,
                holidays: newHolidays
            }
        });
    };

    const handleFetchThaiHolidays = () => {
        // Hardcoded common Thai public holidays for 2025-2026 (2568-2569)
        const thaiHolidays = [
            // 2025 (2568)
            { date: "2025-01-01", description: "วันขึ้นปีใหม่" },
            { date: "2025-02-12", description: "วันมาฆบูชา" },
            { date: "2025-04-06", description: "วันจักรี" },
            { date: "2025-04-13", description: "วันสงกรานต์" },
            { date: "2025-04-14", description: "วันสงกรานต์" },
            { date: "2025-04-15", description: "วันสงกรานต์" },
            { date: "2025-05-01", description: "วันแรงงานแห่งชาติ" },
            { date: "2025-05-04", description: "วันฉัตรมงคล" },
            { date: "2025-05-11", description: "วันวิสาขบูชา" },
            { date: "2025-06-03", description: "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี" },
            { date: "2025-07-10", description: "วันอาสาฬหบูชา" },
            { date: "2025-07-11", description: "วันเข้าพรรษา" },
            { date: "2025-07-28", description: "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว" },
            { date: "2025-08-12", description: "วันแม่แห่งชาติ" },
            { date: "2025-10-13", description: "วันคล้ายวันสวรรคต รัชกาลที่ 9" },
            { date: "2025-10-23", description: "วันปิยมหาราช" },
            { date: "2025-12-05", description: "วันพ่อแห่งชาติ" },
            { date: "2025-12-10", description: "วันรัฐธรรมนูญ" },
            { date: "2025-12-31", description: "วันสิ้นปี" },
            // 2026 (2569)
            { date: "2026-01-01", description: "วันขึ้นปีใหม่" },
            { date: "2026-03-03", description: "วันมาฆบูชา" },
            { date: "2026-04-06", description: "วันจักรี" },
            { date: "2026-04-13", description: "วันสงกรานต์" },
            { date: "2026-04-14", description: "วันสงกรานต์" },
            { date: "2026-04-15", description: "วันสงกรานต์" },
            { date: "2026-05-01", description: "วันแรงงานแห่งชาติ" },
            { date: "2026-05-04", description: "วันฉัตรมงคล" },
            { date: "2026-05-22", description: "วันวิสาขบูชา" },
            { date: "2026-06-03", description: "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี" },
            { date: "2026-07-28", description: "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว" },
            { date: "2026-07-29", description: "วันอาสาฬหบูชา" },
            { date: "2026-07-30", description: "วันเข้าพรรษา" },
            { date: "2026-08-12", description: "วันแม่แห่งชาติ" },
            { date: "2026-10-13", description: "วันคล้ายวันสวรรคต รัชกาลที่ 9" },
            { date: "2026-10-23", description: "วันปิยมหาราช" },
            { date: "2026-12-05", description: "วันพ่อแห่งชาติ" },
            { date: "2026-12-10", description: "วันรัฐธรรมนูญ" },
            { date: "2026-12-31", description: "วันสิ้นปี" }
        ];

        // Filter holidays that fall within start and end date if they are set
        let filteredHolidays = thaiHolidays;
        if (calendar.startDate && calendar.endDate) {
            filteredHolidays = thaiHolidays.filter(h => h.date >= calendar.startDate && h.date <= calendar.endDate);
        }

        // Merge with existing, avoiding duplicates by date
        const existingHolidays = calendar.holidays.map(h => typeof h === 'string' ? { date: h, description: '' } : h);
        const combined = [...existingHolidays];
        
        filteredHolidays.forEach(newH => {
            if (!combined.some(h => h.date === newH.date)) {
                combined.push(newH);
            }
        });

        combined.sort((a, b) => a.date.localeCompare(b.date));

        onUpdateConfig({
            ...config,
            academicCalendar: {
                ...calendar,
                holidays: combined
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">ปฏิทินการศึกษา (Academic Calendar)</h3>
                        <p className="text-sm text-gray-400">กำหนดวันเปิด-ปิดภาคเรียน และวันหยุดนักขัตฤกษ์</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleFetchThaiHolidays}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-xl border border-blue-500/30 transition-all text-sm font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    ดึงข้อมูลวันหยุดนักขัตฤกษ์ (ไทย)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">ช่วงเวลาภาคเรียน</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">วันเปิดภาคเรียน</label>
                        <input
                            type="date"
                            name="startDate"
                            value={calendar.startDate}
                            onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">วันปิดภาคเรียน</label>
                        <input
                            type="date"
                            name="endDate"
                            value={calendar.endDate}
                            onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">ระบบอัตโนมัติ</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">วันที่ล็อคระบบ (Time-lock)</label>
                        <p className="text-xs text-gray-400 mb-2">หลังจากวันนี้ ระบบจะไม่อนุญาตให้แก้ไขคะแนนหรือเช็คชื่อย้อนหลัง</p>
                        <input
                            type="date"
                            name="timeLockDate"
                            value={calendar.timeLockDate}
                            onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-white">วันหยุดนักขัตฤกษ์ (Holidays)</h4>
                    <button 
                        onClick={handleAddHoliday}
                        className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        เพิ่มวันหยุด
                    </button>
                </div>
                <p className="text-xs text-gray-400">ระบบจะข้ามการเช็คชื่อในวันเหล่านี้อัตโนมัติ</p>
                
                {calendar.holidays.length === 0 ? (
                    <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                        <p className="text-gray-500 text-sm">ยังไม่มีการตั้งค่าวัดหยุด</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {calendar.holidays.map((holiday, index) => {
                            const hDate = typeof holiday === 'string' ? holiday : holiday.date;
                            const hDesc = typeof holiday === 'string' ? '' : holiday.description;
                            
                            return (
                                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/10 group">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <input
                                            type="date"
                                            value={hDate}
                                            onChange={(e) => handleHolidayChange(index, 'date', e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                        />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <input
                                            type="text"
                                            placeholder="ชื่อวันหยุด (เช่น วันสงกรานต์)"
                                            value={hDesc}
                                            onChange={(e) => handleHolidayChange(index, 'description', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveHoliday(index)}
                                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-accent font-semibold py-2.5 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                    {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : 'บันทึกปฏิทิน'}
                </button>
            </div>
        </div>
    );
};

export default CalendarTab;
