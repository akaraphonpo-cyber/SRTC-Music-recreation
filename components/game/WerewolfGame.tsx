
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StudentWithId, WerewolfRole, WerewolfRoom, WerewolfRoleDef, WerewolfPlayer } from '../../types';
import { createWerewolfRoom, joinWerewolfRoom, subscribeToWerewolfRoom, updateWerewolfRoomState, leaveWerewolfRoom } from '../../services/gameService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import { getDoc, doc, getFirestore } from 'firebase/firestore';

interface WerewolfGameProps {
    student: StudentWithId;
    onBack: () => void;
}

const GameUtils = {
    shuffle: <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    getCurrentTime: () => Date.now(),
    getRandomInt: (max: number) => Math.floor(Math.random() * max)
};

// --- Role Metadata & Configuration ---
const ROLE_DEFINITIONS: Record<WerewolfRole, WerewolfRoleDef> = {
    [WerewolfRole.MODERATOR]: { 
        id: WerewolfRole.MODERATOR, name: 'ผู้ดำเนินเกม', icon: '🎤', team: 'MODERATOR', wakeOrder: 0,
        description: 'ผู้ควบคุมเกม ไม่ได้ร่วมเล่นแต่เป็นผู้ตัดสิน' 
    },
    [WerewolfRole.WEREWOLF]: { 
        id: WerewolfRole.WEREWOLF, name: 'มนุษย์หมาป่า', icon: '🐺', team: 'WEREWOLF', wakeOrder: 4,
        description: 'ตื่นขึ้นมาตอนกลางคืนเพื่อเลือกเหยื่อ หมาป่ารู้จักกันเอง' 
    },
    [WerewolfRole.WOLF_CUB]: { 
        id: WerewolfRole.WOLF_CUB, name: 'ลูกหมาป่า', icon: '🐾', team: 'WEREWOLF', wakeOrder: 4,
        description: 'อยู่ทีมหมาป่า หากถูกกำจัด คืนถัดไปหมาป่าจะฆ่าได้ 2 คน' 
    },
    [WerewolfRole.MINION]: { 
        id: WerewolfRole.MINION, name: 'ลูกสมุน', icon: '🦹', team: 'WEREWOLF', wakeOrder: 0,
        description: 'รู้ว่าใครเป็นหมาป่า แต่หมาป่าไม่รู้จักคุณ ช่วยปั่นหัวชาวบ้าน' 
    },
    [WerewolfRole.SORCERER]: { 
        id: WerewolfRole.SORCERER, name: 'หมอผี', icon: '🧙‍♂️', team: 'WEREWOLF', wakeOrder: 2,
        description: 'ค้นหาเทพพยากรณ์ตอนกลางคืน หากเจอจะรู้ทันที' 
    },
    [WerewolfRole.VILLAGER]: { 
        id: WerewolfRole.VILLAGER, name: 'ชาวบ้าน', icon: '🧑', team: 'VILLAGER', wakeOrder: 0,
        description: 'ไม่มีความสามารถพิเศษ ช่วยกันจับผิดและโหวตหมาป่าตอนกลางวัน' 
    },
    [WerewolfRole.SEER]: { 
        id: WerewolfRole.SEER, name: 'เทพพยากรณ์', icon: '🔮', team: 'VILLAGER', wakeOrder: 2,
        description: 'ตื่นมาดูดวงผู้เล่น 1 คนว่าเป็นมนุษย์หมาป่าหรือไม่' 
    },
    [WerewolfRole.BODYGUARD]: { 
        id: WerewolfRole.BODYGUARD, name: 'บอดี้การ์ด', icon: '🛡️', team: 'VILLAGER', wakeOrder: 3,
        description: 'เลือกปกป้องผู้เล่น 1 คน (ห้ามซ้ำคนเดิมในคืนถัดไป) ผู้ที่ถูกปกป้องจะไม่ตาย' 
    },
    [WerewolfRole.HUNTER]: { 
        id: WerewolfRole.HUNTER, name: 'นายพราน', icon: '🏹', team: 'VILLAGER', wakeOrder: 0,
        description: 'หากตาย (ถูกโหวตหรือถูกฆ่า) สามารถเลือกยิงคนอื่นตายตามได้ 1 คนทันที' 
    },
    [WerewolfRole.CUPID]: { 
        id: WerewolfRole.CUPID, name: 'กามเทพ', icon: '💘', team: 'VILLAGER', wakeOrder: 1,
        description: 'คืนแรกเลือกผู้เล่น 2 คนให้เป็นคู่รัก หากคนหนึ่งตาย อีกคนต้องตายตาม' 
    },
    [WerewolfRole.WITCH]: { 
        id: WerewolfRole.WITCH, name: 'แม่มด', icon: '🧪', team: 'VILLAGER', wakeOrder: 5,
        description: 'มี 2 ยา: ยาช่วยชีวิต (ใช้กับคนที่โดนกัด) และยาพิษ (ฆ่าใครก็ได้) ใช้ได้อย่างละ 1 ครั้ง' 
    },
    [WerewolfRole.PRIEST]: { 
        id: WerewolfRole.PRIEST, name: 'นักบวช', icon: '⛪', team: 'VILLAGER', wakeOrder: 2, 
        description: 'ได้รับพรคุ้มครองจากการถูกฆ่าในเวลากลางคืน 1 ครั้ง (กดใช้ความสามารถใส่ตัวเอง)' 
    },
    [WerewolfRole.PRINCE]: { 
        id: WerewolfRole.PRINCE, name: 'เจ้าชาย', icon: '👑', team: 'VILLAGER', wakeOrder: 0,
        description: 'หากถูกโหวตประหารชีวิต จะไม่ตายและเปิดเผยตัวตนว่าเป็นเจ้าชาย' 
    },
    [WerewolfRole.MAYOR]: { 
        id: WerewolfRole.MAYOR, name: 'นายกเทศมนตรี', icon: '🎖️', team: 'VILLAGER', wakeOrder: 0,
        description: 'เสียงโหวตของคุณมีค่าเป็น 2 คะแนนในการโหวตประหาร' 
    },
    [WerewolfRole.MEDIUM]: { 
        id: WerewolfRole.MEDIUM, name: 'คนทรง', icon: '👻', team: 'VILLAGER', wakeOrder: 0, 
        description: 'รู้ว่าคนที่ตายเมื่อคืนเป็นฝ่ายมนุษย์หมาป่าหรือชาวบ้าน' 
    },
    [WerewolfRole.APPRENTICE_SEER]: { 
        id: WerewolfRole.APPRENTICE_SEER, name: 'ศิษย์เทพฯ', icon: '🎓', team: 'VILLAGER', wakeOrder: 0,
        description: 'หากเทพพยากรณ์ตาย คุณจะได้รับตำแหน่งและทำหน้าที่แทน' 
    },
    [WerewolfRole.DETECTIVE]: { 
        id: WerewolfRole.DETECTIVE, name: 'นักสืบ', icon: '🕵️', team: 'VILLAGER', wakeOrder: 3,
        description: 'สุ่มรู้ข้อมูลใบ้ของผู้เล่น 1 คน (ระบบสุ่มให้)' 
    },
    [WerewolfRole.CURSED]: { 
        id: WerewolfRole.CURSED, name: 'ผู้ต้องสาป', icon: '🧟', team: 'NEUTRAL', wakeOrder: 0,
        description: 'เริ่มต้นเป็นชาวบ้าน แต่ถ้าโดนหมาป่ากัดจะไม่ตายและกลายเป็นหมาป่า' 
    },
    [WerewolfRole.LYCAN]: { 
        id: WerewolfRole.LYCAN, name: 'ไลแคน', icon: '🐺?', team: 'VILLAGER', wakeOrder: 0,
        description: 'เป็นชาวบ้าน แต่เทพพยากรณ์ส่องแล้วจะเห็นว่าเป็นมนุษย์หมาป่า' 
    },
    [WerewolfRole.FOOL]: { 
        id: WerewolfRole.FOOL, name: 'คนบ้า', icon: '🃏', team: 'NEUTRAL', wakeOrder: 0,
        description: 'เป้าหมายคือต้องทำให้ตัวเองถูกโหวตประหารชีวิตเพื่อชนะเกม' 
    },
    [WerewolfRole.SERIAL_KILLER]: { 
        id: WerewolfRole.SERIAL_KILLER, name: 'ฆาตกร', icon: '🔪', team: 'NEUTRAL', wakeOrder: 4,
        description: 'ออกฆ่าคนทุกคืน ชนะเมื่อเหลือรอดคนสุดท้าย' 
    },
    [WerewolfRole.OLD_MAN]: { 
        id: WerewolfRole.OLD_MAN, name: 'ผู้เฒ่า', icon: '👴', team: 'VILLAGER', wakeOrder: 0,
        description: 'ทนทานต่อการถูกกัดครั้งแรก แต่ถ้าถูกกัดครั้งที่ 2 จะตาย' 
    },
};

// Order of night phases
const NIGHT_PHASE_ORDER = [
    WerewolfRole.CUPID, // Only Night 1
    WerewolfRole.PRIEST, // Protects self
    WerewolfRole.SORCERER,
    WerewolfRole.SEER,
    WerewolfRole.DETECTIVE,
    WerewolfRole.BODYGUARD,
    WerewolfRole.WEREWOLF, // Includes Wolf Cub
    WerewolfRole.SERIAL_KILLER,
    WerewolfRole.WITCH,
];

// Presets for quick setup
const GAME_PRESETS = [
    { name: 'สมดุล (8 คน)', counts: { [WerewolfRole.WEREWOLF]: 2, [WerewolfRole.SEER]: 1, [WerewolfRole.VILLAGER]: 4, [WerewolfRole.BODYGUARD]: 1 } },
    { name: 'คลาสสิก (10 คน)', counts: { [WerewolfRole.WEREWOLF]: 2, [WerewolfRole.SEER]: 1, [WerewolfRole.BODYGUARD]: 1, [WerewolfRole.HUNTER]: 1, [WerewolfRole.VILLAGER]: 5 } },
    { name: 'สายปั่น (12 คน)', counts: { [WerewolfRole.WEREWOLF]: 3, [WerewolfRole.SEER]: 1, [WerewolfRole.BODYGUARD]: 1, [WerewolfRole.FOOL]: 1, [WerewolfRole.LYCAN]: 1, [WerewolfRole.VILLAGER]: 5 } },
    { name: 'Extreme (15 คน)', counts: { [WerewolfRole.WEREWOLF]: 3, [WerewolfRole.SEER]: 1, [WerewolfRole.BODYGUARD]: 1, [WerewolfRole.WITCH]: 1, [WerewolfRole.CUPID]: 1, [WerewolfRole.MAYOR]: 1, [WerewolfRole.CURSED]: 1, [WerewolfRole.SERIAL_KILLER]: 1, [WerewolfRole.VILLAGER]: 5 } },
];

// Helper for Host Instructions
const getHostInstruction = (role: WerewolfRole | null | undefined): string => {
    if (!role) return "ทุกคนหลับตา";
    switch(role) {
        case WerewolfRole.CUPID: return "เรียก 'กามเทพ' ตื่นขึ้นมาเลือกคู่รัก";
        case WerewolfRole.PRIEST: return "เรียก 'นักบวช' ตื่นขึ้นมาใช้พรคุ้มครอง";
        case WerewolfRole.SORCERER: return "เรียก 'หมอผี' ตื่นขึ้นมาหาเทพพยากรณ์";
        case WerewolfRole.SEER: return "เรียก 'เทพพยากรณ์' ตื่นขึ้นมาดูดวง";
        case WerewolfRole.DETECTIVE: return "เรียก 'นักสืบ' ตื่นขึ้นมาสืบหาข้อมูล";
        case WerewolfRole.BODYGUARD: return "เรียก 'บอดี้การ์ด' ตื่นขึ้นมาคุ้มกัน";
        case WerewolfRole.WEREWOLF: return "เรียก 'มนุษย์หมาป่า' (และลูกหมาป่า) ตื่นขึ้นมาเลือกเหยื่อ";
        case WerewolfRole.SERIAL_KILLER: return "เรียก 'ฆาตกร' ตื่นขึ้นมาเลือกเหยื่อ";
        case WerewolfRole.WITCH: return "เรียก 'แม่มด' ตื่นขึ้นมาใช้ยา";
        default: return `เรียก '${ROLE_DEFINITIONS[role]?.name}' ตื่น`;
    }
};

// --- Sub-Components ---

const RoleCard: React.FC<{ role: WerewolfRole, count?: number, onIncrement?: () => void, onDecrement?: () => void, large?: boolean }> = ({ role, count, onIncrement, onDecrement, large }) => {
    const def = ROLE_DEFINITIONS[role];
    
    // Dynamic Styles based on Team
    const themeStyles = def.team === 'WEREWOLF' 
        ? { border: 'border-red-600', bg: 'bg-gradient-to-b from-red-950 to-black', text: 'text-red-100', icon: 'text-red-500', shadow: 'shadow-red-900/50' }
        : def.team === 'VILLAGER' 
        ? { border: 'border-blue-500', bg: 'bg-gradient-to-b from-blue-950 to-black', text: 'text-blue-100', icon: 'text-blue-400', shadow: 'shadow-blue-900/50' }
        : def.team === 'MODERATOR'
        ? { border: 'border-gray-500', bg: 'bg-gradient-to-b from-gray-800 to-black', text: 'text-gray-100', icon: 'text-gray-400', shadow: 'shadow-gray-700/50' }
        : { border: 'border-yellow-500', bg: 'bg-gradient-to-b from-yellow-950 to-black', text: 'text-yellow-100', icon: 'text-yellow-400', shadow: 'shadow-yellow-900/50' };

    return (
        <div className={`relative rounded-xl border-2 overflow-hidden flex flex-col items-center transition-all duration-300 shadow-lg ${themeStyles.border} ${themeStyles.bg} ${themeStyles.shadow} ${large ? 'w-56 h-80 p-6' : 'w-24 h-36 p-2 sm:w-28 sm:h-40'}`}>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
            
            <div className={`z-10 flex flex-col items-center h-full ${large ? 'justify-center' : 'justify-between'}`}>
                <div className={`${large ? 'text-8xl mb-6' : 'text-4xl sm:text-5xl mt-2'} ${themeStyles.icon} drop-shadow-md`}>{def.icon}</div>
                
                <div className="text-center">
                    <div className={`font-bold leading-tight ${large ? 'text-2xl mb-2' : 'text-xs sm:text-sm'} ${themeStyles.text} uppercase tracking-wider`}>{def.name}</div>
                    {large && <div className="h-px w-16 bg-white/30 mx-auto mb-3"></div>}
                    {large && <p className="text-sm text-center opacity-80 font-light leading-relaxed text-gray-300">{def.description}</p>}
                </div>

                {count !== undefined && (
                    <div className="mt-auto flex items-center justify-between w-full bg-black/60 rounded-lg p-1 border border-white/10 backdrop-blur-sm">
                        <button onClick={onDecrement} className="w-6 h-6 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors">-</button>
                        <span className="text-sm font-bold w-6 text-center text-white">{count}</span>
                        <button onClick={onIncrement} className="w-6 h-6 flex items-center justify-center rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors">+</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PlayerAvatar: React.FC<{ 
    player: WerewolfPlayer, 
    showRole?: boolean, 
    onClick?: () => void, 
    selected?: boolean, 
    dead?: boolean,
    statusIcons?: string[], 
    voters?: string[],
    isMinionView?: boolean,
    myPlayer?: WerewolfPlayer | undefined
}> = ({ player, showRole, onClick, selected, dead, statusIcons = [], voters = [], isMinionView, myPlayer }) => {
    const roleDef = ROLE_DEFINITIONS[player.role];
    
    // Logic for viewing wolf team (Wolves see Wolves, Wolves see Turned Cursed, Minion see Wolves)
    const isWolfTeam = player.role === WerewolfRole.WEREWOLF || player.role === WerewolfRole.WOLF_CUB || (player.role === WerewolfRole.CURSED && player.isCursedTurned);
    const viewerIsWolfTeam = myPlayer?.role === WerewolfRole.WEREWOLF || myPlayer?.role === WerewolfRole.WOLF_CUB || (myPlayer?.role === WerewolfRole.CURSED && myPlayer?.isCursedTurned) || myPlayer?.role === WerewolfRole.MINION;
    
    const showWolfIcon = (viewerIsWolfTeam && isWolfTeam);

    if (player.role === WerewolfRole.MODERATOR) {
        return (
            <div className="flex flex-col items-center opacity-70">
                <div className="w-12 h-12 rounded-full border-2 border-gray-500 bg-gray-800 flex items-center justify-center text-2xl">🎤</div>
                <span className="text-[10px] mt-1 text-gray-400">Moderator</span>
            </div>
        )
    }

    return (
        <div 
            onClick={!dead ? onClick : undefined}
            className={`group relative flex flex-col items-center transition-all duration-300 transform 
                ${dead ? 'opacity-50 grayscale scale-95' : 'hover:scale-105 cursor-pointer'} 
                ${selected ? 'scale-110 z-10' : ''}`}
        >
            {player.isProtected && !dead && <span className="absolute top-0 right-2 text-xl z-20 animate-bounce" title="Protected">🛡️</span>}
            {player.isLinked && !dead && <span className="absolute top-0 left-2 text-xl z-20 animate-pulse" title="Lovers">💘</span>}
            {player.isMayorRevealed && !dead && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-yellow-500 text-black px-1 rounded shadow-sm z-30 font-bold whitespace-nowrap">👑 MAYOR</span>}
            {/* Show Turned Icon only to Host or Wolves (handled by showRole logic in parent usually, or we assume logic here) */}
            {player.isCursedTurned && !dead && showRole && <span className="absolute bottom-8 right-0 text-xl z-20" title="Turned">🐺</span>}
            
            {!dead && showWolfIcon && <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md z-30">🐺</span>}
            
            {/* Old Man marked visual (Only for Host/Self) */}
            {player.markedByWolf && player.role === WerewolfRole.OLD_MAN && !dead && <span className="absolute bottom-8 left-0 text-xl z-20" title="Wounded">🩸</span>}

            {!dead && statusIcons.length > 0 && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-1 animate-bounce drop-shadow-lg pointer-events-none whitespace-nowrap">
                    {statusIcons.map((icon, i) => (
                        <span key={i} className="text-2xl filter drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">{icon}</span>
                    ))}
                </div>
            )}

            {!dead && voters.length > 0 && (
                <div className="absolute top-full mt-1 w-32 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in pointer-events-none">
                    <div className="bg-black/80 text-white text-[9px] rounded px-2 py-1 shadow-xl border border-white/10 text-center backdrop-blur-sm">
                        <div className="font-bold text-yellow-400 mb-0.5">ถูกโหวตโดย:</div>
                        {voters.map((v, i) => <div key={i} className="truncate leading-tight text-gray-300">{v}</div>)}
                    </div>
                </div>
            )}

            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-xl border-2 overflow-hidden bg-slate-800 relative
                ${dead ? 'border-slate-600' : selected ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'border-slate-500 group-hover:border-slate-300'}`}
            >
                {dead ? (
                    <>
                        <span className="z-10 opacity-50">🪦</span>
                        <div className="absolute inset-0 bg-red-900/30"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[120%] h-1 bg-red-800 rotate-45 absolute opacity-60"></div>
                            <div className="w-[120%] h-1 bg-red-800 -rotate-45 absolute opacity-60"></div>
                        </div>
                    </>
                ) : (
                    <span>{player.avatar}</span>
                )}
            </div>

            {/* Revised Name/Role Layout for consistency and overlap prevention */}
            <div className="flex flex-col items-center w-full mt-2 gap-1">
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full truncate max-w-[90px] text-center font-bold tracking-wide z-20 
                    ${dead ? 'bg-slate-800 text-slate-500 line-through' : selected ? 'bg-yellow-500 text-black' : 'bg-slate-900/80 text-slate-200 border border-slate-700'}`}>
                    {player.name}
                </span>

                {showRole && roleDef && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shadow-sm tracking-tighter border z-20
                        ${roleDef.team === 'WEREWOLF' ? 'bg-red-900 text-red-100 border-red-700' : 'bg-blue-900 text-blue-100 border-blue-700'}`}>
                        {roleDef.name}
                    </span>
                )}
            </div>
        </div>
    );
};

const InfoModal: React.FC<{ title: string, content: React.ReactNode, onDismiss: () => void, icon?: string, type?: 'info' | 'reveal' }> = ({ title, content, onDismiss, icon = '📜', type = 'info' }) => {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
            <div className={`text-center w-full max-w-sm glass-card p-8 rounded-3xl border ${type === 'reveal' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'border-white/20'}`}>
                <div className="text-6xl mb-4 animate-bounce">{icon}</div>
                <h3 className="text-xl text-slate-300 mb-2 uppercase tracking-wide">{title}</h3>
                <div className="text-white mb-6 font-bold text-lg">{content}</div>
                <button onClick={onDismiss} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
                    รับทราบ
                </button>
            </div>
        </div>
    );
};

const RoleReveal: React.FC<{ role: WerewolfRole, onDismiss: () => void }> = ({ role, onDismiss }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    useEffect(() => { if (role === WerewolfRole.MODERATOR) onDismiss(); }, [role, onDismiss]);
    if (role === WerewolfRole.MODERATOR) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="text-center w-full max-w-sm">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-widest uppercase text-shadow-md">
                    {isFlipped ? "บทบาทของคุณคือ..." : "แตะเพื่อดูบทบาท"}
                </h2>
                <div onClick={() => !isFlipped && setIsFlipped(true)} className="perspective-1000 w-64 h-96 mx-auto cursor-pointer">
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                        <div className="absolute inset-0 backface-hidden rounded-2xl border-4 border-slate-700 bg-gradient-to-br from-slate-800 to-black shadow-2xl flex items-center justify-center">
                            <div className="text-6xl animate-pulse opacity-50">🐺</div>
                            <div className="absolute bottom-4 text-slate-500 font-serif tracking-widest text-xs">WEREWOLF EXTREME</div>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180">
                            <RoleCard role={role} large />
                        </div>
                    </div>
                </div>
                {isFlipped && (
                    <button onClick={onDismiss} className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-fade-in">
                        รับทราบ
                    </button>
                )}
            </div>
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
        </div>
    );
};

const RoleHelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal isOpen={true} onClose={onClose} title="คัมภีร์กฎ (Rule Book)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
            {Object.values(ROLE_DEFINITIONS)
                .filter(r => r.id !== WerewolfRole.MODERATOR)
                .sort((a, b) => (a.team === 'WEREWOLF' ? -1 : 1))
                .map(role => (
                <div key={role.id} className={`p-3 rounded-lg border flex items-start gap-3 ${role.team === 'WEREWOLF' ? 'bg-red-950/20 border-red-900/50' : role.team === 'NEUTRAL' ? 'bg-yellow-900/20 border-yellow-800/50' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className="text-3xl mt-1">{role.icon}</div>
                    <div>
                        <h4 className={`font-bold ${role.team === 'WEREWOLF' ? 'text-red-400' : role.team === 'NEUTRAL' ? 'text-yellow-400' : 'text-blue-300'}`}>{role.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{role.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </Modal>
);

const GameEndModal: React.FC<{ room: WerewolfRoom, onDismiss: () => void }> = ({ room, onDismiss }) => {
    const winnerTeam = room.winner || 'UNKNOWN';
    const isVillagerWin = winnerTeam === 'VILLAGER';
    const isWolfWin = winnerTeam === 'WEREWOLF';
    
    // Sort players: Living first, then roles
    const sortedPlayers = [...room.players].sort((a, b) => {
        if (a.isAlive && !b.isAlive) return -1;
        if (!a.isAlive && b.isAlive) return 1;
        return 0;
    });

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-2xl glass-card rounded-3xl border border-white/20 p-6 sm:p-8 flex flex-col max-h-[90vh]">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-2 animate-bounce">
                        {isVillagerWin ? '🎉' : isWolfWin ? '🐺' : winnerTeam === 'SERIAL_KILLER' ? '🔪' : '🤡'}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-wide">
                        {isVillagerWin ? 'ชาวบ้าน ชนะ!' : isWolfWin ? 'มนุษย์หมาป่า ชนะ!' : winnerTeam === 'SERIAL_KILLER' ? 'ฆาตกร ชนะ!' : 'คนบ้า ชนะ!'}
                    </h2>
                    <p className="text-slate-400 mt-2">เกมสิ้นสุดแล้ว</p>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedPlayers.filter(p => p.role !== WerewolfRole.MODERATOR).map(p => {
                            const def = ROLE_DEFINITIONS[p.role];
                            return (
                                <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg border ${p.isAlive ? 'bg-white/10 border-white/10' : 'bg-red-900/20 border-red-900/40 opacity-70'}`}>
                                    <div className="text-2xl">{def.icon}</div>
                                    <div className="flex-grow">
                                        <div className="font-bold text-sm text-white flex justify-between">
                                            <span>{p.name}</span>
                                            {!p.isAlive && <span className="text-[10px] text-red-400 font-normal self-center bg-red-950 px-1 rounded">DEAD</span>}
                                        </div>
                                        <div className={`text-xs ${def.team === 'WEREWOLF' ? 'text-red-400' : 'text-blue-300'}`}>{def.name}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button onClick={onDismiss} className="mt-6 w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    กลับสู่ล็อบบี้
                </button>
            </div>
        </div>
    );
};

const STORAGE_KEY = 'werewolf_active_room';

const WerewolfGame: React.FC<WerewolfGameProps> = ({ student, onBack }) => {
    const [roomId, setRoomId] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [roomState, setRoomState] = useState<WerewolfRoom | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showRoleReveal, setShowRoleReveal] = useState(false);
    const [hasSeenRole, setHasSeenRole] = useState(false);
    const [showEndGameModal, setShowEndGameModal] = useState(false);
    
    // Specific Role Modals
    const [seerResult, setSeerResult] = useState<{ name: string, isEvil: boolean } | null>(null);
    const [sorcererResult, setSorcererResult] = useState<{ name: string, isSeer: boolean } | null>(null);
    const [detectiveResult, setDetectiveResult] = useState<{ name: string, roleName: string } | null>(null);
    const [mediumResult, setMediumResult] = useState<{ deadCount: number, hasWolf: boolean } | null>(null);
    
    // Witch State
    const [witchMode, setWitchMode] = useState<'CHOOSING_POTION' | 'SELECTING_POISON_TARGET'>('CHOOSING_POTION');

    const [showHelp, setShowHelp] = useState(false);
    const [showModTools, setShowModTools] = useState(false);
    
    // Auto-scroll log ref
    const logContainerRef = useRef<HTMLDivElement>(null);

    const notification = useNotification();
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const myPlayer = roomState?.players.find(p => p.id === student.studentId);
    const isHost = roomState?.hostId === student.studentId;

    const subscribeToRoom = (id: string) => {
        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = subscribeToWerewolfRoom(id, (updatedRoom) => {
            if (!updatedRoom) {
                localStorage.removeItem(STORAGE_KEY);
                setRoomState(null);
                setRoomId('');
                notification.addToast({ type: 'info', title: 'ห้องถูกปิด', message: 'โฮสต์ได้ปิดห้องหรือเกมจบแล้ว' });
                return;
            }
            setRoomState(updatedRoom);
        });
    };

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [roomState?.logs]);

    useEffect(() => {
        const checkActiveSession = async () => {
            const savedRoomId = localStorage.getItem(STORAGE_KEY);
            if (savedRoomId) {
                try {
                    const db = getFirestore();
                    const roomRef = doc(db, 'werewolf_rooms', savedRoomId);
                    const roomSnap = await getDoc(roomRef);
                    if (roomSnap.exists()) {
                        const roomData = roomSnap.data() as WerewolfRoom;
                        const isInRoom = roomData.players.some(p => p.id === student.studentId);
                        if (isInRoom && roomData.status !== 'ENDED') {
                            setRoomId(savedRoomId);
                            subscribeToRoom(savedRoomId);
                            notification.addToast({type:'info', title:'Reconnected', message:'กลับเข้าสู่ห้องเดิมอัตโนมัติ'});
                        } else {
                            localStorage.removeItem(STORAGE_KEY);
                        }
                    } else {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                } catch (e) {
                    console.error("Reconnection failed:", e);
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
            setIsLoading(false);
        };
        checkActiveSession();
        return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
    }, [student.studentId, notification]);

    // Check for Medium Info at start of Day
    useEffect(() => {
        if (roomState?.status === 'DAY' && roomState.phase === 'DISCUSSION' && myPlayer?.role === WerewolfRole.MEDIUM && myPlayer.isAlive) {
            const lastDeaths = roomState.lastDeath || [];
            if (lastDeaths.length > 0) {
                const deadPlayers = roomState.players.filter(p => lastDeaths.includes(p.id));
                const hasWolf = deadPlayers.some(p => p.role === WerewolfRole.WEREWOLF || p.role === WerewolfRole.WOLF_CUB || p.role === WerewolfRole.LYCAN || p.isCursedTurned);
                
                if (!mediumResult) {
                    void Promise.resolve().then(() => setMediumResult({ deadCount: lastDeaths.length, hasWolf }));
                }
            }
        } else {
            void Promise.resolve().then(() => setMediumResult(null)); 
        }
    }, [roomState?.status, roomState?.phase, roomState?.lastDeath, myPlayer, mediumResult]);

    useEffect(() => {
        if (roomState?.status === 'NIGHT' && roomState.dayCount === 1 && !hasSeenRole && myPlayer && myPlayer.role !== WerewolfRole.MODERATOR) {
            void Promise.resolve().then(() => setShowRoleReveal(true));
        }
    }, [roomState?.status, roomState?.dayCount, hasSeenRole, myPlayer]);

    useEffect(() => {
        if (!roomState?.timerEnd) return;
        const interval = setInterval(() => {
            const diff = Math.max(0, Math.ceil((roomState.timerEnd! - GameUtils.getCurrentTime()) / 1000));
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [roomState?.timerEnd]);

    // Show End Game Modal when game ends
    useEffect(() => {
        if (roomState?.status === 'ENDED') {
            void Promise.resolve().then(() => setShowEndGameModal(true));
        }
    }, [roomState?.status]);
    
    // Reset Witch Mode on new phase
    useEffect(() => {
        void Promise.resolve().then(() => setWitchMode('CHOOSING_POTION'));
    }, [roomState?.phase, roomState?.activeRoleTurn]);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        const res = await createWerewolfRoom(student.studentId, student.firstName, '👤');
        if (res.success && res.data) {
            setRoomId(res.data);
            subscribeToRoom(res.data);
            localStorage.setItem(STORAGE_KEY, res.data);
        } else {
            notification.addToast({type: 'error', title: 'Error', message: res.message});
        }
        setIsLoading(false);
    };

    const handleJoinRoom = async () => {
        if (!joinCode) return;
        setIsLoading(true);
        const player: WerewolfPlayer = {
            id: student.studentId, name: student.firstName, role: WerewolfRole.VILLAGER, isAlive: true, avatar: '👤'
        };
        const res = await joinWerewolfRoom(joinCode, player);
        setIsLoading(false);
        if (res.success) {
            setRoomId(joinCode);
            subscribeToRoom(joinCode);
            localStorage.setItem(STORAGE_KEY, joinCode);
        } else {
            notification.addToast({ type: 'error', title: 'Failed', message: res.message });
        }
    };

    const handleLeaveRoom = () => {
        notification.showConfirmation({
            title: 'ออกจากห้อง?',
            message: isHost ? 'คุณคือโฮสต์ หากคุณออก ห้องจะถูกปิดทันที' : 'คุณต้องการออกจากห้องใช่หรือไม่?',
            confirmText: isHost ? 'ปิดห้อง' : 'ออกเลย',
            confirmButtonColor: 'red',
            onConfirm: async () => {
                setIsLoading(true);
                if (roomState) await leaveWerewolfRoom(roomState.roomId, student.studentId);
                localStorage.removeItem(STORAGE_KEY);
                if (unsubscribeRef.current) unsubscribeRef.current();
                setRoomState(null);
                setRoomId('');
                setJoinCode('');
                setIsLoading(false);
            }
        });
    };

    const handleStartGame = async () => {
        if (!roomState) return;
        const allPlayers = [...roomState.players];
        const activePlayers = allPlayers.filter(p => p.id !== roomState.hostId);
        let rolePool: WerewolfRole[] = [];
        Object.entries(roomState.settings.roleCounts).forEach(([role, count]: [string, number]) => {
            for(let i=0; i<count; i++) rolePool.push(role as WerewolfRole);
        });
        
        while(rolePool.length < activePlayers.length) rolePool.push(WerewolfRole.VILLAGER);
        
        rolePool = GameUtils.shuffle(rolePool);
        
        const updatedPlayers = allPlayers.map(p => {
            if (p.id === roomState.hostId) return { ...p, role: WerewolfRole.MODERATOR, isAlive: true };
            const assignedRole = rolePool.pop() || WerewolfRole.VILLAGER;
            return { 
                ...p, 
                role: assignedRole, 
                originalRole: assignedRole, 
                isAlive: true, 
                isProtected: false, 
                isSilenced: false, 
                isLinked: false, 
                markedByWolf: false,
                isMayorRevealed: false,
                isCursedTurned: false,
                priestUsedPower: false,
                lastProtectedId: undefined,
                potionHealUsed: false,
                potionKillUsed: false
            };
        });
        
        // Find first active role
        const firstRole = NIGHT_PHASE_ORDER.find(r => updatedPlayers.some(p => p.role === r && p.isAlive));

        await updateWerewolfRoomState(roomState.roomId, {
            status: 'NIGHT', 
            phase: 'ACTION', 
            activeRoleTurn: firstRole || null, 
            dayCount: 1, 
            players: updatedPlayers, 
            logs: [...roomState.logs, `--- เริ่มต้นเกม คืนที่ 1 ---`, getRolePhaseMessage(firstRole)], 
            timerEnd: GameUtils.getCurrentTime() + (30 * 1000), 
            nightActions: {},
            nextNightWolfKillCount: 1,
        });
    };

    const getRolePhaseMessage = (role: WerewolfRole | null | undefined): string => {
        if (!role) return "ถึงเวลานอนหลับ...";
        switch(role) {
            case WerewolfRole.CUPID: return "กามเทพกำลังแผลงศรแห่งความรัก...";
            case WerewolfRole.PRIEST: return "นักบวชกำลังสวดภาวนา...";
            case WerewolfRole.SORCERER: return "หมอผีกำลังร่ายมนตร์ค้นหา...";
            case WerewolfRole.SEER: return "เทพพยากรณ์กำลังเปิดนิมิตดูดวง...";
            case WerewolfRole.DETECTIVE: return "นักสืบกำลังสืบหาเบาะแส...";
            case WerewolfRole.BODYGUARD: return "บอดี้การ์ดกำลังเลือกปกป้องใครสักคน...";
            case WerewolfRole.WEREWOLF: return "เหล่าหมาป่ากำลังออกล่าเหยื่อ...";
            case WerewolfRole.SERIAL_KILLER: return "ฆาตกรโรคจิตกำลังมองหาเหยื่อรายต่อไป...";
            case WerewolfRole.WITCH: return "แม่มดกำลังปรุงยา...";
            default: return "บางสิ่งกำลังเคลื่อนไหวในความมืด...";
        }
    };

    const handleNextPhase = async () => {
        if (!roomState) return;
        if (roomState.status === 'NIGHT') {
            const currentRoleIndex = NIGHT_PHASE_ORDER.indexOf(roomState.activeRoleTurn as WerewolfRole);
            let nextRole: WerewolfRole | null = null;
            for (let i = currentRoleIndex + 1; i < NIGHT_PHASE_ORDER.length; i++) {
                const r = NIGHT_PHASE_ORDER[i];
                if (r === WerewolfRole.CUPID && roomState.dayCount > 1) continue; 
                const hasRole = roomState.players.some(p => p.role === r && p.isAlive);
                if (hasRole) { nextRole = r; break; }
            }
            if (nextRole) {
                await updateWerewolfRoomState(roomState.roomId, { 
                    activeRoleTurn: nextRole, 
                    timerEnd: GameUtils.getCurrentTime() + (roomState.settings.timerSeconds * 1000),
                    logs: [...roomState.logs, getRolePhaseMessage(nextRole)]
                });
            } else {
                const { deadIds, logs, updatedPlayers, nextKillCount } = processNightResults(roomState);
                const resetPlayers = updatedPlayers.map(p => ({ 
                    ...p, 
                    isProtected: false, 
                    // Reset mark unless it's the Old Man (persistent wound)
                    markedByWolf: p.role === WerewolfRole.OLD_MAN ? p.markedByWolf : false,
                }));

                const { gameEnd, winner } = checkGameEnd(resetPlayers);
                if (gameEnd) {
                    await updateWerewolfRoomState(roomState.roomId, { 
                        status: 'ENDED', 
                        phase: 'ENDED', 
                        winner: winner as any, 
                        players: resetPlayers,
                        logs: [...roomState.logs, ...logs, `เกมจบลงแล้ว! ผู้ชนะคือ: ${winner}`] 
                    });
                } else {
                    await updateWerewolfRoomState(roomState.roomId, {
                        status: 'DAY', phase: 'DISCUSSION', players: resetPlayers, activeRoleTurn: null, lastDeath: deadIds, logs: [...roomState.logs, ...logs], nightActions: {}, timerEnd: GameUtils.getCurrentTime() + (180 * 1000),
                        nextNightWolfKillCount: nextKillCount 
                    });
                }
            }
        } else if (roomState.status === 'DAY') {
            if (roomState.phase === 'DISCUSSION') {
                await updateWerewolfRoomState(roomState.roomId, { phase: 'VOTE', timerEnd: GameUtils.getCurrentTime() + (60 * 1000), votes: {}, logs: [...roomState.logs, "หมดเวลาปรึกษา! เริ่มโหวตหาคนร้าย"] });
            } else if (roomState.phase === 'VOTE') {
                const { executedId, logs, gameEnd, winner, updatedPlayers: penaltyPlayers } = processDayResults(roomState);
                if (gameEnd) {
                    await updateWerewolfRoomState(roomState.roomId, { status: 'ENDED', phase: 'ENDED', winner: winner, logs: [...roomState.logs, ...logs] });
                } else {
                    let updatedPlayers = penaltyPlayers || [...roomState.players];
                    if (executedId) {
                        const victim = updatedPlayers.find(p => p.id === executedId);
                        if (victim?.role === WerewolfRole.PRINCE) {
                            // Prince logic handled in processDayResults (executedId set to null)
                            // But just in case, we check here too
                            updatedPlayers = updatedPlayers.map(p => p.id === executedId ? { ...p, isAlive: true, isMayorRevealed: true } : p);
                        } else {
                            updatedPlayers = updatedPlayers.map(p => p.id === executedId ? { ...p, isAlive: false } : p);
                            // If Hunter Dies
                            if (victim?.role === WerewolfRole.HUNTER) {
                                logs.push("นายพรานตาย! (Host: โปรดถามนายพรานว่าจะยิงใครหรือไม่)");
                            }
                        }
                    }
                    
                    const firstRole = NIGHT_PHASE_ORDER.find(r => r !== WerewolfRole.CUPID && updatedPlayers.some(p => p.role === r && p.isAlive));

                    await updateWerewolfRoomState(roomState.roomId, {
                        status: 'NIGHT', 
                        phase: 'ACTION', 
                        dayCount: roomState.dayCount + 1, 
                        activeRoleTurn: firstRole || null, 
                        players: updatedPlayers, 
                        logs: [...roomState.logs, ...logs, `--- คืนที่ ${roomState.dayCount + 1} ---`, getRolePhaseMessage(firstRole)], 
                        timerEnd: GameUtils.getCurrentTime() + (30 * 1000)
                    });
                }
            }
        }
    };

    const processNightResults = (room: WerewolfRoom) => {
        const deadIds: string[] = [];
        const logs: string[] = [`เช้าวันที่ ${room.dayCount}: `];
        const { wolvesTarget, bodyguardTargets, witchKill, witchHeal, serialKillerTarget, priestTarget } = room.nightActions;
        let updatedPlayers = [...room.players];
        let nextKillCount = 1; 

        // 1. Process Wolf Attack
        if (wolvesTarget && wolvesTarget.length > 0) {
            wolvesTarget.forEach(targetId => {
                const targetPlayer = updatedPlayers.find(p => p.id === targetId);
                const isProtected = bodyguardTargets?.includes(targetId) || priestTarget === targetId;
                
                if (!isProtected && !witchHeal) {
                    if (targetPlayer?.role === WerewolfRole.OLD_MAN) {
                        if (targetPlayer.markedByWolf) {
                            // Hit second time -> Die
                            deadIds.push(targetId);
                        } else {
                            // Hit first time -> Mark
                            updatedPlayers = updatedPlayers.map(p => p.id === targetId ? { ...p, markedByWolf: true } : p);
                            // Old Man survives first hit - Host sees this via PlayerAvatar icon
                        }
                    }
                    else if (targetPlayer?.role === WerewolfRole.CURSED) {
                        // Cursed survives wolf attack and turns into werewolf
                        updatedPlayers = updatedPlayers.map(p => p.id === targetId ? { ...p, role: WerewolfRole.WEREWOLF, originalRole: WerewolfRole.CURSED, isCursedTurned: true } : p);
                        logs.push(`มีเสียงโหยหวนแปลกๆ เกิดขึ้น...`); 
                    } else {
                        deadIds.push(targetId);
                    }
                }
            });
        }
        
        // 2. Process Serial Killer
        if (serialKillerTarget) {
            if (priestTarget !== serialKillerTarget) {
                deadIds.push(serialKillerTarget);
            }
        }
        
        // 3. Process Witch Kill
        if (witchKill) {
            deadIds.push(witchKill);
        }

        // 4. Process Linked Deaths (Cupid)
        const loversToDie: string[] = [];
        const initialDead = [...deadIds];
        initialDead.forEach(deadId => {
            const player = room.players.find(p => p.id === deadId);
            if (player?.isLinked) {
                const partner = room.players.find(p => p.isLinked && p.id !== deadId);
                if (partner && !deadIds.includes(partner.id)) {
                    loversToDie.push(partner.id);
                    logs.push(`${player.name} ตาย คู่รัก ${partner.name} จึงตรอมใจตายตาม`);
                }
            }
        });
        deadIds.push(...loversToDie);

        const uniqueDeadIds = Array.from(new Set(deadIds));
        
        // 5. Apply Deaths & Check Wolf Cub
        updatedPlayers = updatedPlayers.map(p => {
            if (uniqueDeadIds.includes(p.id)) {
                if (p.role === WerewolfRole.WOLF_CUB) nextKillCount = 2; // Trigger double kill
                return { ...p, isAlive: false };
            }
            return p;
        });
        
        // 6. Check Apprentice Seer
        const seerDied = uniqueDeadIds.some(id => {
            const p = room.players.find(pl => pl.id === id);
            return p?.role === WerewolfRole.SEER;
        });
        if (seerDied) {
            updatedPlayers = updatedPlayers.map(p => p.role === WerewolfRole.APPRENTICE_SEER && p.isAlive ? { ...p, role: WerewolfRole.SEER } : p);
            logs.push("ศิษย์เทพพยากรณ์ได้เลื่อนขั้น!");
        }

        if (uniqueDeadIds.length === 0) logs.push("ไม่มีใครเสียชีวิตเมื่อคืน");
        else {
            const names = room.players.filter(p => uniqueDeadIds.includes(p.id)).map(p => p.name).join(', ');
            logs.push(`ผู้เสียชีวิต: ${names}`);
        }
        
        return { deadIds: uniqueDeadIds, logs, updatedPlayers, nextKillCount };
    };

    const checkGameEnd = (players: WerewolfPlayer[]): { gameEnd: boolean, winner: string | null } => {
        const alive = players.filter(p => p.isAlive && p.role !== WerewolfRole.MODERATOR);
        const wolves = alive.filter(p => p.role === WerewolfRole.WEREWOLF || p.role === WerewolfRole.WOLF_CUB || (p.role === WerewolfRole.CURSED && p.isCursedTurned)).length;
        const skCount = alive.filter(p => p.role === WerewolfRole.SERIAL_KILLER).length;
        const humans = alive.length - wolves - skCount;
        
        // Serial Killer wins if they are the last one standing (or with 1 other person they can kill)
        if (skCount > 0 && alive.length <= 2) return { gameEnd: true, winner: 'SERIAL_KILLER' };

        // Villagers win if all threats are gone
        if (wolves === 0 && skCount === 0) return { gameEnd: true, winner: 'VILLAGER' };

        // Werewolves win if they equal or outnumber everyone else (and no SK to kill them)
        if (wolves > 0 && wolves >= (humans + skCount)) return { gameEnd: true, winner: 'WEREWOLF' };
        
        return { gameEnd: false, winner: null };
    };

    const processDayResults = (room: WerewolfRoom) => {
        const voteCounts: Record<string, number> = {};
        
        Object.entries(room.votes).forEach(([voterId, targetId]) => {
            const voter = room.players.find(p => p.id === voterId);
            let weight = 1;
            if (voter?.role === WerewolfRole.MAYOR && voter.isAlive) weight = 2;
            voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
        });
        
        let max = 0;
        let executedId: string | null = null;
        let tie = false;
        Object.entries(voteCounts).forEach(([id, count]) => {
            if (count > max) { max = count; executedId = id; tie = false; }
            else if (count === max) { tie = true; }
        });

        const logs: string[] = [];
        if (tie || !executedId) {
            logs.push("คะแนนโหวตเท่ากัน ไม่มีใครถูกประหาร");
            executedId = null;
        } else {
            const victim = room.players.find(p => p.id === executedId);
            logs.push(`${victim?.name} ถูกโหวตประหารชีวิต`);
            
            if (victim?.role === WerewolfRole.FOOL) {
                return { executedId, logs, gameEnd: true, winner: 'FOOL' as const };
            }
            if (victim?.role === WerewolfRole.PRINCE) {
                logs.push(`แต่ ${victim.name} ประกาศตัวว่าเป็นเจ้าชาย! จึงได้รับการอภัยโทษ`);
                executedId = null; // Prevent death
            }
            if (victim?.role === WerewolfRole.OLD_MAN) {
                logs.push(`ชาวบ้านได้สังหารผู้เฒ่า! เหล่าทวยเทพโกรธกริ้ว ชาวบ้านทุกคนสูญเสียพลังวิเศษ...`);
                // Penalty: All villagers become normal villagers
                const updatedPlayers = room.players.map(p => {
                    const def = ROLE_DEFINITIONS[p.role];
                    if (def.team === 'VILLAGER' && p.role !== WerewolfRole.MODERATOR && p.role !== WerewolfRole.VILLAGER) {
                        return { ...p, role: WerewolfRole.VILLAGER, originalRole: p.role };
                    }
                    return p;
                });
                // We need to return the updated players too
                return { executedId, logs, gameEnd: false, winner: null, updatedPlayers };
            }
        }

        // Win Condition Check
        const { gameEnd, winner } = checkGameEnd(room.players.map(p => p.id === executedId ? { ...p, isAlive: false } : p));
        if (gameEnd) return { executedId, logs, gameEnd, winner: winner as any };
        
        return { executedId, logs, gameEnd: false, winner: null };
    };

    const handleAction = async (targetId: string | null) => {
        if (!roomState || !myPlayer?.isAlive || myPlayer.role === WerewolfRole.MODERATOR) return;
        const updates: any = {};
        
        if (roomState.status === 'NIGHT' && roomState.activeRoleTurn === myPlayer.role) {
            const actions = { ...roomState.nightActions };
            
            if (myPlayer.role === WerewolfRole.WEREWOLF || myPlayer.role === WerewolfRole.WOLF_CUB) {
                if (!targetId) return;
                const limit = roomState.nextNightWolfKillCount || 1;
                let currentTargets = actions.wolvesTarget || [];
                if (currentTargets.includes(targetId)) {
                    currentTargets = currentTargets.filter(id => id !== targetId);
                } else if (currentTargets.length < limit) {
                    currentTargets.push(targetId);
                } else if (limit === 1) {
                    currentTargets = [targetId];
                }
                actions.wolvesTarget = currentTargets;
            } 
            else if (myPlayer.role === WerewolfRole.SEER) {
                if (!targetId) return;
                if (actions.seerTarget) {
                    notification.addToast({type:'warning', title:'ใช้ความสามารถไปแล้ว', message:'คุณสามารถดูดวงได้คืนละ 1 คนเท่านั้น'});
                    return;
                }
                const target = roomState.players.find(p => p.id === targetId);
                let isEvil = target?.role === WerewolfRole.WEREWOLF || target?.role === WerewolfRole.WOLF_CUB || target?.role === WerewolfRole.LYCAN || target?.isCursedTurned || target?.role === WerewolfRole.SERIAL_KILLER;
                setSeerResult({ name: target?.name || '', isEvil: !!isEvil });
                actions.seerTarget = targetId;
            }
            else if (myPlayer.role === WerewolfRole.SORCERER) {
                if (!targetId) return;
                if (sorcererResult) {
                     notification.addToast({type:'warning', title:'ใช้ความสามารถไปแล้ว', message:'คุณสามารถค้นหาได้คืนละ 1 คนเท่านั้น'});
                     return;
                }
                const target = roomState.players.find(p => p.id === targetId);
                setSorcererResult({ name: target?.name || '', isSeer: target?.role === WerewolfRole.SEER });
            }
            else if (myPlayer.role === WerewolfRole.DETECTIVE) {
                // SPECIAL LOGIC: Random target, ignore input targetId
                if (actions.investigatedResult) { // Check if already used this night
                     notification.addToast({type:'warning', title:'ใช้ความสามารถไปแล้ว', message:'คุณสืบข้อมูลได้คืนละ 1 ครั้งเท่านั้น'});
                     return;
                }
                
                // Get all alive players excluding self
                const candidates = roomState.players.filter(p => p.id !== myPlayer.id && p.isAlive);
                if (candidates.length === 0) return;
                
                const randomTarget = candidates[GameUtils.getRandomInt(candidates.length)];
                
                // Generate a Hint
                let hint = "ไม่ทราบข้อมูล";
                const roleDef = ROLE_DEFINITIONS[randomTarget.role];
                if (roleDef.team === 'VILLAGER') hint = "ฝ่ายชาวบ้าน (Villager Team)";
                else if (roleDef.team === 'WEREWOLF') hint = "ฝ่ายหมาป่า (Werewolf Team)";
                else hint = "ฝ่ายอิสระ (Neutral Team)";

                setDetectiveResult({ name: randomTarget.name, roleName: hint }); 
                actions.investigatedResult = "RANDOM_HINT"; // Marker to block repeat usage
            }
            else if (myPlayer.role === WerewolfRole.BODYGUARD) {
                if (!targetId) return;
                if (myPlayer.lastProtectedId === targetId) {
                    notification.addToast({type:'warning', title:'ผิดกติกา', message:'ห้ามปกป้องคนเดิมซ้ำสองคืนติดกัน'});
                    return;
                }
                actions.bodyguardTargets = [targetId];
                const playersUpdate = roomState.players.map(p => p.id === myPlayer.id ? { ...p, lastProtectedId: targetId } : p);
                updates.players = playersUpdate;
            } 
            else if (myPlayer.role === WerewolfRole.PRIEST) {
                if (myPlayer.priestUsedPower) {
                    notification.addToast({type:'warning', title:'หมดสิทธิ์', message:'คุณใช้พรคุ้มครองไปแล้ว'});
                    return;
                }
                // Target ID is implicitly self if triggered via button, or passed explicitly
                const actualTarget = targetId || myPlayer.id;
                if (actualTarget !== myPlayer.id) return;
                
                actions.priestTarget = actualTarget;
                const playersUpdate = roomState.players.map(p => p.id === myPlayer.id ? { ...p, priestUsedPower: true } : p);
                updates.players = playersUpdate;
                notification.addToast({type:'success', title:'คุ้มครอง', message:'คุณใช้พรคุ้มครองตัวเองในคืนนี้'});
            }
            else if (myPlayer.role === WerewolfRole.SERIAL_KILLER) {
                if (!targetId) return;
                actions.serialKillerTarget = targetId;
            }
            else if (myPlayer.role === WerewolfRole.CUPID && roomState.dayCount === 1) {
                if (!targetId) return;
                let currentLinks = actions.cupidLinks || [];
                if (currentLinks.includes(targetId)) currentLinks = currentLinks.filter(id => id !== targetId);
                else if (currentLinks.length < 2) currentLinks.push(targetId);
                actions.cupidLinks = currentLinks;
                
                if (currentLinks.length === 2) {
                    const playersUpdate = roomState.players.map(p => currentLinks.includes(p.id) ? { ...p, isLinked: true } : p);
                    updates.players = playersUpdate;
                }
            }
            else if (myPlayer.role === WerewolfRole.WITCH) {
                // Determine action based on mode
                if (witchMode === 'CHOOSING_POTION') {
                    // Logic handled in separate function, but if called here with null targetId, it might mean skip
                } else if (witchMode === 'SELECTING_POISON_TARGET') {
                    if (!targetId) return;
                    actions.witchKill = targetId;
                    const playersUpdate = roomState.players.map(p => p.id === myPlayer.id ? { ...p, potionKillUsed: true } : p);
                    updates.players = playersUpdate;
                    notification.addToast({type:'success', title:'ใช้ยาพิษ', message:'คุณได้เลือกสังหารเป้าหมายแล้ว'});
                    // Reset to base mode just in case
                    setWitchMode('CHOOSING_POTION');
                }
            }
            
            updates.nightActions = actions;
        }
        
        if (roomState.status === 'DAY' && roomState.phase === 'VOTE') {
            if (!targetId) return;
            updates.votes = { ...roomState.votes, [myPlayer.id]: targetId };
        }
        
        await updateWerewolfRoomState(roomState.roomId, updates);
    };
    
    const handleWitchHeal = async () => {
        if (!roomState || !myPlayer) return;
        const dyingPlayerIds = roomState.nightActions.wolvesTarget || [];
        if (dyingPlayerIds.length === 0) {
             notification.addToast({type:'warning', title:'ไม่มีใครบาดเจ็บ', message:'ไม่มีใครถูกหมาป่าโจมตีคืนนี้'});
             return;
        }
        
        const actions = { ...roomState.nightActions, witchHeal: true };
        const playersUpdate = roomState.players.map(p => p.id === myPlayer.id ? { ...p, potionHealUsed: true } : p);
        
        await updateWerewolfRoomState(roomState.roomId, { nightActions: actions, players: playersUpdate });
        notification.addToast({type:'success', title:'ใช้ยาถอนพิษ', message:'คุณได้ช่วยชีวิตผู้เคราะห์ร้ายแล้ว'});
    };

    const getStatusIcons = (targetId: string): string[] => {
        const icons: string[] = [];
        if (!roomState) return icons;
        if (isHost) {
            if (roomState.nightActions.wolvesTarget?.includes(targetId)) icons.push('🩸');
            if (roomState.nightActions.bodyguardTargets?.includes(targetId)) icons.push('🛡️');
            if (roomState.nightActions.seerTarget === targetId) icons.push('👁️');
            if (roomState.nightActions.serialKillerTarget === targetId) icons.push('🔪');
            if (roomState.nightActions.priestTarget === targetId) icons.push('⛪');
            const p = roomState.players.find(i => i.id === targetId);
            if (p?.isLinked) icons.push('💘');
            if (p?.isCursedTurned) icons.push('🐺');
            if (p?.role === WerewolfRole.OLD_MAN && p.markedByWolf) icons.push('🩸'); // Host sees Old Man wound
            if (roomState.nightActions.witchKill === targetId) icons.push('🧪');
            return icons;
        }
        
        if (roomState.status === 'NIGHT') {
            // Turned Cursed plays like a Wolf
            if (myPlayer?.role === WerewolfRole.WEREWOLF || myPlayer?.role === WerewolfRole.WOLF_CUB || (myPlayer?.role === WerewolfRole.CURSED && myPlayer.isCursedTurned)) { 
                if (roomState.nightActions.wolvesTarget?.includes(targetId)) icons.push('🩸'); 
            }
            if (myPlayer?.role === WerewolfRole.BODYGUARD) { 
                if (roomState.nightActions.bodyguardTargets?.includes(targetId)) icons.push('🛡️'); 
            }
            if (myPlayer?.role === WerewolfRole.CUPID) { 
                if (roomState.nightActions.cupidLinks?.includes(targetId)) icons.push('💘'); 
            }
            if (myPlayer?.role === WerewolfRole.PRIEST && targetId === myPlayer.id && roomState.nightActions.priestTarget === targetId) {
                icons.push('⛪');
            }
            if (myPlayer?.role === WerewolfRole.SERIAL_KILLER) {
                if (roomState.nightActions.serialKillerTarget === targetId) icons.push('🔪');
            }
            // Witch sees who she killed
            if (myPlayer?.role === WerewolfRole.WITCH && roomState.nightActions.witchKill === targetId) {
                icons.push('☠️');
            }
            // Old Man sees his own wound
            if (myPlayer?.role === WerewolfRole.OLD_MAN && targetId === myPlayer.id) {
                const p = roomState.players.find(i => i.id === targetId);
                if (p?.markedByWolf) icons.push('🩸');
            }
        }
        if (roomState.status === 'DAY' && roomState.phase === 'VOTE' && roomState.votes[myPlayer!.id] === targetId) icons.push('👈');
        return icons;
    };

    const getVotersForPlayer = (targetId: string): string[] => {
        if (!roomState || !isHost || roomState.status !== 'DAY') return [];
        const voterIds = Object.keys(roomState.votes).filter(voterId => roomState.votes[voterId] === targetId);
        return voterIds.map(vid => roomState.players.find(p => p.id === vid)?.name || 'Unknown');
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.error(err));
        else if (document.exitFullscreen) document.exitFullscreen();
    };
    
    const applyPreset = (presetCounts: Record<string, number>) => {
        if(!roomState) return;
        updateWerewolfRoomState(roomState.roomId, { settings: { ...roomState.settings, roleCounts: presetCounts } });
    };

    if (isLoading) return <div className="fixed inset-0 z-[100] min-h-screen bg-slate-950 flex flex-col items-center justify-center"><LoadingSpinner size="lg" /></div>;

    if (!roomId) {
        return (
            <div className="fixed inset-0 z-[100] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black flex flex-col items-center justify-center p-6 text-white animate-fade-in overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
                <div className="relative z-10 text-center mb-12">
                    <div className="text-8xl mb-4 animate-pulse filter drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]">🐺</div>
                    <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 mb-2 tracking-tighter drop-shadow-sm">WEREWOLF</h1>
                    <h2 className="text-xl sm:text-2xl font-light tracking-[0.8em] text-slate-400 ml-2">EXTREME</h2>
                </div>
                <div className="relative z-10 w-full max-w-md space-y-6 bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <button onClick={handleCreateRoom} disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-red-700 to-purple-900 rounded-2xl font-bold text-xl shadow-[0_0_25px_rgba(220,38,38,0.3)] hover:scale-[1.02] transition-transform active:scale-95 border-t border-white/20">{isLoading ? 'Summoning...' : 'สร้างห้องใหม่'}</button>
                    <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-700"></div><span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-widest">Or Join</span><div className="flex-grow border-t border-slate-700"></div></div>
                    <div className="flex gap-2"><input type="text" placeholder="CODE" className="w-2/3 p-4 bg-black/50 border border-slate-700 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono text-white placeholder-slate-600" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} /><button onClick={handleJoinRoom} className="w-1/3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-200 border border-slate-600 transition-colors">JOIN</button></div>
                    <button onClick={onBack} className="w-full text-center text-slate-500 text-sm hover:text-white transition-colors mt-4">← กลับหน้าหลัก</button>
                </div>
            </div>
        );
    }

    if (!roomState) return <div className="fixed inset-0 z-[100] min-h-screen bg-slate-950 flex flex-col items-center justify-center"><LoadingSpinner size="lg" /></div>;

    const renderLobby = () => (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950 text-white custom-scrollbar flex flex-col p-4 sm:p-6">
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                <button onClick={handleLeaveRoom} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm font-bold border border-red-500/30">← ออก</button>
                <button onClick={() => setShowHelp(true)} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-sm font-bold border border-blue-500/30">📖 คู่มือ</button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 mt-12 gap-4">
                <div><h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-600 to-blue-600">WEREWOLF</h1><span className="text-xl tracking-[0.5em] text-slate-400 font-light">EXTREME</span></div>
                <div className="flex flex-col items-center gap-2"><p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Room Code</p><div className="text-5xl font-mono font-bold text-cyan-400 border-2 border-cyan-500/50 bg-cyan-950/30 px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer hover:bg-cyan-900/50 transition-colors" onClick={() => { navigator.clipboard.writeText(roomState!.roomId); notification.addToast({type:'success', title:'Copied!'}) }}>{roomState!.roomId}</div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                <div className="lg:col-span-1 glass-card bg-slate-900/60 p-6 rounded-3xl border border-slate-700/50 h-full flex flex-col">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><span className="text-yellow-500">📜</span> รายชื่อผู้เล่น ({roomState!.players.length})</h3>
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar p-1 flex-grow content-start">{roomState!.players.map(p => <PlayerAvatar key={p.id} player={p} />)}</div>
                </div>
                <div className="lg:col-span-2 glass-card bg-slate-900/60 p-6 rounded-3xl border border-slate-700/50 flex flex-col">
                    {isHost ? (
                        <>
                            <div className="flex justify-between items-end mb-4 border-b border-slate-700 pb-2 flex-shrink-0"><div><h3 className="text-xl font-bold text-white">จัดชุดการ์ด</h3><p className="text-sm text-slate-400">เลือกบทบาทให้ครบจำนวนผู้เล่น</p></div><div className="text-right text-xs text-slate-500">Total: {Object.values(roomState!.settings.roleCounts).reduce((a: number, b: number) => a + b, 0)} / {roomState!.players.length - 1}</div></div>
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {GAME_PRESETS.map((preset, idx) => (
                                    <button key={idx} onClick={() => applyPreset(preset.counts)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs whitespace-nowrap transition-colors border border-white/10">
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8 overflow-y-auto custom-scrollbar p-2 flex-grow">
                                {Object.values(ROLE_DEFINITIONS).filter(def => def.id !== WerewolfRole.MODERATOR).map(def => (
                                    <RoleCard key={def.id} role={def.id} count={roomState!.settings.roleCounts[def.id] || 0} 
                                        onIncrement={() => { const newCounts = { ...roomState!.settings.roleCounts }; newCounts[def.id] = (newCounts[def.id] || 0) + 1; updateWerewolfRoomState(roomId, { settings: { ...roomState!.settings, roleCounts: newCounts } }); }}
                                        onDecrement={() => { const newCounts = { ...roomState!.settings.roleCounts }; newCounts[def.id] = Math.max(0, (newCounts[def.id] || 0) - 1); updateWerewolfRoomState(roomId, { settings: { ...roomState!.settings, roleCounts: newCounts } }); }} />
                                ))}
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4 flex-shrink-0"><button onClick={handleStartGame} className="w-full py-4 bg-gradient-to-r from-red-600 to-purple-800 text-white font-black text-xl rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-[1.02] transition-transform active:scale-95 border-t border-white/20">เริ่มเกมล่าปริศนา</button></div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400"><LoadingSpinner size="lg" /><p className="mt-6 text-lg font-light tracking-wide animate-pulse">Waiting for host to start...</p></div>
                    )}
                </div>
            </div>
            {showHelp && <RoleHelpModal onClose={() => setShowHelp(false)} />}
        </div>
    );

    const renderGame = () => {
        const isActive = myPlayer?.isAlive && ((roomState!.status === 'NIGHT' && roomState!.activeRoleTurn === myPlayer!.role) || (roomState!.status === 'DAY' && roomState!.phase === 'VOTE'));
        const isNight = roomState!.status === 'NIGHT';
        const bgClass = isNight ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black' : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-800 via-sky-950 to-slate-900';

        // Custom action for Detective and Witch
        const showActionOverlay = isActive && (myPlayer?.role === WerewolfRole.DETECTIVE || myPlayer?.role === WerewolfRole.WITCH);

        return (
            <div className={`fixed inset-0 z-[90] flex flex-col transition-colors duration-1000 ${bgClass} overflow-hidden`}>
                {showRoleReveal && myPlayer && <RoleReveal role={myPlayer.role} onDismiss={() => { setShowRoleReveal(false); setHasSeenRole(true); }} />}
                
                {/* Result Modals */}
                {seerResult && <InfoModal title="นิมิตเทพพยากรณ์" icon="🔮" type="reveal" content={<div><p className="text-xl">{seerResult.name} คือ...</p><div className={`text-4xl mt-2 font-bold ${seerResult.isEvil ? 'text-red-500' : 'text-green-400'}`}>{seerResult.isEvil ? 'ฝ่ายร้าย (Evil)' : 'ฝ่ายดี (Good)'}</div></div>} onDismiss={() => setSeerResult(null)} />}
                {sorcererResult && <InfoModal title="การค้นหาของหมอผี" icon="🧙‍♂️" type="reveal" content={<div><p className="text-xl">{sorcererResult.name}...</p><div className={`text-4xl mt-2 font-bold ${sorcererResult.isSeer ? 'text-purple-400' : 'text-slate-400'}`}>{sorcererResult.isSeer ? 'เป็นเทพพยากรณ์!' : 'ไม่ใช่เทพพยากรณ์'}</div></div>} onDismiss={() => setSorcererResult(null)} />}
                {detectiveResult && <InfoModal title="การสืบสวน" icon="🕵️" type="reveal" content={<div><p className="text-xl">{detectiveResult.name}...</p><div className="text-2xl mt-4 font-bold text-yellow-300">"น่าสงสัยว่าจะเป็น... {detectiveResult.roleName}"</div></div>} onDismiss={() => setDetectiveResult(null)} />}
                {mediumResult && <InfoModal title="สื่อสารวิญญาณ" icon="👻" type="info" content={<div><p>เมื่อคืนมีผู้เสียชีวิต {mediumResult.deadCount} คน</p><div className="text-2xl mt-2 text-slate-300">วิญญาณบอกว่า... <br/><span className={mediumResult.hasWolf ? "text-red-400" : "text-green-400"}>{mediumResult.hasWolf ? "มีมนุษย์หมาป่าตาย!" : "ไม่มีมนุษย์หมาป่าตาย"}</span></div></div>} onDismiss={() => setMediumResult(null)} />}
                {showEndGameModal && <GameEndModal room={roomState!} onDismiss={() => { setShowEndGameModal(false); setRoomState(null); localStorage.removeItem(STORAGE_KEY); onBack(); }} />}

                {showHelp && <RoleHelpModal onClose={() => setShowHelp(false)} />}
                
                <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/foggy-birds.png')] animate-pulse-slow"></div>
                
                {/* Turn Indicator Banner */}
                {isNight && roomState?.activeRoleTurn && (
                    <div className="mx-4 mt-16 md:mt-4 mb-2 p-3 rounded-xl bg-gradient-to-r from-indigo-900/90 to-purple-900/90 border border-indigo-500/50 shadow-lg text-center relative overflow-hidden z-20 animate-fade-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"></div>
                        
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                            <div className="flex items-center gap-4">
                                <span className="text-5xl filter drop-shadow-lg animate-bounce-slow">{ROLE_DEFINITIONS[roomState.activeRoleTurn].icon}</span>
                                <div className="text-left">
                                    <div className="text-xs text-indigo-300 uppercase tracking-wider font-bold mb-0.5">Current Turn</div>
                                    <div className="text-2xl font-black text-white tracking-wide text-shadow-md leading-none">
                                        {ROLE_DEFINITIONS[roomState.activeRoleTurn].name}
                                    </div>
                                    <div className="text-xs text-indigo-200 opacity-80 mt-1">{getRolePhaseMessage(roomState.activeRoleTurn)}</div>
                                </div>
                            </div>
                            
                            {isHost && (
                                <div className="bg-black/40 px-4 py-2 rounded-lg border-l-4 border-yellow-500 text-left min-w-[200px] shadow-inner">
                                    <div className="text-[10px] text-yellow-400 font-bold uppercase mb-0.5 tracking-wider">Host Instruction</div>
                                    <div className="text-sm text-yellow-100 font-medium">
                                        🗣️ {getHostInstruction(roomState.activeRoleTurn)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="relative z-10 flex justify-between items-center glass-card bg-black/40 p-3 sm:p-4 rounded-b-2xl mb-2 text-white border-b border-white/10 shadow-lg shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={handleLeaveRoom} className="p-2 bg-white/10 rounded-full hover:bg-red-500/50 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                        <button onClick={() => setShowHelp(true)} className="p-2 bg-blue-500/20 text-blue-300 rounded-full hover:bg-blue-500 hover:text-white transition-colors" title="Rules">📖</button>
                        {isHost && (
                            <button 
                                onClick={() => setShowModTools(true)} 
                                className="p-2 bg-yellow-500/20 text-yellow-300 rounded-full hover:bg-yellow-500 hover:text-white transition-colors" 
                                title="Moderator Tools"
                            >
                                🛠️
                            </button>
                        )}
                        <div><h2 className={`font-bold text-lg sm:text-xl uppercase tracking-wider ${isNight ? 'text-indigo-300' : 'text-yellow-200'}`}>{isNight ? 'Night' : 'Day'}</h2><div className="text-[10px] sm:text-xs text-slate-400 font-mono">Day {roomState!.dayCount} • {roomState!.phase}</div></div>
                    </div>
                    <div className="flex flex-col items-end"><div className={`text-3xl sm:text-4xl font-mono font-bold tracking-widest ${timeLeft < 10 ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}>{timeLeft}s</div><div className="flex gap-2">{isActive && <div className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 animate-pulse">YOUR TURN</div>}<button onClick={toggleFullscreen} className="text-white opacity-50 hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button></div></div>
                </div>

                <div className="relative z-10 flex-grow flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                    <div className="glass-card bg-slate-900/60 p-4 rounded-3xl border border-slate-700/50 flex flex-row lg:flex-col items-center justify-between lg:justify-center text-white shadow-2xl shrink-0 lg:w-64">
                        <div className="hidden lg:block"><RoleCard role={myPlayer!.role} large /></div>
                        <div className="lg:block flex items-center gap-4 lg:mt-6 text-center w-full">
                            <div className="lg:hidden text-3xl">{ROLE_DEFINITIONS[myPlayer!.role].icon}</div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase tracking-widest lg:mb-1">Identity</div>
                                <p className="text-lg lg:text-2xl font-bold truncate text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{myPlayer!.name}</p>
                                <div className={`lg:mt-2 py-0.5 px-2 lg:px-4 rounded-full text-[10px] lg:text-xs font-bold inline-block border ${myPlayer!.isAlive ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-500 border-red-800'}`}>{myPlayer!.isAlive ? 'ALIVE' : 'DEAD'}</div>
                            </div>
                        </div>
                        {isHost && (
                            <div className="ml-auto lg:ml-0 lg:mt-auto lg:w-full">
                                <button onClick={handleNextPhase} className="px-4 py-2 lg:w-full lg:py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-600 transition-colors shadow-lg whitespace-nowrap">Next Phase</button>
                            </div>
                        )}
                    </div>

                    <div className="glass-card bg-slate-900/60 p-4 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-2xl flex flex-col flex-grow">
                        {!isActive && isNight && !isHost && (
                            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white transition-opacity duration-500">
                                <p className="text-slate-400 mb-4 text-lg tracking-widest uppercase">Waiting for...</p>
                                <div className="text-6xl animate-bounce filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{ROLE_DEFINITIONS[roomState!.activeRoleTurn as WerewolfRole]?.icon || '💤'}</div>
                                <h2 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">{ROLE_DEFINITIONS[roomState!.activeRoleTurn as WerewolfRole]?.name || 'Everyone Asleep'}</h2>
                            </div>
                        )}
                        
                        {/* Special Role Interfaces */}
                        {showActionOverlay && myPlayer?.role === WerewolfRole.DETECTIVE && !detectiveResult && (
                            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                <div className="text-6xl mb-6 animate-pulse">🕵️</div>
                                <h3 className="text-2xl font-bold text-white mb-2">ถึงเวลาสืบสวน</h3>
                                <p className="text-slate-400 mb-8 max-w-sm">ระบบจะสุ่มตรวจสอบผู้เล่น 1 คนและให้เบาะแสเกี่ยวกับฝ่ายของเขา</p>
                                <button 
                                    onClick={() => handleAction(null)} // Trigger automatic logic
                                    className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform"
                                >
                                    🔍 สุ่มสืบหาเบาะแส
                                </button>
                            </div>
                        )}

                        {showActionOverlay && myPlayer?.role === WerewolfRole.WITCH && witchMode === 'CHOOSING_POTION' && (
                            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                <h3 className="text-2xl font-bold text-white mb-6">เลือกน้ำยาที่จะใช้</h3>
                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                    <button 
                                        disabled={myPlayer.potionHealUsed || (roomState.nightActions.wolvesTarget || []).length === 0}
                                        onClick={handleWitchHeal}
                                        className="flex-1 py-4 bg-green-600 disabled:bg-green-900/30 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg border border-green-500/50 flex flex-col items-center gap-2 hover:bg-green-500 transition-colors"
                                    >
                                        <span className="text-3xl">⚗️</span>
                                        <span>ชุบชีวิต</span>
                                        {myPlayer.potionHealUsed ? <span className="text-xs font-normal opacity-70">(ใช้แล้ว)</span> : (roomState.nightActions.wolvesTarget || []).length === 0 ? <span className="text-xs font-normal opacity-70">(ไม่มีคนตาย)</span> : null}
                                    </button>
                                    <button 
                                        disabled={myPlayer.potionKillUsed}
                                        onClick={() => setWitchMode('SELECTING_POISON_TARGET')}
                                        className="flex-1 py-4 bg-purple-600 disabled:bg-purple-900/30 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg border border-purple-500/50 flex flex-col items-center gap-2 hover:bg-purple-500 transition-colors"
                                    >
                                        <span className="text-3xl">☠️</span>
                                        <span>ยาพิษ</span>
                                        {myPlayer.potionKillUsed && <span className="text-xs font-normal opacity-70">(ใช้แล้ว)</span>}
                                    </button>
                                </div>
                                <div className="mt-6">
                                    <button 
                                        onClick={() => handleNextPhase()} // Or handle action completion
                                        className="text-sm text-slate-400 hover:text-white underline"
                                    >
                                        ไม่ทำอะไร (จบตา)
                                    </button>
                                </div>
                                <div className="mt-2 text-slate-500 text-xs">
                                    { (roomState.nightActions.wolvesTarget?.length || 0) > 0 
                                      ? `คืนนี้มีคนกำลังจะตาย...` 
                                      : `คืนนี้เงียบสงบ ยังไม่มีใครบาดเจ็บ` }
                                </div>
                            </div>
                        )}
                        
                        {/* Player Grid - Only interactive for standard selection or Witch Poison */}
                        <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-6 overflow-y-auto custom-scrollbar flex-grow content-start pb-20 lg:pb-0 transition-opacity ${showActionOverlay && (myPlayer?.role === WerewolfRole.DETECTIVE || (myPlayer?.role === WerewolfRole.WITCH && witchMode === 'CHOOSING_POTION')) ? 'opacity-10 pointer-events-none' : 'opacity-100'}`}>
                            {roomState!.players.filter(p => p.role !== WerewolfRole.MODERATOR).map(p => (
                                <PlayerAvatar 
                                    key={p.id} 
                                    player={p} 
                                    dead={!p.isAlive} 
                                    showRole={p.id === myPlayer!.id || roomState!.status === 'ENDED' || isHost || (myPlayer!.role === WerewolfRole.WEREWOLF && p.role === WerewolfRole.WEREWOLF) || p.isMayorRevealed || p.role === WerewolfRole.PRINCE} 
                                    selected={getStatusIcons(p.id).length > 0} 
                                    statusIcons={getStatusIcons(p.id)} 
                                    voters={isHost ? getVotersForPlayer(p.id) : []} 
                                    onClick={() => handleAction(p.id)}
                                    isMinionView={myPlayer?.role === WerewolfRole.MINION}
                                />
                            ))}
                        </div>
                        
                        {/* Witch Back Button */}
                        {isActive && myPlayer?.role === WerewolfRole.WITCH && witchMode === 'SELECTING_POISON_TARGET' && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
                                <button onClick={() => setWitchMode('CHOOSING_POTION')} className="px-6 py-2 bg-slate-700 text-white rounded-full shadow-lg border border-slate-500 font-bold hover:bg-slate-600">
                                    ยกเลิก / กลับไปเลือกยา
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div ref={logContainerRef} className="relative z-10 glass-card bg-black/80 p-3 rounded-t-2xl lg:rounded-xl h-32 lg:h-40 overflow-y-auto border-t lg:border border-white/10 shadow-inner custom-scrollbar shrink-0 lg:mx-4 lg:mb-4 scroll-smooth">
                    <div className="font-mono text-xs space-y-1">{roomState!.logs.map((log, i) => (<div key={i} className="opacity-80 hover:opacity-100 transition-opacity border-l-2 border-slate-700 pl-2"><span className="text-slate-500 mr-2">[{i+1}]</span><span className="text-green-400">{log}</span></div>))}</div>
                </div>

                {/* Moderator Tools Modal */}
                {showModTools && isHost && roomState && (
                    <Modal isOpen={showModTools} onClose={() => setShowModTools(false)} title="Moderator Tools 🛠️">
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
                            <p className="text-xs text-slate-400 mb-4 italic">ใช้สำหรับแก้ไขสถานะผู้เล่นหรือจัดการเหตุการณ์พิเศษ (เช่น นายพรานยิง)</p>
                            {roomState.players.filter(p => p.role !== WerewolfRole.MODERATOR).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{ROLE_DEFINITIONS[p.role]?.icon || '👤'}</div>
                                        <div>
                                            <div className="font-bold text-sm text-white">{p.name}</div>
                                            <div className="text-[10px] text-slate-400">{ROLE_DEFINITIONS[p.role]?.name} • {p.isAlive ? 'ALIVE' : 'DEAD'}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={async () => {
                                                const updatedPlayers = roomState.players.map(pl => pl.id === p.id ? { ...pl, isAlive: !pl.isAlive } : pl);
                                                await updateWerewolfRoomState(roomState.roomId, { 
                                                    players: updatedPlayers,
                                                    logs: [...roomState.logs, `[MOD] ${p.name} ถูก${p.isAlive ? 'สังหาร' : 'ชุบชีวิต'}โดยผู้ดำเนินเกม`]
                                                });
                                            }}
                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${p.isAlive ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white'}`}
                                        >
                                            {p.isAlive ? 'KILL' : 'REVIVE'}
                                        </button>
                                        <select 
                                            className="bg-slate-800 text-white text-[10px] rounded px-1 border border-white/10 focus:outline-none focus:border-yellow-500"
                                            value={p.role}
                                            onChange={async (e) => {
                                                const newRole = e.target.value as WerewolfRole;
                                                const updatedPlayers = roomState.players.map(pl => pl.id === p.id ? { ...pl, role: newRole } : pl);
                                                await updateWerewolfRoomState(roomState.roomId, { 
                                                    players: updatedPlayers,
                                                    logs: [...roomState.logs, `[MOD] ${p.name} ถูกเปลี่ยนบทบาทเป็น ${ROLE_DEFINITIONS[newRole].name}`]
                                                });
                                            }}
                                        >
                                            {Object.values(WerewolfRole).filter(r => r !== WerewolfRole.MODERATOR).map(role => (
                                                <option key={role} value={role}>{ROLE_DEFINITIONS[role]?.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Modal>
                )}
            </div>
        );
    };

    return roomState.status === 'LOBBY' ? renderLobby() : renderGame();
};

export default WerewolfGame;
