
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StudentWithId, Course, StudentScores, CourseConfig, SystemConfig } from '../../types';
import { getCourseGradingConfig, getScoresForCourse, setStudentScores, getSystemConfig } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { calculateTotal, calculateGrade, flattenGradingConfig, FlatGradingItem, getDisplayColumnsWithGroups, calculateGroupScore } from '../../utils/grades';
import { getStudentSchedule, studentMatchesScheduleFilter, getCustomGroupOptions } from '../../utils/schedule';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

// --- Edit Modal Components (New Simpler Design) ---

const ScoreItemRow: React.FC<{
    item: FlatGradingItem;
    scores: StudentScores['scores'];
    onScoreChange: (key: string, value: string) => void;
}> = ({ item, scores, onScoreChange }) => {
    const indentStyle = { paddingLeft: `${item.level * 1.5 + 0.5}rem` };

    if (item.isHeader) {
        return (
            <div className={`mt-3 first:mt-0 ${item.level > 0 ? 'pl-2' : ''}`}>
                <h4 
                  className="font-semibold p-2 rounded-md"
                  style={{color: 'var(--text-primary)', backgroundColor: 'rgba(0,0,0,0.1)', paddingLeft: item.level > 0 ? `${item.level * 1.5 + 0.5}rem` : undefined }}
                >
                    {item.label}
                </h4>
            </div>
        );
    }

    const inputStyle = {
      color: 'var(--text-primary)',
      backgroundColor: 'var(--input-bg)',
      border: '1px solid var(--input-border)',
    };

    return (
        <div 
          className="flex items-center justify-between py-2 px-2 hover:bg-black/10 rounded-md" 
          style={indentStyle}
        >
            <label htmlFor={item.key} className="text-sm truncate pr-4" style={{color: 'var(--text-secondary)'}}>{item.label}</label>
            <div className="flex items-center space-x-2">
                <input
                    id={item.key}
                    type="number"
                    min="0"
                    max={item.max}
                    value={scores?.[item.key] ?? ''}
                    onChange={(e) => onScoreChange(item.key, e.target.value)}
                    className="w-24 text-center text-sm p-1.5 rounded-md shadow-sm focus:ring-1 focus:ring-accent focus:border-accent"
                    style={inputStyle}
                    placeholder="-"
                />
                <span className="text-sm" style={{color: 'var(--text-muted)'}}>/ {item.max}</span>
            </div>
        </div>
    );
};

const SortIcon: React.FC<{ direction: 'asc' | 'desc' | 'none' }> = ({ direction }) => {
    if (direction === 'asc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    if (direction === 'desc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30 group-hover:opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;
};

interface GradingSystemProps {
  students: StudentWithId[];
  onConfigure: (courseName: Course) => void;
  selectedTerm?: string;
  selectedYear?: string;
  availableSchedules?: any[];
}

const GradingSystem: React.FC<GradingSystemProps> = ({ students, onConfigure, selectedTerm, selectedYear, availableSchedules }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  const [courseConfig, setCourseConfig] = useState<CourseConfig | null>(null);
  const [scores, setScores] = useState<Record<string, StudentScores['scores']>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
  const notification = useNotification();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithId | null>(null);
  const [currentScores, setCurrentScores] = useState<StudentScores['scores']>({});

  // Mass Entry Modal State
  const [isMassEntryModalOpen, setIsMassEntryModalOpen] = useState(false);
  const [massEntryAssignmentKey, setMassEntryAssignmentKey] = useState<string>('');
  const [massEntryScores, setMassEntryScores] = useState<Record<string, string>>({}); // studentId -> score string
  const massEntryModalRef = useRef<HTMLDivElement>(null);

  // System Config for Aliases
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
      const fetchConfig = async () => {
          const res = await getSystemConfig();
          if (res.success && res.data) {
              setSystemConfig(res.data);
          }
      };
      fetchConfig();
  }, []);

  // Custom Group Aliases
  const customGroupOptions = useMemo(() => {
      return getCustomGroupOptions(students, systemConfig, selectedCourse, availableSchedules);
  }, [students, systemConfig, selectedCourse, availableSchedules]);

  const handleCustomGroupChange = (key: string) => {
      if (!key) return;
      // Key format: Dept|Level|Day|Time
      const [dept, level, day, time] = key.split('|');
      setSelectedDepartment(dept || '');
      setSelectedClassLevel(level || '');
      setSelectedDay(day || '');
      setSelectedTimeSlot(time || '');
  };


  const uniqueCourses = useMemo(() => {
    const courses = new Set<Course>();
    students.forEach(student => {
        // Handle new multi-course format
        if (student.courses && Array.isArray(student.courses)) {
            student.courses.forEach(course => courses.add(course));
        }
        // Handle old single-course format for backward compatibility
        // @ts-ignore
        if (student.course) {
             // @ts-ignore
            courses.add(student.course);
        }
    });
    return Array.from(courses).sort();
  }, [students]);
  
  // Effect to reset filters when course changes
  useEffect(() => {
      setSelectedDepartment('');
      setSelectedClassLevel('');
      setSearchTerm('');
      setSelectedDay('');
      setSelectedTimeSlot('');
      setSortDirection('none');
  }, [selectedCourse]);

  const fetchCourseData = useCallback(async (course: Course) => {
    setIsLoading(true);
    setCourseConfig(null);
    setScores({});
    try {
      const [configRes, scoresRes] = await Promise.all([
        getCourseGradingConfig(course),
        getScoresForCourse(course)
      ]);

      if (configRes.success && configRes.data) {
        setCourseConfig(configRes.data);
      } else {
        notification.addToast({ type: 'error', title: 'Error', message: 'Could not load grading configuration.' });
      }

      if (scoresRes.success && scoresRes.data) {
        const scoresByStudentId = Object.entries(scoresRes.data).reduce((acc, [_, studentScore]) => {
          acc[(studentScore as any).studentId] = (studentScore as any).scores;
          return acc;
        }, {} as Record<string, StudentScores['scores']>);
        setScores(scoresByStudentId);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      notification.addToast({ type: 'error', title: 'Error', message: 'Failed to load course data.' });
    } finally {
      setIsLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseData(selectedCourse);
    } else {
      setCourseConfig(null);
      setScores({});
    }
  }, [selectedCourse, fetchCourseData]);

  const filterOptions = useMemo(() => {
    if (!selectedCourse) {
        return { departments: [], classLevels: [], days: [], timeSlots: [] };
    }
    const studentsInCourse = students.filter(s =>
      (s.courses && s.courses.includes(selectedCourse)) ||
      // @ts-ignore
      s.course === selectedCourse
    );
    const departments = new Set<string>();
    const classLevels = new Set<string>();
    const days = new Set<string>();
    const timeSlots = new Set<string>();


    studentsInCourse.forEach(s => {
        const schedule = getStudentSchedule(s, selectedCourse as Course, availableSchedules);
        s.department && departments.add(s.department);
        s.classLevel && classLevels.add(s.classLevel);
        schedule.day && days.add(schedule.day);
        if (schedule.startTime && schedule.endTime) {
          timeSlots.add(`${schedule.startTime} - ${schedule.endTime}`);
        }
    });

    return {
        departments: Array.from(departments).sort(),
        classLevels: Array.from(classLevels).sort(),
        days: Array.from(days).sort(),
        timeSlots: Array.from(timeSlots).sort(),
    };
  }, [students, selectedCourse]);

  const handleSort = () => {
    setSortDirection(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const sortedStudents = useMemo(() => {
    if (!selectedCourse) return [];
    let studentsToProcess = students
      .filter(s => {
        const studentCourses: Course[] = (s.courses && Array.isArray(s.courses))
            ? s.courses
            : ((s as any).course ? [(s as any).course] : []);
        return studentCourses.includes(selectedCourse as Course);
      })
      .filter(s => !selectedDepartment || s.department === selectedDepartment)
      .filter(s => !selectedClassLevel || s.classLevel === selectedClassLevel)
      .filter(s => studentMatchesScheduleFilter(s, selectedCourse as Course, selectedDay, selectedTimeSlot, availableSchedules))
      .filter(s => 
        s.studentId.includes(searchTerm) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (sortDirection !== 'none') {
        studentsToProcess.sort((a, b) => {
            if (sortDirection === 'asc') {
                return a.studentId.localeCompare(b.studentId);
            } else {
                return b.studentId.localeCompare(a.studentId);
            }
        });
    }
    return studentsToProcess;
  }, [students, selectedCourse, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, searchTerm, sortDirection, availableSchedules]);

  // Max score for WEIGHTED total (e.g., 100)
  const totalMaxScore = useMemo(() => {
    if (!courseConfig?.gradingConfig || !courseConfig?.gradingConfigOrder) return 0;
    return courseConfig.gradingConfigOrder.reduce((sum, key) => sum + (Number(courseConfig.gradingConfig[key]?.max) || 0), 0);
  }, [courseConfig]);

  // --- Display Columns Logic (Includes Group Totals) ---
  const displayColumns = useMemo(() => {
    if (!courseConfig?.gradingConfig || !courseConfig.gradingConfigOrder) return [];
    return getDisplayColumnsWithGroups(courseConfig.gradingConfig, courseConfig.gradingConfigOrder);
  }, [courseConfig]);

  // --- Edit Modal Handlers ---
  const handleOpenEditModal = (student: StudentWithId) => {
    setEditingStudent(student);
    setCurrentScores(scores[student.studentId] || {});
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    setCurrentScores({});
  };

  const handleModalScoreChange = (fullKey: string, value: string) => {
    const numericValue = value === '' ? null : parseFloat(value);
    setCurrentScores(prev => ({
      ...prev,
      [fullKey]: numericValue
    }));
  };

  const handleModalSave = async () => {
    if (!editingStudent || !selectedCourse) return;

    const scoresToUpdate: StudentScores = {
      studentId: editingStudent.studentId,
      course: selectedCourse,
      scores: currentScores,
    };
    
    // Optimistically update local state for faster UI response
    setScores(prev => ({...prev, [editingStudent.studentId]: currentScores}));
    handleCloseEditModal();

    const response = await setStudentScores([scoresToUpdate]);
    if (response.success) {
      notification.addToast({
        type: 'success',
        title: 'บันทึกคะแนนสำเร็จ',
      });
    } else {
      notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message || 'ไม่สามารถบันทึกข้อมูลได้' });
      // Revert optimistic update on failure
      fetchCourseData(selectedCourse);
    }
  };
  
  const scaledTotalInModal = useMemo(() => {
    return calculateTotal(currentScores, courseConfig);
  }, [currentScores, courseConfig]);

    const flattenedScoreItems = useMemo((): FlatGradingItem[] => {
        if (!courseConfig?.gradingConfig || !courseConfig?.gradingConfigOrder) return [];
        return flattenGradingConfig(courseConfig.gradingConfig, courseConfig.gradingConfigOrder);
    }, [courseConfig]);


  // --- Mass Entry Modal ---

  const handleOpenMassEntryModal = () => {
    setMassEntryAssignmentKey('');
    setMassEntryScores({});
    setIsMassEntryModalOpen(true);
  };

  const handleCloseMassEntryModal = () => {
    setIsMassEntryModalOpen(false);
    setMassEntryAssignmentKey('');
    setMassEntryScores({});
  };

  const handleMassAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value;
    setMassEntryAssignmentKey(newKey);
    if (newKey) {
      const initialScores = sortedStudents.reduce((acc, student) => {
        const score = scores[student.studentId]?.[newKey];
        acc[student.studentId] = score === undefined || score === null ? '' : String(score);
        return acc;
      }, {} as Record<string, string>);
      setMassEntryScores(initialScores);
    } else {
      setMassEntryScores({});
    }
  };
  
  const handleMassScoreChange = (studentId: string, value: string) => {
    setMassEntryScores(prev => ({...prev, [studentId]: value}));
  };

  const handleMassInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = sortedStudents.findIndex(s => s.id === studentId);
      if (currentIndex < sortedStudents.length - 1) {
        const nextStudent = sortedStudents[currentIndex + 1];
        massEntryModalRef.current?.querySelector<HTMLInputElement>(`#mass-score-input-${nextStudent.id}`)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
       e.preventDefault();
      const currentIndex = sortedStudents.findIndex(s => s.id === studentId);
      if (currentIndex > 0) {
        const prevStudent = sortedStudents[currentIndex - 1];
        massEntryModalRef.current?.querySelector<HTMLInputElement>(`#mass-score-input-${prevStudent.id}`)?.focus();
      }
    }
  };

  const handleMassSave = async () => {
    if (!selectedCourse || !massEntryAssignmentKey) return;

    const updates: StudentScores[] = [];
    const newScoresState = JSON.parse(JSON.stringify(scores)); // Deep copy

    for (const student of sortedStudents) {
      const studentId = student.studentId;
      const newScoreStr = massEntryScores[studentId];
      
      const existingScore = scores[studentId]?.[massEntryAssignmentKey];
      
      // Convert to number or null for comparison
      const newScoreNum = newScoreStr === '' || newScoreStr === undefined ? null : Number(newScoreStr);
      
      // Skip if score hasn't changed
      if ((existingScore === undefined && newScoreNum === null) || existingScore === newScoreNum) {
          continue;
      }
      
      const existingStudentScores = scores[studentId] || {};
      const updatedStudentScores = { ...existingStudentScores };
      
      if (newScoreNum === null) {
        delete updatedStudentScores[massEntryAssignmentKey];
      } else {
        updatedStudentScores[massEntryAssignmentKey] = newScoreNum;
      }

      updates.push({
        studentId: studentId,
        course: selectedCourse,
        scores: updatedStudentScores,
      });

      // For optimistic update
      newScoresState[studentId] = updatedStudentScores;
    }

    if (updates.length === 0) {
      handleCloseMassEntryModal();
      return;
    }

    setScores(newScoresState);
    handleCloseMassEntryModal();

    const response = await setStudentScores(updates);

    if (response.success) {
      notification.addToast({ type: 'success', title: 'บันทึกคะแนนเรียบร้อย!' });
    } else {
      notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message || 'ไม่สามารถบันทึกคะแนนได้' });
      // Revert on failure
      if(selectedCourse) fetchCourseData(selectedCourse);
    }
  };
  
  const currentMassAssignment = useMemo(() => {
    // Only flattened leaf items are selectable for mass entry
    return flattenedScoreItems.find(item => item.key === massEntryAssignmentKey && !item.isHeader);
  }, [massEntryAssignmentKey, flattenedScoreItems]);
  
  const selectClass = "block w-full pl-3 pr-10 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm";
  const labelClass = "block text-sm font-medium mb-1 text-shadow"
  
  const selectStyle = {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
  };

  return (
    <div className="glass-card p-6 rounded-2xl">
      <h2 className="text-2xl font-bold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>ระบบให้คะแนน (Grading System)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 glass-card rounded-lg">
          <div>
              <label htmlFor="course-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกรายวิชา</label>
              <select id="course-select" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value as Course | '')} className={selectClass} style={selectStyle}>
                  <option value="">-- กรุณาเลือกรายวิชา --</option>
                  {uniqueCourses.map(course => <option key={course} value={course}>{course}</option>)}
              </select>
          </div>

          {/* Quick Group Selection */}
          <div className="md:col-span-2 lg:col-span-3 mb-2">
              <label className={labelClass} style={{color: 'rgb(var(--accent-color))'}}>⭐ เลือกกลุ่มเรียน (Saved Groups)</label>
              <select onChange={(e) => handleCustomGroupChange(e.target.value)} disabled={!selectedCourse} className={selectClass} style={{...selectStyle, borderColor: 'rgb(var(--accent-color))', borderWidth: '2px'}}>
                  <option value="">-- เลือกกลุ่มที่ตั้งชื่อไว้ --</option>
                  {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
              </select>
          </div>

          <div>
              <label htmlFor="department-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกแผนกวิชา (ห้อง)</label>
              <select id="department-select" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} disabled={!selectedCourse} className={selectClass} style={selectStyle}>
                  <option value="">ทั้งหมด</option>
                  {filterOptions.departments.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
          <div>
              <label htmlFor="class-level-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกระดับชั้น</label>
              <select id="class-level-select" value={selectedClassLevel} onChange={(e) => setSelectedClassLevel(e.target.value)} disabled={!selectedCourse} className={selectClass} style={selectStyle}>
                  <option value="">ทั้งหมด</option>
                  {filterOptions.classLevels.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
          <div>
              <label htmlFor="day-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกวันเรียน</label>
              <select id="day-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} disabled={!selectedCourse} className={selectClass} style={selectStyle}>
                  <option value="">ทั้งหมด</option>
                  {filterOptions.days.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
          <div>
              <label htmlFor="time-slot-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกเวลาเรียน</label>
              <select id="time-slot-select" value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)} disabled={!selectedCourse} className={selectClass} style={selectStyle}>
                  <option value="">ทั้งหมด</option>
                  {filterOptions.timeSlots.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
          <div className="flex items-end space-x-2">
              <button onClick={() => selectedCourse && onConfigure(selectedCourse)} disabled={!selectedCourse}
                  className="w-1/2 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                  style={{backgroundColor: 'rgb(var(--text-link-rgb))'}}>
                  ตั้งค่า
              </button>
              <button onClick={handleOpenMassEntryModal} disabled={!selectedCourse || sortedStudents.length === 0}
                  className="w-1/2 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                  style={{backgroundColor: 'rgb(var(--text-success-rgb))'}}>
                  กรอกคะแนนทั้งห้อง
              </button>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="search-student" className={labelClass} style={{color: 'var(--text-secondary)'}}>ค้นหานักศึกษา</label>
              <input id="search-student" type="text" placeholder="พิมพ์รหัสนักศึกษาหรือชื่อ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedCourse} className="block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm disabled:opacity-50" style={selectStyle}/>
          </div>
      </div>

      {isLoading && <div className="text-center py-10"><LoadingSpinner size="lg" /></div>}

      {!selectedCourse && !isLoading && (
        <div className="text-center py-12" style={{color: 'var(--text-muted)'}}>
          <p className="mt-4 font-semibold">กรุณาเลือกรายวิชาเพื่อเริ่มต้น</p>
        </div>
      )}

      {selectedCourse && !isLoading && courseConfig && (
        <>
          <div className="overflow-x-auto rounded-xl border" style={{borderColor: 'var(--glass-border)'}}>
            <table className="min-w-full divide-y" style={{borderColor: 'var(--glass-border)'}}>
               <thead className="bg-black/10">
                <tr>
                  <th rowSpan={2} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow border-r border-white/10" style={{color: 'var(--text-secondary)'}}>
                    #
                  </th>
                  <th rowSpan={2} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow border-r border-white/10" style={{color: 'var(--text-secondary)'}}>
                    <button onClick={handleSort} className="flex items-center space-x-1 group">
                        <span>รหัสนักศึกษา</span>
                        <SortIcon direction={sortDirection} />
                    </button>
                  </th>
                  <th rowSpan={2} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow border-r border-white/10" style={{color: 'var(--text-secondary)'}}>ชื่อ-สกุล</th>
                  
                  {/* Dynamic Columns */}
                  {displayColumns.map(item => (
                        <th key={item.key} className={`px-2 py-1 text-center text-[10px] font-bold border-r border-white/10 truncate max-w-[100px] ${item.isGroupTotal ? 'bg-blue-500/10 text-blue-200' : ''}`} title={item.label}>
                            {item.label}
                        </th>
                    ))}

                  <th rowSpan={2} scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow text-green-400 border-l border-white/10">รวม ({totalMaxScore})</th>
                  <th rowSpan={2} scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow text-yellow-400">เกรด</th>
                  <th rowSpan={2} scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>ดำเนินการ</th>
                </tr>
                 <tr>
                    {/* Max Scores Row */}
                    {displayColumns.map(item => (
                        <th key={`max-${item.key}`} className={`px-2 py-1 text-center text-[10px] text-gray-400 border-r border-white/10 border-t border-white/10 ${item.isGroupTotal ? 'bg-blue-500/10' : ''}`}>
                            ({item.max})
                        </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                {sortedStudents.length > 0 ? sortedStudents.map((student, index) => {
                  const studentScores = scores[student.studentId];
                  const scaledTotal = calculateTotal(studentScores, courseConfig);
                  const grade = calculateGrade(scaledTotal);
                  return (
                    <tr key={student.id} className="hover:bg-black/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-white/10" style={{color: 'var(--text-muted)'}}>{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium border-r border-white/10">{student.studentId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-white/10">{student.prefix}{student.firstName} {student.lastName}</td>
                      
                       {displayColumns.map(item => {
                           let displayValue = '-';
                           if (item.isGroupTotal) {
                               const realKey = item.key.split('::')[1];
                               // Find component in config tree
                               const findComp = (cfg: any, keyPath: string[]): any => {
                                    let current = cfg;
                                    for(const k of keyPath) {
                                        if(!current || !current[k]) return null;
                                        if(keyPath.indexOf(k) === keyPath.length - 1) return current[k];
                                        current = current[k].subComponents;
                                    }
                                };
                                const component = findComp(courseConfig.gradingConfig, realKey.split('.'));
                                if(component) {
                                    const val = calculateGroupScore(studentScores, component, realKey);
                                    displayValue = val.toFixed(1);
                                }
                           } else {
                               const val = studentScores ? studentScores[item.key] : undefined;
                               displayValue = val !== undefined && val !== null ? String(val) : '-';
                           }

                           return (
                               <td key={item.key} className={`px-2 py-2 text-center text-xs border-r border-white/10 ${item.isGroupTotal ? 'bg-blue-500/10 font-bold text-blue-200' : ''}`}>
                                   {displayValue}
                               </td>
                           );
                       })}

                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold border-l border-white/10" style={{color: 'rgb(var(--color-highlight-rgb))'}}>{scaledTotal.toFixed(0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold" style={{color: 'rgb(var(--text-success-rgb))'}}>{grade.toFixed(1)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="font-medium transition-colors"
                          style={{color: `rgb(var(--accent-color))`}}
                        >
                          แก้ไขคะแนน
                        </button>
                      </td>
                    </tr>
                  )
                }) : (
                    <tr><td colSpan={displayColumns.length + 6} className="text-center py-10" style={{color: 'var(--text-muted)'}}>ไม่พบข้อมูลนักศึกษาที่ตรงตามเงื่อนไข</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Scores Modal */}
      {editingStudent && (
        <Modal 
          isOpen={isEditModalOpen} 
          onClose={handleCloseEditModal} 
          title={`แก้ไขคะแนน - ${editingStudent.firstName} ${editingStudent.lastName}`}
          size="fullscreen"
        >
          <div className="space-y-1">
            {flattenedScoreItems.length > 0 ? (
                flattenedScoreItems.map(item => (
                    <ScoreItemRow
                        key={item.key}
                        item={item}
                        scores={currentScores}
                        onScoreChange={handleModalScoreChange}
                    />
                ))
            ) : (
                <p>ไม่พบการตั้งค่าคะแนน</p>
            )}
          </div>
          <div className="mt-6 pt-4 border-t" style={{borderColor: 'var(--glass-border)'}}>
            <div className="flex justify-between items-center text-lg font-bold">
              <span style={{color: 'var(--text-primary)'}}>คะแนนรวม (ถ่วงน้ำหนัก):</span>
              <span style={{color: 'rgb(var(--accent-color))'}}>{scaledTotalInModal.toFixed(0)} / {totalMaxScore}</span>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleModalSave}
              className="px-4 py-2 text-sm font-medium text-white btn-accent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </Modal>
      )}

      {/* Mass Score Entry Modal */}
      <Modal
        isOpen={isMassEntryModalOpen}
        onClose={handleCloseMassEntryModal}
        title="กรอกคะแนนทั้งห้อง"
        size="fullscreen"
      >
        <div ref={massEntryModalRef}>
          <div className="mb-4">
            <label htmlFor="mass-assignment-select" className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกหัวข้อคะแนนที่ต้องการกรอก</label>
            <select
              id="mass-assignment-select"
              value={massEntryAssignmentKey}
              onChange={handleMassAssignmentChange}
              className={selectClass}
              style={selectStyle}
            >
              <option value="">-- เลือกหัวข้อ --</option>
              {flattenedScoreItems.filter(i => !i.isHeader).map(item => (
                <option key={item.key} value={item.key}>{item.label} (เต็ม {item.max})</option>
              ))}
            </select>
          </div>
          
          {massEntryAssignmentKey && (
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {sortedStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between p-2 rounded-md hover:bg-black/10">
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{student.prefix}{student.firstName} {student.lastName}</p>
                    <p className="text-xs" style={{color: 'var(--text-muted)'}}>{student.studentId}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id={`mass-score-input-${student.id}`}
                      type="number"
                      min="0"
                      max={currentMassAssignment?.max}
                      value={massEntryScores[student.studentId] ?? ''}
                      onChange={(e) => handleMassScoreChange(student.studentId, e.target.value)}
                      onKeyDown={(e) => handleMassInputKeyDown(e, student.id)}
                      className="w-24 text-center text-sm p-1.5 rounded-md shadow-sm focus:ring-1 focus:ring-accent"
                      style={selectStyle}
                      placeholder="-"
                    />
                     <span className="text-sm" style={{color: 'var(--text-muted)'}}>/ {currentMassAssignment?.max}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 mt-4 border-t" style={{borderColor: 'var(--glass-border)'}}>
            <button
              type="button"
              onClick={handleCloseMassEntryModal}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm"
              style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleMassSave}
              disabled={!massEntryAssignmentKey}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm disabled:opacity-50 hover:opacity-80"
              style={{backgroundColor: 'rgb(var(--text-success-rgb))'}}
            >
              บันทึกคะแนนทั้งหมด
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default GradingSystem;
