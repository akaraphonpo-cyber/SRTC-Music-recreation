export enum Prefix {
  MR = 'นาย',
  MS = 'นางสาว',
}

export enum ClassLevel {
  PVS1 = 'ปวส.1',
  PVS2 = 'ปวส.2',
}

export enum Department {
  AUTOMOTIVE = 'ช่างยนต์',
  ELECTRIC_VEHICLE = 'ยานยนต์ไฟฟ้า',
  FACTORY_MECHANICS = 'ช่างกลโรงงาน',
  WELDING = 'ช่างเชื่อมโลหะ',
  ELECTRICAL_POWER = 'ช่างไฟฟ้า',
  ELECTRONICS = 'ช่างอิเล็กทรอนิกส์',
  MECHATRONICS = 'เมคคาทรอนิกส์',
  CONSTRUCTION = 'ช่างก่อสร้าง',
  ARCHITECTURE = 'เทคนิคสถาปัตยกรรม',
  RUBBER_POLYMER = 'เทคโนโลยียางและพอลิเมอร์',
  IT = 'เทคโนโลยีสารสนเทศ',
  LOGISTICS = 'การจัดการโลจิสติกส์',
  RAIL_TRANSPORT = 'ระบบขนส่งทางราง',
}

export enum Course {
  RECREATION = 'นันทนาการเพื่อพัฒนาคุณภาพชีวิต',
  QUALITY_MANAGEMENT = 'องค์การและการบริหารงานคุณภาพ',
  DANCE_AEROBICS = 'ลีลาศเพื่อพัฒนาสุขภาพและบุคลิกภาพ',
  LEADERSHIP = 'ภาวะผู้นำและทักษะการทำงานเป็นทีม',
}

export enum RegistrationDay {
    MONDAY = 'จันทร์',
    TUESDAY = 'อังคาร',
    WEDNESDAY = 'พุธ',
    THURSDAY = 'พฤหัสบดี',
    FRIDAY = 'ศุกร์',
}

// Base student model, similar to what's stored in Firestore
export interface Student {
  studentId: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  classLevel: ClassLevel;
  department: Department;
  course: Course;
  phoneNumber: string;
  registrationDay: RegistrationDay;
  registrationStartTime: string;
  registrationEndTime: string;
  timestamp?: any; // Can be Firestore ServerTimestamp on write, or a string on read
}

// Student model with Firestore document ID
export interface StudentWithId extends Student {
  id: string;
}

// A generic API response structure to keep components' logic similar
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export type RegistrationStatus = 'OPEN' | 'CLOSED';

// The shape of the registration status data in Firestore
export interface RegistrationStatusData {
  status: RegistrationStatus;
}

export type RegistrationStatusResponse = ApiResponse<RegistrationStatusData>;

// --- Grading System Types ---

// Represents a single component of a grade (e.g., Midterm, or a specific Homework)
export interface GradingComponent {
    label: string;
    max: number;
    subComponents?: GradingConfig; // For nested sub-items
    subComponentsOrder?: string[]; // To maintain order of sub-items
}

// Represents the entire grading structure for a course
export interface GradingConfig {
    [key: string]: GradingComponent;
}

// Data shape for course config in Firestore
export interface CourseConfig {
    gradingConfig: GradingConfig;
    gradingConfigOrder: string[]; // Order for top-level components
    activities?: { [id: string]: Activity };
}

// Represents the scores a student has for a particular course
export interface StudentScores {
    studentId: string;
    course: Course;
    scores: {
        [key: string]: number; // e.g., { 'midterm': 25, 'homework.hw1': 10, 'homework.hw2': 8 }
    };
}

// --- Activity System Types ---
export enum ActivityStatus {
    NOT_STARTED = 'ยังไม่เริ่ม',
    IN_PROGRESS = 'กำลังดำเนินการ',
    COMPLETED = 'เสร็จสิ้น',
}

export interface Activity {
  id: string; // Firestore map key, generated client-side
  gradingComponentKey: string; // e.g., 'midterm' or 'final.project'
  title: string;
  description: string;
  dueDate?: string; // ISO string date
  status: ActivityStatus;
  createdAt: string; // ISO string, not server timestamp
}