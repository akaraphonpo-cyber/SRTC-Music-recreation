import React, { useState } from 'react';
import { getStudentByStudentId } from '../../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import LoadingSpinner from '../LoadingSpinner';

interface StudentLoginPageProps {
  onLoginSuccess: (studentId: string) => void;
}

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const StudentLoginPage: React.FC<StudentLoginPageProps> = ({ onLoginSuccess }) => {
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const commonInputClass = "appearance-none rounded-lg relative block w-full px-3 py-3.5 shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all";
  const style = {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    placeholderColor: 'var(--text-muted)'
  };
   const focusStyle = {
      borderColor: 'var(--input-focus-border)',
      boxShadow: `0 0 0 2px rgba(var(--accent-color), 0.3)`,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(studentId)) {
      setError('กรุณากรอกรหัสนักศึกษา 11 หลักให้ถูกต้อง');
      return;
    }
    if (!/^[0-9]{9,10}$/.test(phoneNumber)) {
        setError('กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง');
        return;
    }


    setIsLoading(true);
    setError('');

    try {
      const response = await getStudentByStudentId(studentId);
      if (response.success) {
        const studentData = response.data;
        if (studentData && studentData.phoneNumber === phoneNumber) {
          Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            customClass: { popup: 'glass-card' }
          });
          onLoginSuccess(studentId);
        } else {
          setError('รหัสนักศึกษาหรือเบอร์โทรศัพท์ไม่ถูกต้อง');
        }
      } else {
        throw new Error(response.message || 'ไม่สามารถตรวจสอบข้อมูลได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => Object.assign(e.target.style, focusStyle);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'var(--input-border)';
      e.target.style.boxShadow = 'none';
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-shadow" style={{color: 'rgb(var(--accent-color))'}}>
            เข้าสู่ระบบสำหรับนักศึกษา
          </h2>
          <p className="mt-2 text-center text-sm text-shadow" style={{color: 'var(--text-secondary)'}}>
            กรุณากรอกรหัสนักศึกษาและเบอร์โทรศัพท์เพื่อเข้าสู่ระบบ
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="student-id-login" className="sr-only">
                รหัสนักศึกษา
              </label>
              <input
                id="student-id-login"
                name="studentId"
                type="text"
                required
                maxLength={11}
                pattern="\d{11}"
                className={commonInputClass}
                style={style}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="รหัสนักศึกษา"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div>
              <label htmlFor="phone-number-login" className="sr-only">
                เบอร์โทรศัพท์
              </label>
              <input
                id="phone-number-login"
                name="phoneNumber"
                type="tel"
                required
                pattern="[0-9]{9,10}"
                title="กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก"
                className={commonInputClass}
                style={style}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="เบอร์โทรศัพท์"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-accent disabled:opacity-50 transition-all transform hover:scale-105"
            >
              {isLoading ? <LoadingSpinner size="sm" color="border-white" /> : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLoginPage;