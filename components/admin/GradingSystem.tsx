import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StudentWithId, Course, GradingConfig, StudentScores, GradingComponent, RegistrationDay } from '../../types';
import { getCourseGradingConfig, getScoresForCourse, setStudentScores } from '../../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../Modal';

// --- Edit Modal Components (New Simpler Design) ---

interface FlatScoreItem {
    key: string;
    label: string;
    max?: number;
    isHeader?: boolean;
    level: number;
}

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const ScoreItemRow: React.FC<{
    item: FlatScoreItem;
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


interface GradingSystemProps {
  students: StudentWithId[];
  onConfigure: (courseName: Course) => void;
}

const GradingSystem: React.FC<GradingSystemProps> = ({ students, onConfigure }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  const [gradingConfig, setGradingConfig] = useState<GradingConfig | null>(null);
  const [gradingConfigOrder, setGradingConfigOrder] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, StudentScores['scores']>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithId | null>(null);
  const [currentScores, setCurrentScores] = useState<StudentScores['scores']>({});

  // Mass Entry Modal State
  const [isMassEntryModalOpen, setIsMassEntryModalOpen] = useState(false);
  const [massEntryAssignmentKey, setMassEntryAssignmentKey] = useState<string>('');
  const [massEntryScores, setMassEntryScores] = useState<Record<string, string>>({}); // studentId -> score string
  const massEntryModalRef = useRef<HTMLDivElement>(null);


  const uniqueCourses = useMemo(() => Array.from(new Set(students.map(s => s.course))).sort(), [students]);
  
  // Effect to reset filters when course changes
  useEffect(() => {
      setSelectedDepartment('');
      setSelectedClassLevel('');
      setSearchTerm('');
      setSelectedDay('');
      setSelectedTimeSlot('');
  }, [selectedCourse]);

  const fetchCourseData = useCallback(async (course: Course) => {
    setIsLoading(true);
    setGradingConfig(null);
    setGradingConfigOrder([]);
    setScores({});
    try {
      const [configRes, scoresRes] = await Promise.all([
        getCourseGradingConfig(course),
        getScoresForCourse(course)
      ]);

      if (configRes.success && configRes.data) {
        setGradingConfig(configRes.data.gradingConfig);
        setGradingConfigOrder(configRes.data.gradingConfigOrder);
      } else {
        Swal.fire({title: 'Error', text: 'Could not load grading configuration.', icon: 'error', customClass: swalCustomClass});
      }

      if (scoresRes.success && scoresRes.data) {
        const scoresByStudentId = Object.entries(scoresRes.data).reduce((acc, [_, studentScore]) => {
          acc[studentScore.studentId] = studentScore.scores;
          return acc;
        }, {} as Record<string, StudentScores['scores']>);
        setScores(scoresByStudentId);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      Swal.fire({title: 'Error', text: 'Failed to load course data.', icon: 'error', customClass: swalCustomClass});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseData(selectedCourse);
    } else {
      setGradingConfig(null);
      setGradingConfigOrder([]);
      setScores({});
    }
  }, [selectedCourse, fetchCourseData]);

  const filterOptions = useMemo(() => {
    if (!selectedCourse) {
        return { departments: [], classLevels: [], days: [], timeSlots: [] };
    }
    const studentsInCourse = students.filter(s => s.course === selectedCourse);
    const departments = new Set<string>();
    const classLevels = new Set<string>();
    const days = new Set<RegistrationDay>();
    const timeSlots = new Set<string>();


    studentsInCourse.forEach(s => {
        s.department && departments.add(s.department);
        s.classLevel && classLevels.add(s.classLevel);
        s.registrationDay && days.add(s.registrationDay);
        if (s.registrationStartTime && s.registrationEndTime) {
          timeSlots.add(`${s.registrationStartTime} - ${s.registrationEndTime}`);
        }
    });

    return {
        departments: Array.from(departments).sort(),
        classLevels: Array.from(classLevels).sort(),
        days: Array.from(days).sort(),
        timeSlots: Array.from(timeSlots).sort(),
    };
  }, [students, selectedCourse]);

  const filteredStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return students
      .filter(s => s.course === selectedCourse)
      .filter(s => !selectedDepartment || s.department === selectedDepartment)
      .filter(s => !selectedClassLevel || s.classLevel === selectedClassLevel)
      .filter(s => !selectedDay || s.registrationDay === selectedDay)
      .filter(s => !selectedTimeSlot || `${s.registrationStartTime} - ${s.registrationEndTime}` === selectedTimeSlot)
      .filter(s => 
        s.studentId.includes(searchTerm) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [students, selectedCourse, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, searchTerm]);
  
  // Calculates the WEIGHTED score for final grade calculation.
  const calculateTotal = useCallback((studentScores: StudentScores['scores'] | undefined) => {
    if (!studentScores || !gradingConfig || !gradingConfigOrder) return 0;

    let totalScore = 0;
    gradingConfigOrder.forEach(key => {
        const component = gradingConfig[key];
        if (!component) return;
        
        const hasSubComponents = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;
        
        if (hasSubComponents) {
            let rawStudentScore = 0;
            let rawMaxScore = 0;
            
            const getRawScores = (subConfig: GradingConfig, subOrder: string[], parentKey: string) => {
                subOrder.forEach(subKey => {
                    const subComponent = subConfig[subKey];
                    if (!subComponent) return;
                    const fullKey = `${parentKey}.${subKey}`;
                    if (subComponent.subComponents && subComponent.subComponentsOrder && subComponent.subComponentsOrder.length > 0) {
                        getRawScores(subComponent.subComponents, subComponent.subComponentsOrder, fullKey);
                    } else {
                        rawStudentScore += Number(studentScores[fullKey]) || 0;
                        rawMaxScore += Number(subComponent.max) || 0;
                    }
                });
            };
            
            getRawScores(component.subComponents!, component.subComponentsOrder!, key);
            
            if (rawMaxScore > 0) {
                const scaledScore = (rawStudentScore / rawMaxScore) * component.max;
                totalScore += scaledScore;
            }
        } else {
            totalScore += Number(studentScores[key]) || 0;
        }
    });
    return totalScore;
  }, [gradingConfig, gradingConfigOrder]);

  const calculateGrade = (totalScore: number) => {
    if (totalScore >= 80) return 4;
    if (totalScore >= 75) return 3.5;
    if (totalScore >= 70) return 3;
    if (totalScore >= 65) return 2.5;
    if (totalScore >= 60) return 2;
    if (totalScore >= 55) return 1.5;
    if (totalScore >= 50) return 1;
    return 0;
  };

  // Max score for WEIGHTED total (e.g., 100)
  const totalMaxScore = useMemo(() => {
    if (!gradingConfig || !gradingConfigOrder) return 0;
    return gradingConfigOrder.reduce((sum, key) => sum + (Number(gradingConfig[key]?.max) || 0), 0);
  }, [gradingConfig, gradingConfigOrder]);

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
      Swal.fire({
        icon: 'success',
        title: 'บันทึกคะแนนสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        customClass: { popup: 'glass-card' }
      });
    } else {
      Swal.fire({title: 'เกิดข้อผิดพลาด', text: response.message || 'ไม่สามารถบันทึกข้อมูลได้', icon: 'error', customClass: swalCustomClass});
      // Revert optimistic update on failure
      fetchCourseData(selectedCourse);
    }
  };
  
  const scaledTotalInModal = useMemo(() => {
    return calculateTotal(currentScores);
  }, [currentScores, calculateTotal]);

    const flattenedScoreItems = useMemo((): FlatScoreItem[] => {
        if (!gradingConfig || !gradingConfigOrder) return [];
        
        const items: FlatScoreItem[] = [];

        const flatten = (config: GradingConfig, order: string[], path: string, level: number) => {
            order.forEach(key => {
                const component = config[key];
                if (!component) return;
                const fullKey = path ? `${path}.${key}` : key;
                const hasSub = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;

                if (hasSub) {
                    items.push({ key: fullKey, label: component.label, isHeader: true, level: level });
                    flatten(component.subComponents, component.subComponentsOrder, fullKey, level + 1);
                } else {
                    items.push({ key: fullKey, label: component.label, max: component.max, level: level });
                }
            });
        };
        
        flatten(gradingConfig, gradingConfigOrder, "", 0);
        return items;
    }, [gradingConfig, gradingConfigOrder]);


  // --- Mass Entry Modal ---

  const flattenedGradingItems = useMemo(() => {
    if (!gradingConfig || !gradingConfigOrder) return [];
    
    const flatten = (config: GradingConfig, order: string[], parentPath = '', parentLabel = ''): { key: string; label: string; max: number }[] => {
      let list: { key: string; label: string; max: number }[] = [];
      order.forEach(key => {
        const component = config[key];
        if (!component) return;
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        const currentLabel = parentLabel ? `${parentLabel} - ${component.label}` : component.label;
        if (component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0) {
          list = list.concat(flatten(component.subComponents, component.subComponentsOrder, currentPath, currentLabel));
        } else {
          list.push({ key: currentPath, label: currentLabel, max: component.max });
        }
      });
      return list;
    };
    
    return flatten(gradingConfig, gradingConfigOrder);
  }, [gradingConfig, gradingConfigOrder]);

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
      const initialScores = filteredStudents.reduce((acc, student) => {
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
      const currentIndex = filteredStudents.findIndex(s => s.id === studentId);
      if (currentIndex < filteredStudents.length - 1) {
        const nextStudent = filteredStudents[currentIndex + 1];
        massEntryModalRef.current?.querySelector<HTMLInputElement>(`#mass-score-input-${nextStudent.id}`)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
       e.preventDefault();
      const currentIndex = filteredStudents.findIndex(s => s.id === studentId);
      if (currentIndex > 0) {
        const prevStudent = filteredStudents[currentIndex - 1];
        massEntryModalRef.current?.querySelector<HTMLInputElement>(`#mass-score-input-${prevStudent.id}`)?.focus();
      }
    }
  };

  const handleMassSave = async () => {
    if (!selectedCourse || !massEntryAssignmentKey) return;

    const updates: StudentScores[] = [];
    const newScoresState = JSON.parse(JSON.stringify(scores)); // Deep copy

    for (const student of filteredStudents) {
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
      Swal.fire({ icon: 'success', title: 'บันทึกคะแนนเรียบร้อย!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'glass-card' } });
    } else {
      Swal.fire({title: 'เกิดข้อผิดพลาด', text: response.message || 'ไม่สามารถบันทึกคะแนนได้', icon: 'error', customClass: swalCustomClass});
      // Revert on failure
      if(selectedCourse) fetchCourseData(selectedCourse);
    }
  };
  
  const currentMassAssignment = useMemo(() => {
    return flattenedGradingItems.find(item => item.key === massEntryAssignmentKey);
  }, [massEntryAssignmentKey, flattenedGradingItems]);
  
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
              <button onClick={handleOpenMassEntryModal} disabled={!selectedCourse || filteredStudents.length === 0}
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

      {selectedCourse && !isLoading && gradingConfig && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
               <thead className="border-b" style={{borderColor: 'var(--glass-border)'}}>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>#</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>รหัสนักศึกษา</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>ชื่อ-สกุล</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>คะแนนรวม ({totalMaxScore})</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>เกรด</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-shadow" style={{color: 'var(--text-secondary)'}}>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                {filteredStudents.length > 0 ? filteredStudents.map((student, index) => {
                  const studentScores = scores[student.studentId];
                  const scaledTotal = calculateTotal(studentScores);
                  const grade = calculateGrade(scaledTotal);
                  return (
                    <tr key={student.id} className="hover:bg-black/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{color: 'var(--text-muted)'}}>{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.studentId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{student.prefix}{student.firstName} {student.lastName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold" style={{color: 'rgb(var(--color-highlight-rgb))'}}>{scaledTotal.toFixed(0)}</td>
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
                    <tr><td colSpan={6} className="text-center py-10" style={{color: 'var(--text-muted)'}}>ไม่พบข้อมูลนักศึกษาที่ตรงตามเงื่อนไข</td></tr>
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
              {flattenedGradingItems.map(item => (
                <option key={item.key} value={item.key}>{item.label} (เต็ม {item.max})</option>
              ))}
            </select>
          </div>
          
          {massEntryAssignmentKey && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {filteredStudents.map(student => (
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