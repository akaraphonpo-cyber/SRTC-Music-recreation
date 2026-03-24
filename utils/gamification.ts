
import { AttendanceRecord, AttendanceStatus, Badge, CardTheme, Quest, StudentWithId, TournamentWithId, UserGamificationStats, GachaPoolItemConfig, GameConfig, GameItem, CustomGameItem } from "../types";

// Re-export GameItem to match usage in components
export type { GameItem };

// --- Configuration ---
const XP_CONFIG = {
    REGISTRATION: 100,
    ATTENDANCE_PRESENT: 20,
    ATTENDANCE_LATE: 10,
    TOURNAMENT_PARTICIPATION: 50,
    SCORE_POINTS_MULTIPLIER: 5, // e.g. 80 score = 400 XP
    QUEST_COMPLETE: 50,
};

const LEVEL_BASE_XP = 200; // XP needed for level 1
const XP_MULTIPLIER = 1.2; // XP needed increases by 20% each level

// --- Items & Crafting ---

export const GAME_ITEMS: Record<string, GameItem> = {
    // Currency
    'gacha_ticket': { id: 'gacha_ticket', name: 'ตั๋วสุ่มกาชา', description: 'ใช้หมุนตู้ SRTC Lucky Gacha', icon: '🎟️', rarity: 'rare', color: 'text-pink-500', type: 'currency', baseValue: 500 },

    // Basic Materials
    'note': { id: 'note', name: 'โน้ตเพลง', description: 'ตัวโน้ตพื้นฐานสำหรับนักดนตรี', icon: '🎵', rarity: 'common', color: 'text-blue-500', type: 'material', baseValue: 50 },
    'pick': { id: 'pick', name: 'ปิ๊กกีตาร์', description: 'อุปกรณ์สำคัญในการดีดสาย', icon: '🎸', rarity: 'common', color: 'text-orange-500', type: 'material', baseValue: 50 },
    'drink': { id: 'drink', name: 'น้ำอัดลม', description: 'เพิ่มความสดชื่นหลังซ้อม', icon: '🥤', rarity: 'common', color: 'text-red-500', type: 'material', baseValue: 30 },
    'drumstick': { id: 'drumstick', name: 'ไม้กลอง', description: 'ไม้คู่ใจมือกลอง', icon: '🥁', rarity: 'common', color: 'text-yellow-600', type: 'material', baseValue: 60 },
    
    // Gacha "Salt" Items (Common)
    'tissue': { id: 'tissue', name: 'ทิชชู่ใช้แล้ว', description: 'ซับเหงื่อได้ดี... มั้ง', icon: '🧻', rarity: 'common', color: 'text-gray-400', type: 'collectible', baseValue: 10 },
    'water_bottle': { id: 'water_bottle', name: 'ขวดเปล่า', description: 'รีไซเคิลได้นะ', icon: '🍾', rarity: 'common', color: 'text-blue-300', type: 'collectible', baseValue: 10 },
    'pencil_2b': { id: 'pencil_2b', name: 'ดินสอ 2B', description: 'อุปกรณ์สอบมาตรฐาน แลกรับของจริงได้', icon: '✏️', rarity: 'common', color: 'text-gray-600', type: 'consumable', baseValue: 20 },

    // Consumables (Rare)
    'xp_potion_s': { id: 'xp_potion_s', name: 'XP Potion (S)', description: 'เพิ่ม 100 XP ทันที', icon: '🧪', rarity: 'uncommon', color: 'text-green-500', type: 'consumable', xpValue: 100, baseValue: 200 },
    'xp_potion_m': { id: 'xp_potion_m', name: 'XP Potion (M)', description: 'เพิ่ม 500 XP ทันที', icon: '⚗️', rarity: 'rare', color: 'text-blue-600', type: 'consumable', xpValue: 500, baseValue: 800 },

    // Crafted/Special Items
    'masterpiece': { id: 'masterpiece', name: 'บทเพลงตำนาน', description: 'รวมโน้ตเพลงระดับเทพเข้าด้วยกัน', icon: '🎼', rarity: 'rare', color: 'text-purple-500', type: 'material', baseValue: 300 },
    'gold_guitar': { id: 'gold_guitar', name: 'กีตาร์ทองคำ', description: 'กีตาร์ที่ทำจากทองคำแท้', icon: '🏆', rarity: 'epic', color: 'text-yellow-400', type: 'collectible', baseValue: 2000 },
    'energy_set': { id: 'energy_set', name: 'ชุดปาร์ตี้', description: 'เสบียงพร้อมลุยทุกงาน', icon: '🍱', rarity: 'rare', color: 'text-green-500', type: 'material', baseValue: 150 },
    'concert_ticket': { id: 'concert_ticket', name: 'บัตรคอนเสิร์ต VIP', description: 'บัตรเข้าชมระดับ VIP สุดหรู', icon: '🎫', rarity: 'legendary', color: 'text-pink-500', type: 'collectible', baseValue: 5000 },
    
    // Legendary Special (Existing)
    'scholarship_coupon': { id: 'scholarship_coupon', name: 'คูปองลบสาย', description: 'ใช้ลบสถิติมาสายได้ 1 ครั้ง (ติดต่อ Admin)', icon: '📜', rarity: 'legendary', color: 'text-yellow-600', type: 'collectible', baseValue: 10000 },

    // --- ULTRA RARE CARDS ---
    'platinum_pass': {
        id: 'platinum_pass',
        name: 'บัตร Platinum Elite',
        description: 'บัตรโลหะเหลวสุดล้ำค่า สำหรับชนชั้นสูงแห่ง SRTC',
        icon: '💿',
        rarity: 'legendary',
        color: 'text-slate-300',
        type: 'special',
        baseValue: 8000
    },
    'diamond_pass': {
        id: 'diamond_pass',
        name: 'บัตร Diamond Prism',
        description: 'ที่สุดแห่งความเลอค่า ประกายแสงแห่งตำนาน หายากที่สุดในปฐพี',
        icon: '💎',
        rarity: 'legendary',
        color: 'text-cyan-400',
        type: 'special',
        baseValue: 15000
    },

    // --- SYSTEM SHOP PREMIUM ITEMS ---
    'late_pass': { 
        id: 'late_pass', 
        name: 'บัตรลบสาย (1 ครั้ง)', 
        description: 'ใช้ล้างสถิติการมาสาย 1 ครั้ง ออกจากระบบ', 
        icon: '⏰', 
        rarity: 'legendary', 
        color: 'text-red-500', 
        type: 'special', 
        baseValue: 2500 
    },
    'late_grace': { 
        id: 'late_grace', 
        name: 'บัตรยืดเวลา (+15 นาที)', 
        description: 'ขยายเวลาเข้าเรียนสายได้อีก 15 นาที (ใช้ได้ 1 ครั้ง)', 
        icon: '⏳', 
        rarity: 'epic', 
        color: 'text-purple-500', 
        type: 'special', 
        baseValue: 1500 
    },
    'scholarship_card': { 
        id: 'scholarship_card', 
        name: 'บัตรทุนการศึกษา', 
        description: 'แลกรับอุปกรณ์การเรียนมูลค่า 100 บาท (ติดต่อห้องพักครู)', 
        icon: '🎓', 
        rarity: 'legendary', 
        color: 'text-yellow-500', 
        type: 'special', 
        baseValue: 5000 
    },
};

// IDs of items that represent real-life benefits and must be redeemed by an Admin/Teacher
export const REAL_LIFE_REDEEMABLES = [
    'late_pass',
    'late_grace',
    'scholarship_card',
    'scholarship_coupon',
    'pencil_2b',
    // Add any custom item IDs here if needed in future
];

// Define items available in the system shop (Default Fallback)
export const SYSTEM_SHOP_LIST = [
    { itemId: 'late_pass', price: 2500 },
    { itemId: 'late_grace', price: 1500 },
    { itemId: 'scholarship_card', price: 5000 },
    { itemId: 'pencil_2b', price: 100 },
];

// Helper to get all items including custom ones
export const getAllGameItems = (customItems?: Record<string, CustomGameItem>): Record<string, GameItem | CustomGameItem> => {
    return { ...GAME_ITEMS, ...(customItems || {}) };
};

export interface CraftingRecipe {
    id: string;
    resultItemId: string;
    ingredients: { itemId: string; count: number }[];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
    { 
        id: 'craft_masterpiece', 
        resultItemId: 'masterpiece', 
        ingredients: [{ itemId: 'note', count: 3 }] 
    },
    { 
        id: 'craft_gold_guitar', 
        resultItemId: 'gold_guitar', 
        ingredients: [{ itemId: 'pick', count: 3 }] 
    },
    { 
        id: 'craft_energy_set', 
        resultItemId: 'energy_set', 
        ingredients: [{ itemId: 'drink', count: 3 }] 
    },
    { 
        id: 'craft_ticket', 
        resultItemId: 'concert_ticket', 
        ingredients: [
            { itemId: 'masterpiece', count: 1 }, 
            { itemId: 'gold_guitar', count: 1 }
        ] 
    },
];

// Drop rates for attendance
const ATTENDANCE_DROP_POOL = ['note', 'pick', 'drink', 'drumstick', 'gacha_ticket', 'pencil_2b'];

export const getRandomDrop = (): string => {
    // 5% chance to get a Gacha Ticket from attendance
    if (Math.random() < 0.05) return 'gacha_ticket';
    
    const randomIndex = Math.floor(Math.random() * (ATTENDANCE_DROP_POOL.length - 1)); // Exclude ticket from normal pool
    return ATTENDANCE_DROP_POOL[randomIndex];
};

// --- Gacha System ---
export interface GachaPoolItem {
    itemId: string;
    weight: number; // Represents Percentage chance (Total should be 100)
}

// Fallback Default Pool (Adjusted to sum to ~100 for percentage clarity)
export const GACHA_POOL: GachaPoolItem[] = [
    // Common (~60%)
    { itemId: 'tissue', weight: 20 },
    { itemId: 'water_bottle', weight: 15 },
    { itemId: 'pencil_2b', weight: 15 },
    { itemId: 'pick', weight: 5 },
    { itemId: 'drink', weight: 5 },
    
    // Uncommon (~25%)
    { itemId: 'note', weight: 10 },
    { itemId: 'drumstick', weight: 10 },
    { itemId: 'xp_potion_s', weight: 5 },

    // Rare (~10%)
    { itemId: 'energy_set', weight: 4 },
    { itemId: 'masterpiece', weight: 3 },
    { itemId: 'xp_potion_m', weight: 3 },

    // Epic (~4%)
    { itemId: 'gold_guitar', weight: 2 },
    { itemId: 'late_grace', weight: 2 },

    // Legendary (~1%)
    { itemId: 'concert_ticket', weight: 0.3 },
    { itemId: 'scholarship_coupon', weight: 0.1 },
    { itemId: 'late_pass', weight: 0.1 },
    { itemId: 'scholarship_card', weight: 0.1 },
    
    // Ultra Rare (<0.5%)
    { itemId: 'platinum_pass', weight: 0.08 },
    { itemId: 'diamond_pass', weight: 0.02 },
];

export const performGachaPull = (customPool?: GachaPoolItemConfig[]): string => {
    let poolToUse: { itemId: string, weight: number }[] = [];

    if (customPool && customPool.length > 0) {
        poolToUse = customPool.filter(i => i.enabled).map(i => ({ itemId: i.itemId, weight: i.weight }));
    } else {
        poolToUse = GACHA_POOL;
    }

    const totalWeight = poolToUse.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of poolToUse) {
        if (random < item.weight) {
            return item.itemId;
        }
        random -= item.weight;
    }
    return 'tissue'; // Fallback
};

// --- Themes ---
export const CARD_THEMES: Record<string, CardTheme> = {
    'default': {
        id: 'default',
        name: 'Standard Blue',
        description: 'ธีมมาตรฐานสำหรับสมาชิกทุกคน',
        styleClass: 'bg-gradient-to-br from-slate-800 to-slate-900',
    },
    'gold_rockstar': {
        id: 'gold_rockstar',
        name: 'Gold Rockstar',
        description: 'สำหรับผู้ครอบครองกีตาร์ทองคำ',
        styleClass: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 border-2 border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.6)]',
        requiredItemId: 'gold_guitar'
    },
    'neon_cyber': {
        id: 'neon_cyber',
        name: 'Neon Cyber',
        description: 'ธีมสุดล้ำสำหรับสายปาร์ตี้',
        styleClass: 'bg-gray-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-black border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]',
        requiredItemId: 'energy_set'
    },
    'maestro': {
        id: 'maestro',
        name: 'The Maestro',
        description: 'ความหรูหราของนักประพันธ์ระดับตำนาน',
        styleClass: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 border border-white/20',
        requiredItemId: 'masterpiece'
    },
    'legendary_vip': {
        id: 'legendary_vip',
        name: 'Legendary VIP',
        description: 'ที่สุดแห่งความ Exclusive สำหรับผู้มีบัตรคอนเสิร์ต',
        styleClass: 'bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500 animate-gradient-xy',
        requiredItemId: 'concert_ticket'
    },
    'platinum_elite': {
        id: 'platinum_elite',
        name: 'Platinum Elite',
        description: 'โลหะเหลวแห่งโลกอนาคต เรียบหรูและทรงพลัง',
        styleClass: 'bg-[#0D1127] border-[3px] border-[#5978F3] shadow-[0_0_30px_rgba(89,120,243,0.4)]',
        requiredItemId: 'platinum_pass'
    },
    'diamond_prism': {
        id: 'diamond_prism',
        name: 'Diamond Prism',
        description: 'ประกายแสงแห่งอัญมณีล้ำค่า หายากที่สุดในปฐพี',
        styleClass: 'bg-gradient-to-tr from-cyan-100 via-white to-purple-100 border-2 border-white/80 shadow-[0_0_40px_rgba(255,255,255,0.9)]',
        requiredItemId: 'diamond_pass'
    }
};

// --- Badges ---
export const PREDEFINED_BADGES: Badge[] = [
    {
        id: 'welcome',
        name: 'ผู้เริ่มต้น (Novice)',
        description: 'ลงทะเบียนเข้าสู่ระบบสำเร็จ',
        icon: '🌱',
        color: 'from-emerald-400 to-green-600'
    },
    {
        id: 'attendance_perfect',
        name: 'ตรงต่อเวลา (Punctual)',
        description: 'เข้าเรียนโดยไม่สายและไม่ขาดเลย (อย่างน้อย 3 ครั้ง)',
        icon: '⏰',
        color: 'from-blue-400 to-indigo-600'
    },
    {
        id: 'attendance_consistent',
        name: 'สม่ำเสมอ (Consistent)',
        description: 'เข้าเรียนครบ 5 ครั้งขึ้นไป',
        icon: '📅',
        color: 'from-cyan-400 to-blue-500'
    },
    {
        id: 'score_high',
        name: 'หัวกะทิ (Top Tier)',
        description: 'มีคะแนนรวมวิชาใดวิชาหนึ่งเกิน 80 คะแนน',
        icon: '💯',
        color: 'from-yellow-300 to-amber-500'
    },
    {
        id: 'competitor',
        name: 'นักแข่ง (Competitor)',
        description: 'เข้าร่วมการแข่งขัน Tournament',
        icon: '⚔️',
        color: 'from-red-400 to-rose-600'
    },
    {
        id: 'social',
        name: 'คนดัง (Social Star)',
        description: 'มีรูปโปรไฟล์',
        icon: '📸',
        color: 'from-purple-400 to-fuchsia-600'
    },
    {
        id: 'collector',
        name: 'นักสะสม (Collector)',
        description: 'คราฟไอเท็มระดับ Legendary สำเร็จ',
        icon: '💎',
        color: 'from-pink-400 to-rose-500'
    },
    {
        id: 'fashionista',
        name: 'แฟชั่นนิสต้า (Fashionista)',
        description: 'ปลดล็อกธีมบัตรนักศึกษาใหม่',
        icon: '🎨',
        color: 'from-orange-400 to-pink-600'
    },
    {
        id: 'gambler',
        name: 'นักเสี่ยงดวง (Gambler)',
        description: 'เปิดกาชาปองครบ 10 ครั้ง',
        icon: '🎲',
        color: 'from-purple-500 to-indigo-500'
    }
];

// --- Helpers ---

export const calculateXP = (
    attendance: AttendanceRecord[],
    tournaments: TournamentWithId[],
    totalScores: number[],
    completedQuestsCount: number = 0,
    bonusXP: number = 0
): number => {
    let xp = XP_CONFIG.REGISTRATION;

    // Attendance XP
    attendance.forEach(record => {
        if (record.status === AttendanceStatus.PRESENT) xp += XP_CONFIG.ATTENDANCE_PRESENT;
        if (record.status === AttendanceStatus.LATE) xp += XP_CONFIG.ATTENDANCE_LATE;
    });

    // Tournament XP
    xp += tournaments.length * XP_CONFIG.TOURNAMENT_PARTICIPATION;

    // Score XP
    totalScores.forEach(score => {
        xp += Math.floor(score * XP_CONFIG.SCORE_POINTS_MULTIPLIER);
    });
    
    // Quest XP
    xp += completedQuestsCount * XP_CONFIG.QUEST_COMPLETE;
    
    // Bonus XP (From potions etc stored in student profile)
    xp += bonusXP;

    return xp;
};

export const calculateLevel = (xp: number): { level: number; currentLevelXP: number; nextLevelXP: number } => {
    let level = 1;
    let requiredXP = LEVEL_BASE_XP;
    let remainingXP = xp;

    while (remainingXP >= requiredXP) {
        remainingXP -= requiredXP;
        level++;
        requiredXP = Math.floor(requiredXP * XP_MULTIPLIER);
    }

    return {
        level,
        currentLevelXP: Math.floor(remainingXP),
        nextLevelXP: requiredXP
    };
};

export const getBadges = (
    student: StudentWithId,
    attendance: AttendanceRecord[],
    tournaments: TournamentWithId[],
    scoresList: number[]
): Badge[] => {
    const stats = student as any; // Quick access for new fields
    return PREDEFINED_BADGES.map(badge => {
        let isUnlocked = false;

        switch (badge.id) {
            case 'welcome':
                isUnlocked = true;
                break;
            case 'attendance_perfect':
                const hasEnoughData = attendance.length >= 3;
                const noLateOrAbsent = !attendance.some(r => r.status === AttendanceStatus.LATE || r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE);
                isUnlocked = hasEnoughData && noLateOrAbsent;
                break;
            case 'attendance_consistent':
                const presentCount = attendance.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
                isUnlocked = presentCount >= 5;
                break;
            case 'score_high':
                isUnlocked = scoresList.some(score => score >= 80);
                break;
            case 'competitor':
                isUnlocked = tournaments.length > 0;
                break;
            case 'social':
                isUnlocked = !!student.photoUrl;
                break;
            case 'collector':
                const inventory = student.inventory || {};
                isUnlocked = !!inventory['concert_ticket'];
                break;
            case 'fashionista':
                isUnlocked = student.activeTheme && student.activeTheme !== 'default' ? true : false;
                break;
            case 'gambler':
                isUnlocked = (stats.gachaPullCount || 0) >= 10;
                break;
            default:
                isUnlocked = false;
        }

        return { ...badge, isUnlocked };
    });
};

export const getDailyQuests = (student: StudentWithId, attendance: AttendanceRecord[]): Quest[] => {
    const inventory = student.inventory || {};
    const notesCount = inventory['note'] || 0;
    const hasCrafted = Object.keys(inventory).some(k => !['note', 'pick', 'drink', 'drumstick', 'gacha_ticket', 'tissue', 'water_bottle', 'late_pass', 'late_grace', 'scholarship_card', 'pencil_2b', 'platinum_pass', 'diamond_pass'].includes(k));
    const todayAttendance = attendance.some(r => {
        const today = new Date().toISOString().split('T')[0];
        return r.date === today && (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE);
    });

    return [
        {
            id: 'q_attendance',
            title: 'เช็คชื่อวันนี้',
            description: 'สแกน QR Code เข้าเรียนให้ทันเวลา เพื่อรับแต้มและไอเท็ม',
            target: 1,
            progress: todayAttendance ? 1 : 0,
            isCompleted: todayAttendance,
            rewardXP: 50,
            icon: '🏫'
        },
        {
            id: 'q_collector',
            title: 'นักสะสมโน้ต',
            description: 'สะสมไอเท็ม "โน้ตเพลง" จากการเข้าเรียนให้ครบ 5 ชิ้น',
            target: 5,
            progress: Math.min(notesCount, 5),
            isCompleted: notesCount >= 5,
            rewardXP: 100,
            icon: '🎵'
        },
        {
            id: 'q_crafter',
            title: 'ช่างฝีมือฝึกหัด',
            description: 'ไปที่หน้า "ความสำเร็จ" และผสมไอเท็มระดับ Rare ขึ้นไป 1 ชิ้น',
            target: 1,
            progress: hasCrafted ? 1 : 0,
            isCompleted: hasCrafted,
            rewardXP: 150,
            icon: '🔨'
        }
    ];
};

export const calculateGamificationStats = (
    student: StudentWithId,
    attendance: AttendanceRecord[],
    tournaments: TournamentWithId[],
    courseDataMap: Record<string, { scores: any, config: any }>
): UserGamificationStats => {
    
    // Extract scores list
    const totalScores: number[] = [];
    
    Object.values(courseDataMap).forEach(data => {
        let total = 0;
        if (data.config?.gradingConfigOrder && data.scores?.scores) {
             const scores = data.scores.scores as Record<string, number>;
             total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
        }
        totalScores.push(total);
    });

    // Calculate quests for XP bonus
    const quests = getDailyQuests(student, attendance);
    const completedQuests = quests.filter(q => q.isCompleted).length;
    const bonusXP = (student as any).bonusXP || 0;

    const xp = calculateXP(attendance, tournaments, totalScores, completedQuests, bonusXP);
    const levelInfo = calculateLevel(xp);
    const badges = getBadges(student, attendance, tournaments, totalScores);

    return {
        level: levelInfo.level,
        currentXP: levelInfo.currentLevelXP,
        nextLevelXP: levelInfo.nextLevelXP,
        badges
    };
};
