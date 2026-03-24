
import React from 'react';
import { SystemConfig, Course } from '../../../types';
import { COURSE_OPTIONS } from '../../../constants';
import LoadingSpinner from '../../common/LoadingSpinner';

interface GeneralTabProps {
    config: SystemConfig;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTermSelect: (year: string, term: string) => void;
    handleRoomChange: (course: Course, room: string) => void;
    handleCreditChange: (course: Course, field: 'theory' | 'practice' | 'credit', value: number) => void;
    handleCourseCodeChange: (course: Course, code: string) => void;
    handleSave: () => void;
    isSaving: boolean;
    availableCourses?: string[];
}

const GeneralTab: React.FC<GeneralTabProps> = ({ config, handleChange, handleTermSelect, handleRoomChange, handleCreditChange, handleCourseCodeChange, handleSave, isSaving, availableCourses }) => {
    const inputClass = "block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };
    const coursesToDisplay = availableCourses || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>1. ข้อมูลภาคเรียน</h3>
            </div>
            
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                <h4 className="text-md font-medium mb-3" style={{color: 'var(--text-primary)'}}>เลือกปีการศึกษาที่ใช้งาน (Active Term)</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow w-full">
                        <select
                            className={inputClass}
                            style={inputStyle}
                            value={`${config.year}_${config.term}`}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'new') {
                                    handleTermSelect('', '');
                                } else {
                                    const [y, t] = val.split('_');
                                    handleTermSelect(y, t);
                                }
                            }}
                        >
                            {config.terms && config.terms.length > 0 ? (
                                config.terms.map(t => (
                                    <option key={t.id} value={t.id}>
                                        ภาคเรียนที่ {t.term} ปีการศึกษา {t.year}
                                    </option>
                                ))
                            ) : (
                                <option value={`${config.year}_${config.term}`}>
                                    ภาคเรียนที่ {config.term} ปีการศึกษา {config.year}
                                </option>
                            )}
                            <option value="new">+ เพิ่มปีการศึกษาใหม่</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>ภาคเรียน (Term)</label>
                    <input 
                        type="text" 
                        name="term" 
                        value={config.term} 
                        onChange={handleChange} 
                        placeholder="เช่น 1, 2" 
                        className={inputClass} 
                        style={inputStyle} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>ปีการศึกษา (Academic Year)</label>
                    <input 
                        type="text" 
                        name="year" 
                        value={config.year} 
                        onChange={handleChange} 
                        placeholder="เช่น 2567" 
                        className={inputClass} 
                        style={inputStyle} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>ชื่อผู้สอน (Teacher Name)</label>
                    <input 
                        type="text" 
                        name="teacherName" 
                        value={config.teacherName} 
                        onChange={handleChange} 
                        placeholder="ชื่อ-นามสกุล" 
                        className={inputClass} 
                        style={inputStyle} 
                    />
                </div>
            </div>

            <div className="pt-4 border-t" style={{borderColor: 'var(--glass-border)'}}>
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>รายวิชาที่เปิดในภาคเรียนนี้</h3>
                <div className="space-y-2">
                    {coursesToDisplay.length > 0 ? (
                        coursesToDisplay.map(course => (
                            <div key={course} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <p className="font-medium" style={{color: 'var(--text-primary)'}}>{course}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>ยังไม่มีรายวิชาที่เปิดสอน (สามารถจัดการได้ที่แท็บ "จัดการรายวิชาหลัก")</p>
                    )}
                </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-white/10">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-accent font-semibold py-2.5 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                    {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : 'บันทึกข้อมูลทั่วไป'}
                </button>
            </div>
        </div>
    );
};

export default GeneralTab;
