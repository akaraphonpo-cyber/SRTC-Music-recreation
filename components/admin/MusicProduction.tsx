
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentWithId, Course, MusicProductionRecord, MusicProductionRubric, StudentScores, SystemConfig } from '../../types';
import { getMusicProductionRecords, saveMusicProductionRecord, getCourseGradingConfig, getScoresForCourse, setStudentScores, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { flattenGradingConfig } from '../../utils/grades';
import { getCustomGroupOptions, filterStudentsByGroupKey } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

interface MusicProductionProps {
    allStudents: StudentWithId[];
    availableSchedules: any[];
}

const emptyRubric: MusicProductionRubric = {
    sunoPrompt: 0,
    sunoCreativity: 0,
    sunoCompleteness: 0,
    bandlabEditing: 0,
    bandlabMixing: 0,
    bandlabArtistry: 0,
    total: 0,
    feedback: ''
};

// Shared Sync Options UI
const SyncOptionsSelector = ({ source, setSource }: { source: 'TOTAL' | 'SUNO' | 'BANDLAB', setSource: (s: 'TOTAL' | 'SUNO' | 'BANDLAB') => void }) => (
    <div className="bg-black/20 p-3 rounded-xl mb-4 border border-white/10">
        <label className="block text-sm font-bold mb-2 text-white">เลือกส่วนของคะแนนที่จะส่ง (Score Source)</label>
        <div className="grid grid-cols-3 gap-2">
            <button 
                onClick={() => setSource('SUNO')}
                className={`p-2 rounded-lg text-xs font-bold transition-all border-2 ${source === 'SUNO' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-transparent border-gray-600 text-gray-400 hover:bg-white/5'}`}
            >
                🎵 Suno AI
                <div className="text-[10px] font-normal opacity-80 mt-1">เต็ม 10 คะแนน</div>
            </button>
            <button 
                onClick={() => setSource('BANDLAB')}
                className={`p-2 rounded-lg text-xs font-bold transition-all border-2 ${source === 'BANDLAB' ? 'bg-orange-600 border-orange-400 text-white shadow-lg scale-105' : 'bg-transparent border-gray-600 text-gray-400 hover:bg-white/5'}`}
            >
                🎸 BandLab
                <div className="text-[10px] font-normal opacity-80 mt-1">เต็ม 10 คะแนน</div>
            </button>
            <button 
                onClick={() => setSource('TOTAL')}
                className={`p-2 rounded-lg text-xs font-bold transition-all border-2 ${source === 'TOTAL' ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-105' : 'bg-transparent border-gray-600 text-gray-400 hover:bg-white/5'}`}
            >
                ∑ Total
                <div className="text-[10px] font-normal opacity-80 mt-1">เต็ม 20 คะแนน</div>
            </button>
        </div>
        
        <div className="mt-3 text-xs text-center p-2 rounded bg-white/10 text-white">
            <span className="font-bold text-yellow-400">Preview:</span> 
            {source === 'SUNO' && ' คะแนนดิบ (50) ÷ 5 = คะแนนสุทธิ (10)'}
            {source === 'BANDLAB' && ' คะแนนดิบ (50) ÷ 5 = คะแนนสุทธิ (10)'}
            {source === 'TOTAL' && ' คะแนนดิบ (100) ÷ 5 = คะแนนสุทธิ (20)'}
        </div>
    </div>
);

const MusicProduction: React.FC<MusicProductionProps> = ({ allStudents, availableSchedules }) => {
    const [records, setRecords] = useState<Record<string, MusicProductionRecord>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [viewFilterKey, setViewFilterKey] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Grading Modal State
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<StudentWithId | null>(null);
    const [currentRecord, setCurrentRecord] = useState<Partial<MusicProductionRecord>>({});
    const [scores, setScores] = useState<MusicProductionRubric>(emptyRubric);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradingTab, setGradingTab] = useState<'SUNO' | 'BANDLAB'>('SUNO');

    // Sync State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
    const [targetGradingKey, setTargetGradingKey] = useState('');
    const [gradingOptions, setGradingOptions] = useState<{key: string, label: string}[]>([]);
    
    // New: Sync Source Selection
    const [syncSource, setSyncSource] = useState<'TOTAL' | 'SUNO' | 'BANDLAB'>('TOTAL');
    
    const notification = useNotification();

    const fetchData = useCallback(async () => {
        await Promise.resolve();
        setIsLoading(true);
        const [recordsRes, configRes] = await Promise.all([
            getMusicProductionRecords(),
            getSystemConfig()
        ]);
        
        if (recordsRes.success && recordsRes.data) {
            setRecords(recordsRes.data);
        }
        if (configRes.success && configRes.data) {
            setSystemConfig(configRes.data);
        }
        
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let mounted = true;
        if (mounted) {
            void fetchData();
        }
        return () => { mounted = false; };
    }, [fetchData]);

    const customGroupOptions = useMemo(() => {
        return getCustomGroupOptions(allStudents, systemConfig, Course.RECREATION, availableSchedules);
    }, [allStudents, systemConfig, availableSchedules]);

    const filteredStudents = useMemo(() => {
        let students = allStudents.filter(s => {
            const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
            return courses.includes(Course.RECREATION);
        });

        if (viewFilterKey) {
            students = filterStudentsByGroupKey(students, viewFilterKey, Course.RECREATION, availableSchedules);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            students = students.filter(s => 
                s.studentId.includes(searchTerm) || 
                s.firstName.toLowerCase().includes(lower) || 
                s.lastName.toLowerCase().includes(lower)
            );
        }
        
        return students.sort((a,b) => a.studentId.localeCompare(b.studentId));
    }, [allStudents, viewFilterKey, searchTerm, availableSchedules]);

    const handleOpenGrading = (student: StudentWithId) => {
        setCurrentStudent(student);
        const existingRecord = records[student.studentId];
        
        if (existingRecord) {
            setCurrentRecord(existingRecord);
            setScores(existingRecord.scores || emptyRubric);
        } else {
            setCurrentRecord({ studentId: student.studentId, projectTitle: '', sunoLink: '', bandlabLink: '' });
            setScores(emptyRubric);
        }
        setGradingTab('SUNO');
        setIsGradingModalOpen(true);
    };

    const handleScoreChange = (field: keyof MusicProductionRubric, value: any) => {
        setScores(prev => {
            const newScores = { ...prev, [field]: value };
            if (field !== 'total' && field !== 'feedback') {
                newScores.total = (
                    Number(newScores.sunoPrompt) + 
                    Number(newScores.sunoCreativity) + 
                    Number(newScores.sunoCompleteness) + 
                    Number(newScores.bandlabEditing) + 
                    Number(newScores.bandlabMixing) + 
                    Number(newScores.bandlabArtistry)
                );
            }
            return newScores;
        });
    };

    const handleSaveRecord = async () => {
        if (!currentStudent) return;
        setIsSubmitting(true);
        
        const recordToSave: MusicProductionRecord = {
            studentId: currentStudent.studentId,
            projectTitle: currentRecord.projectTitle,
            sunoLink: currentRecord.sunoLink,
            bandlabLink: currentRecord.bandlabLink,
            scores: scores,
            isPosted: records[currentStudent.studentId]?.isPosted || false
        };

        const res = await saveMusicProductionRecord(recordToSave);
        
        if (res.success) {
            setRecords(prev => ({ ...prev, [currentStudent.studentId]: recordToSave }));
            notification.addToast({ type: 'success', title: 'บันทึกเรียบร้อย' });
            setIsGradingModalOpen(false);
        } else {
            notification.addToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: res.message });
        }
        setIsSubmitting(false);
    };

    // --- Helper to calculate sub-scores ---
    const calculateScorePart = (rubric: MusicProductionRubric | undefined, type: 'TOTAL' | 'SUNO' | 'BANDLAB') => {
        if (!rubric) return 0;
        if (type === 'SUNO') {
            return (rubric.sunoPrompt || 0) + (rubric.sunoCreativity || 0) + (rubric.sunoCompleteness || 0);
        }
        if (type === 'BANDLAB') {
            return (rubric.bandlabEditing || 0) + (rubric.bandlabMixing || 0) + (rubric.bandlabArtistry || 0);
        }
        return rubric.total || 0;
    };

    // --- SYNC LOGIC ---
    const prepareGradingOptions = async () => {
        const res = await getCourseGradingConfig(Course.RECREATION);
        if (res.success && res.data) {
            const items = flattenGradingConfig(res.data.gradingConfig, res.data.gradingConfigOrder);
            setGradingOptions(items.filter(i => !i.isHeader));
        } else {
            notification.addToast({type:'error', title:'Error', message:'ไม่สามารถโหลดข้อมูลการให้คะแนนวิชานี้ได้'});
        }
    };
    
    // --- SINGLE SYNC MODAL ---
    const handleOpenSyncModal = async (student: StudentWithId) => {
        setCurrentStudent(student);
        const record = records[student.studentId];
        if (record) {
            setScores(record.scores || emptyRubric);
        }
        setSyncSource('TOTAL'); // Default
        await prepareGradingOptions();
        setIsSyncModalOpen(true);
    };

    const handleSyncScore = async () => {
        if (!currentStudent || !targetGradingKey) return;
        setIsSubmitting(true);
        
        const record = records[currentStudent.studentId];
        if (!record || !record.scores) {
            notification.addToast({type: 'error', title: 'ไม่พบคะแนน', message: 'กรุณาให้คะแนนก่อนส่ง'});
            setIsSubmitting(false);
            return;
        }

        try {
            const rawScore = calculateScorePart(record.scores, syncSource);
            const scaledScore = rawScore / 5; // 50->10 or 100->20
            
            const existingScoresRes = await getScoresForCourse(Course.RECREATION);
            const existingScores = existingScoresRes.data || {};
            const currentStudentScores = existingScores[currentStudent.studentId]?.scores || {};

            const update: StudentScores = {
                studentId: currentStudent.studentId,
                course: Course.RECREATION,
                scores: {
                    ...currentStudentScores,
                    [targetGradingKey]: scaledScore
                }
            };

            await setStudentScores([update]);
            
            // Mark as posted (only if sending total, optional logic)
            const updatedRecord = { ...record, isPosted: true };
            await saveMusicProductionRecord(updatedRecord);
            setRecords(prev => ({ ...prev, [currentStudent.studentId]: updatedRecord }));

            notification.addToast({ type: 'success', title: 'ส่งคะแนนเรียบร้อย' });
            setIsSyncModalOpen(false);

        } catch (e: any) {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
        }
        setIsSubmitting(false);
    };

    // --- BATCH SYNC MODAL ---
    const handleOpenBatchSync = async () => {
        setSyncSource('TOTAL'); // Default
        await prepareGradingOptions();
        setIsBatchSyncModalOpen(true);
    };

    const handleBatchSync = async () => {
        if (!targetGradingKey) return;
        setIsSubmitting(true);

        try {
            const studentsToSync = filteredStudents.filter(s => records[s.studentId]?.scores);
            
            if (studentsToSync.length === 0) {
                 notification.addToast({ type: 'warning', title: 'ไม่พบข้อมูล', message: 'ไม่มีนักศึกษาที่มีคะแนนในรายการนี้' });
                 setIsSubmitting(false);
                 return;
            }

            const existingScoresRes = await getScoresForCourse(Course.RECREATION);
            const existingScores = existingScoresRes.data || {};
            
            const updates: StudentScores[] = [];
            const recordUpdates: Promise<any>[] = [];

            studentsToSync.forEach(s => {
                const record = records[s.studentId];
                if (!record || !record.scores) return;

                const rawScore = calculateScorePart(record.scores, syncSource);
                const scaledScore = rawScore / 5; // 50->10 or 100->20
                
                const currentStudentScores = existingScores[s.studentId]?.scores || {};
                
                updates.push({
                    studentId: s.studentId,
                    course: Course.RECREATION,
                    scores: {
                        ...currentStudentScores,
                        [targetGradingKey]: scaledScore
                    }
                });
                
                const updatedRecord = { ...record, isPosted: true };
                recordUpdates.push(saveMusicProductionRecord(updatedRecord));
                records[s.studentId] = updatedRecord; 
            });

            if (updates.length > 0) {
                await setStudentScores(updates);
                await Promise.all(recordUpdates);
                setRecords({ ...records }); 
                notification.addToast({ 
                    type: 'success', 
                    title: 'ส่งคะแนนหมู่สำเร็จ', 
                    message: `ส่งคะแนนของ ${updates.length} คนเรียบร้อยแล้ว` 
                });
                setIsBatchSyncModalOpen(false);
            }

        } catch (e: any) {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
        }
        setIsSubmitting(false);
    };

    const inputStyle = {
        color: 'var(--text-primary)',
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--input-border)'
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-center p-4 glass-card rounded-2xl gap-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40">
                <div>
                    <h2 className="text-2xl font-bold text-shadow flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                        <span className="text-3xl">🎧</span> Music Production
                    </h2>
                    <p className="text-sm opacity-70" style={{color: 'var(--text-secondary)'}}>สร้างสรรค์งานเพลงด้วย AI (Suno) และตัดต่อ (BandLab)</p>
                </div>
                <button 
                    onClick={handleOpenBatchSync}
                    className="btn-accent px-4 py-2 rounded-lg font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-2"
                    disabled={filteredStudents.length === 0}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    ส่งคะแนนทั้งห้อง
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-3 rounded-xl flex flex-col sm:flex-row gap-3 items-center border border-white/10">
                <div className="flex-grow w-full">
                    <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>🔍 เลือกห้อง/กลุ่มเรียน</label>
                    <select 
                        onChange={(e) => setViewFilterKey(e.target.value)} 
                        value={viewFilterKey}
                        className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500"
                        style={inputStyle}
                    >
                        <option value="">-- แสดงทั้งหมด (All Students) --</option>
                        {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-auto self-end">
                    <input 
                         type="text" 
                         placeholder="ค้นหาชื่อ/รหัส..." 
                         className="w-full p-2 rounded-lg border border-gray-300 text-sm"
                         style={inputStyle}
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStudents.map(student => {
                        const record = records[student.studentId];
                        const hasScore = record && record.scores && record.scores.total > 0;
                        
                        return (
                            <div key={student.studentId} className={`glass-card p-4 rounded-xl border-l-4 transition-all hover:shadow-lg ${hasScore ? 'border-green-500' : 'border-purple-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-lg truncate" style={{color: 'var(--text-primary)'}}>{student.firstName} {student.lastName}</h3>
                                        <p className="text-xs font-mono opacity-70" style={{color: 'var(--text-secondary)'}}>{student.studentId}</p>
                                    </div>
                                    {record?.isPosted && <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded border border-green-500/30">Posted</span>}
                                </div>
                                
                                <div className="mb-3 min-h-[40px]">
                                    {record?.projectTitle && <p className="text-xs text-purple-300 truncate font-medium mb-1">🎵 {record.projectTitle}</p>}
                                    
                                    <div className="flex gap-2 text-xs mb-2">
                                        {record?.sunoLink ? (
                                            <a href={record.sunoLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">Link Suno</a>
                                        ) : <span className="text-gray-500">No Suno</span>}
                                        <span className="text-gray-600">|</span>
                                        {record?.bandlabLink ? (
                                            <a href={record.bandlabLink} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 hover:underline">Link BandLab</a>
                                        ) : <span className="text-gray-500">No BandLab</span>}
                                    </div>

                                    {hasScore ? (
                                        <div className="flex items-end gap-2 mt-1 border-t border-white/10 pt-1">
                                            <span className="text-2xl font-bold text-purple-400">{record.scores?.total}</span>
                                            <span className="text-xs text-gray-500 mb-1">/ 100</span>
                                            
                                            {/* Show breakdown */}
                                            <div className="ml-auto flex flex-col items-end text-[10px] text-gray-400">
                                                <span>S: {(calculateScorePart(record.scores, 'SUNO')/5).toFixed(1)} / 10</span>
                                                <span>B: {(calculateScorePart(record.scores, 'BANDLAB')/5).toFixed(1)} / 10</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mt-2">- ยังไม่ได้ประเมิน -</p>
                                    )}
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <button 
                                        onClick={() => handleOpenGrading(student)} 
                                        className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                    >
                                        {hasScore ? 'แก้ไข' : 'ให้คะแนน'}
                                    </button>
                                     {hasScore && (
                                        <button 
                                            onClick={() => handleOpenSyncModal(student)}
                                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-blue-400 transition-colors border border-white/10"
                                            title="ส่งคะแนนคนเดียว"
                                        >
                                            🚀
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredStudents.length === 0 && <div className="col-span-full text-center py-10 text-gray-500">ไม่พบรายชื่อนักศึกษา</div>}
                </div>
            )}

            {/* Grading Modal */}
            <Modal isOpen={isGradingModalOpen} onClose={() => setIsGradingModalOpen(false)} title={`ประเมินผล: ${currentStudent?.firstName} ${currentStudent?.lastName}`} size="lg">
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold mb-1" style={{color: 'var(--text-secondary)'}}>ชื่อโปรเจกต์เพลง</label>
                            <input type="text" className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" 
                                placeholder="ระบุชื่อเพลง..." value={currentRecord.projectTitle || ''}
                                onChange={e => setCurrentRecord({...currentRecord, projectTitle: e.target.value})} style={inputStyle}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-xs font-bold mb-1 text-blue-400">ลิงก์ Suno AI</label>
                                <input type="text" className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                                    placeholder="https://suno.com/..." value={currentRecord.sunoLink || ''}
                                    onChange={e => setCurrentRecord({...currentRecord, sunoLink: e.target.value})} style={inputStyle}
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-orange-400">ลิงก์ BandLab</label>
                                <input type="text" className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-xs" 
                                    placeholder="https://bandlab.com/..." value={currentRecord.bandlabLink || ''}
                                    onChange={e => setCurrentRecord({...currentRecord, bandlabLink: e.target.value})} style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex border-b border-white/10 mt-2">
                        <button onClick={() => setGradingTab('SUNO')} className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${gradingTab === 'SUNO' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500'}`}>🎵 Suno AI (50)</button>
                        <button onClick={() => setGradingTab('BANDLAB')} className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${gradingTab === 'BANDLAB' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500'}`}>🎸 BandLab (50)</button>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-1">
                        {gradingTab === 'SUNO' && (
                            <div className="space-y-4 animate-fade-in pt-2">
                                {[
                                    { key: 'sunoPrompt', label: '1. การเขียน Prompt (Prompt Engineering)', max: 20, desc: 'ความละเอียด, การระบุ Mood/Style, Structure' },
                                    { key: 'sunoCreativity', label: '2. ความคิดสร้างสรรค์ (Creativity)', max: 15, desc: 'ไอเดียเนื้อหา, ความแปลกใหม่ของแนวเพลง' },
                                    { key: 'sunoCompleteness', label: '3. ความสมบูรณ์ของเพลง (Completeness)', max: 15, desc: 'โครงสร้างเพลงครบถ้วน (Verse, Chorus), ไฟล์สมบูรณ์' },
                                ].map((criteria) => (
                                    <div key={criteria.key} className="glass-card p-4 rounded-xl border border-blue-500/20 shadow-sm bg-blue-900/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="font-bold text-sm text-blue-200">{criteria.label}</label>
                                            <span className="text-xl font-bold text-blue-500">{(scores as any)[criteria.key] || 0} <span className="text-sm font-normal text-gray-500">/ {criteria.max}</span></span>
                                        </div>
                                        <p className="text-xs mb-3 opacity-60 text-gray-300">{criteria.desc}</p>
                                        <input type="range" min="0" max={criteria.max} value={(scores as any)[criteria.key] || 0} onChange={(e) => handleScoreChange(criteria.key as keyof MusicProductionRubric, parseInt(e.target.value))} className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {gradingTab === 'BANDLAB' && (
                             <div className="space-y-4 animate-fade-in pt-2">
                                {[
                                    { key: 'bandlabEditing', label: '1. เทคนิคการตัดต่อ (Editing)', max: 20, desc: 'การตัดต่อ Loop, ความเนียนของรอยต่อ, Timing' },
                                    { key: 'bandlabMixing', label: '2. การมิกซ์เสียง (Mixing & Balance)', max: 15, desc: 'ความสมดุลเสียงร้อง/ดนตรี, การใช้ Effect, Volume' },
                                    { key: 'bandlabArtistry', label: '3. องค์ประกอบศิลป์ (Artistry)', max: 15, desc: 'การเรียบเรียง, การเพิ่มเครื่องดนตรี, ความไพเราะ' },
                                ].map((criteria) => (
                                    <div key={criteria.key} className="glass-card p-4 rounded-xl border border-orange-500/20 shadow-sm bg-orange-900/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="font-bold text-sm text-orange-200">{criteria.label}</label>
                                            <span className="text-xl font-bold text-orange-500">{(scores as any)[criteria.key] || 0} <span className="text-sm font-normal text-gray-500">/ {criteria.max}</span></span>
                                        </div>
                                        <p className="text-xs mb-3 opacity-60 text-gray-300">{criteria.desc}</p>
                                        <input type="range" min="0" max={criteria.max} value={(scores as any)[criteria.key] || 0} onChange={(e) => handleScoreChange(criteria.key as keyof MusicProductionRubric, parseInt(e.target.value))} className="w-full accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0">
                        <label className="block text-sm font-bold mb-1" style={{color: 'var(--text-primary)'}}>Feedback</label>
                        <textarea className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm" rows={2} placeholder="ข้อเสนอแนะ..." value={scores.feedback || ''} onChange={e => handleScoreChange('feedback', e.target.value)} style={inputStyle} />
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                            <div className="flex flex-col">
                                 <div className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>รวม: <span className="text-3xl text-purple-500 ml-2">{scores.total}</span> / 100</div>
                                 <div className="text-sm font-bold text-blue-400">สุทธิ: {(scores.total / 5).toFixed(2)} / 20</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsGradingModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                                <button onClick={handleSaveRecord} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">บันทึกผล</button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Sync Modal (Individual) */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="ส่งคะแนนเข้าระบบ" size="md">
                <div className="space-y-4">
                     <SyncOptionsSelector source={syncSource} setSource={setSyncSource} />
                     <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 text-blue-400 text-sm">
                        <p className="font-bold">⚠️ ยืนยันการส่งคะแนน: <span className="text-white">{syncSource}</span></p>
                        <p className="mt-1 opacity-80">
                            คะแนนจะถูกบันทึกไปยังช่องที่คุณเลือก 
                            {syncSource === 'TOTAL' ? ' (100 -> 20)' : ' (50 -> 10)'}
                        </p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold mb-2" style={{color: 'var(--text-primary)'}}>เลือกช่องคะแนนปลายทาง (Target Column)</label>
                        <select 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                            value={targetGradingKey}
                            onChange={e => setTargetGradingKey(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">-- เลือกหัวข้อคะแนน (เช่น Final Exam) --</option>
                            {gradingOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                        <button onClick={handleSyncScore} disabled={!targetGradingKey || isSubmitting} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">ยืนยันส่งคะแนน</button>
                    </div>
                </div>
            </Modal>

            {/* Batch Sync Modal */}
            <Modal isOpen={isBatchSyncModalOpen} onClose={() => setIsBatchSyncModalOpen(false)} title="ส่งคะแนนทั้งห้อง (Batch Sync)" size="md">
                <div className="space-y-4">
                    <SyncOptionsSelector source={syncSource} setSource={setSyncSource} />
                    
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30 text-green-500 text-sm">
                        <p className="font-bold">🚀 ส่งคะแนนหมู่ ({syncSource})</p>
                        <p>ระบบจะส่งคะแนนของนักศึกษา <u>ที่มีผลประเมินแล้ว</u> ในหน้านี้ทั้งหมด</p>
                        <ul className="list-disc list-inside mt-2 text-xs opacity-80">
                            <li>จำนวนนักศึกษาในหน้านี้: <strong>{filteredStudents.length}</strong></li>
                            <li>จำนวนที่จะถูกส่งคะแนน: <strong>{filteredStudents.filter(s => records[s.studentId]?.scores).length}</strong></li>
                        </ul>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold mb-2" style={{color: 'var(--text-primary)'}}>เลือกช่องคะแนนปลายทาง (Target Column)</label>
                        <select 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                            value={targetGradingKey}
                            onChange={e => setTargetGradingKey(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">-- เลือกหัวข้อคะแนน --</option>
                            {gradingOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsBatchSyncModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                        <button onClick={handleBatchSync} disabled={!targetGradingKey || isSubmitting} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">ยืนยันส่งทั้งหมด</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MusicProduction;
