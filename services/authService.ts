import { auth } from './firebase';
import { 
    signInWithEmailAndPassword, signOut, onAuthStateChanged, 
    User, signInAnonymously 
} from "firebase/auth";
import { ApiResponse } from '../types';

export const signInAdmin = async (email: string, password: string): Promise<ApiResponse> => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true, message: 'Login successful.' };
    } catch (error: any) {
        let message = error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        }
        return { success: false, error: message };
    }
};

export const signOutAdmin = async (): Promise<ApiResponse<void>> => {
    try {
        await signOut(auth);
        return { success: true, message: 'Logout successful.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export const ensureGameAuth = async () => {
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }
};
