
import React, { useState, useMemo, useEffect } from 'react';
import { Student, StudentWithId, Prefix, ClassLevel, Department, Course, RegistrationStatus, RegistrationDay, SystemConfig, Schedule } from '../../types';
import { addStudent, updateStudent, deleteStudent, getSystemConfig, setSystemConfig, consumeItem, grantReward } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { getStudentSchedule, formatTimeSlot, studentMatchesScheduleFilter } from '../../utils/schedule';
import { COURSE_OPTIONS, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import StudentFormFields from '../StudentFormFields';
import StudentDashboardPage from '../student/StudentDashboardPage';
import { GAME_ITEMS, REAL_LIFE_REDEEMABLES, getAllGameItems } from '../../utils/gamification'; // Import item definitions

const emptyStudent: Omit<Student, 'timestamp'> = {
  studentId: '',
  prefix: Prefix.MR,
  firstName: '',
  lastName: '',
  classLevel: ClassLevel.PVS1,
  department: Department.IT,
  courses: [],
  courseSchedules: {},
  phoneNumber: '',
  registrationDay: RegistrationDay.MONDAY,
  registrationStartTime: '08:00',
  registrationEndTime: '08:30',
};

const SortIcon: React.FC<{ direction: 'asc' | 'desc' | 'none' }> = ({ direction }) => {
    if (direction === 'asc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    if (direction === 'desc') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30 group-hover:opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;
};

interface StudentsManagementProps {
  students: StudentWithId[];
  availableSchedules: Schedule[];
  systemConfig: SystemConfig | null;
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  onStudentAdded: (student: StudentWithId) => void;
  onStudentUpdated: (student: StudentWithId) => void;
  onStudentDeleted: (id: string) => void;
  regStatus: 'LOADING' | RegistrationStatus;
  onStatusToggle: () => void;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}

const PAGE_SIZE = 30;

// Dynamic Color Palette for Groups (Fallback if no custom color)
const GROUP_COLORS = [
    { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-600', icon: 'text-red-400' },
    { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600', icon: 'text-orange-400' },
    { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: 'text-amber-400' },
    { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-600', icon: 'text-green-400' },
    { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: 'text-emerald-400' },
    { border: 'border-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600', icon: 'text-teal-400' },
    { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-600', icon: 'text-cyan-400' },
    { border: 'border-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-600', icon: 'text-sky-400' },
    { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600', icon: 'text-blue-400' },
    { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-600', icon: 'text-indigo-400' },
    { border: 'border-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-600', icon: 'text-violet-400' },
    { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600', icon: 'text-purple-400' },
    { border: 'border-fuchsia-500', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-600', icon: 'text-fuchsia-400' },
    { border: 'border-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-600', icon: 'text-pink-400' },
    { border: 'border-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600', icon: 'text-rose-400' },
];

const getGroupColor = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GROUP_COLORS.length;
    return GROUP_COLORS[index];
};

const StudentsManagement: React.FC<StudentsManagementProps> = ({ 
    students, 
    availableSchedules, 
    systemConfig,
    isLoading, 
    onDataChange, 
    onStudentAdded, 
    onStudentUpdated, 
    onStudentDeleted, 
    regStatus, 
    onStatusToggle, 
    currentPage, 
    setCurrentPage 
}) => {
  // Search and Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
  
  // View Mode State: 'list' or 'groups'
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('groups'); 
  
  // Grouping Option
  const [groupBySchedule, setGroupBySchedule] = useState(true); 

  // Filters (Hoisted up to act as "Selection" from groups)
  const [selectedCourse, setSelectedCourse] = useState<string>(''); 
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>(''); 
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(''); 

  // Manual Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<StudentWithId>>(emptyStudent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  
  // Batch Edit Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchUpdateType, setBatchUpdateType] = useState<'group' | 'selection'>('group');
  
  // Store original constraints to ensure we only update the correct subgroup
  const [batchTargetGroup, setBatchTargetGroup] = useState<{
      dept: string, 
      level: string, 
      originalDay?: string, 
      originalTimeSlot?: string
  } | null>(null);
  
  const [batchForm, setBatchForm] = useState({
      targetCourse: '' as Course | '',
      selectedScheduleId: ''
  });
  
  // Scope: 'specific' (apply only to matching original time) or 'all' (apply to all in dept/level)
  const [batchUpdateScope, setBatchUpdateScope] = useState<'specific' | 'all'>('specific');
  
  // View as Student State
  const [viewingStudent, setViewingStudent] = useState<StudentWithId | null>(null);

  // Group Alias & Color State (Using prop instead of local state)
  const [editingAliasKey, setEditingAliasKey] = useState<string | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [aliasColorInput, setAliasColorInput] = useState('#000000'); // For color picker
  
  // Redemption State
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [redemptionStudent, setRedemptionStudent] = useState<StudentWithId | null>(null);

  // Reward State
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardStudent, setRewardStudent] = useState<StudentWithId | null>(null);
  const [rewardType, setRewardType] = useState<'COIN' | 'ITEM'>('COIN');
  const [rewardValue, setRewardValue] = useState<string>('50'); // Coin amount or item ID
  const [gameConfig, setGameConfig] = useState<any>(null); // To get custom items

  const notification = useNotification();
  
  // Fetch game config for items (systemConfig is now a prop)
  useEffect(() => {
      // We still need gameConfig if it's separate, but systemConfig is now from props
  }, []);

  // Reset page to 1 when search term changes
  useEffect(() => {
    if (searchTerm) {
        setCurrentPage(1);
    }
  }, [searchTerm, setCurrentPage]);

  // Reset selection when view mode changes or main filters change
  useEffect(() => {
      setSelectedStudentIds(new Set());
  }, [viewMode, selectedDepartment, selectedClassLevel, selectedCourse]);

  // --- Grouping Logic ---
  const classGroups = useMemo(() => {
      const groups: Record<string, { 
          key: string,
          dept: string, 
          level: string, 
          day?: string, 
          timeSlot?: string,
          students: StudentWithId[],
          course?: string,
          customName?: string,
          customColor?: string
      }> = {};

      const aliasMap = systemConfig?.classGroupAliases || {};
      const colorMap = systemConfig?.classGroupColors || {};

      students.forEach(s => {
          // 1. Filter by Course if selected
          if (selectedCourse) {
              const sCourses = s.courses || ((s as any).course ? [(s as any).course] : []);
              if (!sCourses.includes(selectedCourse as Course)) return;
          }

          // Base Key: Dept|Level
          let baseKey = `${s.department}|${s.classLevel}`;
          
          // Determine Schedule (Global or Course Specific)
          let day = s.registrationDay;
          let startTime = s.registrationStartTime;
          let endTime = s.registrationEndTime;

          // If filtering by course, use that course's schedule instead of global defaults
          if (selectedCourse) {
              const sched = getStudentSchedule(s, selectedCourse);
              day = sched.day;
              startTime = sched.startTime;
              endTime = sched.endTime;
          }

          const timeSlot = `${startTime} - ${endTime}`;
          
          // Final Key Construction
          let key = baseKey;
          if (groupBySchedule) {
              key += `|${day}|${timeSlot}`;
          }

          if (!groups[key]) {
              groups[key] = { 
                  key: key,
                  dept: s.department, 
                  level: s.classLevel, 
                  students: [],
                  course: selectedCourse,
                  customName: aliasMap[key],
                  customColor: colorMap[key]
              };
              if (groupBySchedule) {
                  groups[key].day = day;
                  groups[key].timeSlot = timeSlot;
              }
          }
          groups[key].students.push(s);
      });
      
      // Convert to array and sort
      return Object.values(groups).sort((a, b) => {
          const deptCompare = a.dept.localeCompare(b.dept);
          if (deptCompare !== 0) return deptCompare;
          
          const levelCompare = a.level.localeCompare(b.level);
          if (levelCompare !== 0) return levelCompare;

          if (groupBySchedule) {
              // Sort by Day
              const days = Object.values(RegistrationDay);
              const dayA = days.indexOf(a.day as RegistrationDay);
              const dayB = days.indexOf(b.day as RegistrationDay);
              if (dayA !== dayB) return dayA - dayB;
              
              // Sort by Time
              return (a.timeSlot || '').localeCompare(b.timeSlot || '');
          }
          
          return 0;
      });
  }, [students, groupBySchedule, selectedCourse, systemConfig]);

  const handleGroupClick = (group: typeof classGroups[0]) => {
      if (editingAliasKey) return; // Don't navigate if editing
      setSelectedDepartment(group.dept);
      setSelectedClassLevel(group.level);
      if (groupBySchedule && group.day && group.timeSlot) {
          setSelectedDay(group.day);
          setSelectedTimeSlot(group.timeSlot);
      } else {
          setSelectedDay('');
          setSelectedTimeSlot('');
      }
      
      setViewMode('list');
      setSearchTerm(''); 
      setCurrentPage(1);
  };
  
  const clearFilters = () => {
      setSelectedCourse('');
      setSelectedDepartment('');
      setSelectedClassLevel('');
      setSelectedDay('');
      setSelectedTimeSlot('');
      setViewMode('groups');
  };

  // --- Group Alias & Color Handlers ---
  const startEditingAlias = (key: string, currentName?: string, currentColor?: string) => {
      setEditingAliasKey(key);
      setAliasInput(currentName || '');
      setAliasColorInput(currentColor || '#f97316'); // Default orange if not set
  };

  const saveGroupSettings = async (key: string) => {
      if (!systemConfig) return;
      
      const newAliases = { ...systemConfig.classGroupAliases, [key]: aliasInput };
      if (!aliasInput.trim()) {
          delete newAliases[key];
      }

      const newColors = { ...systemConfig.classGroupColors, [key]: aliasColorInput };
      
      const newConfig = { ...systemConfig, classGroupAliases: newAliases, classGroupColors: newColors };
      setSystemConfigState(newConfig); // Optimistic update
      setEditingAliasKey(null);

      const res = await setSystemConfig(newConfig);
      if (res.success) {
          notification.addToast({ type: 'success', title: 'บันทึกการตั้งค่ากลุ่มแล้ว' });
      } else {
          notification.addToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: res.message });
      }
  };

  // --- Selection Logic ---
  const handleSelectAll = (isChecked: boolean) => {
      if (isChecked) {
          const allVisibleIds = paginatedStudents.map(s => s.id);
          setSelectedStudentIds(prev => {
              const next = new Set(prev);
              allVisibleIds.forEach(id => next.add(id));
              return next;
          });
      } else {
          const allVisibleIds = paginatedStudents.map(s => s.id);
          setSelectedStudentIds(prev => {
              const next = new Set(prev);
              allVisibleIds.forEach(id => next.delete(id));
              return next;
          });
      }
  };

  const handleSelectRow = (id: string) => {
      setSelectedStudentIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
              next.delete(id);
          } else {
              next.add(id);
          }
          return next;
      });
  };
  
  const handleClearSelection = () => {
      setSelectedStudentIds(new Set());
  };

  // --- Batch Edit Logic ---
  const openBatchEditModal = (group: { dept: string, level: string, course?: string, day?: string, timeSlot?: string }) => {
      setBatchUpdateType('group');
      setBatchTargetGroup({ 
          dept: group.dept, 
          level: group.level,
          originalDay: group.day,
          originalTimeSlot: group.timeSlot
      });
      setBatchForm({
          targetCourse: (group.course as Course) || (selectedCourse as Course) || '',
          day: RegistrationDay.MONDAY,
          startTime: '08:00',
          endTime: '08:30'
      });
      setBatchUpdateScope(group.day && group.timeSlot ? 'specific' : 'all');
      setIsBatchModalOpen(true);
  };

  const handleBatchEditFromList = () => {
    setBatchUpdateType('group');
    if (!selectedDepartment || !selectedClassLevel) return;
    
    const hasTimeFilters = !!(selectedDay && selectedTimeSlot);

    setBatchTargetGroup({ 
        dept: selectedDepartment, 
        level: selectedClassLevel,
        originalDay: selectedDay || undefined,
        originalTimeSlot: selectedTimeSlot || undefined
    });
    setBatchForm({
        targetCourse: (selectedCourse as Course) || '',
        day: RegistrationDay.MONDAY,
        startTime: '08:00',
        endTime: '08:30'
    });
    
    setBatchUpdateScope(hasTimeFilters ? 'specific' : 'all');
    setIsBatchModalOpen(true);
  };

  const handleSelectionBatchEdit = () => {
      if (selectedStudentIds.size === 0) return;
      setBatchUpdateType('selection');
      setBatchTargetGroup(null); // Not using group logic
      setBatchForm({
          targetCourse: (selectedCourse as Course) || '',
          selectedScheduleId: ''
      });
      setIsBatchModalOpen(true);
  };

  const handleBatchUpdateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchForm.targetCourse) {
          notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาเลือกวิชาที่ต้องการแก้ไข' });
          return;
      }

      setIsSubmittingModal(true);
      notification.showLoading('กำลังอัปเดตข้อมูล...');

      try {
          let studentsToUpdate: StudentWithId[] = [];
          let skippedCount = 0;

          if (batchUpdateType === 'selection') {
              // Filter students from the full list based on IDs
              const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));
              
              // SAFETY CHECK: Filter out students who don't have the selected course
              studentsToUpdate = selectedStudents.filter(s => {
                  const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
                  return courses.includes(batchForm.targetCourse as Course);
              });
              
              skippedCount = selectedStudents.length - studentsToUpdate.length;

          } else {
              // Group Logic
              if (!batchTargetGroup) throw new Error("Invalid group target");

              const targetStudents = students.filter(s => 
                  s.department === batchTargetGroup.dept && 
                  s.classLevel === batchTargetGroup.level
              );

              studentsToUpdate = targetStudents.filter(s => {
                  const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
                  const hasCourse = courses.includes(batchForm.targetCourse as Course);
                  
                  if (!hasCourse) return false;

                  if (batchUpdateScope === 'specific' && batchTargetGroup.originalDay && batchTargetGroup.originalTimeSlot) {
                      const currentSchedule = getStudentSchedule(s, batchForm.targetCourse as Course);
                      const currentTimeSlot = formatTimeSlot(currentSchedule);
                      if (currentSchedule.day !== batchTargetGroup.originalDay || currentTimeSlot !== batchTargetGroup.originalTimeSlot) {
                          return false;
                      }
                  }
                  return true;
              });
          }

          if (studentsToUpdate.length === 0) {
              if (skippedCount > 0) {
                  throw new Error(`ไม่พบนักศึกษาที่ลงวิชา ${batchForm.targetCourse} ในกลุ่มที่เลือก`);
              }
              throw new Error('ไม่พบนักศึกษาที่จะทำการแก้ไข');
          }

          // Update each student
          const promises = studentsToUpdate.map(student => {
              const currentSelectedScheduleIds = student.selectedScheduleIds || {};
              const updatedSelectedScheduleIds = {
                  ...currentSelectedScheduleIds,
                  [batchForm.targetCourse]: batchForm.selectedScheduleId
              };
              
              return updateStudent({
                  ...student,
                  selectedScheduleIds: updatedSelectedScheduleIds
              });
          });

          await Promise.all(promises);

          let successMessage = `แก้ไขเวลาเรียนวิชา ${batchForm.targetCourse} ให้กับนักศึกษา ${studentsToUpdate.length} คนเรียบร้อยแล้ว`;
          if (skippedCount > 0) {
              successMessage += ` (ข้าม ${skippedCount} คนที่ไม่ได้ลงวิชานี้)`;
          }

          notification.addToast({ 
              type: 'success', 
              title: 'อัปเดตสำเร็จ', 
              message: successMessage
          });
          
          setIsBatchModalOpen(false);
          setSelectedStudentIds(new Set()); // Clear selection
          onDataChange();

      } catch (error: any) {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: error.message });
      } finally {
          setIsSubmittingModal(false);
          notification.hideLoading();
      }
  };
  
  // Calculate stats for batch selection in modal
  const selectionStats = useMemo(() => {
      if (batchUpdateType !== 'selection' || !batchForm.targetCourse) return null;
      
      const selectedList = students.filter(s => selectedStudentIds.has(s.id));
      const validList = selectedList.filter(s => {
          const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
          return courses.includes(batchForm.targetCourse as Course);
      });
      
      return {
          total: selectedList.length,
          valid: validList.length,
          invalid: selectedList.length - validList.length,
          validList: validList
      };
  }, [students, selectedStudentIds, batchUpdateType, batchForm.targetCourse]);

  // --- Modal Logic ---

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentStudent(prev => ({ ...prev, [name]: value }));
     if (modalErrors[name]) {
        setModalErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[name];
            return newErrors;
        });
    }
  };
  
  const handleModalCourseChange = (course: Course, checked: boolean) => {
    setCurrentStudent(prev => {
        const currentCourses = prev.courses || [];
        const newCourses = checked ? [...currentCourses, course] : currentCourses.filter(c => c !== course);
        
        // Clean up schedule if course removed
        const newSchedules = { ...prev.courseSchedules };
        if (!checked) delete newSchedules[course];

        return { ...prev, courses: newCourses, courseSchedules: newSchedules };
    });
    if (modalErrors.courses) {
        setModalErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.courses;
            return newErrors;
        });
    }
  };

  const handleModalScheduleChange = (course: Course, field: string, value: string) => {
      setCurrentStudent(prev => {
          const currentSchedules = prev.courseSchedules || {};
          const currentCourseSchedule = currentSchedules[course] || {
              day: prev.registrationDay || RegistrationDay.MONDAY,
              startTime: prev.registrationStartTime || '08:00',
              endTime: prev.registrationEndTime || '08:30'
          };
          return {
              ...prev,
              courseSchedules: {
                  ...currentSchedules,
                  [course]: {
                      ...currentCourseSchedule,
                      [field]: value
                  }
              }
          };
      });
  };


  const handleModalScheduleIdChange = (course: Course, scheduleId: string) => {
      setCurrentStudent(prev => {
          const currentSelectedIds = prev.selectedScheduleIds || {};
          return {
              ...prev,
              selectedScheduleIds: {
                  ...currentSelectedIds,
                  [course]: scheduleId
              }
          };
      });
  };

  const openAddModal = () => {
    setCurrentStudent(emptyStudent);
    setIsEditing(false);
    setModalErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentWithId) => {
    // Ensure courses array exists
    const studentWithCourses = {
        ...student,
        courses: student.courses || ((student as any).course ? [(student as any).course] : [])
    };
    setCurrentStudent(studentWithCourses);
    setIsEditing(true);
    setModalErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStudent(emptyStudent);
    setIsSubmittingModal(false);
    setModalErrors({});
  };
  
  const validateModalForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const student = currentStudent;

    if (!student.studentId || !/^\d{11}$/.test(student.studentId)) {
        newErrors.studentId = 'กรุณากรอกรหัสประจำตัวนักศึกษา 11 หลักให้ถูกต้อง';
    }
    if (!student.phoneNumber || !/^[0-9]{9,10}$/.test(student.phoneNumber)) {
        newErrors.phoneNumber = 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง';
    }
    if (student.registrationStartTime && student.registrationEndTime && student.registrationStartTime >= student.registrationEndTime) {
        newErrors.registrationEndTime = 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
    }
    
    for (const key of Object.keys(emptyStudent) as Array<keyof typeof emptyStudent>) {
        if (key === 'courses') {
            if (!student.courses || student.courses.length === 0) {
                newErrors.courses = 'กรุณาเลือกอย่างน้อย 1 วิชา';
            }
        } else if (key === 'courseSchedules') {
            // skip
        } else if (!student[key]) {
            if (key === 'registrationStartTime' || key === 'registrationEndTime') {
                newErrors[key] = 'กรุณาเลือกเวลา';
            } else {
                newErrors[key] = 'กรุณากรอกข้อมูลในช่องนี้';
            }
        }
    }
    
    setModalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateModalForm()) {
      return;
    }

    setIsSubmittingModal(true);
    notification.showLoading('กำลังประมวลผล...');

    try {
      let response;
      if (isEditing && currentStudent.id) {
        response = await updateStudent(currentStudent as StudentWithId);
        if (response.success) {
            onStudentUpdated(currentStudent as StudentWithId);
        }
      } else {
        response = await addStudent(currentStudent as Omit<Student, 'timestamp'>);
        if (response.success) {
            // Construct a complete StudentWithId object for local state update
            const newStudent = { 
                ...currentStudent, 
                id: currentStudent.studentId, 
                timestamp: new Date().toISOString() 
            } as StudentWithId;
            onStudentAdded(newStudent);
        }
      }

      if (response.success) {
        notification.addToast({ type: 'success', title: 'สำเร็จ', message: `ข้อมูลนักศึกษาถูก${isEditing ? 'แก้ไข' : 'เพิ่ม'}เรียบร้อยแล้ว` });
        closeModal();
      } else {
        throw new Error(response.message || `ไม่สามารถ${isEditing ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลได้`);
      }
    } catch (error: any) {
      notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmittingModal(false);
      notification.hideLoading();
    }
  };

  const handleDelete = (student: StudentWithId) => {
    notification.showConfirmation({
      title: 'คุณแน่ใจหรือไม่?',
      message: `คุณต้องการลบข้อมูลของ ${student.firstName} ${student.lastName} (ID: ${student.studentId})? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: 'ใช่, ลบเลย!',
      onConfirm: async () => {
        notification.showLoading('กำลังลบ...');
        try {
          const response = await deleteStudent(student.id);
          if (response.success) {
            notification.addToast({ type: 'success', title: 'ลบสำเร็จ!', message: 'ข้อมูลนักศึกษาถูกลบแล้ว' });
            onStudentDeleted(student.id);
          } else {
            throw new Error(response.message || 'ไม่สามารถลบข้อมูลได้');
          }
        } catch (error: any) {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: error.message || 'An unexpected error occurred during deletion.' });
        } finally {
          notification.hideLoading();
        }
      }
    });
  };
  
  const handleSort = () => {
    setSortDirection(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter(student => {
        // Apply Course Filter (if selected)
        if (selectedCourse) {
            const studentCourses: Course[] = student.courses || ((student as any).course ? [(student as any).course] : []);
            if (!studentCourses.includes(selectedCourse as Course)) return false;
        }

        // Apply Department & Class Level Filters
        if (selectedDepartment && student.department !== selectedDepartment) return false;
        if (selectedClassLevel && student.classLevel !== selectedClassLevel) return false;
        
        // Apply Day & Time Filters (Smart Check)
        if (selectedDay || selectedTimeSlot) {
            const courseToCheck = selectedCourse ? (selectedCourse as Course) : undefined;
            if (courseToCheck) {
                if (!studentMatchesScheduleFilter(student, courseToCheck, selectedDay, selectedTimeSlot)) return false;
            } else {
                const sched = getStudentSchedule(student, 'any'); 
                if (selectedDay && sched.day !== selectedDay) return false;
                if (selectedTimeSlot && formatTimeSlot(sched) !== selectedTimeSlot) return false;
            }
        }

        // Apply Search Term
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const studentCourses: Course[] = student.courses || ((student as any).course ? [(student as any).course] : []);
            return (
                student.firstName.toLowerCase().includes(lowerSearchTerm) ||
                student.lastName.toLowerCase().includes(lowerSearchTerm) ||
                student.studentId.includes(searchTerm) ||
                student.department.toLowerCase().includes(lowerSearchTerm) ||
                studentCourses.some(course => course.toLowerCase().includes(lowerSearchTerm))
            );
        }
        return true;
    });


    if (sortDirection !== 'none') {
      return [...filtered].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.studentId.localeCompare(b.studentId);
        } else {
          return b.studentId.localeCompare(a.studentId);
        }
      });
    }
    return filtered;
  }, [students, searchTerm, sortDirection, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, selectedCourse]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / PAGE_SIZE);
  const paginatedStudents = useMemo(() => {
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      return filteredAndSortedStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedStudents, currentPage]);

  // --- Redemption Handlers ---
  const handleOpenRedemption = (student: StudentWithId) => {
      setRedemptionStudent(student);
      setIsRedemptionModalOpen(true);
  };

  const handleRedeemItem = async (itemId: string, itemName: string) => {
      if (!redemptionStudent) return;
      
      notification.showConfirmation({
          title: `ยืนยันการใช้ ${itemName}?`,
          message: `เมื่อกดใช้แล้ว ไอเท็มจะถูกลบออกจากกระเป๋าของ ${redemptionStudent.firstName} ทันที`,
          confirmText: 'ใช่, กดใช้เลย',
          onConfirm: async () => {
              const res = await consumeItem(redemptionStudent.studentId, itemId);
              if (res.success) {
                  notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'ใช้งานไอเท็มเรียบร้อย' });
                  
                  // Update local state to reflect removal
                  const updatedInventory = { ...redemptionStudent.inventory };
                  if (updatedInventory[itemId] > 1) {
                      updatedInventory[itemId]--;
                  } else {
                      delete updatedInventory[itemId];
                  }
                  
                  const updatedStudent = { ...redemptionStudent, inventory: updatedInventory };
                  setRedemptionStudent(updatedStudent);
                  onStudentUpdated(updatedStudent); // Update main list
              } else {
                  notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
              }
          }
      });
  };

  // --- Reward Handlers ---
  const handleOpenRewardModal = (student: StudentWithId) => {
      setRewardStudent(student);
      setRewardType('COIN');
      setRewardValue('50');
      setIsRewardModalOpen(true);
  };

  const handleGrantReward = async () => {
      if (!rewardStudent) return;
      setIsSubmittingModal(true);
      
      try {
          // If ITEM, validate item exists
          if (rewardType === 'ITEM') {
              if(!getAllGameItems(gameConfig?.customItems)[rewardValue]) {
                  throw new Error('Invalid Item ID');
              }
          }

          const res = await grantReward(rewardStudent.studentId, rewardType, rewardValue);
          if (res.success) {
              notification.addToast({ type: 'success', title: 'ให้รางวัลสำเร็จ', message: res.message });
              
              // Optimistic update
              let updatedStudent = { ...rewardStudent };
              if (rewardType === 'COIN') {
                  updatedStudent.coins = (updatedStudent.coins || 0) + Number(rewardValue);
              } else {
                  const inv = { ...updatedStudent.inventory };
                  inv[rewardValue] = (inv[rewardValue] || 0) + 1;
                  updatedStudent.inventory = inv;
              }
              onStudentUpdated(updatedStudent);
              setIsRewardModalOpen(false);
          } else {
              throw new Error(res.message);
          }
      } catch (e: any) {
          notification.addToast({ type: 'error', title: 'Error', message: e.message });
      } finally {
          setIsSubmittingModal(false);
      }
  };

  const headers = ['ID', 'ชื่อ-สกุล', 'ระดับชั้น', 'แผนก', 'วิชา (เวลาเรียน)', 'เบอร์โทร', 'ดำเนินการ'];

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div className="flex-grow">
            <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการข้อมูลนักศึกษา</h2>
            <div className="flex items-center space-x-3 mt-3 glass-card p-3 rounded-lg inline-flex">
                <span className="font-medium text-shadow" style={{color: 'var(--text-secondary)'}}>สถานะการลงทะเบียน:</span>
                {regStatus === 'LOADING' ? (
                    <LoadingSpinner size="sm" />
                ) : (
                    <button
                    onClick={onStatusToggle}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent`}
                    style={{ backgroundColor: regStatus === 'OPEN' ? 'rgb(var(--text-success-rgb))' : 'var(--text-muted)' }}
                    role="switch"
                    aria-checked={regStatus === 'OPEN'}
                    >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${
                        regStatus === 'OPEN' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                    </button>
                )}
                <span className={`font-semibold`} style={{color: regStatus === 'OPEN' ? 'rgb(var(--text-success-rgb))' : 'var(--text-secondary)'}}>
                    {regStatus === 'OPEN' ? 'เปิด' : (regStatus === 'CLOSED' ? 'ปิด' : '...')}
                </span>
            </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full sm:w-auto">
            {/* Toggle View Mode */}
            <div className="flex bg-black/5 p-1 rounded-lg self-end">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:bg-black/5'}`}
                    style={viewMode === 'list' ? {color: 'rgb(var(--accent-color))'} : {}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    รายชื่อ
                </button>
                <button
                    onClick={clearFilters}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'groups' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:bg-black/5'}`}
                    style={viewMode === 'groups' ? {color: 'rgb(var(--accent-color))'} : {}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    กลุ่มเรียน
                </button>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (รหัส, ชื่อ)..."
                    className="px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto"
                    style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderColor: 'var(--input-focus-border)'}}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={viewMode === 'groups'}
                />
                <button
                    onClick={() => onDataChange()}
                    disabled={isLoading}
                    className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap w-full sm:w-auto transform hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                    style={{ backgroundColor: `rgba(var(--text-link-rgb), 1)`, color: `var(--text-inverted)` }}
                    aria-label="Refresh student data"
                >
                    {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    )}
                    {isLoading ? 'โหลด...' : 'อัพเดท'}
                </button>
                <button
                    onClick={openAddModal}
                    className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap w-full sm:w-auto transform hover:scale-105"
                >
                    เพิ่มนักศึกษา
                </button>
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
            <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
        {/* Filter Badges (Show when filters are active in List mode) */}
        {viewMode === 'list' && (selectedDepartment || selectedClassLevel || selectedCourse) && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-gray-500">กำลังแสดงผล:</span>
                {selectedCourse && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        วิชา: {selectedCourse}
                    </span>
                )}
                {selectedDepartment && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        แผนก: {selectedDepartment}
                    </span>
                )}
                {selectedClassLevel && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        ระดับชั้น: {selectedClassLevel}
                    </span>
                )}
                {selectedDay && selectedTimeSlot && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        เวลา: {selectedDay} {selectedTimeSlot}
                    </span>
                )}
                <button 
                    onClick={clearFilters} 
                    className="text-xs text-gray-500 hover:text-accent underline ml-2"
                >
                    ล้างตัวกรอง / กลับไปเลือกกลุ่มเรียน
                </button>
            </div>
        )}

        {viewMode === 'list' && (
            <div className="flex justify-end mb-4 animate-fade-in gap-2">
                {/* Batch Edit Buttons */}
                {selectedStudentIds.size > 0 && (
                    <>
                        <button
                            onClick={handleSelectionBatchEdit}
                            className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap transform hover:scale-105 bg-blue-600 text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2V5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            แก้ไขเวลาเรียน ({selectedStudentIds.size} คน)
                        </button>
                        <button
                            onClick={handleClearSelection}
                            className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap hover:bg-gray-200 bg-gray-100 text-gray-600"
                        >
                            ยกเลิกการเลือก
                        </button>
                    </>
                )}
                
                {selectedDepartment && selectedClassLevel && selectedStudentIds.size === 0 && (
                    <button
                        onClick={handleBatchEditFromList}
                        className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap w-full sm:w-auto transform hover:scale-105 bg-amber-500 text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        แก้ไขเวลาเรียน (ทั้งห้อง)
                    </button>
                )}
            </div>
        )}

        {viewMode === 'groups' ? (
            <>
                {/* Group View Options */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-4 animate-fade-in">
                    <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 px-3 py-1.5 w-full sm:w-auto"
                        style={{backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)'}}
                    >
                        <option value="">แสดงทุกวิชา (All Courses)</option>
                        {COURSE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label className="flex items-center cursor-pointer space-x-2 text-sm">
                        <span style={{color: 'var(--text-secondary)'}}>แยกกลุ่มตามเวลาเรียน (Split by Schedule)</span>
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={groupBySchedule}
                                onChange={(e) => setGroupBySchedule(e.target.value === 'true' || !groupBySchedule)}
                            />
                            <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${groupBySchedule ? 'bg-accent' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${groupBySchedule ? 'transform translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>

                {/* GROUPS VIEW (Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                    {classGroups.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">ไม่มีข้อมูลกลุ่มเรียน</div>
                    ) : (
                        classGroups.map((group) => {
                            const fallbackColor = getGroupColor(group.dept);
                            const customColor = group.customColor;
                            
                            // Determine styles based on custom color or fallback preset
                            const cardStyle = customColor ? {
                                borderLeftColor: customColor,
                                backgroundColor: `${customColor}1A`, // ~10% opacity
                            } : {};
                            
                            const classNameStr = customColor 
                                ? `glass-card p-5 rounded-xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border-l-4 relative overflow-hidden flex flex-col justify-between`
                                : `glass-card p-5 rounded-xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border-l-4 relative overflow-hidden flex flex-col justify-between ${fallbackColor.border} ${fallbackColor.bg}`;

                            const textStyle = customColor ? { color: customColor } : {};
                            const iconStyle = customColor ? { color: customColor } : {};

                            return (
                            <div 
                                key={group.key}
                                onClick={() => handleGroupClick(group)}
                                className={classNameStr}
                                style={cardStyle}
                            >
                                <div 
                                    className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none ${!customColor ? fallbackColor.icon : ''}`}
                                    style={iconStyle}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                    </svg>
                                </div>
                                <div>
                                    {/* Custom Name Edit Area */}
                                    <div className="flex justify-between items-start mb-1 relative z-20">
                                        {editingAliasKey === group.key ? (
                                            <div className="flex flex-col gap-1 w-full p-2 bg-white/90 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="text" 
                                                    value={aliasInput} 
                                                    onChange={(e) => setAliasInput(e.target.value)}
                                                    className="w-full text-sm p-1.5 border rounded mb-1"
                                                    placeholder="ตั้งชื่อกลุ่ม..."
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={aliasColorInput}
                                                        onChange={(e) => setAliasColorInput(e.target.value)}
                                                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                                        title="เลือกสีกลุ่ม"
                                                    />
                                                    <span className="text-xs text-gray-500">เลือกสี</span>
                                                    <div className="flex-grow flex justify-end gap-1">
                                                        <button onClick={() => saveGroupSettings(group.key)} className="text-white bg-green-500 px-2 py-1 rounded text-xs">บันทึก</button>
                                                        <button onClick={() => setEditingAliasKey(null)} className="text-gray-600 bg-gray-200 px-2 py-1 rounded text-xs">ยกเลิก</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 
                                                    className={`font-bold text-lg text-shadow truncate pr-2 flex-grow ${!customColor ? fallbackColor.text : ''}`} 
                                                    title={group.customName || group.dept}
                                                    style={textStyle}
                                                >
                                                    {group.customName || group.dept}
                                                </h3>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditingAlias(group.key, group.customName, group.customColor); }}
                                                    className="text-gray-400 hover:text-accent transition-colors p-1"
                                                    title="แก้ไขชื่อและสีกลุ่ม"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openBatchEditModal(group); }}
                                                    className="ml-1 p-1.5 rounded-full bg-white/20 hover:bg-accent hover:text-white text-gray-600 transition-colors shadow-sm"
                                                    title="แก้ไขเวลาเรียนทั้งกลุ่ม"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Original Details if Custom Name is set */}
                                    {group.customName && (
                                        <p className="text-xs mb-2 opacity-70" style={{color: 'var(--text-secondary)'}}>
                                            {group.dept} - {group.level}
                                        </p>
                                    )}
                                    
                                    {!group.customName && <p className="text-sm font-medium mb-3" style={{color: 'var(--text-primary)'}}>{group.level}</p>}
                                    
                                    {/* Display Course Name if filtering by Course */}
                                    {group.course && (
                                        <div className="mb-2 text-xs font-semibold px-2 py-1 rounded bg-white/30 text-gray-800 inline-block shadow-sm">
                                            {group.course}
                                        </div>
                                    )}

                                    {groupBySchedule && group.day && group.timeSlot && (
                                        <div className="mb-3 text-xs bg-black/5 p-2 rounded-md" style={{color: 'var(--text-secondary)'}}>
                                            <div className="flex items-center gap-1 mb-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="font-semibold">{group.day}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>{group.timeSlot}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-2 border-t pt-2" style={{borderColor: 'var(--glass-border)'}}>
                                    <span className="text-xs text-gray-500">จำนวนนักศึกษา</span>
                                    <span 
                                        className={`text-xl font-bold text-shadow ${!customColor ? fallbackColor.text : ''}`}
                                        style={textStyle}
                                    >
                                        {group.students.length}
                                    </span>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
            </>
        ) : (
            /* LIST VIEW (Table) */
            <div className="overflow-x-auto animate-fade-in">
            {paginatedStudents.length === 0 ? (
                <p className="text-center py-4" style={{color: 'var(--text-muted)'}}>
                    {searchTerm ? 'ไม่พบข้อมูลนักศึกษาที่ตรงกับการค้นหา' : 'ยังไม่มีนักศึกษาลงทะเบียน'}
                </p>
            ) : (
            <table className="min-w-full">
                <thead className="border-b" style={{borderColor: 'var(--glass-border)'}}>
                <tr>
                    <th scope="col" className="px-4 py-3 w-10 text-center">
                        <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.has(s.id))}
                        />
                    </th>
                    {headers.map(header => (
                    <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-shadow" style={{color: 'var(--text-secondary)'}}>
                        {header === 'ID' ? (
                        <button onClick={handleSort} className="flex items-center space-x-1 group">
                            <span>{header}</span>
                            <SortIcon direction={sortDirection} />
                        </button>
                        ) : (
                        header
                        )}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                {paginatedStudents.map((student) => {
                    const displayCourses = student.courses || ((student as any).course ? [(student as any).course] : []);
                    return (
                    <tr key={student.id} className="hover:bg-black/10 transition-colors">
                    <td className="px-4 py-3 w-10 text-center">
                        <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={() => handleSelectRow(student.id)}
                        />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.studentId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.prefix}{student.firstName} {student.lastName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{student.classLevel}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{student.department}</td>
                    <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                            {displayCourses.map(course => {
                                const schedule = getStudentSchedule(student, course);
                                const isDefault = !student.courseSchedules?.[course];
                                // Highlight if it matches the selected course filter
                                const isSelected = selectedCourse === course;
                                return (
                                    <div key={course} className={`flex items-center gap-2 ${isSelected ? 'font-semibold' : ''}`}>
                                        <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap truncate max-w-[150px] ${isSelected ? 'bg-green-100 text-green-800' : 'bg-black/10'} `} title={course} style={{color: isSelected ? undefined : 'var(--text-secondary)'}}>
                                            {course}
                                        </span>
                                        <span className={`text-xs ${isDefault ? 'opacity-50' : 'text-accent font-bold'}`}>
                                            {schedule.day} {formatTimeSlot(schedule)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{student.phoneNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium flex items-center space-x-2">
                        <button 
                            onClick={() => handleOpenRewardModal(student)}
                            className="transition-transform hover:scale-110 text-yellow-500 hover:text-yellow-600"
                            title="ให้รางวัล (Coins/Item)"
                        >
                            🎁
                        </button>
                        <button
                        onClick={() => handleOpenRedemption(student)}
                        className="transition-transform hover:scale-110 text-purple-500 hover:text-purple-600"
                        title="แลกของ"
                        >
                            🎒
                        </button>
                        <button
                        onClick={() => setViewingStudent(student)}
                        className="transition-transform hover:scale-110 text-slate-500 hover:text-sky-500"
                        title="ดูในมุมมองนักศึกษา"
                        aria-label={`View dashboard for ${student.firstName}`}
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button
                        onClick={() => openEditModal(student)}
                        className="transition-colors"
                        style={{color: 'rgb(var(--accent-color))'}}
                        aria-label={`Edit ${student.firstName} ${student.lastName}`}
                        >
                        แก้ไข
                        </button>
                        <button
                        onClick={() => handleDelete(student)}
                        className="hover:opacity-80 transition-opacity"
                        style={{color: 'rgb(var(--text-danger-rgb))'}}
                        aria-label={`Delete ${student.firstName} ${student.lastName}`}
                        >
                        ลบ
                        </button>
                    </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            )}
            </div>
        )}
        
         {viewMode === 'list' && totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center text-sm">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all disabled:opacity-50"
                style={{backgroundColor: 'var(--glass-border)'}}
              >
                หน้าก่อนหน้า
              </button>
              <span style={{color: 'var(--text-muted)'}}>
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="font-semibold py-2 px-4 rounded-lg shadow-md transition-all disabled:opacity-50"
                style={{backgroundColor: 'var(--glass-border)'}}
              >
                หน้าถัดไป
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'} size="fullscreen">
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <StudentFormFields 
            formData={currentStudent} 
            availableSchedules={availableSchedules}
            onFormChange={handleModalInputChange} 
            onCourseChange={handleModalCourseChange}
            onScheduleChange={handleModalScheduleChange}
            onScheduleIdChange={handleModalScheduleIdChange}
            isSubmitting={isSubmittingModal} 
            errors={modalErrors}
          />
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmittingModal}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmittingModal}
              className="px-4 py-2 text-sm font-medium btn-accent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
            >
              {isSubmittingModal ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มนักศึกษา')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Edit Modal */}
      <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title={batchUpdateType === 'selection' ? "แก้ไขเวลาเรียน (กลุ่มที่เลือก)" : "แก้ไขเวลาเรียนทั้งกลุ่ม"} size="lg">
          <form onSubmit={handleBatchUpdateSubmit} className="space-y-6">
              {batchUpdateType === 'group' && batchTargetGroup && (
                  <div className="p-4 rounded-lg bg-orange-100 border border-orange-200 text-orange-800 text-sm">
                      <p className="font-bold">กำลังแก้ไขข้อมูลสำหรับกลุ่ม:</p>
                      <p>{batchTargetGroup.dept} - {batchTargetGroup.level}</p>
                      {batchTargetGroup.originalDay && batchTargetGroup.originalTimeSlot && (
                          <p className="font-medium text-indigo-700 mt-1">
                              (กลุ่มเดิม: {batchTargetGroup.originalDay} {batchTargetGroup.originalTimeSlot})
                          </p>
                      )}
                  </div>
              )}
              
              {batchUpdateType === 'selection' && (
                  <div className="p-4 rounded-lg bg-blue-100 border border-blue-200 text-blue-800 text-sm">
                      <p className="font-bold">กำลังแก้ไขข้อมูลสำหรับ:</p>
                      <p>นักศึกษาที่เลือกไว้จำนวน <span className="font-bold text-lg">{selectedStudentIds.size}</span> คน</p>
                      
                      {selectionStats && selectionStats.invalid > 0 ? (
                          <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-700">
                              <p className="font-bold text-xs">⚠️ คำเตือน:</p>
                              <p className="text-xs">มีนักศึกษา {selectionStats.invalid} คนที่ <u>ไม่ได้ลงวิชา {batchForm.targetCourse}</u> (จะถูกข้าม)</p>
                              <p className="text-xs mt-1">จะทำการแก้ไขให้เฉพาะ {selectionStats.valid} คนที่ลงทะเบียนวิชานี้เท่านั้น</p>
                          </div>
                      ) : batchForm.targetCourse && (
                          <p className="text-xs text-green-700 mt-1">✓ นักศึกษาทุกคนที่เลือก ลงทะเบียนวิชา {batchForm.targetCourse} แล้ว</p>
                      )}

                      <ul className="list-disc list-inside mt-2 max-h-24 overflow-y-auto text-xs bg-white/50 p-2 rounded">
                          {students.filter(s => selectedStudentIds.has(s.id)).map(s => {
                              const hasCourse = !batchForm.targetCourse || (s.courses || ((s as any).course ? [(s as any).course] : [])).includes(batchForm.targetCourse as Course);
                              return (
                                  <li key={s.id} className={!hasCourse ? 'text-gray-400 line-through' : ''}>
                                      {s.studentId} - {s.firstName} {s.lastName}
                                  </li>
                              );
                          })}
                      </ul>
                  </div>
              )}

              <div>
                  <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>วิชาที่ต้องการแก้ไขเวลา</label>
                  <select 
                      value={batchForm.targetCourse}
                      onChange={(e) => setBatchForm({...batchForm, targetCourse: e.target.value as Course})}
                      className="w-full p-2.5 rounded-lg border border-gray-300"
                      required
                  >
                      <option value="">-- เลือกวิชา --</option>
                      {COURSE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>เลือกตารางเรียนใหม่</label>
                      <select 
                          value={batchForm.selectedScheduleId}
                          onChange={(e) => setBatchForm({...batchForm, selectedScheduleId: e.target.value})}
                          className="w-full p-2.5 rounded-lg border border-gray-300"
                          required
                      >
                          <option value="">-- เลือกตารางเรียน --</option>
                          {availableSchedules
                              .filter(s => s.course === batchForm.targetCourse)
                              .map(s => (
                                  <option key={s.id} value={s.id}>
                                      วัน{s.day} {s.startTime}-{s.endTime} น. {s.classGroup ? `(${s.classGroup})` : ''} - ห้อง {s.room}
                                  </option>
                              ))
                          }
                      </select>
                  </div>
              </div>

              {/* Update Scope Toggle - Hide if in Selection Mode */}
              {batchUpdateType === 'group' && batchTargetGroup?.originalDay && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="block text-sm font-bold mb-2" style={{color: 'var(--text-primary)'}}>ขอบเขตการแก้ไข (Update Scope)</p>
                      <div className="flex flex-col gap-2">
                          <label className="flex items-center cursor-pointer">
                              <input 
                                  type="radio" 
                                  name="updateScope" 
                                  value="specific" 
                                  checked={batchUpdateScope === 'specific'} 
                                  onChange={() => setBatchUpdateScope('specific')}
                                  className="h-4 w-4 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                  แก้ไขเฉพาะกลุ่มเดิม (ปลอดภัย - แก้เฉพาะคนที่เวลาตรงกัน)
                              </span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                              <input 
                                  type="radio" 
                                  name="updateScope" 
                                  value="all" 
                                  checked={batchUpdateScope === 'all'} 
                                  onChange={() => setBatchUpdateScope('all')}
                                  className="h-4 w-4 text-red-600"
                              />
                              <span className="ml-2 text-sm text-gray-700 font-semibold">
                                  แก้ไขทั้งระดับชั้น (บังคับแก้ - ใช้เมื่อหาคนไม่เจอ หรือข้อมูลเวลาเดิมผิดเพี้ยน)
                              </span>
                          </label>
                      </div>
                  </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                  <button
                      type="button"
                      onClick={() => setIsBatchModalOpen(false)}
                      disabled={isSubmittingModal}
                      className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                      ยกเลิก
                  </button>
                  <button
                      type="submit"
                      disabled={isSubmittingModal || (batchUpdateType === 'selection' && selectionStats?.valid === 0)}
                      className="px-4 py-2 text-sm font-medium btn-accent rounded-lg shadow-sm text-white disabled:opacity-50"
                  >
                      {isSubmittingModal ? 'กำลังบันทึก...' : 'ยืนยันการแก้ไข'}
                  </button>
              </div>
          </form>
      </Modal>

      {/* Item Redemption Modal */}
      <Modal 
        isOpen={isRedemptionModalOpen} 
        onClose={() => { setIsRedemptionModalOpen(false); setRedemptionStudent(null); }} 
        title="แลกของรางวัล (Real Life Items)" 
        size="md"
      >
        {redemptionStudent && (
            <div className="space-y-4">
                <div className="text-center pb-4 border-b">
                    <h3 className="text-lg font-bold">{redemptionStudent.prefix}{redemptionStudent.firstName} {redemptionStudent.lastName}</h3>
                    <p className="text-gray-500">{redemptionStudent.studentId}</p>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                    {(() => {
                        const inventory = redemptionStudent.inventory || {};
                        const redeemableItems = Object.keys(inventory).filter(itemId => 
                            REAL_LIFE_REDEEMABLES.includes(itemId) && inventory[itemId] > 0
                        );

                        if (redeemableItems.length === 0) {
                            return (
                                <div className="text-center py-8 text-gray-400">
                                    <span className="text-4xl block mb-2">🤷‍♂️</span>
                                    <p>ไม่พบไอเท็มที่ใช้แลกได้</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {redeemableItems.map(itemId => {
                                    const item = GAME_ITEMS[itemId];
                                    const count = inventory[itemId];
                                    return (
                                        <div key={itemId} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{item?.icon}</span>
                                                <div>
                                                    <p className="font-bold text-gray-800">{item?.name}</p>
                                                    <p className="text-xs text-gray-500">มีอยู่: <span className="font-bold text-blue-600">{count}</span> ชิ้น</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRedeemItem(itemId, item?.name)}
                                                className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm transition-colors"
                                            >
                                                กดใช้ (Use)
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}
      </Modal>

      {/* Admin Reward Modal */}
      <Modal 
        isOpen={isRewardModalOpen} 
        onClose={() => { setIsRewardModalOpen(false); setRewardStudent(null); }} 
        title="มอบรางวัลพิเศษ (Admin Reward)" 
        size="md"
      >
        {rewardStudent && (
            <div className="space-y-6">
                <div className="text-center border-b pb-4">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">
                        🎁 ส่งของขวัญให้ {rewardStudent.firstName}
                    </h3>
                    <p className="text-sm text-gray-500">{rewardStudent.studentId}</p>
                </div>

                <div className="flex justify-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setRewardType('COIN')} 
                        className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${rewardType === 'COIN' ? 'bg-white shadow text-yellow-600' : 'text-gray-500'}`}
                    >
                        🪙 ให้ Coins
                    </button>
                    <button 
                        onClick={() => setRewardType('ITEM')} 
                        className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${rewardType === 'ITEM' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
                    >
                        🎒 ให้ไอเท็ม
                    </button>
                </div>

                {rewardType === 'COIN' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-600">จำนวน Coins</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border rounded-xl text-2xl text-center font-bold text-yellow-500 focus:ring-2 focus:ring-yellow-400 outline-none" 
                                value={rewardValue}
                                onChange={e => setRewardValue(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-center">
                            {[50, 100, 500, 1000].map(amt => (
                                <button key={amt} onClick={() => setRewardValue(amt.toString())} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 transition-colors">
                                    +{amt}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-center">
                             <button onClick={() => setRewardValue('50')} className="text-xs text-gray-400 hover:text-gray-600">มาเช้า (+50)</button>
                             <button onClick={() => setRewardValue('100')} className="text-xs text-gray-400 hover:text-gray-600">จิตอาสา (+100)</button>
                             <button onClick={() => setRewardValue('200')} className="text-xs text-gray-400 hover:text-gray-600">ช่วยงานครู (+200)</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="block text-sm font-bold mb-1 text-gray-600">เลือกไอเท็ม</label>
                        <select 
                            className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-purple-400 outline-none"
                            value={rewardValue}
                            onChange={e => setRewardValue(e.target.value)}
                        >
                            {Object.values(getAllGameItems(gameConfig?.customItems)).map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.icon} {item.name} ({item.rarity})
                                </option>
                            ))}
                        </select>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center gap-3">
                            <span className="text-3xl">{getAllGameItems(gameConfig?.customItems)[rewardValue]?.icon}</span>
                            <div>
                                <p className="font-bold text-purple-900">{getAllGameItems(gameConfig?.customItems)[rewardValue]?.name}</p>
                                <p className="text-xs text-purple-600">{getAllGameItems(gameConfig?.customItems)[rewardValue]?.description}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 gap-2 border-t">
                    <button onClick={() => setIsRewardModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">ยกเลิก</button>
                    <button 
                        onClick={handleGrantReward} 
                        disabled={isSubmittingModal}
                        className={`px-6 py-2 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-50 ${rewardType === 'COIN' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                    >
                        {isSubmittingModal ? 'กำลังส่ง...' : 'ยืนยันการให้รางวัล'}
                    </button>
                </div>
            </div>
        )}
      </Modal>

      {/* View As Student Modal */}
      <Modal 
        isOpen={!!viewingStudent} 
        onClose={() => setViewingStudent(null)} 
        title="" 
        size="fullscreen"
      >
        {viewingStudent && (
            <StudentDashboardPage 
                studentId={viewingStudent.studentId} 
                initialStudentData={viewingStudent}
                onLogout={() => setViewingStudent(null)}
            />
        )}
      </Modal>
    </div>
  );
};

export default StudentsManagement;
