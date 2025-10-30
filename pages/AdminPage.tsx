import React, { useState, useEffect } from 'react';
import AdminLogin from '../components/AdminLogin';
import AdminDashboard from '../components/AdminDashboard';
import { onAuthChange, signOutAdmin } from '../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminPage: React.FC = () => {
  // Use null to represent the initial loading state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
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
    Swal.fire({
        icon: 'info',
        title: 'ออกจากระบบแล้ว',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
            popup: 'glass-card'
        }
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