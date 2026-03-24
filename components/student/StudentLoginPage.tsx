import React, { useState } from 'react';
import { getStudentByStudentId } from '../../services/studentService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface StudentLoginPageProps {
  onLoginSuccess: (studentId: string) => void;
}

const StudentLoginPage: React.FC<StudentLoginPageProps> = ({ onLoginSuccess }) => {
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const notification = useNotification();

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
          notification.addToast({
            type: 'success',
            title: 'ยินดีต้อนรับ',
            message: `สวัสดี ${studentData.firstName} ${studentData.lastName}`,
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

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Animated Background Blobs - Variation for Students */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-10 right-10 w-64 h-64 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-10 left-1/2 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/40 backdrop-blur-xl bg-white/10 animate-float">
          
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100/20 mb-4 backdrop-blur-sm shadow-inner border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-shadow bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
              Student Login
            </h2>
            <p className="mt-2 text-sm text-shadow" style={{color: 'var(--text-secondary)'}}>
              ตรวจสอบคะแนนและกิจกรรม
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
                {/* Student ID Input */}
                <div className="group relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        id="student-id-login"
                        name="studentId"
                        type="text"
                        required
                        maxLength={11}
                        pattern="\d{11}"
                        className="block w-full pl-10 pr-3 py-3.5 border-none rounded-xl bg-white/40 backdrop-blur-sm focus:bg-white/60 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:shadow-lg transition-all duration-300"
                        placeholder="รหัสนักศึกษา (11 หลัก)"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                {/* Phone Number Input */}
                <div className="group relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                    </div>
                    <input
                        id="phone-number-login"
                        name="phoneNumber"
                        type="tel"
                        required
                        pattern="[0-9]{9,10}"
                        title="กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก"
                        className="block w-full pl-10 pr-3 py-3.5 border-none rounded-xl bg-white/40 backdrop-blur-sm focus:bg-white/60 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:shadow-lg transition-all duration-300"
                        placeholder="เบอร์โทรศัพท์"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
            </div>

            {error && (
               <div className="flex items-center p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            <div>
                <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoading ? <LoadingSpinner size="sm" color="border-white" /> : 'เข้าสู่ระบบ'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;