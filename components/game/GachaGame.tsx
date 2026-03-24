import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, StudentWithId } from '../../types';
import { GAME_ITEMS, performGachaPull, GameItem } from '../../utils/gamification';
import { updateStudent } from '../../services/studentService';
import { saveGachaLog } from '../../services/googleSheetService';
import { getGameConfig } from '../../services/configService';
import { useNotification } from '../../contexts/NotificationContext';
import { playSuccessSound } from '../../utils/soundUtils';

interface GachaGameProps {
    student: StudentWithId;
    onBack: () => void;
    onUpdateStudent: (student: StudentWithId) => void;
}

const GachaGame: React.FC<GachaGameProps> = ({ student, onBack, onUpdateStudent }) => {
    // Game States: IDLE -> CHARGING -> EXPLODING -> RESULT
    const [gameState, setGameState] = useState<'IDLE' | 'CHARGING' | 'EXPLODING' | 'RESULT'>('IDLE');
    const [resultItem, setResultItem] = useState<GameItem | null>(null);
    const [inventory, setInventory] = useState(student.inventory || {});
    const [coins, setCoins] = useState(student.coins || 0);
    const [paymentMethod, setPaymentMethod] = useState<'TICKET' | 'COIN'>('TICKET');
    const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
    
    // Animation Refs & State
    const [chargeLevel, setChargeLevel] = useState(0); // 0-100%
    const [explosionColor, setExplosionColor] = useState('#ffffff'); // Dynamic based on rarity
    
    const notification = useNotification();
    const ticketCount = inventory['gacha_ticket'] || 0;
    const GACHA_COIN_COST = gameConfig?.gacha.coinCost || 500;

    useEffect(() => {
        const fetchConfig = async () => {
            const res = await getGameConfig();
            if (res.success && res.data) {
                setGameConfig(res.data);
            }
        };
        fetchConfig();
    }, []);

    // Helper to get colors
    const getRarityBaseColor = (rarity: string) => {
        switch(rarity) {
            case 'legendary': return '#eab308'; // Gold
            case 'epic': return '#a855f7'; // Purple
            case 'rare': return '#3b82f6'; // Blue
            default: return '#22c55e'; // Green
        }
    };

    const getRarityGlow = (rarity: string) => {
        switch(rarity) {
            case 'legendary': return 'shadow-[0_0_50px_rgba(234,179,8,0.8)]';
            case 'epic': return 'shadow-[0_0_50px_rgba(168,85,247,0.8)]';
            case 'rare': return 'shadow-[0_0_50px_rgba(59,130,246,0.8)]';
            default: return 'shadow-[0_0_30px_rgba(34,197,94,0.6)]';
        }
    };

    const handleSpin = async () => {
        if (gameState !== 'IDLE') return;

        const useCoins = paymentMethod === 'COIN';
        if (!useCoins && ticketCount <= 0) {
            notification.addToast({ type: 'warning', title: 'ตั๋วหมด', message: 'คุณสามารถเปลี่ยนไปใช้ Music Coins ได้' });
            return;
        }
        if (useCoins && coins < GACHA_COIN_COST) {
            notification.addToast({ type: 'warning', title: 'เหรียญไม่พอ', message: `ต้องการ ${GACHA_COIN_COST} Coins เพื่อสุ่ม` });
            return;
        }

        // 1. Transaction Logic
        let newInventory = { ...inventory };
        let newCoins = coins;

        if (useCoins) {
            newCoins -= GACHA_COIN_COST;
            setCoins(newCoins);
        } else {
            newInventory['gacha_ticket'] = ticketCount - 1;
            if (newInventory['gacha_ticket'] <= 0) delete newInventory['gacha_ticket'];
            setInventory(newInventory);
        }

        // 2. Determine Result Immediately (to control animation color)
        const pool = gameConfig?.gacha?.pool || undefined;
        const itemId = performGachaPull(pool);
        const item = GAME_ITEMS[itemId];
        
        // Pre-set explosion color based on result
        const rareColor = getRarityBaseColor(item.rarity);
        setExplosionColor(rareColor);

        // 3. Start Charging Animation
        setGameState('CHARGING');
        setChargeLevel(0);
        playSuccessSound(); 

        // Animate Charge up (0 to 100%)
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            setChargeLevel(Math.min(progress, 100));
            if (progress >= 100) clearInterval(interval);
        }, 30); // ~1.5 seconds charge time

        // 4. Trigger Explosion & Result
        setTimeout(() => {
            setGameState('EXPLODING');
            
            // Short delay for explosion visual to peak before showing item
            setTimeout(async () => {
                setResultItem(item);
                setGameState('RESULT');
                
                // Update DB
                const finalInventory = { ...newInventory };
                finalInventory[itemId] = (finalInventory[itemId] || 0) + 1;
                setInventory(finalInventory);
                
                const updatedStudent = {
                    ...student,
                    inventory: finalInventory,
                    coins: newCoins,
                    gachaPullCount: (student.gachaPullCount || 0) + 1
                };

                await updateStudent(updatedStudent);
                onUpdateStudent(updatedStudent);
                await saveGachaLog({
                    studentId: student.studentId,
                    studentName: student.firstName,
                    itemId: item.id,
                    itemName: item.name,
                    rarity: item.rarity
                });

            }, 400); // Wait for whiteout
        }, 1600); // Wait for charge
    };

    const handleReset = () => {
        setGameState('IDLE');
        setResultItem(null);
        setChargeLevel(0);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* --- Dynamic Background --- */}
            <div 
                className="absolute inset-0 transition-colors duration-1000"
                style={{
                    background: gameState === 'IDLE' 
                        ? 'radial-gradient(circle at center, #1e1b4b 0%, #000000 100%)'
                        : `radial-gradient(circle at center, ${gameState === 'CHARGING' ? '#312e81' : explosionColor} 0%, #000000 100%)`,
                    opacity: gameState === 'EXPLODING' ? 0.4 : 1
                }}
            ></div>
            
            {/* Starfield / Particles */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 animate-pulse-slow"></div>
            
            {/* --- EXPLOSION FLASH OVERLAY --- */}
            <div 
                className={`absolute inset-0 z-[150] pointer-events-none transition-opacity duration-300 ease-out`}
                style={{
                    backgroundColor: explosionColor,
                    opacity: gameState === 'EXPLODING' ? 1 : 0
                }}
            ></div>

            {/* Header */}
            <div className="absolute top-0 left-0 w-full px-4 py-4 flex justify-between items-center z-20">
                <button onClick={onBack} className="p-2 bg-black/40 rounded-full border border-white/10 hover:bg-white/10 text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex gap-3">
                    <div className="glass-card px-4 py-2 rounded-full border border-pink-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                        <span className="text-xl">🎟️</span>
                        <span className="text-pink-300 font-bold font-mono text-lg">{ticketCount}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-full border border-yellow-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <span className="text-xl">🪙</span>
                        <span className="text-yellow-300 font-bold font-mono text-lg">{coins}</span>
                    </div>
                </div>
            </div>

            {/* --- 3D SUMMONING CORE --- */}
            <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ${gameState === 'RESULT' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                
                {/* 1. Core Energy Sphere */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                    
                    {/* Outer Glow Ring (Static) */}
                    <div className="absolute inset-[-20px] rounded-full border-2 border-white/10 opacity-30"></div>
                    
                    {/* Rotating Rings (Gyroscope) */}
                    <div className={`absolute inset-0 rounded-full border-[3px] border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-[2000ms] ease-in`}
                        style={{
                            transform: `rotateX(${gameState === 'CHARGING' ? chargeLevel * 20 : 60}deg) rotateY(${gameState === 'CHARGING' ? chargeLevel * 10 : 0}deg)`,
                            opacity: 0.8
                        }}
                    ></div>
                    <div className={`absolute inset-4 rounded-full border-[3px] border-purple-400/50 shadow-[0_0_15px_rgba(192,132,252,0.5)] transition-all duration-[2000ms] ease-in`}
                         style={{
                             transform: `rotateY(${gameState === 'CHARGING' ? chargeLevel * -15 : 60}deg) rotateZ(${gameState === 'CHARGING' ? chargeLevel * 5 : 45}deg)`,
                             opacity: 0.8
                         }}
                    ></div>
                    <div className={`absolute inset-8 rounded-full border-[4px] border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-[2000ms] ease-in`}
                         style={{
                             transform: `rotateX(${gameState === 'CHARGING' ? chargeLevel * 30 : 0}deg) rotateZ(${gameState === 'CHARGING' ? chargeLevel * 20 : -45}deg)`,
                         }}
                    ></div>

                    {/* The Core Orb */}
                    <div 
                        className={`w-32 h-32 rounded-full bg-gradient-to-br from-white via-cyan-300 to-blue-600 shadow-[inset_-10px_-10px_30px_rgba(0,0,0,0.5),0_0_50px_rgba(56,189,248,0.6)] relative overflow-hidden transition-transform duration-100`}
                        style={{
                            transform: gameState === 'CHARGING' ? `scale(${1 + chargeLevel/200}) shake(5px)` : 'scale(1)',
                            filter: gameState === 'CHARGING' ? `brightness(${1 + chargeLevel/50})` : 'brightness(1)'
                        }}
                    >
                        {/* Energy Texture inside */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-30 mix-blend-overlay animate-spin-slow"></div>
                        <div className={`absolute inset-0 bg-white opacity-0 ${gameState === 'CHARGING' ? 'animate-pulse' : ''}`}></div>
                    </div>

                    {/* Charge Particles (Visible only when charging) */}
                    {gameState === 'CHARGING' && (
                        <>
                           {[...Array(8)].map((_, i) => (
                               <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                                    style={{
                                        top: '50%', left: '50%',
                                        transform: `rotate(${i * 45}deg) translateX(${120 - chargeLevel}px)`,
                                        animationDuration: `${1000 - chargeLevel * 8}ms`
                                    }}
                               ></div>
                           ))}
                        </>
                    )}

                </div>

                {/* --- CONTROLS --- */}
                <div className="w-full max-w-xs z-20 flex flex-col items-center gap-6">
                    
                    {/* Status Text */}
                    <div className="h-8">
                         {gameState === 'CHARGING' && (
                             <p className="text-cyan-300 font-mono tracking-widest animate-pulse text-lg font-bold">
                                 CHARGING... {Math.round(chargeLevel)}%
                             </p>
                         )}
                         {gameState === 'IDLE' && (
                             <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase">
                                 System Ready
                             </p>
                         )}
                    </div>

                    {/* Payment Switch */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 relative w-full">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg transition-all duration-300 shadow-lg ${paymentMethod === 'TICKET' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
                        ></div>
                        <button 
                            onClick={() => setPaymentMethod('TICKET')}
                            disabled={gameState !== 'IDLE'}
                            className={`flex-1 relative z-10 text-xs font-bold py-3 text-center transition-colors ${paymentMethod === 'TICKET' ? 'text-white' : 'text-gray-400'}`}
                        >
                            ใช้ตั๋ว
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('COIN')}
                            disabled={gameState !== 'IDLE'}
                            className={`flex-1 relative z-10 text-xs font-bold py-3 text-center transition-colors ${paymentMethod === 'COIN' ? 'text-white' : 'text-gray-400'}`}
                        >
                            {GACHA_COIN_COST} Coins
                        </button>
                    </div>

                    {/* Main Summon Button */}
                    <button 
                        onClick={handleSpin}
                        disabled={gameState !== 'IDLE'}
                        className={`group relative w-full py-4 rounded-xl font-black text-xl tracking-widest transition-all overflow-hidden ${gameState === 'IDLE' ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-80'}`}
                    >
                        {/* Button Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 animate-[shimmer_2s_infinite]"></div>
                        {/* Glow */}
                        <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-30 transition-opacity blur-md"></div>
                        
                        <span className="relative z-10 text-white drop-shadow-md flex items-center justify-center gap-2">
                             {gameState === 'IDLE' ? 'SUMMON' : 'INITIALIZING'}
                        </span>
                    </button>

                </div>
            </div>

            {/* --- RESULT REVEAL --- */}
            {gameState === 'RESULT' && resultItem && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in p-6">
                    
                    {/* Ray Burst Background */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] opacity-20 animate-spin-slow"
                        style={{
                            background: `conic-gradient(from 0deg, ${explosionColor} 0deg, transparent 20deg, ${explosionColor} 40deg, transparent 60deg, ${explosionColor} 80deg, transparent 100deg)`
                        }}
                    ></div>
                    
                    {/* Item Container */}
                    <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-bounce-in">
                        
                        {/* Rarity Badge */}
                        <div className="mb-8 transform -rotate-2">
                            <span 
                                className="inline-block px-8 py-2 rounded-full border-2 border-white/40 text-white text-sm font-black uppercase tracking-[0.3em] backdrop-blur-md shadow-[0_0_30px_currentColor]"
                                style={{
                                    backgroundColor: explosionColor,
                                    borderColor: explosionColor,
                                    boxShadow: `0 0 40px ${explosionColor}`
                                }}
                            >
                                {resultItem.rarity}
                            </span>
                        </div>
                        
                        {/* Icon */}
                        <div className="text-[10rem] mb-8 filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-float">
                            {resultItem.icon}
                        </div>
                        
                        {/* Name */}
                        <h2 
                            className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-lg leading-tight"
                            style={{ textShadow: `0 0 30px ${explosionColor}` }}
                        >
                            {resultItem.name}
                        </h2>
                        
                        {/* Description */}
                        <p className="text-slate-300 text-base max-w-xs mb-12 leading-relaxed font-light border-l-2 border-white/20 pl-4 text-left italic">
                            {resultItem.description}
                        </p>
                        
                        {/* Action Button */}
                        <button 
                            onClick={handleReset}
                            className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-transform"
                        >
                            รับไอเทม
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GachaGame;