
import React from 'react';
import { useNotification } from '../../../contexts/NotificationContext';

interface RecruitmentTabProps {
    qrTarget: 'register' | 'landing';
    setQrTarget: (target: 'register' | 'landing') => void;
}

const RecruitmentTab: React.FC<RecruitmentTabProps> = ({ qrTarget, setQrTarget }) => {
    const notification = useNotification();
    
    // Helper to construct URL
    const getTargetUrl = () => {
        const base = window.location.href.split('#')[0];
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return qrTarget === 'register' ? `${cleanBase}/#/register` : `${cleanBase}/#/`;
    };

    const targetUrl = getTargetUrl();
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
    
    const inputClass = "block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>เครื่องมือรับสมัคร (Recruitment)</h3>
                
                <div className="flex items-center bg-gray-200 rounded-lg p-1">
                    <button 
                        onClick={() => setQrTarget('register')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${qrTarget === 'register' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        หน้าลงทะเบียน
                    </button>
                    <button 
                        onClick={() => setQrTarget('landing')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${qrTarget === 'landing' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        หน้าแรก (Landing)
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="bg-white p-4 rounded-xl shadow-inner flex-shrink-0">
                    <img src={qrCodeUrl} alt="Registration QR" className="w-40 h-40 object-contain" />
                    <p className="text-center text-xs text-gray-500 mt-2 font-bold">{qrTarget === 'register' ? 'SCAN TO REGISTER' : 'SCAN TO VISIT'}</p>
                </div>
                <div className="flex-grow space-y-4 w-full">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>
                            ลิ้งค์สำหรับ: <span className="text-blue-500">{qrTarget === 'register' ? 'แบบฟอร์มลงทะเบียนโดยตรง' : 'หน้าเว็บไซต์หลัก (ประชาสัมพันธ์)'}</span>
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={targetUrl} 
                                className={inputClass} 
                                style={{...inputStyle, cursor: 'text'}} 
                                onClick={(e) => e.currentTarget.select()}
                            />
                            <button 
                                onClick={() => { navigator.clipboard.writeText(targetUrl); notification.addToast({type: 'success', title: 'Copied!'}); }}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-gray-700 font-medium"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="text-sm opacity-80 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20" style={{color: 'var(--text-secondary)'}}>
                        {qrTarget === 'register' ? (
                            <p>📝 <strong>แนะนำ:</strong> ใช้ลิ้งค์นี้สำหรับให้นักเรียนสแกนเพื่อกรอกข้อมูลสมัครสมาชิกโดยตรง (เช่น แปะหน้าห้องเรียน หรือส่งในไลน์กลุ่ม)</p>
                        ) : (
                            <p>🏠 <strong>แนะนำ:</strong> ใช้ลิ้งค์นี้สำหรับการประชาสัมพันธ์ทั่วไป เพื่อให้คนเห็นภาพรวมกิจกรรมและผลงานก่อนตัดสินใจสมัคร</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruitmentTab;
