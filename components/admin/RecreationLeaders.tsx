
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentWithId, Course, RecreationGroup, RecreationRubric, StudentScores, SystemConfig } from '../../types';
import { getRecreationGroups, addRecreationGroup, updateRecreationGroup, deleteRecreationGroup, getCourseGradingConfig, getScoresForCourse, setStudentScores, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { flattenGradingConfig } from '../../utils/grades';
import { studentMatchesScheduleFilter, getCustomGroupOptions, filterStudentsByGroupKey } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

interface RecreationLeadersProps {
    allStudents: StudentWithId[];
    availableSchedules?: any[];
    selectedTerm?: string;
    selectedYear?: string;
}

const emptyScores: RecreationRubric = {
    teamwork: 0,
    roleDivision: 0,
    fun: 0,
    communication: 0,
    preparation: 0,
    total: 0,
    feedback: ''
};

const RecreationLeaders: React.FC<RecreationLeadersProps> = ({ allStudents, availableSchedules, selectedTerm, selectedYear }) => {
    const [groups, setGroups] = useState<RecreationGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'groups' | 'grading'>('groups');
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<Partial<RecreationGroup>>({ activityName: '', members: [] });
    const [searchTerm, setSearchTerm] = useState(''); // Inside Modal Search
    const [selectedStudents, setSelectedStudents] = useState<StudentWithId[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Group Filtering State (Main Page & Modal)
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [filterGroupKey, setFilterGroupKey] = useState<string>(''); // For creating groups
    const [viewFilterKey, setViewFilterKey] = useState<string>(''); // For viewing groups list
    const [selectedCourse, setSelectedCourse] = useState<Course>(Course.RECREATION); // Added course selector

    // Grading State
    const [gradingGroup, setGradingGroup] = useState<RecreationGroup | null>(null);
    const [scores, setScores] = useState<RecreationRubric>(emptyScores);
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    
    // Grade Sync State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [targetGradingKey, setTargetGradingKey] = useState('');
    const [gradingOptions, setGradingOptions] = useState<{key: string, label: string}[]>([]);
    
    // Batch Sync State
    const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
    const [batchSyncStats, setBatchSyncStats] = useState({ totalGroups: 0, validGroups: 0 });

    const notification = useNotification();

    const fetchGroups = useCallback(async () => {
        await Promise.resolve();
        setIsLoading(true);
        const res = await getRecreationGroups(selectedTerm, selectedYear);
        if (res.success && res.data) {
            setGroups(res.data);
        }
        setIsLoading(false);
    }, [selectedTerm, selectedYear]);

    useEffect(() => {
        void fetchGroups();
        
        // Fetch System Config for Group Aliases
        const fetchConfig = async () => {
            await Promise.resolve();
            const res = await getSystemConfig();
            if (res.success && res.data) {
                setSystemConfig(res.data);
            }
        };
        void fetchConfig();
    }, [fetchGroups]);

    // Custom Group Options for Dropdown
    const customGroupOptions = useMemo(() => {
        return getCustomGroupOptions(allStudents, systemConfig, selectedCourse, availableSchedules);
    }, [allStudents, systemConfig, selectedCourse, availableSchedules]);

    // --- Data Filtering Logic ---

    // 1. Filter Groups for Display (Main Page)
    const filteredGroups = useMemo(() => {
        if (!viewFilterKey) return groups;

        return groups.filter(group => {
            // A group matches if AT LEAST ONE member matches the filter criteria
            return group.members.some(member => {
                const student = allStudents.find(s => s.studentId === member.studentId);
                if (!student) return false;
                return filterStudentsByGroupKey([student], viewFilterKey, selectedCourse, availableSchedules).length > 0;
            });
        });
    }, [groups, viewFilterKey, allStudents, selectedCourse, availableSchedules]);

    // 2. Filter students for group creation (Modal)
    const availableStudents = useMemo(() => {
        let filtered = allStudents.filter(s => {
            const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
            return courses.includes(selectedCourse);
        });

        if (filterGroupKey) {
            filtered = filterStudentsByGroupKey(filtered, filterGroupKey, selectedCourse, availableSchedules);
        }

        if (searchTerm) {
            filtered = filtered.filter(s => 
                s.studentId.includes(searchTerm) || 
                s.firstName.includes(searchTerm) || 
                s.lastName.includes(searchTerm)
            );
        }

        return filtered;
    }, [allStudents, searchTerm, filterGroupKey, selectedCourse, availableSchedules]);

    // Theme-aware input styles
    const inputStyle = {
        color: 'var(--text-primary)',
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--input-border)'
    };

    // --- Handlers ---

    const handleCreateGroup = () => {
        setCurrentGroup({ activityName: '', members: [] });
        setSelectedStudents([]);
        setSearchTerm('');
        setFilterGroupKey(viewFilterKey); // Default to current view filter
        setIsModalOpen(true);
    };

    const handleEditGroup = (group: RecreationGroup) => {
        setCurrentGroup(group);
        setSelectedStudents(group.members || []);
        setSearchTerm('');
        setFilterGroupKey('');
        setIsModalOpen(true);
    };

    const handleSelectAllVisible = () => {
        if (availableStudents.length === 0) return;
        setSelectedStudents(prev => {
            const existingIds = new Set(prev.map(s => s.studentId));
            const newStudents = availableStudents.filter(s => !existingIds.has(s.studentId));
            return [...prev, ...newStudents];
        });
        notification.addToast({ type: 'info', title: 'เลือกแล้ว', message: `เพิ่มนักศึกษา ${availableStudents.length} คน` });
    };

    const handleClearSelection = () => {
        setSelectedStudents([]);
    };

    const handleSaveGroup = async () => {
        if (!currentGroup.activityName || selectedStudents.length === 0) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อกิจกรรมและเลือกสมาชิก' });
            return;
        }
        
        setIsSubmitting(true);
        let res;
        
        if (currentGroup.id) {
            res = await updateRecreationGroup(currentGroup.id, {
                course: selectedCourse,
                activityName: currentGroup.activityName,
                members: selectedStudents
            });
        } else {
            const newGroupData = {
                course: selectedCourse,
                activityName: currentGroup.activityName,
                members: selectedStudents,
                scores: emptyScores
            };
            res = await addRecreationGroup(newGroupData);
        }

        if (res.success) {
            notification.addToast({ type: 'success', title: currentGroup.id ? 'แก้ไขกลุ่มสำเร็จ' : 'สร้างกลุ่มสำเร็จ' });
            fetchGroups();
            setIsModalOpen(false);
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
        }
        setIsSubmitting(false);
    };

    const handleDeleteGroup = (group: RecreationGroup) => {
        notification.showConfirmation({
            title: 'ลบกลุ่ม?',
            message: `ยืนยันการลบกลุ่ม "${group.activityName}"`,
            confirmText: 'ลบเลย',
            onConfirm: async () => {
                if (group.id) {
                    await deleteRecreationGroup(group.id);
                    fetchGroups();
                    notification.addToast({ type: 'success', title: 'ลบสำเร็จ' });
                }
            }
        });
    };

    const handleOpenGrading = (group: RecreationGroup) => {
        setGradingGroup(group);
        setScores(group.scores || emptyScores);
        setIsGradingModalOpen(true);
    };

    const handleScoreChange = (field: keyof RecreationRubric, value: any) => {
        setScores(prev => {
            const newScores = { ...prev, [field]: value };
            if (field !== 'total' && field !== 'feedback') {
                newScores.total = (
                    Number(newScores.teamwork) + 
                    Number(newScores.roleDivision) + 
                    Number(newScores.fun) + 
                    Number(newScores.communication) + 
                    Number(newScores.preparation)
                );
            }
            return newScores;
        });
    };

    const handleSaveScore = async () => {
        if (!gradingGroup?.id) return;
        setIsSubmitting(true);
        const res = await updateRecreationGroup(gradingGroup.id, { scores: scores });
        if (res.success) {
            notification.addToast({ type: 'success', title: 'บันทึกคะแนนแล้ว' });
            fetchGroups();
            setIsGradingModalOpen(false);
        } else {
            notification.addToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: res.message });
        }
        setIsSubmitting(false);
    };

    // --- Single Sync ---
    const handleOpenSyncModal = async (group: RecreationGroup) => {
        setGradingGroup(group);
        setScores(group.scores || emptyScores);
        await prepareGradingOptions();
        setIsSyncModalOpen(true);
    };

    const prepareGradingOptions = async () => {
        const res = await getCourseGradingConfig(selectedCourse);
        if (res.success && res.data) {
            const items = flattenGradingConfig(res.data.gradingConfig, res.data.gradingConfigOrder);
            setGradingOptions(items.filter(i => !i.isHeader));
        } else {
            notification.addToast({type:'error', title:'Error', message:'ไม่สามารถโหลดข้อมูลการให้คะแนนวิชานี้ได้'});
        }
    };

    const handleSyncScore = async () => {
        if (!gradingGroup || !targetGradingKey) return;
        setIsSubmitting(true);
        try {
            await processScoreSync([gradingGroup], targetGradingKey);
            notification.addToast({ type: 'success', title: 'ส่งคะแนนเรียบร้อย' });
            setIsSyncModalOpen(false);
            fetchGroups();
        } catch (e: any) {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
        }
        setIsSubmitting(false);
    };

    // --- Batch Sync ---
    const handleOpenBatchSyncModal = async () => {
        await prepareGradingOptions();
        // Calculate valid groups
        const valid = filteredGroups.filter(g => g.scores && g.scores.total > 0 && !g.isPosted).length;
        setBatchSyncStats({ totalGroups: filteredGroups.length, validGroups: valid });
        setIsBatchSyncModalOpen(true);
    };

    const handleBatchSync = async () => {
        if (!targetGradingKey) return;
        setIsSubmitting(true);
        try {
            // Filter groups that have scores and are not posted (optional check, usually we allow overwrite but let's prioritize valid scores)
            const groupsToSync = filteredGroups.filter(g => g.scores && g.scores.total > 0);
            
            if (groupsToSync.length === 0) {
                 notification.addToast({ type: 'warning', title: 'ไม่พบกลุ่ม', message: 'ไม่มีกลุ่มที่ประเมินคะแนนแล้วในรายการนี้' });
                 setIsSubmitting(false);
                 return;
            }

            await processScoreSync(groupsToSync, targetGradingKey);
            
            notification.addToast({ 
                type: 'success', 
                title: 'ส่งคะแนนกลุ่มสำเร็จ', 
                message: `ส่งคะแนนของ ${groupsToSync.length} กลุ่มเรียบร้อยแล้ว` 
            });
            setIsBatchSyncModalOpen(false);
            fetchGroups();

        } catch (e: any) {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
        }
        setIsSubmitting(false);
    };

    // Helper Function for Sync Logic
    const processScoreSync = async (targetGroups: RecreationGroup[], gradingKey: string) => {
        // 1. Get existing scores
        const existingScoresRes = await getScoresForCourse(selectedCourse);
        const existingScores = existingScoresRes.data || {};

        const updates: StudentScores[] = [];
        const groupUpdatePromises: Promise<any>[] = [];

        targetGroups.forEach(group => {
            if (!group.scores || !group.id) return;
            // Calculate scaled score (100 -> 10)
            const scaledScore = (group.scores.total / 100) * 10;

            group.members.forEach(member => {
                const currentStudentScores = existingScores[member.studentId]?.scores || {};
                updates.push({
                    studentId: member.studentId,
                    course: selectedCourse,
                    scores: {
                        ...currentStudentScores,
                        [gradingKey]: scaledScore
                    }
                });
            });
            
            // Mark group as posted
            groupUpdatePromises.push(updateRecreationGroup(group.id, { isPosted: true }));
        });

        // 2. Batch Update Scores
        if (updates.length > 0) {
            await setStudentScores(updates);
        }
        
        // 3. Mark groups as posted
        await Promise.all(groupUpdatePromises);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 glass-card rounded-2xl gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>ผู้นำกิจกรรมนันทนาการ (Recreation Leaders)</h2>
                    <p className="text-sm opacity-70" style={{color: 'var(--text-secondary)'}}>จัดการกลุ่มและประเมินผลการนำกิจกรรม</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleCreateGroup} className="flex-1 sm:flex-none btn-accent px-4 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform whitespace-nowrap">
                        + สร้างกลุ่ม
                    </button>
                </div>
            </div>
            
            {/* Main Filter Bar */}
            <div className="glass-card p-3 rounded-xl flex flex-col sm:flex-row gap-3 items-center border border-white/10">
                <div className="flex-grow w-full sm:w-1/3">
                    <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>📚 รายวิชา (Course)</label>
                    <select 
                        onChange={(e) => setSelectedCourse(e.target.value as Course)} 
                        value={selectedCourse}
                        className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
                        style={inputStyle}
                    >
                        {Object.values(Course).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex-grow w-full sm:w-2/3">
                    <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-secondary)'}}>🔍 กรองตามกลุ่มเรียน (Filter View)</label>
                    <select 
                        onChange={(e) => setViewFilterKey(e.target.value)} 
                        value={viewFilterKey}
                        className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
                        style={inputStyle}
                    >
                        <option value="">-- แสดงทั้งหมด (All Groups) --</option>
                        {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                    </select>
                </div>
                {activeTab === 'grading' && (
                    <button 
                        onClick={handleOpenBatchSyncModal}
                        disabled={filteredGroups.length === 0}
                        className="w-full sm:w-auto mt-auto px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        ส่งคะแนนทีเดียว (Batch)
                    </button>
                )}
            </div>

            <div className="flex space-x-2 border-b border-gray-200/20 mb-4">
                <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'groups' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>รายชื่อกลุ่ม ({filteredGroups.length})</button>
                <button onClick={() => setActiveTab('grading')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'grading' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>การประเมินผล</button>
            </div>

            {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredGroups.map(group => (
                        <div key={group.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between h-full border border-white/10 hover:shadow-xl transition-all">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{group.activityName}</h3>
                                    {group.isPosted && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30">ส่งคะแนนแล้ว</span>}
                                </div>
                                
                                <div className="bg-black/20 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">สมาชิก ({group.members.length})</p>
                                    <ul className="text-sm space-y-1">
                                        {group.members.map(m => (
                                            <li key={m.studentId} className="flex justify-between">
                                                <span>{m.prefix}{m.firstName} {m.lastName}</span>
                                                <span className="opacity-50 text-xs">{m.studentId}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {activeTab === 'grading' && (
                                    <div className="mb-4">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm text-gray-400">คะแนนรวม</span>
                                            <span className="text-2xl font-bold text-yellow-400">{group.scores?.total || 0}/100</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                            <div className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500" style={{width: `${group.scores?.total || 0}%`}}></div>
                                        </div>
                                        {group.scores?.feedback && (
                                            <p className="text-xs text-gray-400 mt-2 italic">"{group.scores.feedback}"</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t border-white/10">
                                {activeTab === 'groups' ? (
                                    <>
                                        <button onClick={() => handleDeleteGroup(group)} className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors">ลบ</button>
                                        <button onClick={() => handleEditGroup(group)} className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors">แก้ไข</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleOpenGrading(group)} className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors shadow-lg">ประเมินผล</button>
                                        <button onClick={() => handleOpenSyncModal(group)} className="px-3 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40 border border-green-500/30" title="ส่งคะแนนเข้าระบบ">🚀</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredGroups.length === 0 && <p className="text-center col-span-full py-10 text-gray-500">ไม่พบกลุ่มที่ตรงกับเงื่อนไข</p>}
                </div>
            )}

            {/* Group Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentGroup.id ? "แก้ไขกลุ่มกิจกรรม" : "สร้างกลุ่มกิจกรรมใหม่"} size="lg">
                <div className="space-y-4 h-full flex flex-col">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>ชื่อกิจกรรม (Activity Name)</label>
                        <input 
                            type="text" 
                            className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent outline-none" 
                            placeholder="เช่น เก้าอี้ดนตรี, เหยียบลูกโป่ง"
                            value={currentGroup.activityName}
                            onChange={e => setCurrentGroup({...currentGroup, activityName: e.target.value})}
                            style={inputStyle}
                        />
                    </div>
                    
                    <div className="flex-grow flex flex-col min-h-0">
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เลือกสมาชิก (Select Students)</label>
                        
                        <div className="bg-black/5 p-3 rounded-lg mb-2">
                            <label className="block text-xs font-bold mb-1" style={{color: 'var(--text-muted)'}}>ตัวกรอง (Filter)</label>
                            
                            {/* Group Selection Dropdown */}
                            <select 
                                onChange={(e) => setFilterGroupKey(e.target.value)} 
                                value={filterGroupKey}
                                className="w-full p-2 mb-2 rounded-lg border border-gray-300 text-sm"
                                style={inputStyle}
                            >
                                <option value="">-- กรองตามกลุ่มเรียน (Saved Groups) --</option>
                                {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                            </select>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-grow p-2 rounded-lg border border-gray-300 text-sm" 
                                    placeholder="ค้นหารหัส หรือ ชื่อ..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={inputStyle}
                                />
                                <button 
                                    onClick={handleSelectAllVisible}
                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                                >
                                    เลือกทั้งหมดที่แสดง
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto border rounded-lg p-2 max-h-60 custom-scrollbar" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                            {availableStudents.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">ไม่พบนักศึกษาตามเงื่อนไข</p>
                            ) : (
                                availableStudents.slice(0, 100).map(student => {
                                    const isSelected = selectedStudents.some(s => s.studentId === student.studentId);
                                    return (
                                        <div 
                                            key={student.studentId} 
                                            onClick={() => {
                                                if (isSelected) setSelectedStudents(prev => prev.filter(s => s.studentId !== student.studentId));
                                                else setSelectedStudents(prev => [...prev, student]);
                                            }}
                                            className={`flex justify-between items-center p-2 rounded cursor-pointer mb-1 ${isSelected ? 'bg-blue-500/20 border-blue-500/50 border' : 'hover:bg-black/5'}`}
                                        >
                                            <div className="text-sm" style={{color: 'var(--text-primary)'}}>
                                                <span className="font-bold mr-2">{student.studentId}</span>
                                                {student.prefix}{student.firstName} {student.lastName}
                                            </div>
                                            {isSelected && <span className="text-blue-500 font-bold">✓</span>}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div className="mt-2 flex justify-between items-center text-sm">
                            <button onClick={handleClearSelection} className="text-red-500 hover:underline text-xs">ล้างการเลือก</button>
                            <span style={{color: 'var(--text-secondary)'}}>เลือกแล้ว {selectedStudents.length} คน</span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg mr-2" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                        <button onClick={handleSaveGroup} disabled={isSubmitting} className="btn-accent px-6 py-2 rounded-lg font-bold shadow-md disabled:opacity-50">
                            {currentGroup.id ? 'บันทึกการแก้ไข' : 'บันทึกกลุ่ม'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Grading Modal (Rubric) */}
            <Modal isOpen={isGradingModalOpen} onClose={() => setIsGradingModalOpen(false)} title={`ประเมินผล: ${gradingGroup?.activityName}`} size="lg">
                <div className="space-y-6">
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 text-sm text-blue-400">
                        <p className="font-bold mb-1">ℹ️ เกณฑ์การให้คะแนน (Total 100)</p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                            <li>คะแนนดิบเต็ม 100 จะถูกหารเหลือ 10 เมื่อส่งเข้าระบบ</li>
                            <li>กรุณาให้คะแนนตามความเป็นจริงเพื่อความยุติธรรม</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        {[
                            { key: 'teamwork', label: '1. การทำงานเป็นทีม (Teamwork)', max: 20, desc: 'ความสามัคคี, การช่วยเหลือกันในกลุ่ม' },
                            { key: 'roleDivision', label: '2. การแบ่งหน้าที่ (Role Division)', max: 20, desc: 'มีการแบ่งหน้าที่ชัดเจน, ทุกคนมีส่วนร่วม' },
                            { key: 'fun', label: '3. ความสนุก (Fun/Engagement)', max: 20, desc: 'สร้างบรรยากาศได้ดี, เพื่อนร่วมชั้นสนุกสนาน' },
                            { key: 'communication', label: '4. การสื่อสาร (Communication)', max: 20, desc: 'อธิบายกติกาชัดเจน, น้ำเสียงน่าฟัง, การนำเสนอ' },
                            { key: 'preparation', label: '5. การจัดเตรียมอุปกรณ์ (Preparation)', max: 20, desc: 'อุปกรณ์พร้อม, สถานที่พร้อม, เพลงพร้อม' },
                        ].map((criteria) => (
                            <div key={criteria.key} className="glass-card p-4 rounded-xl border border-white/10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold" style={{color: 'var(--text-primary)'}}>{criteria.label}</label>
                                    <span className="text-xl font-bold text-blue-500">
                                        {(scores as any)[criteria.key] || 0} <span className="text-sm font-normal" style={{color: 'var(--text-muted)'}}>/ {criteria.max}</span>
                                    </span>
                                </div>
                                <p className="text-xs mb-3" style={{color: 'var(--text-secondary)'}}>{criteria.desc}</p>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={criteria.max} 
                                    value={(scores as any)[criteria.key] || 0} 
                                    onChange={(e) => handleScoreChange(criteria.key as keyof RecreationRubric, parseInt(e.target.value))}
                                    className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2" style={{color: 'var(--text-primary)'}}>ข้อเสนอแนะ (Feedback)</label>
                        <textarea 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                            rows={3} 
                            placeholder="สิ่งที่ทำได้ดี, สิ่งที่ควรปรับปรุง..."
                            value={scores.feedback || ''}
                            onChange={e => handleScoreChange('feedback', e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>รวม: <span className="text-3xl text-blue-500 ml-2">{scores.total}</span> / 100</div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsGradingModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                            <button onClick={handleSaveScore} disabled={isSubmitting} className="btn-accent px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50">บันทึกคะแนน</button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Sync to System Modal (Single) */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="ส่งคะแนนเข้าระบบ" size="md">
                <div className="space-y-4">
                    <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30 text-yellow-500 text-sm">
                        <p className="font-bold">⚠️ ยืนยันการส่งคะแนน</p>
                        <p>คะแนนเต็ม 100 จะถูกหารเหลือเต็ม 10 คะแนน</p>
                        <p className="mt-1">คะแนนที่จะบันทึกจริง: <span className="font-bold text-lg text-blue-500">{(scores.total / 10).toFixed(1)}</span> / 10</p>
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
                        <button onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                        <button onClick={handleSyncScore} disabled={!targetGradingKey || isSubmitting} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">ยืนยันส่งคะแนน</button>
                    </div>
                </div>
            </Modal>

             {/* Batch Sync Modal */}
             <Modal isOpen={isBatchSyncModalOpen} onClose={() => setIsBatchSyncModalOpen(false)} title="ส่งคะแนนทั้งห้อง (Batch Sync)" size="md">
                <div className="space-y-4">
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30 text-green-500 text-sm">
                        <p className="font-bold">🚀 ยืนยันการส่งคะแนนแบบกลุ่ม</p>
                        <p>ระบบจะส่งคะแนนของกลุ่มที่ <u>ผ่านการประเมินแล้ว (มีคะแนน)</u> เท่านั้น</p>
                        <ul className="list-disc list-inside mt-2 text-xs opacity-80">
                            <li>จำนวนกลุ่มทั้งหมดในหน้านี้: <strong>{batchSyncStats.totalGroups}</strong></li>
                            <li>จำนวนกลุ่มที่จะถูกส่งคะแนน: <strong>{batchSyncStats.validGroups}</strong></li>
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
                        <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>คะแนนดิบเต็ม 100 จะถูกหารเหลือ 10 คะแนน</p>
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsBatchSyncModalOpen(false)} className="px-4 py-2 hover:bg-black/5 rounded-lg" style={{color: 'var(--text-secondary)'}}>ยกเลิก</button>
                        <button onClick={handleBatchSync} disabled={!targetGradingKey || isSubmitting || batchSyncStats.validGroups === 0} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors">ยืนยันส่งทั้งหมด</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default RecreationLeaders;
