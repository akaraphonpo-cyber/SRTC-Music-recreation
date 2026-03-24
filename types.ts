
import { PORTFOLIO_CATEGORIES } from './constants';

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

export interface CourseData {
  id: string;
  code: string;
  name: string;
  credits: { theory: number; practice: number; credit: number };
  description?: string;
  room?: string;
  isActive: boolean;
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

// New Interface for specific course scheduling
export interface ClassSchedule {
    day: RegistrationDay;
    startTime: string;
    endTime: string;
}

// System Configuration Type
export interface SystemConfig {
  term: string; // e.g., "2"
  year: string; // e.g., "2568"
  teacherName: string; // e.g., "นายอัครพนธ์ ป้องจันทา"
  roomMapping: { [key in Course]?: string }; // e.g., { RECREATION: "622" }
  courseCredits?: { [key in Course]?: { theory: number, practice: number, credit: number } }; // ท-ป-น
  courseCodes?: { [key in Course]?: string }; // รหัสวิชา
  classGroupAliases?: { [key: string]: string }; // key="Dept|Level|Day|Time", value="Custom Name"
  classGroupColors?: { [key: string]: string }; // New: key="Dept|Level...", value="#HEXCOLOR"
  
  // LINE Messaging API Config (Replaces Notify)
  lineChannelAccessToken?: string; // The Bot's Long-lived Access Token
  lineDefaultTargetId?: string; // Default User ID or Group ID to send messages to
  groupLineTargetIds?: { [key: string]: string }; // Specific Target ID: key="Dept|Level", value="U... or C..."
  
  // Teacher Schedule
  teacherSchedule?: TeacherScheduleEntry[];
}

export interface Schedule {
  id: string;
  course: Course;
  classGroup: string;
  day: RegistrationDay;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string;
  teacherName: string;
  maxStudents: number;
  currentStudents: number;
  term: string;
  year: string;
  createdAt?: any;
}

export interface TeacherScheduleEntry {
  id: string;
  course: Course;
  day: RegistrationDay;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string;
  groupAlias?: string; // Optional group
}

// --- GAME CONFIGURATION TYPES ---
export interface GachaPoolItemConfig {
    itemId: string;
    weight: number;
    enabled: boolean;
}

export interface ShopItemConfig {
    itemId: string;
    price: number;
    enabled: boolean;
}

export interface GameItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    color: string;
    type: 'material' | 'consumable' | 'collectible' | 'currency' | 'special';
    baseValue: number;
    xpValue?: number;
}

export interface CustomGameItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    color: string;
    type: 'material' | 'consumable' | 'collectible' | 'currency' | 'special';
    baseValue: number;
}

export interface GameConfig {
    gacha: {
        pool: GachaPoolItemConfig[];
        coinCost: number;
    };
    runner: {
        baseSpeed: number;
        gravity: number;
    };
    shop?: {
        items: ShopItemConfig[];
    };
    customItems?: Record<string, CustomGameItem>;
}

// Base student model, similar to what's stored in Firestore
export interface Student {
  studentId: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  classLevel: ClassLevel;
  department: Department;
  courses: Course[];
  phoneNumber: string;
  registrationDay: RegistrationDay;
  registrationStartTime: string;
  registrationEndTime: string;
  // New field: Map course name to specific schedule ID from admin
  selectedScheduleIds?: Record<string, string>;
  // New field: Map course name to specific schedule details (legacy/custom)
  courseSchedules?: Record<string, ClassSchedule>; 
  photoUrl?: string; // New field for profile picture
  inventory?: Record<string, number>; // Item ID -> Count
  coins?: number; // New Currency
  lastClaimedAttendanceCount?: number; // To track drops
  unlockedThemes?: string[]; // List of theme IDs unlocked
  activeTheme?: string; // Currently selected theme ID
  highScore?: number; // Game High Score
  bonusXP?: number; // XP from potions or special events
  gachaPullCount?: number; // Total gacha pulls
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

// --- Announcement System Types ---
export enum AnnouncementImportance {
    NORMAL = 'ทั่วไป',
    IMPORTANT = 'สำคัญ',
    URGENT = 'ด่วน!',
}

export interface Announcement {
  title: string;
  content: string; // Can be plain text or basic HTML
  importance: AnnouncementImportance;
  isPinned: boolean;
  targetCourses: Course[] | 'ALL';
  targetDepartments: Department[] | 'ALL';
  createdAt?: any; // Firestore ServerTimestamp on write
  updatedAt?: any; // Firestore ServerTimestamp on write
}

export interface AnnouncementWithId extends Announcement {
  id:string;
}

// --- Weekly Activity Log Types ---
export interface WeeklyActivityLog {
  weekStartDate: string; // ISO String for Monday of the week
  course: Course;
  department: Department;
  classLevel: ClassLevel;
  activityDescription: string;
  activityDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  createdAt?: any;
  updatedAt?: any;
}

export interface WeeklyActivityLogWithId extends WeeklyActivityLog {
  id: string;
}

// --- Tournament Types ---
export interface Team {
  id: number;
  name: string;
  members: StudentWithId[];
}

export interface Match {
  round: number;
  team1: Team;
  team2: Team | { id: -1; name: 'BYE' };
  team1Score?: number;
  team2Score?: number;
  winnerId?: number | null; // null for a tie
}

export enum TournamentStatus {
    PENDING = 'ยังไม่เริ่ม',
    IN_PROGRESS = 'กำลังดำเนินการ',
    COMPLETED = 'เสร็จสิ้น',
}

export interface Tournament {
    name: string;
    course: Course;
    departments: string[];
    classLevel: ClassLevel;
    registrationDay: RegistrationDay;
    timeSlot: string;
    status: TournamentStatus;
    teams: Team[];
    schedule: Match[];
    leftoverStudents: StudentWithId[];
    gradingComponentKey?: string; // Link to the grading system
    pointsForWin?: number;
    pointsForTie?: number;
    pointsForLoss?: number;
    scoresPosted?: boolean; // To prevent posting scores multiple times
    createdAt?: any;
}

export interface TournamentWithId extends Tournament {
    id: string;
}

// --- Recreation Leader Types ---
export interface RecreationRubric {
    teamwork: number; // การทำงานเป็นทีม (20)
    roleDivision: number; // การแบ่งหน้าที่ (20)
    fun: number; // ความสนุก (20)
    communication: number; // การสื่อสาร (20)
    preparation: number; // การจัดเตรียมอุปกรณ์ (20)
    total: number; // Sum 100
    feedback?: string;
}

export interface RecreationGroup {
    id?: string;
    activityName: string; // ชื่อกิจกรรม
    members: StudentWithId[];
    scores?: RecreationRubric;
    isPosted?: boolean;
    createdAt?: any;
}

// --- Creative Content Types ---
export interface CreativeContentRubric {
    storytelling: number; // การเล่าเรื่อง/บท (20)
    creativity: number; // ความคิดสร้างสรรค์ (20)
    technique: number; // เทคนิคการถ่ายทำ/ตัดต่อ (20)
    relevance: number; // ความสอดคล้องกับหัวข้อ/วิทยาลัย (20)
    engagement: number; // ความน่าสนใจ/สไตล์ (20)
    total: number; // Sum 100
    feedback?: string;
}

export interface CreativeContentGroup {
    id?: string;
    projectTitle: string; // ชื่อผลงาน/โปรเจกต์
    videoUrl?: string; // ลิงก์วิดีโอ (ถ้ามี)
    members: StudentWithId[];
    scores?: CreativeContentRubric;
    isPosted?: boolean;
    createdAt?: any;
}

// --- Singing Exam Types ---
export interface SingingRubric {
    soundQuality: number; // คุณภาพเสียง (30) - ไพเราะ, กังวาน, ธรรมชาติ
    lyrics: number; // เนื้อร้อง (20) - ถูกต้อง, ชัดเจน, อักขระ
    melody: number; // ทำนอง (20) - แม่นคีย์, ลื่นไหล
    rhythm: number; // จังหวะ (20) - แม่นยำ, เข้า/จบเพลง
    performance: number; // บุคลิกภาพ (10) - ลีลา, ความมั่นใจ
    total: number; // Sum 100
    feedback?: string;
}

export interface SingingRecord {
    id?: string; // Document ID (usually studentId)
    studentId: string;
    songName?: string; // ชื่อเพลง
    scores?: SingingRubric;
    isPosted?: boolean; // Sent to gradebook
    updatedAt?: any;
}

// --- Music Production Types (NEW) ---
export interface MusicProductionRubric {
    // Suno AI (50)
    sunoPrompt: number; // 20
    sunoCreativity: number; // 15
    sunoCompleteness: number; // 15

    // BandLab (50)
    bandlabEditing: number; // 20
    bandlabMixing: number; // 15
    bandlabArtistry: number; // 15
    
    total: number; // Sum 100
    feedback?: string;
}

export interface MusicProductionRecord {
    id?: string; // Document ID (studentId)
    studentId: string;
    projectTitle?: string;
    sunoLink?: string;
    bandlabLink?: string;
    scores?: MusicProductionRubric;
    isPosted?: boolean;
    updatedAt?: any;
}


// --- Statistics Types ---
export interface OverviewStatistics {
  totalStudents: number;
  totalCourses: number;
  departmentCounts: { [key: string]: number };
  courseCounts: { [key: string]: number };
  totalStudentsAbove2?: number; // New field
  lastUpdated?: any;
}

// --- Attendance System Types ---
export enum AttendanceStatus {
    PRESENT = 'มาเรียน',
    LATE = 'มาสาย',
    ABSENT = 'ขาดเรียน',
    LEAVE = 'ลา',
}

export interface AttendanceRecord {
    id: string; // Composite key: `${studentId}_${date}_${course}`
    studentId: string;
    course: Course;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
    updatedAt?: any;
}

// --- Portfolio Types ---
export type PortfolioCategory = typeof PORTFOLIO_CATEGORIES[number];

export interface PortfolioImage {
  imageUrl: string;
}

export interface PortfolioAlbum {
  title: string;
  description: string;
  category: PortfolioCategory;
  images: PortfolioImage[];
  coverImageUrl: string;
  likes: number;
  loves: number;
  viewCount?: number; // New field for view tracking
  createdAt?: any;
}

export interface PortfolioAlbumWithId extends PortfolioAlbum {
  id: string;
}

// --- Video Types ---
export interface VideoContent {
    id: string;
    title: string;
    description: string;
    youtubeUrl: string;
    videoId: string; // Extracted ID
    viewCount?: number; // New field for view tracking
    createdAt?: any;
}

// --- Gamification Types ---
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string; // Emoji or URL
    color: string;
    isUnlocked?: boolean; // Calculated at runtime
}

export interface UserGamificationStats {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    badges: Badge[];
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    target: number;
    progress: number;
    isCompleted: boolean;
    rewardXP: number;
    icon: string;
}

export interface CardTheme {
    id: string;
    name: string;
    description: string;
    styleClass: string; // Tailwind classes or CSS vars
    requiredItemId?: string; // Item needed to unlock
    requiredLevel?: number;
}

export interface MarketplaceListing {
    id: string;
    sellerId: string;
    sellerName: string;
    itemId: string;
    price: number;
    createdAt: any;
}

// --- GACHA TYPES ---
export interface GachaLog {
    id: string;
    studentId: string;
    studentName: string;
    itemId: string;
    itemName: string;
    rarity: string;
    timestamp: any;
}

// --- WEREWOLF GAME TYPES ---

export enum WerewolfRole {
  MODERATOR = 'MODERATOR', // Host/Game Master
  VILLAGER = 'VILLAGER', 
  SEER = 'SEER', 
  BODYGUARD = 'BODYGUARD', 
  HUNTER = 'HUNTER', 
  PRINCE = 'PRINCE', 
  CUPID = 'CUPID', 
  WITCH = 'WITCH', 
  PRIEST = 'PRIEST', 
  MAYOR = 'MAYOR', 
  APPRENTICE_SEER = 'APPRENTICE_SEER', 
  MEDIUM = 'MEDIUM', 
  DETECTIVE = 'DETECTIVE', 
  OLD_MAN = 'OLD_MAN', 
  
  WEREWOLF = 'WEREWOLF', 
  WOLF_CUB = 'WOLF_CUB', 
  SORCERER = 'SORCERER', 
  MINION = 'MINION', 
  
  CURSED = 'CURSED', 
  LYCAN = 'LYCAN', 
  FOOL = 'FOOL', 
  SERIAL_KILLER = 'SERIAL_KILLER', 
}

export interface WerewolfRoleDef {
    id: WerewolfRole;
    name: string;
    description: string;
    team: 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL' | 'MODERATOR';
    icon: string;
    wakeOrder: number; // 0 = Passive/Day only
}

export interface WerewolfPlayer {
  id: string; // studentId
  name: string;
  role: WerewolfRole;
  isAlive: boolean;
  avatar: string; // Emoji
  
  isProtected?: boolean;
  isSilenced?: boolean;
  isLinked?: boolean; 
  linkedWith?: string; 
  potionHealUsed?: boolean;
  potionKillUsed?: boolean;
  priestUsedPower?: boolean; 
  markedByWolf?: boolean;
  
  isMayorRevealed?: boolean; 
  isCursedTurned?: boolean; 
  lastProtectedId?: string; 
  
  originalRole?: WerewolfRole; 
}

export interface WerewolfRoom {
  roomId: string;
  hostId: string; // Student ID of creator
  status: 'LOBBY' | 'NIGHT' | 'DAY' | 'ENDED';
  phase: string; // 'ACTION', 'VOTE', 'RESULT'
  activeRoleTurn?: WerewolfRole | null; // Which role is acting right now (Night)
  dayCount: number;
  players: WerewolfPlayer[];
  logs: string[]; // Game history log
  
  // Configuration
  settings: {
      roleCounts: Record<string, number>;
      timerSeconds: number;
  };
  
  // Timer State
  timerEnd?: number; // Timestamp when timer ends
  nextNightWolfKillCount?: number; 
  
  // Dynamic Game State
  votes: Record<string, string>; // voterId -> targetId
  nightActions: {
    wolvesTarget?: string[]; 
    seerTarget?: string;
    bodyguardTargets?: string[]; 
    witchHeal?: boolean;
    witchKill?: string;
    cupidLinks?: string[]; 
    hunterTarget?: string;
    serialKillerTarget?: string; 
    priestTarget?: string; 
    investigatedResult?: string; 
  };
  lastDeath?: string[]; 
  winner?: 'VILLAGER' | 'WEREWOLF' | 'FOOL' | 'SERIAL_KILLER' | null;
  createdAt: any;
}

// --- UNO GAME TYPES ---

export type UnoColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'BLACK';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'SKIP' | 'REVERSE' | 'DRAW_2' | 'WILD' | 'WILD_DRAW_4';

export interface UnoCard {
    id: string; // Unique ID for keying
    color: UnoColor;
    value: UnoValue;
}

export interface UnoPlayer {
    id: string; // studentId
    name: string;
    handCount: number; // For others to see
    hand?: UnoCard[]; // Only for self or server
    isUno: boolean; // Has shouted Uno
    avatar: string;
}

export interface UnoRoom {
    roomId: string;
    hostId: string;
    status: 'LOBBY' | 'PLAYING' | 'ENDED';
    players: UnoPlayer[];
    
    // Betting
    betAmount: number;
    pot: number;
    
    // Game State
    currentTurnIndex: number;
    direction: 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise
    topCard: UnoCard | null;
    drawPileCount: number; // Visual only
    lastAction?: string; // "Player A played Red 5"
    winnerId?: string | null;
    
    // Internal use (not always needed on client unless hosting)
    fullDeck?: UnoCard[]; 
    
    createdAt: any;
}
