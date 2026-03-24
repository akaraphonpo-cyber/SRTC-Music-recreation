import { db, storage } from './firebase';
import { 
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
    query, orderBy, where, writeBatch, serverTimestamp, increment,
    onSnapshot, addDoc, deleteField
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collections } from './configService';
import { callCloudFunction } from './googleSheetService';
import { 
    ApiResponse, Student, StudentWithId, 
    StudentScores, AttendanceRecord,
    WeeklyActivityLog, WeeklyActivityLogWithId,
    RecreationGroup, CreativeContentGroup,
    SingingRecord, MusicProductionRecord
} from '../types';

export const getAllStudents = async (): Promise<ApiResponse<StudentWithId[]>> => {
    try {
        const snapshot = await getDocs(collections.students);
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentWithId));
        return { success: true, data: students };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getStudentByStudentId = async (studentId: string): Promise<ApiResponse<StudentWithId>> => {
    try {
        const snapshot = await getDoc(doc(collections.students, studentId));
        if (snapshot.exists()) {
            return { success: true, data: { id: snapshot.id, ...snapshot.data() } as StudentWithId };
        }
        return { success: false, error: 'Student not found' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addStudent = async (student: Omit<Student, 'timestamp'>): Promise<ApiResponse> => {
    try {
        await setDoc(doc(collections.students, student.studentId), { ...student, timestamp: serverTimestamp() });
        return { success: true, message: 'Student added' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateStudent = async (student: StudentWithId): Promise<ApiResponse> => {
    try {
        const { id, ...data } = student;
        await updateDoc(doc(collections.students, id), data);
        return { success: true, message: 'Student updated' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteStudent = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.students, id));
        return { success: true, message: 'Student deleted' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const uploadStudentProfilePicture = async (studentId: string, file: Blob): Promise<ApiResponse<string>> => {
    try {
        const storageRef = ref(storage, `profiles/${studentId}`);
        await uploadBytesResumable(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(collections.students, studentId), { profilePicture: url });
        return { success: true, data: url };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const importStudents = async (students: Student[]): Promise<ApiResponse> => {
    try {
        const batch = writeBatch(db);
        students.forEach(s => {
            const ref = doc(collections.students, s.studentId);
            batch.set(ref, { ...s, timestamp: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
        return { success: true, message: `Imported ${students.length} students` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const migrateStudentData = async (fromTerm: string, toTerm: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('migrateStudentData', { fromTerm, toTerm });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getGameLeaderboard = async (): Promise<ApiResponse<StudentWithId[]>> => {
    try {
        const q = query(collections.students, orderBy('highScore', 'desc'), limit(10));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentWithId)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateStudentHighScore = async (studentId: string, score: number): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.students, studentId), { highScore: score });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const subscribeToGameLeaderboard = (callback: (data: StudentWithId[]) => void) => {
    const q = query(collections.students, orderBy('highScore', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
         callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentWithId)));
    });
};

// --- Weekly Activity Logs ---
export const getWeeklyActivityLogsForWeek = async (weekStart: string): Promise<ApiResponse<WeeklyActivityLogWithId[]>> => {
    try {
        const q = query(collections.weeklyActivityLogs, where('weekStartDate', '==', weekStart));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyActivityLogWithId)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addWeeklyActivityLog = async (log: WeeklyActivityLog): Promise<ApiResponse> => {
    try {
        await addDoc(collections.weeklyActivityLogs, log);
        return { success: true, message: 'Log added' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateWeeklyActivityLog = async (id: string, log: Partial<WeeklyActivityLog>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.weeklyActivityLogs, id), log);
        return { success: true, message: 'Log updated' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteWeeklyActivityLog = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.weeklyActivityLogs, id));
        return { success: true, message: 'Log deleted' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Recreation Groups ---
export const getRecreationGroups = async (): Promise<ApiResponse<RecreationGroup[]>> => {
    try {
        const snap = await getDocs(collections.recreationGroups);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as RecreationGroup)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addRecreationGroup = async (group: RecreationGroup): Promise<ApiResponse> => {
    try {
        await addDoc(collections.recreationGroups, { ...group, createdAt: new Date().toISOString() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateRecreationGroup = async (id: string, data: Partial<RecreationGroup>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.recreationGroups, id), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteRecreationGroup = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.recreationGroups, id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Creative Content Groups ---
export const getCreativeContentGroups = async (): Promise<ApiResponse<CreativeContentGroup[]>> => {
    try {
        const snap = await getDocs(collections.creativeContentGroups);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as CreativeContentGroup)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addCreativeContentGroup = async (group: CreativeContentGroup): Promise<ApiResponse> => {
    try {
        await addDoc(collections.creativeContentGroups, { ...group, createdAt: new Date().toISOString() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateCreativeContentGroup = async (id: string, data: Partial<CreativeContentGroup>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.creativeContentGroups, id), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteCreativeContentGroup = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.creativeContentGroups, id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Singing Exam Records ---
export const getSingingRecords = async (): Promise<ApiResponse<Record<string, SingingRecord>>> => {
    try {
        const snap = await getDocs(collections.singingRecords);
        const records: Record<string, SingingRecord> = {};
        snap.forEach(d => {
            const data = d.data() as SingingRecord;
            records[data.studentId] = { ...data, id: d.id };
        });
        return { success: true, data: records };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const saveSingingRecord = async (record: SingingRecord): Promise<ApiResponse> => {
    try {
        const id = record.studentId;
        await setDoc(doc(collections.singingRecords, id), { ...record, updatedAt: serverTimestamp() }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Music Production Records ---
export const getMusicProductionRecords = async (): Promise<ApiResponse<Record<string, MusicProductionRecord>>> => {
    try {
        const snap = await getDocs(collections.musicProductionRecords);
        const records: Record<string, MusicProductionRecord> = {};
        snap.forEach(d => {
            const data = d.data() as MusicProductionRecord;
            records[data.studentId] = { ...data, id: d.id };
        });
        return { success: true, data: records };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const saveMusicProductionRecord = async (record: MusicProductionRecord): Promise<ApiResponse> => {
    try {
        const id = record.studentId;
        await setDoc(doc(collections.musicProductionRecords, id), { ...record, updatedAt: serverTimestamp() }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Gamification & Rewards ---
export const grantGameXP = async (studentId: string, amount: number, source: string): Promise<ApiResponse> => {
    try {
        const ref = doc(collections.students, studentId);
        await updateDoc(ref, { bonusXP: increment(amount) });
        return { success: true, message: `Granted ${amount} XP from ${source}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const resetGameLeaderboard = async (): Promise<ApiResponse> => {
    try {
        const snap = await getDocs(collections.students);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            batch.update(d.ref, { highScore: 0 });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const giveGachaTicketToAll = async (): Promise<ApiResponse> => {
    try {
        const snap = await getDocs(collections.students);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            const currentInv = d.data().inventory || {};
            currentInv['gacha_ticket'] = (currentInv['gacha_ticket'] || 0) + 1;
            batch.update(d.ref, { inventory: currentInv });
        });
        await batch.commit();
        return { success: true, message: 'Tickets distributed' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const buySystemItem = async (studentId: string, itemId: string, price: number): Promise<ApiResponse> => {
    try {
        const ref = doc(collections.students, studentId);
        await updateDoc(ref, {
            coins: increment(-price),
            [`inventory.${itemId}`]: increment(1)
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const consumeItem = async (studentId: string, itemId: string): Promise<ApiResponse> => {
    try {
        const ref = doc(collections.students, studentId);
        const snap = await getDoc(ref);
        const inv = snap.data()?.inventory || {};
        if (!inv[itemId] || inv[itemId] < 1) return { success: false, message: 'Not enough items' };
        
        if (inv[itemId] === 1) {
            await updateDoc(ref, { [`inventory.${itemId}`]: deleteField() });
        } else {
            await updateDoc(ref, { [`inventory.${itemId}`]: increment(-1) });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const grantReward = async (studentId: string, type: 'COIN' | 'ITEM', value: string): Promise<ApiResponse> => {
    try {
        const ref = doc(collections.students, studentId);
        if (type === 'COIN') {
            await updateDoc(ref, { coins: increment(Number(value)) });
        } else {
            await updateDoc(ref, { [`inventory.${value}`]: increment(1) });
        }
        return { success: true, message: 'Reward granted' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
