import { db } from './firebase';
import { 
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
    query, orderBy, setDoc, writeBatch, where, serverTimestamp
} from "firebase/firestore";
import { collections } from './configService';
import { 
    ApiResponse, CourseData, CourseConfig, StudentScores, Course, AttendanceRecord, Activity 
} from '../types';

// --- Course Catalog ---
export const getCourseCatalog = async (): Promise<ApiResponse<CourseData[]>> => {
    try {
        const snap = await getDocs(collections.courseCatalog);
        const courses = snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseData));
        return { success: true, data: courses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addCourseToCatalog = async (course: Omit<CourseData, 'id'>): Promise<ApiResponse> => {
    try {
        await addDoc(collections.courseCatalog, course);
        return { success: true, message: 'Course added to catalog' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateCourseInCatalog = async (id: string, course: Partial<CourseData>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.courseCatalog, id), course);
        return { success: true, message: 'Course updated' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteCourseFromCatalog = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.courseCatalog, id));
        return { success: true, message: 'Course deleted' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Course Grading Config ---
export const getCourseGradingConfig = async (courseName: string): Promise<ApiResponse<CourseConfig>> => {
    try {
        const snap = await getDoc(doc(db, 'config', `grading_${courseName}`));
        return { success: true, data: snap.exists() ? snap.data() as CourseConfig : { gradingConfig: {}, gradingConfigOrder: [] } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setCourseGradingConfig = async (courseName: string, config: Partial<CourseConfig>): Promise<ApiResponse> => {
    try {
        await setDoc(doc(db, 'config', `grading_${courseName}`), config, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getScoresForCourse = async (courseName: string): Promise<ApiResponse<Record<string, StudentScores>>> => {
    try {
        const q = query(collections.scores, where('courseName', '==', courseName));
        const snap = await getDocs(q);
        const scores: Record<string, StudentScores> = {};
        snap.forEach(d => {
            const data = d.data() as StudentScores;
            scores[data.studentId] = data;
        });
        return { success: true, data: scores };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getScoresForStudent = async (studentId: string): Promise<ApiResponse<StudentScores[]>> => {
    try {
        const q = query(collections.scores, where('studentId', '==', studentId));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => d.data() as StudentScores) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setStudentScores = async (scores: StudentScores[]): Promise<ApiResponse> => {
    try {
        const batch = writeBatch(db);
        scores.forEach(s => {
            const id = `${s.studentId}_${s.courseName}`;
            const ref = doc(collections.scores, id);
            batch.set(ref, s, { merge: true });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Attendance Services ---
export const getAttendance = async (course: Course, date: string): Promise<ApiResponse<Record<string, AttendanceRecord>>> => {
    try {
        const q = query(collections.attendance, where('course', '==', course), where('date', '==', date));
        const snap = await getDocs(q);
        const records: Record<string, AttendanceRecord> = {};
        snap.forEach(d => {
            const data = d.data() as AttendanceRecord;
            records[data.studentId] = data;
        });
        return { success: true, data: records };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setAttendance = async (records: Omit<AttendanceRecord, 'id'>[]): Promise<ApiResponse> => {
    try {
        const batch = writeBatch(db);
        records.forEach(r => {
            const id = `${r.studentId}_${r.date}_${r.course}`;
            const ref = doc(collections.attendance, id);
            batch.set(ref, { ...r, id }, { merge: true });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getAllAttendanceForCourse = async (course: Course): Promise<ApiResponse<AttendanceRecord[]>> => {
    try {
        const q = query(collections.attendance, where('course', '==', course));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => d.data() as AttendanceRecord) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getAttendanceForStudent = async (studentId: string): Promise<ApiResponse<AttendanceRecord[]>> => {
    try {
        const q = query(collections.attendance, where('studentId', '==', studentId));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => d.data() as AttendanceRecord) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Activity Services ---
export const getActivities = async (courseName: string): Promise<ApiResponse<Activity[]>> => {
    try {
        const q = query(collections.activities, where('courseName', '==', courseName), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addActivity = async (activity: Omit<Activity, 'id'>): Promise<ApiResponse> => {
    try {
        await addDoc(collections.activities, { ...activity, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateActivity = async (id: string, data: Partial<Activity>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.activities, id), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteActivity = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.activities, id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
