
import React, { useState } from 'react';
import { SystemConfig } from '../../../types';
import { COURSE_OPTIONS, DEPARTMENT_OPTIONS, CLASS_LEVEL_OPTIONS, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../../../constants';
import LoadingSpinner from '../../common/LoadingSpinner';
import { callCloudFunction } from '../../../services/googleSheetService';
import { useNotification } from '../../../contexts/NotificationContext';

interface NotificationsTabProps {
    config: SystemConfig;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpdateConfig: (newConfig: SystemConfig) => Promise<void>;
    isSaving: boolean;
    availableCourses?: string[];
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ config, handleChange, onUpdateConfig, isSaving, availableCourses }) => {
    const [isTestingBot, setIsTestingBot] = useState(false);
    const [targetConfigMode, setTargetConfigMode] = useState<'manual' | 'saved'>('manual');
    const [selectedSavedGroups, setSelectedSavedGroups] = useState<Set<string>>(new Set());
    
    // Form State for new target
    const [newGroupCourse, setNewGroupCourse] = useState<string>(''); 
    const [newGroupDept, setNewGroupDept] = useState<string>('');
    const [newGroupLevel, setNewGroupLevel] = useState<string>('');
    const [newGroupDay, setNewGroupDay] = useState<string>('');
    const [newGroupStartTime, setNewGroupStartTime] = useState<string>('');
    const [newGroupEndTime, setNewGroupEndTime] = useState<string>('');
    const [newGroupTargetId, setNewGroupTargetId] = useState<string>('');

    const notification = useNotification();
    const webhookUrl = "https://us-central1-srtc-student-registration.cloudfunctions.net/lineWebhook";

    const inputClass = "block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };
    const coursesToDisplay = availableCourses && availableCourses.length > 0 ? availableCourses : COURSE_OPTIONS;

    const handleTestBot = async () => {
        if (!config.lineChannelAccessToken || !config.lineDefaultTargetId) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอก Token และ Default Target ID ให้ครบถ้วนก่อนทดสอบ' });
            return;
        }

        setIsTestingBot(true);
        try {
            const result = await callCloudFunction('sendLineNotification', { 
                message: '✅ ทดสอบการเชื่อมต่อสำเร็จ!\n(Connection Successful)\n\nระบบพร้อมใช้งานครับ',
                testToken: config.lineChannelAccessToken,
                testTargetId: config.lineDefaultTargetId
            });

            if (result.success) {
                notification.addToast({ type: 'success', title: 'ทดสอบสำเร็จ', message: 'ส่งข้อความเข้า LINE เรียบร้อยแล้ว (อย่าลืมกดบันทึก)' });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Bot Test Error:", error);
            notification.addToast({ type: 'error', title: 'ทดสอบล้มเหลว', message: error.message || 'กรุณาตรวจสอบ Token และ Target ID' });
        } finally {
            setIsTestingBot(false);
        }
    };

    const toggleSavedGroupSelection = (key: string) => {
        setSelectedSavedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleAddGroupTarget = () => {
        if (!newGroupTargetId) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาใส่ Target ID' });
            return;
        }

        let newTargets = { ...config.groupLineTargetIds };
        let addedCount = 0;

        if (targetConfigMode === 'manual') {
            if (!newGroupDept || !newGroupLevel) {
                notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาเลือกแผนกและระดับชั้น' });
                return;
            }
            const parts = [];
            if (newGroupCourse) parts.push(newGroupCourse);
            parts.push(newGroupDept);
            parts.push(newGroupLevel);
            
            if (newGroupDay && newGroupStartTime && newGroupEndTime) {
                const timeSlot = `${newGroupStartTime} - ${newGroupEndTime}`;
                parts.push(newGroupDay);
                parts.push(timeSlot);
            }
            const key = parts.join('|');
            newTargets[key] = newGroupTargetId;
            addedCount = 1;
        } else {
            if (selectedSavedGroups.size === 0) {
                notification.addToast({ type: 'warning', title: 'ยังไม่ได้เลือกกลุ่ม', message: 'กรุณาติ๊กเลือกกลุ่มที่ต้องการ' });
                return;
            }
            selectedSavedGroups.forEach(key => {
                newTargets[key] = newGroupTargetId;
            });
            addedCount = selectedSavedGroups.size;
        }

        const newConfig = { ...config, groupLineTargetIds: newTargets };
        // We update the parent state but don't save to DB yet (user must click Save)
        // But for this tab logic, we can just update local prop reflection if parent allows, 
        // OR we just use the onUpdateConfig which mimics setConfig in parent
        onUpdateConfig(newConfig);
        
        setNewGroupTargetId('');
        setSelectedSavedGroups(new Set());
        notification.addToast({ type: 'success', title: 'เพิ่มเรียบร้อย', message: `จับคู่ Target ID กับ ${addedCount} กลุ่มแล้ว (อย่าลืมกดบันทึก)` });
    };

    const handleDeleteGroupTarget = (key: string) => {
        const newTargets = { ...config.groupLineTargetIds };
        delete newTargets[key];
        onUpdateConfig({ ...config, groupLineTargetIds: newTargets });
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onUpdateConfig({
            ...config,
            notificationTemplates: {
                ...config.notificationTemplates,
                [name]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#06C755]">
                    <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                </svg>
                <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>LINE Messaging API (Bot)</h3>
            </div>
            
            <div className="bg-[#06C755]/10 border border-[#06C755]/30 rounded-xl p-4 mb-6 text-sm">
                <h4 className="font-bold mb-2 text-[#06C755]">วิธีตั้งค่าเพื่อใช้งานบอท (Bot)</h4>
                <ol className="list-decimal list-inside space-y-1" style={{color: 'var(--text-secondary)'}}>
                    <li>ใส่ <strong>Channel Access Token</strong> ที่ได้จาก LINE Developers Console</li>
                    <li>(สำคัญ) นำ <strong>Webhook URL</strong> ด้านล่างไปใส่ใน LINE Console</li>
                    <li>เปิดใช้งาน "Use webhook"</li>
                    <li>เพิ่มบอทเข้ากลุ่ม แล้วพิมพ์ <strong>"id"</strong> เพื่อดูรหัสกลุ่ม (Group ID)</li>
                    <li>นำรหัสนั้นมาใส่ในช่อง Target ID ด้านล่าง</li>
                </ol>
                <div className="mt-3 flex gap-2 items-center">
                    <span className="font-mono bg-black/10 p-1.5 rounded select-all truncate flex-grow">{webhookUrl}</span>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(webhookUrl); notification.addToast({type:'success', title:'Copied URL'}); }}
                        className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/40"
                    >
                        Copy URL
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>Channel Access Token (Long-lived)</label>
                <input 
                    type="password" 
                    name="lineChannelAccessToken" 
                    value={config.lineChannelAccessToken || ''} 
                    onChange={handleChange} 
                    placeholder="ใส่ Token ของบอทที่ได้จาก LINE Developers" 
                    className={inputClass} 
                    style={inputStyle} 
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>Default Target ID (User ID / Group ID)</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        name="lineDefaultTargetId" 
                        value={config.lineDefaultTargetId || ''} 
                        onChange={handleChange} 
                        placeholder="Uxxxxxxxx... (User) หรือ Cxxxxxxxx... (Group) ที่จะรับข้อความทั่วไป" 
                        className={inputClass} 
                        style={inputStyle} 
                    />
                    <button 
                        onClick={handleTestBot}
                        disabled={isTestingBot || isSaving}
                        className="whitespace-nowrap px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                    >
                        {isTestingBot ? <LoadingSpinner size="sm" color="border-white" /> : 'ทดสอบส่งข้อความ'}
                    </button>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-md font-semibold mb-3" style={{color: 'var(--text-primary)'}}>กำหนด Target ID เฉพาะกลุ่ม (แยกห้อง/เวลา)</h4>
                
                <div className="flex mb-4 bg-black/10 p-1 rounded-lg w-fit">
                    <button 
                        onClick={() => setTargetConfigMode('manual')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-all ${targetConfigMode === 'manual' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        สร้างใหม่ (Manual)
                    </button>
                    <button 
                        onClick={() => setTargetConfigMode('saved')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-all ${targetConfigMode === 'saved' ? 'bg-white shadow text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        เลือกจากกลุ่มที่ตั้งชื่อไว้ (Saved Groups)
                    </button>
                </div>

                <div className="flex flex-col gap-3 mb-4 p-3 rounded-lg border border-white/5 bg-white/5">
                    {targetConfigMode === 'manual' ? (
                        <>
                            <div className="w-full">
                                <select value={newGroupCourse} onChange={(e) => setNewGroupCourse(e.target.value)} className={inputClass} style={inputStyle}>
                                    <option value="">-- เลือกวิชา (ถ้าต้องการเจาะจง) --</option>
                                    {coursesToDisplay.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select value={newGroupDept} onChange={(e) => setNewGroupDept(e.target.value)} className={`${inputClass} sm:w-1/2`} style={inputStyle}>
                                    <option value="">-- เลือกแผนก --</option>
                                    {DEPARTMENT_OPTIONS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                                <select value={newGroupLevel} onChange={(e) => setNewGroupLevel(e.target.value)} className={`${inputClass} sm:w-1/2`} style={inputStyle}>
                                    <option value="">-- เลือกระดับชั้น --</option>
                                    {CLASS_LEVEL_OPTIONS.map(level => <option key={level} value={level}>{level}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 bg-black/5 p-2 rounded-lg">
                                <div className="flex items-center gap-2 sm:w-1/3">
                                    <span className="text-xs whitespace-nowrap opacity-70">เฉพาะวัน:</span>
                                    <select value={newGroupDay} onChange={(e) => setNewGroupDay(e.target.value)} className={inputClass} style={inputStyle}>
                                        <option value="">-- ทุกวัน --</option>
                                        {REGISTRATION_DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 sm:w-2/3">
                                    <span className="text-xs whitespace-nowrap opacity-70">เวลา:</span>
                                    <select value={newGroupStartTime} onChange={(e) => setNewGroupStartTime(e.target.value)} className={inputClass} style={inputStyle} disabled={!newGroupDay}>
                                        <option value="">เริ่ม</option>
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <span>-</span>
                                    <select value={newGroupEndTime} onChange={(e) => setNewGroupEndTime(e.target.value)} className={inputClass} style={inputStyle} disabled={!newGroupDay}>
                                        <option value="">จบ</option>
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-lg border border-white/5">
                                {config.classGroupAliases && Object.keys(config.classGroupAliases).length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(config.classGroupAliases).map(([key, name]) => {
                                            const isSelected = selectedSavedGroups.has(key);
                                            const parts = key.split('|');
                                            const hint = parts.length >= 2 ? `${parts[parts.length-2]} ${parts[parts.length-1]}` : key;
                                            return (
                                                <div key={key} onClick={() => toggleSavedGroupSelection(key)} className={`cursor-pointer p-2 rounded-lg border flex items-center justify-between transition-all ${isSelected ? 'bg-orange-500/20 border-orange-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-sm truncate" style={{color: 'var(--text-primary)'}}>{name}</p>
                                                        <p className="text-xs opacity-50 truncate">{hint}</p>
                                                    </div>
                                                    {isSelected && <span className="text-orange-500 font-bold">✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-center text-sm opacity-60 py-4">ไม่พบกลุ่มที่บันทึกไว้</p>
                                )}
                            </div>
                            <p className="text-xs opacity-70 text-right">เลือกได้หลายกลุ่มเพื่อใช้ ID เดียวกัน</p>
                        </>
                    )}

                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                        <input type="text" value={newGroupTargetId} onChange={(e) => setNewGroupTargetId(e.target.value)} placeholder="Target ID (Group ID หรือ User ID)" className={`${inputClass} flex-grow`} style={inputStyle} />
                        <button onClick={handleAddGroupTarget} className="bg-[#06C755] hover:bg-[#05a546] text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap shadow-lg">
                            {targetConfigMode === 'saved' && selectedSavedGroups.size > 1 ? 'เพิ่มทั้งหมด' : 'เพิ่ม / อัปเดต'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {config.groupLineTargetIds && Object.keys(config.groupLineTargetIds).length > 0 ? (
                        Object.entries(config.groupLineTargetIds).map(([key, targetId]) => {
                            const parts = key.split('|');
                            let course, dept, level, day, time;
                            if (parts.length === 5) { [course, dept, level, day, time] = parts; }
                            else if (parts.length === 4) { [dept, level, day, time] = parts; }
                            else if (parts.length === 3) { [course, dept, level] = parts; }
                            else { [dept, level] = parts; }
                            
                            const aliasName = config.classGroupAliases?.[key];

                            return (
                                <div key={key} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-lg bg-black/10 border border-white/5 text-sm gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {aliasName && <span className="font-bold text-orange-400 mr-1">[{aliasName}]</span>}
                                        {course && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold border border-green-200">{course}</span>}
                                        <span className="font-bold text-blue-400">{dept}</span>
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{level}</span>
                                        {day && time && <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs border border-orange-500/30">{day} {time}</span>}
                                        <div className="text-gray-500 font-mono text-xs truncate max-w-[150px] sm:max-w-none" title={targetId as string}>ID: {(targetId as string).substring(0, 10)}...</div>
                                    </div>
                                    <button onClick={() => handleDeleteGroupTarget(key)} className="text-red-400 hover:text-red-300 p-1 self-end sm:self-auto" title="ลบ">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-500 text-xs py-2">ยังไม่มีการกำหนด Target ID เฉพาะกลุ่ม</p>
                    )}
                </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-6">
                <h4 className="text-md font-semibold mb-3" style={{color: 'var(--text-primary)'}}>เทมเพลตการแจ้งเตือน (Notification Templates)</h4>
                <p className="text-sm text-gray-400 mb-4">ปรับแต่งข้อความที่จะส่งไปยัง LINE โดยใช้ตัวแปรเช่น {'{studentName}'}, {'{course}'}, {'{grade}'}</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>แจ้งเตือนขาดเรียน (Attendance Warning)</label>
                        <textarea 
                            name="attendanceWarning" 
                            value={config.notificationTemplates?.attendanceWarning || ''} 
                            onChange={handleTemplateChange} 
                            placeholder="ตัวอย่าง: แจ้งเตือน! นักศึกษา {studentName} ขาดเรียนวิชา {course} เกินกำหนด" 
                            className={`${inputClass} min-h-[80px]`} 
                            style={inputStyle} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>แจ้งเตือนอัปเดตเกรด (Grade Update)</label>
                        <textarea 
                            name="gradeUpdate" 
                            value={config.notificationTemplates?.gradeUpdate || ''} 
                            onChange={handleTemplateChange} 
                            placeholder="ตัวอย่าง: ประกาศผลการเรียนวิชา {course} ของ {studentName} ได้เกรด {grade}" 
                            className={`${inputClass} min-h-[80px]`} 
                            style={inputStyle} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsTab;
