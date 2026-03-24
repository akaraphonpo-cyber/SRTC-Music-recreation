
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentWithId, Course, SingingRecord, SingingRubric, StudentScores, SystemConfig } from '../../types';
import { getSingingRecords, saveSingingRecord, getCourseGradingConfig, getScoresForCourse, setStudentScores, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { flattenGradingConfig } from '../../utils/grades';
import { studentMatchesScheduleFilter, getCustomGroupOptions, filterStudentsByGroupKey } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

interface SingingContestProps {
    allStudents: StudentWithId[];
    selectedTerm?: string;
    selectedYear?: string;
    availableSchedules?: any[];
}

const emptyRubric: SingingRubric = {
    soundQuality: 0, // 30
    lyrics: 0, // 20
    melody: 0, // 20
    rhythm: 0, // 20
    performance: 0, // 10
    total: 0,
    feedback: ''
};

const SingingContest: React.FC<SingingContestProps> = ({ allStudents, selectedTerm, selectedYear, availableSchedules }) => {
    const [records, setRecords] = useState<Record<string, SingingRecord>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [selectedCourse, setSelectedCourse] = useState<Course>(Course.RECREATION);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [viewFilterKey, setViewFilterKey] = useState<string>(''); // Dept|Level|Day|Time
    const [searchTerm, setSearchTerm] = useState('');

    // Grading Modal State
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<StudentWithId | null>(null);
    const [currentRecord, setCurrentRecord] = useState<Partial<SingingRecord>>({});
    const [scores, setScores] = useState<SingingRubric>(emptyRubric);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
    const [targetGradingKey, setTargetGradingKey] = useState('');
    const [gradingOptions, setGradingOptions] = useState<{key: string, label: string}[]>([]);
    
    const notification = useNotification();

    // Fetch initial data
    const fetchData = useCallback(async () => {
        await Promise.resolve();
        setIsLoading(true);
        const [recordsRes, configRes] = await Promise.all([
            getSingingRecords(selectedTerm, selectedYear),
            getSystemConfig()
        ]);
        
        if (recordsRes.success && recordsRes.data) {
            setRecords(recordsRes.data);
        }
        if (configRes.success && configRes.data) {
            setSystemConfig(configRes.data);
        }
        
        setIsLoading(false);
    }, [selectedTerm, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Custom Group Options
    const customGroupOptions = useMemo(() => {
        return getCustomGroupOptions(allStudents, systemConfig, selectedCourse, availableSchedules);
    }, [allStudents, systemConfig, selectedCourse, availableSchedules]);

    // Filter Students
    const filteredStudents = useMemo(() => {
        let students = allStudents.filter(s => {
            const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
            return courses.includes(selectedCourse);
        });

        // 1. Filter by Group/Schedule
        if (viewFilterKey) {
            students = filterStudentsByGroupKey(students, viewFilterKey, selectedCourse, availableSchedules);
        }

        // 2. Filter by Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            students = students.filter(s => 
                s.studentId.includes(searchTerm) || 
                s.firstName.toLowerCase().includes(lower) || 
                s.lastName.toLowerCase().includes(lower)
            );
        }
        
        // Sort by ID
        return students.sort((a,b) => a.studentId.localeCompare(b.studentId));
    }, [allStudents, viewFilterKey, searchTerm, selectedCourse, availableSchedules]);

    // Handlers
    const handleOpenGrading = (student: StudentWithId) => {
        setCurrentStudent(student);
        const existingRecord = records[student.studentId];
        
        if (existingRecord) {
            setCurrentRecord(existingRecord);
            setScores(existingRecord.scores || emptyRubric);
        } else {
            setCurrentRecord({ studentId: student.studentId, songName: '' });
            setScores(emptyRubric);
        }
        setIsGradingModalOpen(true);
    };

    const handleScoreChange = (field: keyof SingingRubric, value: any) => {
        setScores(prev => {
            const newScores = { ...prev, [field]: value };
            if (field !== 'total' && field !== 'feedback') {
                newScores.total = (
                    Number(newScores.soundQuality) + 
                    Number(newScores.lyrics) + 
                    Number(newScores.melody) + 
                    Number(newScores.rhythm) + 
                    Number(newScores.performance)
                );
            }
            return newScores;
        });
    };

    const handleSaveRecord = async () => {
        if (!currentStudent) return;
        setIsSubmitting(true);
        
        const recordToSave: SingingRecord = {
            studentId: currentStudent.studentId,
            songName: currentRecord.songName,
            scores: scores,
            isPosted: records[currentStudent.studentId]?.isPosted || false // Preserve posted status unless explicitly synced
        };

        const res = await saveSingingRecord(recordToSave);
        
        if (res.success) {
            setRecords(prev => ({ ...prev, [currentStudent.studentId]: recordToSave }));
            notification.addToast({ type: 'success', title: 'บันทึกเรียบร้อย' });
            setIsGradingModalOpen(false);
        } else {
            notification.addToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: res.message });
        }
        setIsSubmitting(false);
    };

    // --- SYNC LOGIC ---
    const prepareGradingOptions = async () => {
        const res = await getCourseGradingConfig(selectedCourse);
        if (res.success && res.data) {
            const items = flattenGradingConfig(res.data.gradingConfig, res.data.gradingConfigOrder);
            setGradingOptions(items.filter(i => !i.isHeader));
        } else {
            notification.addToast({type:'error', title:'Error', message:'ไม่สามารถโหลดข้อมูลการให้คะแนนวิชานี้ได้'});
        }
    };

    const handleOpenSyncModal = async (student: StudentWithId) => {
        setCurrentStudent(student);
        await prepareGradingOptions();
        setIsSyncModalOpen(true);
    };
    
    const handleOpenBatchSync = async () => {
        await prepareGradingOptions();
        setIsBatchSyncModalOpen(true);
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
            const scaledScore = (record.scores.total / 100) * 20; // Scale to 20
            const existingScoresRes = await getScoresForCourse(selectedCourse);
            const existingScores = existingScoresRes.data || {};
            const currentStudentScores = existingScores[currentStudent.studentId]?.scores || {};

            const update: StudentScores = {
                studentId: currentStudent.studentId,
                course: selectedCourse,
                scores: {
                    ...currentStudentScores,
                    [targetGradingKey]: scaledScore
                }
            };

            await setStudentScores([update]);
            
            // Mark as posted
            const updatedRecord = { ...record, isPosted: true };
            await saveSingingRecord(updatedRecord);
            setRecords(prev => ({ ...prev, [currentStudent.studentId]: updatedRecord }));

            notification.addToast({ type: 'success', title: 'ส่งคะแนนเรียบร้อย' });
            setIsSyncModalOpen(false);

        } catch (e: any) {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
        }
        setIsSubmitting(false);
    };

    const handleBatchSync = async () => {
        if (!targetGradingKey) return;
        setIsSubmitting(true);

        try {
            // Filter records for CURRENTLY displayed students only
            const studentsToSync = filteredStudents.filter(s => records[s.studentId]?.scores);
            
            if (studentsToSync.length === 0) {
                 notification.addToast({ type: 'warning', title: 'ไม่พบข้อมูล', message: 'ไม่มีนักศึกษาที่มีคะแนนในรายการนี้' });
                 setIsSubmitting(false);
                 return;
            }

            const existingScoresRes = await getScoresForCourse(selectedCourse);
            const existingScores = existingScoresRes.data || {};
            
            const updates: StudentScores[] = [];
            const recordUpdates: Promise<any>[] = [];

            studentsToSync.forEach(s => {
                const record = records[s.studentId];
                if (!record || !record.scores) return;

                const scaledScore = (record.scores.total / 100) * 20; // Scale to 20
                const currentStudentScores = existingScores[s.studentId]?.scores || {};
                
                updates.push({
                    studentId: s.studentId,
                    course: selectedCourse,
                    scores: {
                        ...currentStudentScores,
                        [targetGradingKey]: scaledScore
                    }
                });
                
                // Update local record state for posted status
                const updatedRecord = { ...record, isPosted: true };
                recordUpdates.push(saveSingingRecord(updatedRecord));
                // We update local state in bulk later or re-fetch? Let's optimistic update locally
                records[s.studentId] = updatedRecord; 
            });

            if (updates.length > 0) {
                await setStudentScores(updates);
                await Promise.all(recordUpdates);
                setRecords({ ...records }); // Trigger re-render
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
             <div className="flex flex-col sm:flex-row justify-between items-center p-4 glass-card rounded-2xl gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>🎤 การสอบร้องเพลง (Singing Exam)</h2>
                    <p className="text-sm opacity-70" style={{color: 'var(--text-secondary)'}}>ประเมินผลรายบุคคล (วิชานันทนาการ)</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-3 rounded-xl flex flex-col sm:flex-row gap-3 items-center border border-white/10">
                <div className="w-full sm:w-1/4">
                    <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>📚 เลือกรายวิชา</label>
                    <select 
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value as Course)}
                        className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-pink-500"
                        style={inputStyle}
                    >
                        <option value={Course.RECREATION}>นันทนาการ (Recreation)</option>
                        <option value={Course.BOY_SCOUT}>ลูกเสือ (Boy Scout)</option>
                    </select>
                </div>
                <div className="flex-grow w-full sm:w-1/2">
                    <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>🔍 เลือกห้อง/กลุ่มเรียน</label>
                    <select 
                        onChange={(e) => setViewFilterKey(e.target.value)} 
                        value={viewFilterKey}
                        className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-pink-500"
                        style={inputStyle}
                    >
                        <option value="">-- แสดงทั้งหมด (All Students) --</option>
                        {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-1/4 self-end">
                    <input 
                         type="text" 
                         placeholder="ค้นหาชื่อ/รหัส..." 
                         className="w-full p-2 rounded-lg border border-gray-300 text-sm"
                         style={inputStyle}
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                 <div className="w-full sm:w-auto self-end">
                    <button 
                        onClick={handleOpenBatchSync}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                        disabled={filteredStudents.length === 0}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        ส่งคะแนนทั้งห้อง
                    </button>
                </div>
            </div>

            {/* Student List Grid */}
            {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStudents.map(student => {
                        const record = records[student.studentId];
                        const hasScore = record && record.scores && record.scores.total > 0;
                        
                        return (
                            <div key={student.studentId} className={`glass-card p-4 rounded-xl border-l-4 transition-all hover:shadow-lg ${hasScore ? 'border-green-500' : 'border-gray-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{student.firstName} {student.lastName}</h3>
                                        <p className="text-xs font-mono opacity-70" style={{color: 'var(--text-secondary)'}}>{student.studentId}</p>
                                    </div>
                                    {record?.isPosted && <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded border border-green-500/30">Posted</span>}
                                </div>
                                
                                <div className="mb-3 min-h-[40px]">
                                    {hasScore ? (
                                        <div>
                                            <p className="text-xs text-gray-400">เพลง: {record.songName || '-'}</p>
                                            <div className="flex items-end gap-2 mt-1">
                                                <span className="text-2xl font-bold text-pink-500">{record.scores?.total}</span>
                                                <span className="text-xs text-gray-500 mb-1">/ 100</span>
                                                <span className="text-sm font-bold text-blue-400 ml-auto">
                                                    = {((record.scores?.total || 0) / 5).toFixed(1)} <span className="text-[10px] font-normal text-gray-500">/ 20</span>
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mt-2">- ยังไม่ได้ประเมิน -</p>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => handleOpenGrading(student)} 
                                        className="flex-1 py-1.5 rounded-lg bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 transition-colors shadow-md"
                                    >
                                        {hasScore ? 'แก้ไข' : 'ให้คะแนน'}
                                    </button>
                                    {hasScore && (
                                        <button 
                                            onClick={() => handleOpenSyncModal(student)}
                                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-400 transition-colors"
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
                <div className="space-y-6">
                    <div className="bg-pink-500/10 p-4 rounded-xl border border-pink-500/30 text-sm text-pink-400">
                        <div className="flex justify-between items-center">
                            <span className="font-bold">🎤 แบบประเมินการร้องเพลง</span>
                            <span className="text-xs opacity-80">คะแนนเต็ม 100 (หารเหลือ 20)</span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{color: 'var(--text-secondary)'}}>ชื่อเพลงที่ร้อง</label>
                        <input 
                            type="text" 
                            className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none" 
                            placeholder="ระบุชื่อเพลง..."
                            value={currentRecord.songName || ''}
                            onChange={e => setCurrentRecord({...currentRecord, songName: e.target.value})}
                            style={inputStyle}
                        />
                    </div>

                    <div className="space-y-4">
                        {[
                            { key: 'soundQuality', label: '1. คุณภาพเสียง (Sound Quality)', max: 30, desc: 'ความไพเราะ, ความกังวาน, ความเป็นธรรมชาติ' },
                            { key: 'lyrics', label: '2. เนื้อร้อง (Lyrics)', max: 20, desc: 'ความถูกต้อง, ความชัดเจน, อักขระควบกล้ำ' },
                            { key: 'melody', label: '3. ทำนอง (Melody)', max: 20, desc: 'ความแม่นยำของคีย์, ความลื่นไหล' },
                            { key: 'rhythm', label: '4. จังหวะ (Rhythm)', max: 20, desc: 'ความแม่นยำ, การเข้า/จบเพลง' },
                            { key: 'performance', label: '5. บุคลิกภาพ (Performance)', max: 10, desc: 'ลีลาท่าทาง, ความมั่นใจ, การแต่งกาย' },
                        ].map((criteria) => (
                            <div key={criteria.key} className="glass-card p-4 rounded-xl border border-white/10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-sm sm:text-base" style={{color: 'var(--text-primary)'}}>{criteria.label}</label>
                                    <span className="text-xl font-bold text-pink-500">
                                        {(scores as any)[criteria.key] || 0} <span className="text-sm font-normal" style={{color: 'var(--text-muted)'}}>/ {criteria.max}</span>
                                    </span>
                                </div>
                                <p className="text-xs mb-3 opacity-70" style={{color: 'var(--text-secondary)'}}>{criteria.desc}</p>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={criteria.max} 
                                    value={(scores as any)[criteria.key] || 0} 
                                    onChange={(e) => handleScoreChange(criteria.key as keyof SingingRubric, parseInt(e.target.value))}
                                    className="w-full accent-pink-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2" style={{color: 'var(--text-primary)'}}>ข้อเสนอแนะ (Feedback)</label>
                        <textarea 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm" 
                            rows={2} 
                            placeholder="สิ่งที่ทำได้ดี, สิ่งที่ควรปรับปรุง..."
                            value={scores.feedback || ''}
                            onChange={e => handleScoreChange('feedback', e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="flex flex-col">
                             <div className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>รวม: <span className="text-3xl text-pink-500 ml-2">{scores.total}</span> / 100</div>
                             <div className="text-sm font-bold text-blue-400">สุทธิ: {(scores.total / 5).toFixed(2)} / 20</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsGradingModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                            <button onClick={handleSaveRecord} disabled={isSubmitting} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">บันทึกผล</button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Sync Modal (Individual) */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="ส่งคะแนนเข้าระบบ" size="md">
                <div className="space-y-4">
                     <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 text-blue-400 text-sm">
                        <p className="font-bold">⚠️ ยืนยันการส่งคะแนน</p>
                        <p className="mt-1">คะแนนดิบ: <span className="font-bold text-white">{scores.total}</span> / 100</p>
                        <p>คะแนนที่จะบันทึกจริง: <span className="font-bold text-lg text-white">{(scores.total / 5).toFixed(2)}</span> / 20</p>
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
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30 text-green-500 text-sm">
                        <p className="font-bold">🚀 ส่งคะแนนหมู่</p>
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
                            <option value="">-- เลือกหัวข้อคะแนน (เช่น Final Exam) --</option>
                            {gradingOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>คะแนนเต็ม 100 จะถูกหารเหลือ 20 อัตโนมัติ</p>
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

export default SingingContest;
