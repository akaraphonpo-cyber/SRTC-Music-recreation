import React, { useState, useEffect } from 'react';
import StudentLoginPage from '../components/student/StudentLoginPage';
import StudentDashboardPage from '../components/student/StudentDashboardPage';
// @ts-ignore
import Swal from 'sweetalert2';

const STUDENT_AUTH_KEY = 'srtc_student_auth_id';

const StudentPortalPage: React.FC = () => {
  const [authenticatedStudentId, setAuthenticatedStudentId] = useState<string | null>(() => {
    return sessionStorage.getItem(STUDENT_AUTH_KEY);
  });

  useEffect(() => {
    if (authenticatedStudentId) {
      sessionStorage.setItem(STUDENT_AUTH_KEY, authenticatedStudentId);
    } else {
      sessionStorage.removeItem(STUDENT_AUTH_KEY);
    }
  }, [authenticatedStudentId]);

  const handleLoginSuccess = (studentId: string) => {
    setAuthenticatedStudentId(studentId);
  };

  const handleLogout = () => {
    setAuthenticatedStudentId(null);
    Swal.fire({
      icon: 'info',
      title: 'ออกจากระบบแล้ว',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      customClass: { popup: 'glass-card' }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!authenticatedStudentId ? (
        <StudentLoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <StudentDashboardPage studentId={authenticatedStudentId} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default StudentPortalPage;