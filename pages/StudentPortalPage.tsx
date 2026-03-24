import React, { useState, useEffect } from 'react';
import StudentLoginPage from '../components/student/StudentLoginPage';
import StudentDashboardPage from '../components/student/StudentDashboardPage';
import { useNotification } from '../contexts/NotificationContext';
import { ensureGameAuth } from '../services/authService';

const STUDENT_AUTH_KEY = 'srtc_student_auth_id';

const StudentPortalPage: React.FC = () => {
  const [authenticatedStudentId, setAuthenticatedStudentId] = useState<string | null>(() => {
    return sessionStorage.getItem(STUDENT_AUTH_KEY);
  });
  const notification = useNotification();

  useEffect(() => {
    if (authenticatedStudentId) {
      sessionStorage.setItem(STUDENT_AUTH_KEY, authenticatedStudentId);
      void ensureGameAuth();
    } else {
      sessionStorage.removeItem(STUDENT_AUTH_KEY);
    }
  }, [authenticatedStudentId]);

  const handleLoginSuccess = (studentId: string) => {
    setAuthenticatedStudentId(studentId);
  };

  const handleLogout = () => {
    setAuthenticatedStudentId(null);
    notification.addToast({
      type: 'info',
      title: 'ออกจากระบบแล้ว',
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