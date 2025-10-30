import React, { useState, useEffect } from 'react';
import { Student, Prefix, ClassLevel, Department, Course, RegistrationDay } from '../types';
import { addStudent, getRegistrationStatus } from '../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import StudentFormFields from '../components/StudentFormFields';
import LoadingSpinner from '../components/LoadingSpinner';

const initialFormData: Omit<Student, 'timestamp'> = {
  studentId: '',
  prefix: Prefix.MR,
  firstName: '',
  lastName: '',
  classLevel: ClassLevel.PVS1,
  department: Department.IT,
  course: Course.RECREATION,
  phoneNumber: '',
  registrationDay: RegistrationDay.MONDAY,
  registrationStartTime: '08:00',
  registrationEndTime: '08:30',
};

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const HomePage: React.FC = () => {
  const [formData, setFormData] = useState<Omit<Student, 'timestamp'>>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'LOADING' | 'OPEN' | 'CLOSED'>('LOADING');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await getRegistrationStatus();
        if (response.success && response.data?.status) {
          setRegistrationStatus(response.data.status);
        } else {
          // Default to closed to be safe if there's an issue
          setRegistrationStatus('CLOSED');
          console.error("API error fetching status:", response.message);
        }
      } catch (error) {
        console.error("Fetch error for registration status:", error);
        setRegistrationStatus('CLOSED');
      }
    };
    checkStatus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const swalConfig = {
        icon: 'error' as const,
        title: 'ข้อมูลไม่ถูกต้อง',
        confirmButtonColor: 'rgb(var(--accent-color))',
        customClass: swalCustomClass,
    };

    if (!formData.studentId || !/^\d{11}$/.test(formData.studentId)) {
      Swal.fire({...swalConfig, text: 'กรุณากรอกรหัสประจำตัวนักศึกษา 11 หลักให้ถูกต้อง'});
      return;
    }
    if (!formData.phoneNumber || !/^[0-9]{9,10}$/.test(formData.phoneNumber)) {
        Swal.fire({...swalConfig, text: 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง'});
        return;
    }
    if (formData.registrationStartTime >= formData.registrationEndTime) {
        Swal.fire({...swalConfig, text: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น'});
        return;
    }

    setIsSubmitting(true);
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      text: 'กรุณารอสักครู่',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      confirmButtonColor: 'rgb(var(--accent-color))',
      customClass: swalCustomClass,
    });

    try {
      const response = await addStudent(formData);
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          text: 'ข้อมูลของท่านถูกบันทึกเรียบร้อยแล้ว',
          confirmButtonColor: 'rgb(var(--accent-color))',
          customClass: swalCustomClass,
        });
        setFormData(initialFormData); // Reset form
      } else {
        throw new Error(response.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: 'rgb(var(--accent-color))',
        customClass: swalCustomClass,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderContent = () => {
    switch(registrationStatus) {
      case 'LOADING':
        return (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        );
      case 'CLOSED':
        return (
          <div className="glass-card border-amber-500/50 text-amber-700 p-6 rounded-xl text-center" role="alert">
            <p className="font-bold text-lg text-shadow" style={{color: 'var(--text-primary)'}}>ปิดรับการลงทะเบียน</p>
            <p className="mt-2 text-shadow" style={{color: 'var(--text-secondary)'}}>ขณะนี้ระบบได้ปิดรับการลงทะเบียนแล้ว ขออภัยในความไม่สะดวก</p>
          </div>
        );
      case 'OPEN':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <StudentFormFields formData={formData} onFormChange={handleChange} isSubmitting={isSubmitting} />
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium btn-accent disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto glass-card p-6 sm:p-8 rounded-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-shadow" style={{color: 'var(--text-primary)'}}>แบบฟอร์มลงทะเบียนนักเรียนนักศึกษา</h1>
        {renderContent()}
      </div>
    </div>
  );
};

export default HomePage;