import { initializeApp } from "firebase/app";
import { 
  getFirestore,
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  writeBatch,
  deleteField
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { Student, StudentWithId, ApiResponse, RegistrationStatus, RegistrationStatusResponse, RegistrationStatusData, GradingConfig, Course, StudentScores, CourseConfig, Activity } from '../types';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyBG3ASzqNad31LwWfoAK5fQtQzykwD91R4",
  authDomain: "srtc-student-registration.firebaseapp.com",
  projectId: "srtc-student-registration",
  storageBucket: "srtc-student-registration.firebasestorage.app",
  messagingSenderId: "782725512423",
  appId: "1:782725512423:web:32d5bb13d21a99d7303642",
  measurementId: "G-80JSD8GF9L"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// --- Firestore Collections ---
const studentsCollection = collection(db, 'students');
const configDocRef = doc(db, 'config', 'registration');
const coursesCollection = collection(db, 'courses');
const scoresCollection = collection(db, 'scores');


// --- Helper Function ---
async function handleRequest<T>(promise: Promise<T>, successMessage?: string): Promise<ApiResponse<T>> {
  try {
    const data = await promise;
    return { success: true, data, message: successMessage };
  } catch (error: any) {
    console.error("Firebase Error:", error);
    let message = error.message || 'An unknown error occurred with Firebase.';
    // Customize Firebase Auth error messages
    if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                break;
            case 'auth/invalid-email':
                message = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'permission-denied':
                 message = 'Permission denied. Check Firestore security rules.';
                 break;
            default:
                message = 'เกิดข้อผิดพลาดในการยืนยันตัวตน';
        }
    }
    return { success: false, error: message, message };
  }
}

// --- Authentication Functions ---
export const signInAdmin = (email: string, password: string): Promise<ApiResponse> => {
    return handleRequest(signInWithEmailAndPassword(auth, email, password), 'Login successful.');
};

export const signOutAdmin = (): Promise<ApiResponse<void>> => {
    return handleRequest(signOut(auth), 'Logout successful.');
};

export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};


// --- Service Functions (Students) ---

export const addStudent = async (studentData: Omit<Student, 'timestamp'>): Promise<ApiResponse> => {
    // Check for duplicate student ID before adding
    const q = query(studentsCollection, where("studentId", "==", studentData.studentId));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const message = `รหัสนักศึกษา ${studentData.studentId} นี้ได้ลงทะเบียนแล้ว`;
            return { success: false, error: message, message };
        }

        const newStudent = {
            ...studentData,
            timestamp: serverTimestamp(),
        };
        return handleRequest(addDoc(studentsCollection, newStudent), 'ลงทะเบียนสำเร็จ');

    } catch (error: any) {
        console.error("Firebase Error checking student ID:", error);
        const message = error.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัสนักศึกษา';
        return { success: false, error: message, message };
    }
};

export const getStudents = async (): Promise<ApiResponse<StudentWithId[]>> => {
  const q = query(studentsCollection, orderBy("timestamp", "desc"));
  const promise = getDocs(q).then(snapshot => 
    snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to JS Date string for consistency
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      return { ...data, id: doc.id, timestamp } as StudentWithId
    })
  );
  return handleRequest(promise);
};

export const getStudentByStudentId = async (studentId: string): Promise<ApiResponse<StudentWithId | null>> => {
    const q = query(studentsCollection, where("studentId", "==", studentId));
    const promise = getDocs(q).then(snapshot => {
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
        return { ...data, id: doc.id, timestamp } as StudentWithId;
    });
    return handleRequest(promise);
};


export const updateStudent = async (studentData: StudentWithId): Promise<ApiResponse> => {
  const { id, ...dataToUpdate } = studentData;
  const studentDoc = doc(db, 'students', id);
  // Firestore's serverTimestamp cannot be part of a normal update object, so we exclude it.
  // If we needed to update the timestamp, we would handle it separately.
  delete (dataToUpdate as Partial<StudentWithId>).timestamp;
  return handleRequest(updateDoc(studentDoc, dataToUpdate as any), 'Student updated successfully.');
};

export const deleteStudent = async (id: string): Promise<ApiResponse> => {
  const studentDoc = doc(db, 'students', id);
  return handleRequest(deleteDoc(studentDoc), 'Student deleted successfully.');
};

export const getRegistrationStatus = async (): Promise<RegistrationStatusResponse> => {
    const promise = getDoc(configDocRef).then(docSnap => {
        if (docSnap.exists()) {
            return docSnap.data() as RegistrationStatusData;
        }
        // If config doesn't exist, create it with a default of 'CLOSED' for safety
        const defaultStatus: RegistrationStatusData = { status: 'CLOSED' };
        setDoc(configDocRef, defaultStatus);
        return defaultStatus;
    });
    return handleRequest(promise);
};

export const setRegistrationStatus = async (status: RegistrationStatus): Promise<ApiResponse> => {
  const statusData: RegistrationStatusData = { status };
  return handleRequest(setDoc(configDocRef, statusData), 'Registration status updated.');
};

// --- Grading System Functions ---

export const getCourseGradingConfig = async (courseName: Course): Promise<ApiResponse<CourseConfig>> => {
    const docRef = doc(db, 'courses', courseName);
    const promise = getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data() as any; // Read as any to handle old structure
             // If new structure is present, return it.
            if (data.gradingConfig && data.gradingConfigOrder) {
                return { ...data, activities: data.activities || {} } as CourseConfig;
            }
            // --- Backward compatibility for old, flat data structure ---
            const config = (data.gradingConfig || data) as GradingConfig;
             // Ensure no subComponents exist from a failed migration or old data
            Object.values(config).forEach(val => {
                delete val.subComponents;
                delete val.subComponentsOrder;
            });
            return {
                gradingConfig: config,
                gradingConfigOrder: Object.keys(config),
                activities: {},
            };
        }
        // Return a default config if none exists
        const defaultConfig: GradingConfig = {
            'psychomotor': { label: 'จิตพิสัย', max: 20 },
            'midterm': { label: 'กลางภาค', max: 40 },
            'final': { label: 'ปลายภาค', max: 40 },
        };
         return {
            gradingConfig: defaultConfig,
            gradingConfigOrder: ['psychomotor', 'midterm', 'final'],
            activities: {}
        };
    });
    return handleRequest(promise);
};

export const setCourseGradingConfig = async (courseName: Course, courseConfig: CourseConfig): Promise<ApiResponse> => {
    const docRef = doc(db, 'courses', courseName);
    return handleRequest(setDoc(docRef, courseConfig), 'Grading config updated.');
};

export const getScoresForCourse = async (courseName: Course): Promise<ApiResponse<Record<string, StudentScores>>> => {
    const q = query(scoresCollection, where("course", "==", courseName));
    const promise = getDocs(q).then(snapshot => {
        const allScores: Record<string, StudentScores> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data() as StudentScores;
            allScores[data.studentId] = data;
        });
        return allScores;
    });
    return handleRequest(promise);
};

export const getScoresForStudent = async (studentId: string, courseName: Course): Promise<ApiResponse<StudentScores | null>> => {
    const docId = `${studentId}_${courseName}`;
    const docRef = doc(db, 'scores', docId);
    const promise = getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
            return docSnap.data() as StudentScores;
        }
        return null;
    });
    return handleRequest(promise);
};

export const setStudentScores = async (scoresToUpdate: StudentScores[]): Promise<ApiResponse> => {
    const batch = writeBatch(db);
    scoresToUpdate.forEach(studentScore => {
        const docId = `${studentScore.studentId}_${studentScore.course}`;
        const docRef = doc(db, 'scores', docId);
        batch.set(docRef, studentScore, { merge: true }); // Use merge to avoid overwriting unrelated data
    });
    return handleRequest(batch.commit(), 'Scores updated successfully.');
};

// --- New Activity Functions (Embedded in Course Doc) ---

export const addActivity = async (courseName: Course, activityData: Omit<Activity, 'id' | 'createdAt'>): Promise<ApiResponse<{ id: string }>> => {
    const courseDocRef = doc(db, 'courses', courseName);
    const newActivityId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newActivity: Activity = {
        ...activityData,
        id: newActivityId,
        createdAt: new Date().toISOString(),
    };

    const promise = updateDoc(courseDocRef, {
        [`activities.${newActivityId}`]: newActivity
    }).then(() => ({ id: newActivityId }));
    
    return handleRequest(promise, 'เพิ่มกิจกรรมสำเร็จ');
};

export const updateActivity = async (courseName: Course, activityData: Activity): Promise<ApiResponse> => {
    const courseDocRef = doc(db, 'courses', courseName);
    const { id } = activityData;

    if (!id) {
        return { success: false, error: 'Activity ID is missing for update.', message: 'ไม่พบ ID ของกิจกรรมที่ต้องการอัปเดต' };
    }

    // Pass the entire activityData object to ensure all fields, including the 'id', are preserved.
    // This fixes the bug where the 'id' field was being removed on update.
    return handleRequest(updateDoc(courseDocRef, {
        [`activities.${id}`]: activityData
    }), 'อัปเดตกิจกรรมสำเร็จ');
};

export const deleteActivity = async (courseName: Course, activityId: string): Promise<ApiResponse> => {
    const courseDocRef = doc(db, 'courses', courseName);
    return handleRequest(updateDoc(courseDocRef, {
        [`activities.${activityId}`]: deleteField()
    }), 'ลบกิจกรรมสำเร็จ');
};