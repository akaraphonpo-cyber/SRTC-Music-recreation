import { db } from './firebase';
import { 
    doc, getDoc, onSnapshot, collection, updateDoc, setDoc, 
    increment, serverTimestamp, writeBatch, getDocs, deleteDoc 
} from "firebase/firestore";
import { 
    SystemConfig, ApiResponse, OverviewStatistics, 
    RegistrationConfig, GameConfig, Course, Student 
} from '../types';
import { callCloudFunction } from './googleSheetService';

export const systemConfigDocRef = doc(db, 'config/system');
export const registrationConfigDocRef = doc(db, 'config/registration');
export const gamesConfigDocRef = doc(db, 'config/games');

let activeTermId = '';

export const initSystemConfig = async () => {
    const snap = await getDoc(systemConfigDocRef);
    if (snap.exists()) {
        const config = snap.data() as SystemConfig;
        if (config.year && config.term) {
            activeTermId = `${config.year}_${config.term}`;
        }
    }
};

// Internal listener to keep activeTermId updated
onSnapshot(systemConfigDocRef, (snap) => {
    if (snap.exists()) {
        const config = snap.data() as SystemConfig;
        if (config.year && config.term) {
            activeTermId = `${config.year}_${config.term}`;
        }
    }
});

export const onSystemConfigChange = (callback: (config: SystemConfig) => void) => {
    return onSnapshot(systemConfigDocRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as SystemConfig);
        }
    });
};

export const getCollectionName = (baseName: string) => {
    // Content collections are always global to keep the Landing Page consistent
    if (['portfolio', 'videos', 'announcements'].includes(baseName)) {
        return baseName;
    }
    
    if (activeTermId === '2568_2' || !activeTermId) {
        return baseName;
    }
    return `${baseName}_${activeTermId}`;
};

export const getActiveTermId = () => activeTermId;

export const setGlobalTermYear = (term: string, year: string) => {
    activeTermId = `${year}_${term}`;
};

export const collections = {
    get students() { return collection(db, getCollectionName('students')); },
    get courseCatalog() { return collection(db, getCollectionName('course_catalog')); },
    get courses() { return collection(db, getCollectionName('courses')); },
    get scores() { return collection(db, getCollectionName('scores')); },
    get weeklyActivityLogs() { return collection(db, getCollectionName('weeklyActivityLogs')); },
    get tournaments() { return collection(db, getCollectionName('tournaments')); },
    get portfolio() { return collection(db, 'portfolio'); },
    get attendance() { return collection(db, getCollectionName('attendance')); },
    get activities() { return collection(db, getCollectionName('activities')); },
    get werewolf() { return collection(db, getCollectionName('werewolf_rooms')); },
    get uno() { return collection(db, getCollectionName('uno_rooms')); },
    get recreationGroups() { return collection(db, getCollectionName('recreation_groups')); },
    get creativeContentGroups() { return collection(db, getCollectionName('creative_content_groups')); },
    get singingRecords() { return collection(db, getCollectionName('singing_records')); },
    get musicProductionRecords() { return collection(db, getCollectionName('music_production_records')); },
    get gachaLogs() { return collection(db, getCollectionName('gacha_logs')); },
    get marketplace() { return collection(db, getCollectionName('marketplace')); },
    get videos() { return collection(db, 'videos'); },
    get announcements() { return collection(db, 'announcements'); },
};

// --- System Config & Terms ---
export const getSystemConfig = async (): Promise<ApiResponse<SystemConfig>> => {
    try {
        const snap = await getDoc(systemConfigDocRef);
        return { success: true, data: snap.data() as SystemConfig };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setSystemConfig = async (config: SystemConfig): Promise<ApiResponse> => {
    try {
        await setDoc(systemConfigDocRef, config, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getSystemConfigForTerm = async (year: string, term: string): Promise<ApiResponse<SystemConfig>> => {
    try {
        const termDocRef = doc(db, `config/system_${year}_${term}`);
        const snap = await getDoc(termDocRef);
        return { success: true, data: snap.data() as SystemConfig };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Registration Config ---
export const getRegistrationStatus = async (): Promise<ApiResponse<RegistrationConfig>> => {
    try {
        const snap = await getDoc(registrationConfigDocRef);
        return { success: true, data: snap.data() as RegistrationConfig };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setRegistrationStatus = async (config: RegistrationConfig): Promise<ApiResponse> => {
    try {
        await setDoc(registrationConfigDocRef, config, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Game Config ---
export const getGameConfig = async (): Promise<ApiResponse<GameConfig>> => {
    try {
        const snap = await getDoc(gamesConfigDocRef);
        return { success: true, data: snap.data() as GameConfig };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const setGameConfig = async (config: GameConfig): Promise<ApiResponse> => {
    try {
        await setDoc(gamesConfigDocRef, config, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Statistics ---
export const getOverviewStatistics = async (): Promise<ApiResponse<OverviewStatistics>> => {
    try {
        const snap = await getDoc(systemConfigDocRef);
        if (snap.exists() && snap.data().overviewStats) {
            return { success: true, data: snap.data().overviewStats as OverviewStatistics };
        }
        return { success: true, data: { totalStudents: 0, totalCourses: 0, departmentCounts: {}, courseCounts: {} } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const triggerStatisticsRecalculation = async (): Promise<ApiResponse> => {
    try {
        await callCloudFunction('recalculateStats');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getVisitorCount = async (): Promise<number> => {
    try {
        const docRef = doc(db, 'site', 'stats');
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data().visitorCount || 0 : 0;
    } catch { return 0; }
};

export const incrementVisitorCount = async (): Promise<void> => {
    const docRef = doc(db, 'site', 'stats');
    try {
        await updateDoc(docRef, { visitorCount: increment(1) });
    } catch (e: any) {
        if (e.code === 'not-found') {
            await setDoc(docRef, { visitorCount: 1 });
        }
    }
};

// --- Term Management (Advanced) ---
export const rolloverCourses = async (fromTerm: string, toTerm: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('rolloverCourses', { fromTerm, toTerm });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const promoteStudents = async (fromTerm: string, toTerm: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('promoteStudents', { fromTerm, toTerm });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const importFromMainTerm = async (targetTerm: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('importFromMainTerm', { targetTerm });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const resetSystemForNewTerm = async (year: string, term: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('resetSystemForNewTerm', { year, term });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const checkForUnmigratedData = async (): Promise<ApiResponse<boolean>> => {
    try {
        // Check if the base 'students' collection has any documents
        // This is a simple heuristic for unmigrated data
        const snap = await getDocs(collection(db, 'students'));
        return { success: true, data: !snap.empty };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
