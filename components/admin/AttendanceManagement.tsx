
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StudentWithId, Course, Department, ClassLevel, RegistrationDay, AttendanceStatus, AttendanceRecord, SystemConfig } from '../../types';
import { getAttendance, setAttendance, getAllAttendanceForCourse, getSystemConfig, callCloudFunction } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { ATTENDANCE_STATUS_OPTIONS } from '../../constants';
import { getStudentSchedule, studentMatchesScheduleFilter, getCustomGroupOptions } from '../../utils/schedule';
import { toYYYYMMDD, getThaiDayFromDate } from '../../utils/dateUtils';
import { playSuccessSound, playErrorSound } from '../../utils/soundUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import { generateAttendancePDF } from '../../utils/pdfGenerator';

interface AttendanceManagementProps {
  allStudents: StudentWithId[];
  selectedTerm?: string;
  selectedYear?: string;
  availableSchedules?: any[];
}

interface DailyStats {
    date: string;
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
}

interface ScanLogItem {
    id: string;
    timestamp: Date;
    studentName: string;
    studentId: string;
    status: 'success' | 'duplicate' | 'error';
    message: string;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ allStudents, selectedTerm, selectedYear, availableSchedules }) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'summary'>('record');
  const [selectedCourse, setSelectedCourse] = useState<Course | ''>('');
  
  // Record Tab State
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  // NEW: Multi-Select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());

  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(toYYYYMMDD(new Date()));
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [fetchedRecordIds, setFetchedRecordIds] = useState<Set<string>>(new Set()); // Store IDs that actually exist in DB
  const [shouldNotify, setShouldNotify] = useState(true); // Control LINE Notification
  
  // Summary Tab State (Filters)
  const [summaryDepartment, setSummaryDepartment] = useState<string>('');
  const [summaryDay, setSummaryDay] = useState<string>('');
  const [summaryTimeSlot, setSummaryTimeSlot] = useState<string>('');

  // History Tab State
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  // History Filters (Synced from Record tab or Manual)
  const [historyFilterDate, setHistoryFilterDate] = useState<string>('');
  const [historyFilterDept, setHistoryFilterDept] = useState<string>('');
  const [historyFilterLevel, setHistoryFilterLevel] = useState<string>('');

  const [historyDetailDate, setHistoryDetailDate] = useState<string | null>(null);
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('ALL'); // Renamed from historyFilter to avoid confusion
  const [historyDetailTimeSlot, setHistoryDetailTimeSlot] = useState<string>('');
  const [historyLoaded, setHistoryLoaded] = useState(false); // Track if history is loaded to prevent re-fetch
  
  // History Editing State
  const [isHistoryEditing, setIsHistoryEditing] = useState(false);
  const [historyEdits, setHistoryEdits] = useState<Record<string, AttendanceStatus>>({});

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<StudentWithId | null>(null);
  const [manualInputId, setManualInputId] = useState('');
  const scannerInstanceRef = useRef<any>(null);
  const isScanningRef = useRef(false); // To prevent double initialization
  const [scanLog, setScanLog] = useState<ScanLogItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // System Config for PDF
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  const currentHoliday = useMemo(() => {
    if (!systemConfig?.academicCalendar?.holidays || !selectedDate) return null;
    const holiday = systemConfig.academicCalendar.holidays.find(h => {
      const hDate = typeof h === 'string' ? h : h.date;
      return hDate === selectedDate;
    });
    if (!holiday) return null;
    return typeof holiday === 'string' ? { date: holiday, description: 'วันหยุดนักขัตฤกษ์' } : holiday;
  }, [systemConfig, selectedDate]);

  const isOutOfTerm = useMemo(() => {
    if (!systemConfig?.academicCalendar?.startDate || !systemConfig?.academicCalendar?.endDate || !selectedDate) return false;
    return selectedDate < systemConfig.academicCalendar.startDate || selectedDate > systemConfig.academicCalendar.endDate;
  }, [systemConfig, selectedDate]);

  const notification = useNotification();

  // Fetch system config on mount
  useEffect(() => {
      const fetchConfig = async () => {
          const res = await getSystemConfig();
          if (res.success && res.data) {
              setSystemConfig(res.data);
          }
      };
      fetchConfig();
  }, []);

  const getStudentCourses = useCallback((student: StudentWithId): Course[] => {
    if (student.courses && Array.isArray(student.courses)) {
        return student.courses;
    }
    // @ts-ignore
    if (student.course) {
        // @ts-ignore
        return [student.course];
    }
    return [];
  }, []);

  const uniqueCourses = useMemo(() => {
    const courses = new Set<Course>();
    allStudents.forEach(student => {
        const studentCourses = getStudentCourses(student);
        studentCourses.forEach(course => courses.add(course));
    });
    return Array.from(courses).sort();
  }, [allStudents, getStudentCourses]);

  const customGroupOptions = useMemo(() => {
      return getCustomGroupOptions(allStudents, systemConfig, selectedCourse, availableSchedules);
  }, [allStudents, systemConfig, selectedCourse, availableSchedules]);

  const handleCustomGroupChange = (key: string) => {
      if (!key) return;
      // Key format: Dept|Level|Day|Time
      const [dept, level, day, time] = key.split('|');
      
      // Reset multi-mode when using quick select to avoid confusion
      setIsMultiSelectMode(false);
      setSelectedDepartments(new Set());

      setSelectedDepartment(dept || '');
      setSelectedClassLevel(level || '');
      setSelectedDay(day || '');
      setSelectedTimeSlot(time || '');
  };

  const fetchAttendanceData = useCallback(async () => {
    if (!selectedCourse || !selectedDate) return;
    setIsLoading(true);

    const response = await getAttendance(selectedCourse as Course, selectedDate);
    
    const recordIds = new Set<string>();
    const newAttendanceData = response.success && response.data 
        ? Object.entries(response.data).reduce((acc, [studentId, record]) => {
            acc[studentId] = (record as any).status;
            recordIds.add(studentId); 
            return acc;
        }, {} as Record<string, AttendanceStatus>)
        : {};

    // Initialize default status for students who don't have a record yet
    const studentsInCourse = allStudents.filter(s => getStudentCourses(s).includes(selectedCourse as Course));
    
    studentsInCourse.forEach(student => {
        if (!newAttendanceData[student.studentId]) {
            // Default is 'PRESENT' only in UI state, not saved to DB yet
            newAttendanceData[student.studentId] = AttendanceStatus.PRESENT;
        }
    });

    setFetchedRecordIds(recordIds);
    setAttendanceData(newAttendanceData);
    setIsLoading(false);
  }, [selectedCourse, selectedDate, notification, allStudents, getStudentCourses]);

  const fetchHistory = useCallback(async (force = false) => {
      if (!selectedCourse) return;
      if (!force && historyLoaded) return;

      setIsLoading(true);
      const response = await getAllAttendanceForCourse(selectedCourse as Course);
      if (response.success && response.data) {
          setHistoryRecords(response.data);
          setHistoryLoaded(true);
      } else {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดประวัติการเข้าเรียนได้' });
      }
      setIsLoading(false);
  }, [selectedCourse, historyLoaded, notification]);

  useEffect(() => {
    if (activeTab === 'record') {
        fetchAttendanceData();
    } else if (activeTab === 'history' || activeTab === 'summary') {
        fetchHistory();
    }
  }, [fetchAttendanceData, fetchHistory, activeTab]);
  
  // Sync filters when switching to History Tab
  useEffect(() => {
      if (activeTab === 'history') {
          // Pull values from Record tab
          setHistoryFilterDate(selectedDate || '');
          setHistoryFilterDept(selectedDepartment || '');
          setHistoryFilterLevel(selectedClassLevel || '');
      }
  }, [activeTab]);

  // Reset filters when course changes
  useEffect(() => {
      setSelectedDepartment('');
      setIsMultiSelectMode(false);
      setSelectedDepartments(new Set());
      setSelectedClassLevel('');
      setSelectedTimeSlot('');
      setSummaryDepartment('');
      setSummaryDay('');
      setSummaryTimeSlot('');
      setHistoryRecords([]); 
      setHistoryLoaded(false); 
      setFetchedRecordIds(new Set()); 
      // Reset History Filters
      setHistoryFilterDate('');
      setHistoryFilterDept('');
      setHistoryFilterLevel('');
  }, [selectedCourse]);

  // Auto-select Day based on Date
  useEffect(() => {
      if (activeTab === 'record' && selectedDate) {
          const day = getThaiDayFromDate(selectedDate);
          // Only update day if it's different to avoid loops/unnecessary renders
          // and if the date actually maps to a day (not empty)
          if (day && day !== selectedDay) {
              setSelectedDay(day);
          }
      }
  }, [selectedDate, activeTab]);

  const filterOptions = useMemo(() => {
    if (!selectedCourse) return { departments: [], classLevels: [], days: [], timeSlots: [] };
    const studentsInCourse = allStudents.filter(s => getStudentCourses(s).includes(selectedCourse as Course));
    const departments = new Set<string>();
    const classLevels = new Set<string>();
    const days = new Set<RegistrationDay>();
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
  }, [allStudents, selectedCourse, getStudentCourses, availableSchedules]);

  const filteredStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return allStudents
      .filter(s => getStudentCourses(s).includes(selectedCourse as Course))
      .filter(s => {
          // Logic for Multi-Select vs Single Select
          if (isMultiSelectMode) {
              if (selectedDepartments.size === 0) return true; // Show all if none selected (or handle as empty)
              return selectedDepartments.has(s.department);
          }
          return !selectedDepartment || s.department === selectedDepartment;
      })
      .filter(s => !selectedClassLevel || s.classLevel === selectedClassLevel)
      .filter(s => studentMatchesScheduleFilter(s, selectedCourse as Course, selectedDay, selectedTimeSlot, availableSchedules))
      .sort((a, b) => a.studentId.localeCompare(b.studentId));
  }, [allStudents, selectedCourse, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, getStudentCourses, isMultiSelectMode, selectedDepartments, availableSchedules]);

    // Check if session is recorded for the CURRENTLY filtered view
    const isSessionRecorded = useMemo(() => {
      if (filteredStudents.length === 0) return false;
      // If any student in the current filter has a record in the DB for this date/course
      return filteredStudents.some(s => fetchedRecordIds.has(s.studentId));
    }, [filteredStudents, fetchedRecordIds]);

    // --- NEW: Determine LINE Target Status (Updated for Course Support & Multi-Select) ---
    const lineTargetStatus = useMemo(() => {
      // Helper to check target for a specific set of params
      const checkTarget = (dept: string) => {
          const targets = systemConfig?.groupLineTargetIds || {};
          
          if (selectedCourse && selectedDay && selectedTimeSlot) {
              const key = `${selectedCourse}|${dept}|${selectedClassLevel}|${selectedDay}|${selectedTimeSlot}`;
              if (targets[key]) return { found: true, label: `ส่งเข้ากลุ่ม: ${selectedCourse} ${dept} ${selectedClassLevel} (${selectedDay} ${selectedTimeSlot})`, key };
          }
          if (selectedDay && selectedTimeSlot) {
              const key = `${dept}|${selectedClassLevel}|${selectedDay}|${selectedTimeSlot}`;
              if (targets[key]) return { found: true, label: `ส่งเข้ากลุ่ม: ${dept} ${selectedClassLevel} (${selectedDay} ${selectedTimeSlot})`, key };
          }
          if (selectedCourse) {
              const key = `${selectedCourse}|${dept}|${selectedClassLevel}`;
              if (targets[key]) return { found: true, label: `ส่งเข้ากลุ่ม: ${selectedCourse} ${dept} ${selectedClassLevel}`, key };
          }
          const genericKey = `${dept}|${selectedClassLevel}`;
          if (targets[genericKey]) return { found: true, label: `ส่งเข้ากลุ่ม: ${dept} ${selectedClassLevel}`, key: genericKey };

          return { found: false, label: 'ส่งกลุ่มกลาง (Default)', key: undefined };
      };

      if (isMultiSelectMode && selectedDepartments.size > 0) {
          // In multi-mode, try to find ANY valid specific token among selected departments
          // If found, we use that (assuming users group classes that share a LINE group)
          for (const dept of Array.from(selectedDepartments)) {
              const result = checkTarget(dept as string);
              if (result.found) return { type: 'specific', label: result.label + " (รวมกลุ่ม)", key: result.key };
          }
          return { type: 'default', label: 'ส่งกลุ่มกลาง (Default)', key: undefined };
      } else {
          // Single Mode
          if (!selectedDepartment || !selectedClassLevel) return { type: 'default', label: 'ส่งกลุ่มกลาง (Default)', key: undefined };
          const result = checkTarget(selectedDepartment);
          return { type: result.found ? 'specific' : 'default', label: result.label, key: result.key };
      }
  }, [systemConfig, selectedCourse, selectedDepartment, selectedClassLevel, selectedDay, selectedTimeSlot, isMultiSelectMode, selectedDepartments]);
    // ------------------------------------------

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({...prev, [studentId]: status}));
  };
  
  // Bulk Status Change Handler
  const handleBulkStatusChange = (status: AttendanceStatus) => {
      if (filteredStudents.length === 0) return;
      setAttendanceData(prev => {
          const newData = { ...prev };
          filteredStudents.forEach(student => {
              newData[student.studentId] = status;
          });
          return newData;
      });
      
      const statusText = status === AttendanceStatus.PRESENT ? "มาเรียน" : "ขาดเรียน";
      notification.addToast({ type: 'info', title: `ตั้งค่าทั้งหมดเป็น "${statusText}"`, message: 'อัปเดตสถานะนักเรียนในรายการแล้ว' });
  };
  
  const processScanCode = useCallback((decodedText: string) => {
      const student = filteredStudents.find(s => s.studentId === decodedText);
      
      if (student) {
          setScanLog(prevLog => {
              // Check if already scanned successfully in this session
              const alreadyScanned = prevLog.some(log => log.studentId === student.studentId && log.status === 'success');
              
              if (alreadyScanned) {
                  playErrorSound();
                  const newLogItem: ScanLogItem = {
                      id: Date.now().toString(),
                      timestamp: new Date(),
                      studentName: `${student.firstName} ${student.lastName}`,
                      studentId: student.studentId,
                      status: 'duplicate',
                      message: 'สแกนซ้ำ (Already Scanned)'
                  };
                  return [newLogItem, ...prevLog];
              } else {
                  // Update status to Present
                  setAttendanceData(prev => ({...prev, [student.studentId]: AttendanceStatus.PRESENT}));
                  setLastScannedStudent(student);
                  playSuccessSound();
                  setManualInputId('');
                  
                  const newLogItem: ScanLogItem = {
                      id: Date.now().toString(),
                      timestamp: new Date(),
                      studentName: `${student.firstName} ${student.lastName}`,
                      studentId: student.studentId,
                      status: 'success',
                      message: 'เช็คชื่อสำเร็จ'
                  };
                  return [newLogItem, ...prevLog];
              }
          });

      } else {
          // Student not found in filter or database
          const anyStudent = allStudents.find(s => s.studentId === decodedText);
          playErrorSound();
          setScanLog(prevLog => [{
              id: Date.now().toString(),
              timestamp: new Date(),
              studentName: anyStudent ? `${anyStudent.firstName} ${anyStudent.lastName}` : 'ไม่ทราบชื่อ',
              studentId: decodedText,
              status: 'error',
              message: anyStudent ? 'ไม่ได้อยู่ในกลุ่มเรียนนี้' : 'รหัสนักศึกษาไม่ถูกต้อง'
          }, ...prevLog]);
      }
  }, [filteredStudents, allStudents]);

  useEffect(() => {
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) return;

      const stopScanner = async () => {
          if (scannerInstanceRef.current) {
              const instance = scannerInstanceRef.current;
              // Decouple immediately to prevent race conditions
              scannerInstanceRef.current = null;
              isScanningRef.current = false;
              
              try {
                  // Wait for stop
                  await instance.stop();
              } catch (err: any) {
                  // Suppress errors during stop, especially "not running"
                  // console.debug("Scanner stop exception:", err);
              } finally {
                  // Ensure clear is called
                  try {
                      instance.clear();
                  } catch (e) {
                      // ignore clear errors
                  }
              }
          }
      };

      const startScanning = async () => {
          const element = document.getElementById("reader");
          if (!element) return;
          if (isScanningRef.current) return;

          try {
              const html5QrCode = new Html5Qrcode("reader");
              scannerInstanceRef.current = html5QrCode;
              isScanningRef.current = true;
              const config = { fps: 10, qrbox: { width: 250, height: 250 } };
              await html5QrCode.start({ facingMode: "environment" }, config, (decodedText: string) => { processScanCode(decodedText); }, () => {});
          } catch (err) {
              console.error("Error starting scanner", err);
              isScanningRef.current = false;
              // Clean up if start failed
              if(scannerInstanceRef.current) {
                  try {
                    scannerInstanceRef.current.clear();
                  } catch(e) {}
                  scannerInstanceRef.current = null;
              }
          }
      };

      let timer: any;

      if (isScannerOpen) {
          setScanLog([]);
          setLastScannedStudent(null);
          // Delay start to allow Modal animation/DOM rendering
          timer = setTimeout(startScanning, 300);
      } else {
          stopScanner();
      }

      return () => {
          if (timer) clearTimeout(timer);
          stopScanner();
      };
  }, [isScannerOpen, processScanCode]);

  const handleManualInputSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (manualInputId.trim()) {
          processScanCode(manualInputId.trim());
      }
  };

    const handleSaveAttendance = async () => {
    if (!selectedCourse || !selectedDate || filteredStudents.length === 0) return;

    setIsSaving(true);
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = filteredStudents
        .filter(student => attendanceData[student.studentId]) // Only save students with a status
        .map(student => ({
            studentId: student.studentId,
            course: selectedCourse as Course,
            date: selectedDate,
            status: attendanceData[student.studentId]!,
        }));
    
    if(recordsToSave.length === 0) {
        notification.addToast({ type: 'info', title: 'ไม่มีข้อมูลให้บันทึก', message: 'กรุณาเลือกสถานะการเข้าเรียนของนักศึกษาอย่างน้อย 1 คน' });
        setIsSaving(false);
        return;
    }
    
    const response = await setAttendance(recordsToSave);
    if(response.success) {
        notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'บันทึกข้อมูลการเข้าเรียนเรียบร้อย' });
        
        // Trigger LINE Notification ONLY IF checkbox is checked
        if (shouldNotify) {
            try {
                const stats = {
                    total: recordsToSave.length,
                    present: recordsToSave.filter(r => r.status === AttendanceStatus.PRESENT).length,
                    late: recordsToSave.filter(r => r.status === AttendanceStatus.LATE).length,
                    absent: recordsToSave.filter(r => r.status === AttendanceStatus.ABSENT).length,
                    leave: recordsToSave.filter(r => r.status === AttendanceStatus.LEAVE).length
                };

                // Identify students who are Absent or Leave for the detail list
                const absentStudents = filteredStudents.filter(s => attendanceData[s.studentId] === AttendanceStatus.ABSENT);
                const leaveStudents = filteredStudents.filter(s => attendanceData[s.studentId] === AttendanceStatus.LEAVE);

                // Construct descriptive group name
                let groupName = '';
                if (isMultiSelectMode && selectedDepartments.size > 0) {
                    groupName = Array.from(selectedDepartments).join(' & ') + (selectedClassLevel ? ` ${selectedClassLevel}` : '');
                } else if (selectedDepartment && selectedClassLevel) {
                    groupName = `${selectedDepartment} ${selectedClassLevel}`;
                } else {
                    groupName = 'รวมทุกห้อง';
                }
                
                // Thai date string
                const thaiDate = new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                // Build the message
                let message = `📢 **สรุปการเข้าเรียน**\n`;
                message += `📅 ${thaiDate}\n`;
                message += `📚 วิชา: ${selectedCourse}\n`;
                message += `🏫 กลุ่ม: ${groupName}\n`;
                message += `-----------------------------\n`;
                message += `📊 **ยอดรวม: ${stats.total} คน**\n`;
                message += `✅ มาเรียน: ${stats.present}\n`;
                message += `⚠️ สาย: ${stats.late}\n`;
                message += `❌ ขาด: ${stats.absent}\n`;
                message += `😷 ลา: ${stats.leave}\n`;
                
                // Add details if there are abnormal attendances
                if (absentStudents.length > 0 || leaveStudents.length > 0) {
                    message += `-----------------------------\n`;
                    message += `📋 **รายชื่อผู้ไม่มาเรียน:**\n`;
                    
                    absentStudents.forEach(s => {
                        message += `❌ ${s.firstName} ${s.lastName} (ขาด)\n`;
                    });
                    leaveStudents.forEach(s => {
                        message += `😷 ${s.firstName} ${s.lastName} (ลา)\n`;
                    });
                }

                // Add Link to Student Portal
                const appUrl = 'https://srtc-music-recreation-239263404015.us-west1.run.app/#/student-portal';
                message += `-----------------------------\n`;
                message += `🔗 เช็คสถานะการเรียน:\n${appUrl}`;

                // Use the key resolved by lineTargetStatus
                const groupKeyToSend = lineTargetStatus.key;

                // Call function without awaiting to unblock UI
                callCloudFunction('sendLineNotification', { message, groupKey: groupKeyToSend })
                    .then((res: any) => {
                        if (!res.success) {
                            console.warn("LINE Notify failed:", res.message);
                            // Use toast to inform user but indicate secondary failure
                            notification.addToast({ type: 'warning', title: 'แจ้งเตือนไม่สำเร็จ', message: res.message || 'ตรวจสอบการตั้งค่า LINE Bot' });
                        } else {
                            notification.addToast({ type: 'info', title: 'แจ้งเตือน LINE', message: 'ส่งข้อมูลเข้ากลุ่มเรียบร้อยแล้ว' });
                        }
                    })
                    .catch(err => {
                        console.error("Call function error", err);
                        // Gracefully handle internal errors (e.g. function crash)
                        notification.addToast({ type: 'warning', title: 'แจ้งเตือนไม่สำเร็จ', message: 'บันทึกข้อมูลแล้ว แต่ไม่สามารถส่ง LINE ได้ (ระบบขัดข้อง)' });
                    });

            } catch (err) {
                console.error("Error triggering notification", err);
            }
        }

        // Refresh data to update "Recorded" status
        await fetchAttendanceData();
        // Mark history as dirty so it refreshes next time we visit
        setHistoryLoaded(false); 
    } else {
        notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
    }
    setIsSaving(false);
  };

  const historyStats = useMemo(() => {
      // Filter the history records based on selected filters (Date, Dept, Level)
      const filteredHistory = historyRecords.filter(record => {
          // 1. Filter by Date (Exact match)
          if (historyFilterDate && record.date !== historyFilterDate) {
              return false;
          }

          // 2. Filter by Student Properties (Dept, Level)
          const student = allStudents.find(s => s.studentId === record.studentId);
          if (!student) return false;

          if (historyFilterDept && student.department !== historyFilterDept) {
              return false;
          }
          if (historyFilterLevel && student.classLevel !== historyFilterLevel) {
              return false;
          }

          return true;
      });

      // Aggregate Stats
      const stats: Record<string, DailyStats> = {};
      filteredHistory.forEach(record => {
          if (!stats[record.date]) {
              stats[record.date] = {
                  date: record.date,
                  total: 0,
                  present: 0,
                  late: 0,
                  absent: 0,
                  leave: 0
              };
          }
          stats[record.date].total++;
          if (record.status === AttendanceStatus.PRESENT) stats[record.date].present++;
          else if (record.status === AttendanceStatus.LATE) stats[record.date].late++;
          else if (record.status === AttendanceStatus.ABSENT) stats[record.date].absent++;
          else if (record.status === AttendanceStatus.LEAVE) stats[record.date].leave++;
      });
      return Object.values(stats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyRecords, historyFilterDate, historyFilterDept, historyFilterLevel, allStudents]);

  const studentSummaryStats = useMemo(() => {
      if (!selectedCourse) return [];
      const studentsInCourse = allStudents
        .filter(s => getStudentCourses(s).includes(selectedCourse as Course))
        .filter(s => !summaryDepartment || s.department === summaryDepartment)
        .filter(s => studentMatchesScheduleFilter(s, selectedCourse as Course, summaryDay, summaryTimeSlot, availableSchedules));

      const displayedStudentIds = new Set(studentsInCourse.map(s => s.studentId));
      const relevantRecords = historyRecords.filter(r => displayedStudentIds.has(r.studentId));
      const uniqueDatesForGroup = new Set(relevantRecords.map(r => r.date));
      const totalSessions = uniqueDatesForGroup.size;

      return studentsInCourse.map(student => {
          const studentRecords = historyRecords.filter(r => r.studentId === student.studentId);
          const present = studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
          const late = studentRecords.filter(r => r.status === AttendanceStatus.LATE).length;
          const absent = studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
          const leave = studentRecords.filter(r => r.status === AttendanceStatus.LEAVE).length;
          const attended = present + late;
          const percentage = totalSessions > 0 ? (attended / totalSessions) * 100 : 0;
          
          // Advanced Logic for Scoring/Status
          const effectiveAbsence = absent + Math.floor(leave / 2);
          const isBanned = effectiveAbsence > 4;
          const scoreDeduction = late + absent;

          return {
              ...student,
              stats: { present, late, absent, leave, totalSessions, percentage, effectiveAbsence, isBanned, scoreDeduction }
          };
      }).sort((a, b) => a.studentId.localeCompare(b.studentId));
  }, [allStudents, historyRecords, selectedCourse, getStudentCourses, summaryDepartment, summaryDay, summaryTimeSlot, availableSchedules]);

  const handleViewHistoryDetail = (date: string) => {
      setHistoryDetailDate(date);
      setHistoryFilterStatus('ALL');
      setHistoryDetailTimeSlot('');
      setIsHistoryEditing(false);
      // Populate edit state
      const records = historyRecords.filter(r => r.date === date);
      const initialEdits: Record<string, AttendanceStatus> = {};
      records.forEach(r => { initialEdits[r.studentId] = r.status; });
      setHistoryEdits(initialEdits);
  };

  const handleCloseHistoryModal = () => {
      setHistoryDetailDate(null);
      setIsHistoryEditing(false);
      setHistoryEdits({});
      setHistoryDetailTimeSlot('');
  };

  const handleHistoryEditChange = (studentId: string, status: AttendanceStatus) => {
      setHistoryEdits(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveHistoryChanges = async () => {
      if (!selectedCourse || !historyDetailDate) return;
      setIsSaving(true);
      
      const recordsToSave: Omit<AttendanceRecord, 'id' | 'updatedAt'>[] = Object.entries(historyEdits).map(([studentId, status]) => ({
          studentId,
          course: selectedCourse as Course,
          date: historyDetailDate,
          status: status as AttendanceStatus
      }));

      const response = await setAttendance(recordsToSave);
      if (response.success) {
          notification.addToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'อัปเดตข้อมูลการเช็คชื่อเรียบร้อย' });
          await fetchHistory(true);
          setIsHistoryEditing(false);
      } else {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: response.message });
      }
      setIsSaving(false);
  };

  const exportToCSV = () => {
      if (!studentSummaryStats.length) return;
      
      const headers = ['Student ID', 'Name', 'Department', 'Present', 'Late', 'Absent', 'Leave', 'Total Sessions', 'Percentage', 'Effective Absence', 'Deducted Points', 'Exam Status'];
      const rows = studentSummaryStats.map(item => [
          `"${item.studentId}"`,
          `"${item.prefix}${item.firstName} ${item.lastName}"`,
          `"${item.department}"`,
          item.stats.present,
          item.stats.late,
          item.stats.absent,
          item.stats.leave,
          item.stats.totalSessions,
          `${item.stats.percentage.toFixed(1)}%`,
          item.stats.effectiveAbsence,
          item.stats.scoreDeduction,
          item.stats.isBanned ? 'หมดสิทธิ์' : 'ปกติ'
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_summary_${selectedCourse}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const exportToPDF = async () => {
      if (!selectedCourse || studentSummaryStats.length === 0) return;
      
      setIsExporting(true);
      notification.showLoading('กำลังสร้าง PDF...');
      try {
          await generateAttendancePDF(selectedCourse, studentSummaryStats, systemConfig);
          notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'ดาวน์โหลดไฟล์ PDF แล้ว' });
      } catch (error) {
          console.error("PDF Error:", error);
          notification.addToast({ type: 'error', title: 'Error', message: 'ไม่สามารถสร้างไฟล์ PDF ได้' });
      } finally {
          notification.hideLoading();
          setIsExporting(false);
      }
  };

  const labelClass = "block text-sm font-medium mb-1 text-shadow";
  const selectClass = "block w-full pl-3 pr-10 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm";
  const formStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-2xl font-bold text-shadow mb-6" style={{color: 'var(--text-primary)'}}>เช็คชื่อออนไลน์ (Attendance)</h2>
        
        {/* Course Selector */}
        <div className="mb-6">
            <label className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกรายวิชา</label>
            <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value as Course | '')}
                className={selectClass}
                style={formStyle}
            >
                <option value="">-- กรุณาเลือกวิชา --</option>
                {uniqueCourses.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
        </div>

        {selectedCourse && (
            <>
                <div className="flex space-x-1 rounded-xl bg-black/10 p-1 mb-6">
                    <button onClick={() => setActiveTab('record')} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${activeTab === 'record' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-white/[0.12] hover:text-white'}`}>เช็คชื่อ (Record)</button>
                    <button onClick={() => setActiveTab('history')} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${activeTab === 'history' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-white/[0.12] hover:text-white'}`}>ประวัติ (History)</button>
                    <button onClick={() => setActiveTab('summary')} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${activeTab === 'summary' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-white/[0.12] hover:text-white'}`}>สรุปผล (Summary)</button>
                </div>

                {/* RECORD TAB */}
                {activeTab === 'record' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>วันที่</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={selectClass}
                                    style={formStyle}
                                />
                            </div>

                            {/* Quick Group Selection */}
                            <div className="md:col-span-2 lg:col-span-3 mb-2">
                                <label className={labelClass} style={{color: 'rgb(var(--accent-color))'}}>⭐ เลือกกลุ่มเรียน (Saved Groups)</label>
                                <select onChange={(e) => handleCustomGroupChange(e.target.value)} className={selectClass} style={{...formStyle, borderColor: 'rgb(var(--accent-color))', borderWidth: '2px'}}>
                                    <option value="">-- เลือกกลุ่มที่ตั้งชื่อไว้ --</option>
                                    {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-shadow" style={{color: 'var(--text-secondary)'}}>แผนกวิชา</label>
                                    <button 
                                        onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                                        className={`text-xs px-2 py-0.5 rounded transition-colors ${isMultiSelectMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        {isMultiSelectMode ? '🔀 รวมกลุ่ม (เปิด)' : '🔀 รวมกลุ่ม'}
                                    </button>
                                </div>
                                
                                {isMultiSelectMode ? (
                                    <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-white/50" style={{borderColor: 'var(--input-border)'}}>
                                        {filterOptions.departments.map(opt => (
                                            <label key={opt} className="flex items-center space-x-2 p-1 hover:bg-black/5 rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDepartments.has(opt)}
                                                    onChange={(e) => {
                                                        const newSet = new Set(selectedDepartments);
                                                        if (e.target.checked) newSet.add(opt);
                                                        else newSet.delete(opt);
                                                        setSelectedDepartments(newSet);
                                                    }}
                                                    className="rounded text-accent focus:ring-accent"
                                                />
                                                <span className="text-sm" style={{color: 'var(--text-primary)'}}>{opt}</span>
                                            </label>
                                        ))}
                                        {filterOptions.departments.length === 0 && <p className="text-xs text-gray-500">ไม่มีตัวเลือก</p>}
                                    </div>
                                ) : (
                                    <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className={selectClass} style={formStyle}>
                                        <option value="">ทั้งหมด</option>
                                        {filterOptions.departments.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>ระดับชั้น</label>
                                <select value={selectedClassLevel} onChange={(e) => setSelectedClassLevel(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.classLevels.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>วันเรียน (ตามตาราง)</label>
                                <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.days.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>เวลาเรียน</label>
                                <select value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.timeSlots.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        {currentHoliday && (
                            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-sm mb-4" role="alert">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold">วันนี้เป็นวันหยุด:</p>
                                        <p>{currentHoliday.description} ({new Date(currentHoliday.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })})</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isOutOfTerm && (
                            <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-700 p-4 rounded shadow-sm mb-4" role="alert">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold">อยู่นอกช่วงเวลาภาคเรียน:</p>
                                        <p>วันที่เลือกไม่ได้อยู่ในช่วงเปิดภาคเรียนที่กำหนดไว้ในระบบ</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isSessionRecorded && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-sm" role="alert">
                                <p className="font-bold">แจ้งเตือน:</p>
                                <p>มีการบันทึกข้อมูลการเช็คชื่อสำหรับกลุ่มนี้ในวันนี้ไปแล้ว การกดบันทึกซ้ำจะเป็นการอัปเดตข้อมูลเดิม</p>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/5 p-4 rounded-xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => setIsScannerOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /><path d="M11 11a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6zm2 2v4h4v-4h-4z" /></svg>
                                    สแกน QR Code
                                </button>
                                
                                <button onClick={() => handleBulkStatusChange(AttendanceStatus.ABSENT)} className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold transition-colors border border-red-200">
                                    ตั้งเป็น "ขาด" ทั้งหมด (สำหรับ QR)
                                </button>
                                <button onClick={() => handleBulkStatusChange(AttendanceStatus.PRESENT)} className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-semibold transition-colors border border-green-200">
                                    ตั้งเป็น "มา" ทั้งหมด
                                </button>

                                <button onClick={fetchAttendanceData} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">รีเฟรชข้อมูล</button>
                            </div>
                            <div className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>จำนวนนักศึกษา: <span className="font-bold text-lg">{filteredStudents.length}</span> คน</div>
                        </div>

                        {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : filteredStudents.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border" style={{borderColor: 'var(--glass-border)'}}>
                                <table className="min-w-full divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                    <thead className="bg-black/5">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>รหัสนักศึกษา</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>ชื่อ-สกุล</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                        {filteredStudents.map(student => (
                                            <tr key={student.studentId} className={`hover:bg-black/5 transition-colors ${attendanceData[student.studentId] === AttendanceStatus.ABSENT ? 'bg-red-50/50' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.studentId}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">{student.prefix}{student.firstName} {student.lastName}<div className="text-xs opacity-60">{student.department}</div></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <div className="flex justify-center space-x-1">
                                                        {ATTENDANCE_STATUS_OPTIONS.map(status => (
                                                            <button key={status} onClick={() => handleStatusChange(student.studentId, status)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-all border ${attendanceData[student.studentId] === status ? status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white border-green-600' : status === AttendanceStatus.LATE ? 'bg-yellow-400 text-black border-yellow-500' : status === AttendanceStatus.LEAVE ? 'bg-gray-500 text-white border-gray-600' : 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>{status}</button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">ไม่พบนักศึกษาตามเงื่อนไขที่เลือก</div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end items-center pt-4 border-t gap-4" style={{borderColor: 'var(--glass-border)'}}>
                            {/* Target Indicator */}
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center ${lineTargetStatus.type === 'specific' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" /></svg>
                                {lineTargetStatus.label}
                            </div>

                            <label className="flex items-center space-x-2 cursor-pointer bg-white/50 p-2 rounded-lg border border-gray-200">
                                <input 
                                    type="checkbox" 
                                    checked={shouldNotify} 
                                    onChange={(e) => setShouldNotify(e.target.checked)} 
                                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700">ส่งแจ้งเตือน LINE</span>
                            </label>

                            <button onClick={handleSaveAttendance} disabled={isSaving || filteredStudents.length === 0} className="btn-accent font-bold py-3 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center w-full sm:w-auto justify-center">
                                {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>บันทึกการเช็คชื่อ</>)}
                            </button>
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="animate-fade-in space-y-6">
                        {/* History Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 glass-card rounded-xl">
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองวันที่</label>
                                <input 
                                    type="date" 
                                    value={historyFilterDate} 
                                    onChange={(e) => setHistoryFilterDate(e.target.value)}
                                    className={selectClass}
                                    style={formStyle}
                                />
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองแผนกวิชา</label>
                                <select value={historyFilterDept} onChange={(e) => setHistoryFilterDept(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.departments.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองระดับชั้น</label>
                                <select value={historyFilterLevel} onChange={(e) => setHistoryFilterLevel(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.classLevels.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : historyStats.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {historyStats.map(stat => (
                                    <div key={stat.date} className="glass-card p-4 rounded-xl hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewHistoryDetail(stat.date)}>
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{new Date(stat.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                                            <span className="text-xs bg-black/10 px-2 py-1 rounded-full" style={{color: 'var(--text-secondary)'}}>{getThaiDayFromDate(stat.date)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-green-100 text-green-800 p-2 rounded text-center"><span className="block text-xs">มา</span><span className="font-bold">{stat.present}</span></div>
                                            <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-center"><span className="block text-xs">สาย</span><span className="font-bold">{stat.late}</span></div>
                                            <div className="bg-red-100 text-red-800 p-2 rounded text-center"><span className="block text-xs">ขาด</span><span className="font-bold">{stat.absent}</span></div>
                                            <div className="bg-gray-100 text-gray-800 p-2 rounded text-center"><span className="block text-xs">ลา</span><span className="font-bold">{stat.leave}</span></div>
                                        </div>
                                        <div className="mt-3 text-center text-xs text-gray-500 font-medium">รวมทั้งหมด: {stat.total} คน</div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center py-10 text-gray-500">ไม่พบประวัติการเช็คชื่อตามเงื่อนไข</div>}
                    </div>
                )}

                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 glass-card rounded-xl">
                            {/* Quick Group Selection */}
                            <div className="md:col-span-3 mb-2">
                                <label className={labelClass} style={{color: 'rgb(var(--accent-color))'}}>⭐ เลือกกลุ่มเรียน (Saved Groups)</label>
                                <select onChange={(e) => {
                                    const key = e.target.value;
                                    if (!key) return;
                                    const [dept, level, day, time] = key.split('|');
                                    setSummaryDepartment(dept || '');
                                    setSummaryDay(day || '');
                                    setSummaryTimeSlot(time || '');
                                }} className={selectClass} style={{...formStyle, borderColor: 'rgb(var(--accent-color))', borderWidth: '2px'}}>
                                    <option value="">-- เลือกกลุ่มที่ตั้งชื่อไว้ --</option>
                                    {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองแผนกวิชา</label>
                                <select value={summaryDepartment} onChange={(e) => setSummaryDepartment(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.departments.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองวันเรียน</label>
                                <select value={summaryDay} onChange={(e) => setSummaryDay(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.days.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={{color: 'var(--text-secondary)'}}>กรองเวลาเรียน</label>
                                <select value={summaryTimeSlot} onChange={(e) => setSummaryTimeSlot(e.target.value)} className={selectClass} style={formStyle}>
                                    <option value="">ทั้งหมด</option>
                                    {filterOptions.timeSlots.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mb-4">
                            <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors flex items-center text-sm font-bold">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV
                            </button>
                            <button onClick={exportToPDF} disabled={isExporting} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors flex items-center text-sm font-bold disabled:opacity-50">
                                {isExporting ? <LoadingSpinner size="sm" color="border-white" /> : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>Download PDF Report</>)}
                            </button>
                        </div>

                        {isLoading ? <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div> : (
                            <div className="overflow-x-auto rounded-lg border" style={{borderColor: 'var(--glass-border)'}}>
                                <table className="min-w-full divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                    <thead className="bg-black/5">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>รหัส/ชื่อ</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-green-600">มา</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-yellow-600">สาย</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-red-600">ขาด</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-600">ลา</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>%</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>สุทธิ (ขาด)</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>หักคะแนน</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                                        {studentSummaryStats.map(student => (
                                            <tr key={student.studentId} className="hover:bg-black/5 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><div className="font-bold">{student.studentId}</div><div>{student.prefix}{student.firstName} {student.lastName}</div><div className="text-xs opacity-60">{student.department}</div></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-green-600">{student.stats.present}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-yellow-600">{student.stats.late}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-red-600">{student.stats.absent}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-600">{student.stats.leave}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold"><span className={`px-2 py-1 rounded ${student.stats.percentage < 80 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{student.stats.percentage.toFixed(0)}%</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold"><span className={student.stats.effectiveAbsence > 4 ? 'text-red-600' : 'text-gray-700'}>{student.stats.effectiveAbsence}</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-red-500">-{student.stats.scoreDeduction}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-bold">{student.stats.isBanned ? <span className="bg-red-500 text-white px-2 py-1 rounded">หมดสิทธิ์</span> : <span className="bg-green-500 text-white px-2 py-1 rounded">ปกติ</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </>
        )}

        {/* QR Scanner Modal */}
        <Modal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} title="สแกน QR Code" size="lg">
            <div className="flex flex-col items-center">
                <div id="reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-black shadow-lg mb-4"></div>
                <div className="w-full max-w-sm mb-6">
                    <form onSubmit={handleManualInputSubmit} className="flex gap-2">
                        <input type="text" value={manualInputId} onChange={(e) => setManualInputId(e.target.value)} placeholder="หรือพิมพ์รหัสนักศึกษา..." className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" maxLength={11} />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">ตกลง</button>
                    </form>
                </div>
                {lastScannedStudent && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 w-full max-w-sm rounded animate-fade-in">
                        <p className="font-bold text-lg">✅ เช็คชื่อสำเร็จ!</p>
                        <p>{lastScannedStudent.prefix}{lastScannedStudent.firstName} {lastScannedStudent.lastName}</p>
                        <p className="text-sm opacity-75">{lastScannedStudent.studentId}</p>
                    </div>
                )}
                <div className="w-full bg-gray-100 p-3 rounded-lg max-h-48 overflow-y-auto">
                    <h4 className="font-bold text-gray-700 mb-2 text-sm">ประวัติการสแกนล่าสุด:</h4>
                    <ul className="space-y-2 text-sm">
                        {scanLog.map(log => (
                            <li key={log.id} className={`flex justify-between items-center p-2 rounded ${log.status === 'success' ? 'bg-white border-l-2 border-green-500' : log.status === 'duplicate' ? 'bg-yellow-50 border-l-2 border-yellow-500' : 'bg-red-50 border-l-2 border-red-500'}`}>
                                <div><span className="font-bold block">{log.studentId}</span><span className="text-xs text-gray-600">{log.studentName}</span></div>
                                <span className={`text-xs font-bold ${log.status === 'success' ? 'text-green-600' : log.status === 'duplicate' ? 'text-yellow-600' : 'text-red-600'}`}>{log.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Modal>

        {/* History Detail Modal */}
        <Modal isOpen={!!historyDetailDate} onClose={handleCloseHistoryModal} title={`แก้ไขการเช็คชื่อ: ${historyDetailDate ? new Date(historyDetailDate).toLocaleDateString('th-TH') : ''}`} size="fullscreen">
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex justify-between items-center p-2 bg-black/5 rounded-lg">
                    <div className="flex gap-2">
                        <select value={historyFilterStatus} onChange={(e) => setHistoryFilterStatus(e.target.value)} className="p-2 rounded border text-sm" style={formStyle}>
                            <option value="ALL">ทุกสถานะ</option>
                            {ATTENDANCE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={historyDetailTimeSlot} onChange={(e) => setHistoryDetailTimeSlot(e.target.value)} className="p-2 rounded border text-sm" style={formStyle}>
                            <option value="">ทุกเวลาเรียน</option>
                            {filterOptions.timeSlots.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium hidden sm:inline" style={{color: 'var(--text-secondary)'}}>แก้ไข: </span>
                        <button onClick={() => setIsHistoryEditing(!isHistoryEditing)} className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${isHistoryEditing ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{isHistoryEditing ? 'กำลังแก้ไข' : 'กดเพื่อแก้ไข'}</button>
                    </div>
                </div>
                <div className="overflow-auto flex-grow">
                    <table className="min-w-full divide-y" style={{borderColor: 'var(--glass-border)'}}>
                        <thead className="bg-black/5 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">รหัสนักศึกษา</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ชื่อ-สกุล</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">เวลาเรียน</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                            {allStudents
                                .filter(s => getStudentCourses(s).includes(selectedCourse as Course))
                                .filter(s => {
                                    if (historyFilterStatus !== 'ALL' && historyEdits[s.studentId] !== historyFilterStatus) return false;
                                    if (historyDetailTimeSlot && !studentMatchesScheduleFilter(s, selectedCourse as Course, '', historyDetailTimeSlot)) return false;
                                    
                                    // Also apply main history filters to detail view if desired, though usually modal is context-specific
                                    if (historyFilterDept && s.department !== historyFilterDept) return false;
                                    if (historyFilterLevel && s.classLevel !== historyFilterLevel) return false;

                                    return true;
                                })
                                .map(student => (
                                <tr key={student.studentId} className="hover:bg-black/5">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{student.studentId}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{student.prefix}{student.firstName} {student.lastName}<div className="text-xs opacity-50">{student.department}</div></td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-gray-500">{(() => { const sched = getStudentSchedule(student, selectedCourse as Course); return sched.startTime && sched.endTime ? `${sched.startTime}-${sched.endTime}` : '-'; })()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {isHistoryEditing ? (
                                            <select value={historyEdits[student.studentId] || AttendanceStatus.ABSENT} onChange={(e) => handleHistoryEditChange(student.studentId, e.target.value as AttendanceStatus)} className="p-1 rounded border text-sm" style={formStyle}>
                                                {ATTENDANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${historyEdits[student.studentId] === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-800' : historyEdits[student.studentId] === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-800' : historyEdits[student.studentId] === AttendanceStatus.LEAVE ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>{historyEdits[student.studentId] || '-'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {isHistoryEditing && (
                    <div className="flex justify-end pt-4 border-t gap-2" style={{borderColor: 'var(--glass-border)'}}>
                        <button onClick={() => setIsHistoryEditing(false)} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">ยกเลิก</button>
                        <button onClick={handleSaveHistoryChanges} disabled={isSaving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">บันทึกการแก้ไข</button>
                    </div>
                )}
            </div>
        </Modal>
      </div>
    </div>
  );
};

export default AttendanceManagement;
