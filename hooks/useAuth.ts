import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, signInAdmin, signOutAdmin } from '../services/authService';
import { ApiResponse } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
            setIsAuthenticated(!!user && !user.isAnonymous);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<ApiResponse> => {
        return await signInAdmin(email, password);
    };

    const logout = async (): Promise<ApiResponse<void>> => {
        return await signOutAdmin();
    };

    return {
        user,
        loading,
        isAuthenticated,
        login,
        logout
    };
};
