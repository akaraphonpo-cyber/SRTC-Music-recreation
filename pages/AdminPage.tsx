import React, { useState, useEffect } from 'react';
import AdminLogin from '../components/AdminLogin';
import AdminDashboard from '../components/admin/AdminDashboard';
import { onAuthChange, signOutAdmin } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AdminPage: React.FC = () => {
  // Use null to represent the initial loading state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const notification = useNotification();

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user && !user.isAnonymous);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    // onAuthChange will handle setting isAuthenticated to true
  };
  
  const handleLogout = async () => {
    await signOutAdmin();
    // onAuthChange will handle setting isAuthenticated to false
    notification.addToast({
        type: 'info',
        title: 'ออกจากระบบแล้ว',
    });
  };

  const renderContent = () => {
    if (isAuthenticated === null) {
      // Show a loading spinner while checking auth status
      return (
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="container mx-auto px-4 py-8">
            <AdminLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      );
    }
    
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <>{renderContent()}</>;
};

export default AdminPage;