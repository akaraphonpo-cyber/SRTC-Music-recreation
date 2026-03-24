
import React, { useState, useEffect, useCallback } from 'react';
import { Student, Prefix, ClassLevel, Department, Course, RegistrationDay, Schedule } from '../types';
import { addStudent, getRegistrationStatus, getSchedules } from '../services/googleSheetService';
import { useNotification } from '../contexts/NotificationContext';
import StudentFormFields from '../components/StudentFormFields';
import LoadingSpinner from '../components/common/LoadingSpinner';

const initialFormData: Omit<Student, 'timestamp'> = {
  studentId: '',
  prefix: Prefix.MR,
  firstName: '',
  lastName: '',
  classLevel: ClassLevel.PVS1,
  department: Department.IT,
  courses: [],
  selectedScheduleIds: {},
  courseSchedules: {},
  phoneNumber: '',
  registrationDay: RegistrationDay.MONDAY,
  registrationStartTime: '08:00',
  registrationEndTime: '08:30',
};

// Optimized Background Component for Mobile Stability
const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-gradient-to-b from-slate-50/50 to-slate-100/50">
    {/* Use translate3d to force hardware acceleration and avoid mix-blend-multiply on large areas which crashes mobile GPUs */}
    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-400/20 rounded-full filter blur-3xl animate-blob opacity-40 transform-gpu will-change-transform"></div>
    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-400/20 rounded-full filter blur-3xl animate-blob animation-delay-2000 opacity-40 transform-gpu will-change-transform"></div>
    <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-400/20 rounded-full filter blur-3xl animate-blob animation-delay-4000 opacity-40 transform-gpu will-change-transform"></div>
  </div>
);

const HomePage: React.FC = () => {
  const [formData, setFormData] = useState<Omit<Student, 'timestamp'>>(initialFormData);
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'LOADING' | 'OPEN' | 'CLOSED'>('LOADING');
  const [showTimeout, setShowTimeout] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const notification = useNotification();

  const fetchStatusAndSchedules = async () => {
      setShowTimeout(false);
      setRegistrationStatus('LOADING');
      try {
        const [statusRes, schedulesRes] = await Promise.all([
            getRegistrationStatus(),
            getSchedules()
        ]);

        if (statusRes.success && statusRes.data?.status) {
          setRegistrationStatus(statusRes.data.status);
        } else {
          setRegistrationStatus('CLOSED');
        }

        if (schedulesRes.success && schedulesRes.data) {
            setAvailableSchedules(schedulesRes.data);
        }
      } catch (error) {
        console.error("Fetch error for status/schedules:", error);
        setRegistrationStatus('CLOSED');
      }
  };

  useEffect(() => {
    // Set a timeout to detect slow network/hangs
    const timeoutId = setTimeout(() => {
        if (registrationStatus === 'LOADING') {
            setShowTimeout(true);
        }
    }, 10000); // 10 seconds

    fetchStatusAndSchedules();

    return () => clearTimeout(timeoutId);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
     if (errors[name]) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[name];
            return newErrors;
        });
    }
  };
  
  const handleCourseChange = (course: Course, checked: boolean) => {
    setFormData(prev => {
        const currentCourses = prev.courses || [];
        if (checked) {
            // Automatically select the first available schedule for this course if it exists
            const courseSchedules = availableSchedules.filter(s => s.course === course);
            const selectedScheduleIds = { ...prev.selectedScheduleIds };
            if (courseSchedules.length > 0) {
                selectedScheduleIds[course] = courseSchedules[0].id;
            }
            return { ...prev, courses: [...currentCourses, course], selectedScheduleIds };
        } else {
            // Also remove schedule if course is unchecked
            const newSchedules = { ...prev.courseSchedules };
            const newSelectedScheduleIds = { ...prev.selectedScheduleIds };
            delete newSchedules[course];
            delete newSelectedScheduleIds[course];
            return { 
                ...prev, 
                courses: currentCourses.filter(c => c !== course),
                courseSchedules: newSchedules,
                selectedScheduleIds: newSelectedScheduleIds
            };
        }
    });
    if (errors.courses) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.courses;
            return newErrors;
        });
    }
  };

  const handleScheduleIdChange = (course: Course, scheduleId: string) => {
      setFormData(prev => ({
          ...prev,
          selectedScheduleIds: {
              ...prev.selectedScheduleIds,
              [course]: scheduleId
          }
      }));
  };

  const handleScheduleChange = (course: Course, field: string, value: string) => {
      setFormData(prev => {
          const currentSchedules = prev.courseSchedules || {};
          const currentCourseSchedule = currentSchedules[course] || {
              day: prev.registrationDay,
              startTime: prev.registrationStartTime,
              endTime: prev.registrationEndTime
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
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.studentId || !/^\d{11}$/.test(formData.studentId)) {
        newErrors.studentId = 'กรุณากรอกรหัสประจำตัวนักศึกษา 11 หลักให้ถูกต้อง';
    }
    if (!formData.phoneNumber || !/^[0-9]{9,10}$/.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง';
    }
    if (formData.registrationStartTime >= formData.registrationEndTime) {
        newErrors.registrationEndTime = 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
    }
    
    // Check for any empty required fields by iterating over initialFormData keys
    for (const key of Object.keys(initialFormData) as Array<keyof typeof initialFormData>) {
        if (key === 'courses') {
            if (!formData.courses || formData.courses.length === 0) {
                newErrors.courses = 'กรุณาเลือกอย่างน้อย 1 วิชา';
            }
        } else if (key === 'courseSchedules') {
            // Skip validation for this object
        } else if (!formData[key]) {
             // A more specific message for time fields
            if (key === 'registrationStartTime' || key === 'registrationEndTime') {
                newErrors[key] = 'กรุณาเลือกเวลา';
            } else {
                newErrors[key] = 'กรุณากรอกข้อมูลในช่องนี้';
            }
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true);
    notification.showLoading('กำลังบันทึกข้อมูล...');

    try {
      const response = await addStudent(formData);
      if (response.success) {
        notification.addToast({
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: 'ข้อมูลของท่านถูกบันทึกเรียบร้อยแล้ว',
        });
        setFormData(initialFormData); // Reset form
        setErrors({}); // Clear errors on success
      } else {
        throw new Error(response.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      notification.addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSubmitting(false);
      notification.hideLoading();
    }
  };
  
  const renderContent = () => {
    if (showTimeout && registrationStatus === 'LOADING') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="mb-4 text-gray-500">การเชื่อมต่อใช้เวลานานกว่าปกติ</p>
                <button 
                    onClick={() => { setShowTimeout(false); fetchStatus(); }}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors"
                >
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        );
    }

    switch(registrationStatus) {
      case 'LOADING':
        return (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        );
      case 'CLOSED':
        return (
          <div className="glass-card border-2 border-amber-500/30 bg-amber-500/10 text-amber-700 p-8 rounded-2xl text-center shadow-lg" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="font-bold text-2xl text-shadow" style={{color: 'var(--text-primary)'}}>ปิดรับการลงทะเบียน</p>
            <p className="mt-2 text-lg text-shadow opacity-80" style={{color: 'var(--text-secondary)'}}>ขณะนี้ระบบได้ปิดรับการลงทะเบียนแล้ว ขออภัยในความไม่สะดวก</p>
          </div>
        );
      case 'OPEN':
        return (
          <form onSubmit={handleSubmit} className="space-y-8">
            <StudentFormFields 
                formData={formData} 
                onFormChange={handleChange} 
                onCourseChange={handleCourseChange} 
                onScheduleChange={handleScheduleChange}
                onScheduleIdChange={handleScheduleIdChange}
                availableSchedules={availableSchedules}
                isSubmitting={isSubmitting} 
                errors={errors} 
            />
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-xl hover:shadow-orange-500/30 transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isSubmitting && <LoadingSpinner size="sm" color="border-white" />}
                </span>
                {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการลงทะเบียน'}
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      
      <div className="w-full max-w-4xl relative z-10 animate-fade-in">
        <div className="glass-card p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-white/30 backdrop-blur-xl bg-white/10 animate-float">
            
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-shadow mb-3 tracking-wide" style={{fontFamily: "'RushDriver', sans-serif"}}>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-red-500">
                        SRTC Registration
                    </span>
                </h1>
                <p className="text-lg sm:text-xl font-medium opacity-80" style={{color: 'var(--text-secondary)'}}>
                    แบบฟอร์มลงทะเบียนสมาชิกชมรมดนตรีและนันทนาการ
                </p>
                <div className="mt-4 flex justify-center">
                    <div className="h-1 w-20 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"></div>
                </div>
            </div>

            {/* Content */}
            {renderContent()}
        </div>
        
        <div className="mt-8 text-center text-sm opacity-60" style={{color: 'var(--text-primary)'}}>
            <p>มีปัญหาในการลงทะเบียน? ติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
