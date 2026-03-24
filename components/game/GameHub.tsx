
import React, { useState } from 'react';
import MusicRunnerGame from './MusicRunnerGame';
import WerewolfGame from './WerewolfGame';
import GachaGame from './GachaGame';
import Marketplace from './Marketplace';
import UnoGameContainer from './uno/UnoGameContainer'; // Updated Import
import { StudentWithId } from '../../types';

interface GameHubProps {
    student: StudentWithId;
    onUpdateStudent: (student: StudentWithId) => void;
}

const GameHub: React.FC<GameHubProps> = ({ student, onUpdateStudent }) => {
    const [selectedGame, setSelectedGame] = useState<'NONE' | 'RUNNER' | 'WEREWOLF' | 'GACHA' | 'MARKET' | 'UNO'>('NONE');

    if (selectedGame === 'RUNNER') {
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedGame('NONE')} className="mb-4 flex items-center text-sm font-medium text-gray-500 hover:text-accent transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    กลับไปเลือกเกม
                </button>
                <MusicRunnerGame student={student} onUpdateStudent={onUpdateStudent} />
            </div>
        );
    }

    if (selectedGame === 'WEREWOLF') {
        return <WerewolfGame student={student} onBack={() => setSelectedGame('NONE')} />;
    }

    if (selectedGame === 'GACHA') {
        return <GachaGame student={student} onBack={() => setSelectedGame('NONE')} onUpdateStudent={onUpdateStudent} />;
    }

    if (selectedGame === 'UNO') {
        // Updated to use the new Container which wraps Lobby and Board
        return <UnoGameContainer student={student} onBack={() => setSelectedGame('NONE')} onUpdateStudent={onUpdateStudent} />;
    }

    if (selectedGame === 'MARKET') {
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedGame('NONE')} className="mb-4 flex items-center text-sm font-medium text-gray-500 hover:text-accent transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    กลับไปเลือกเกม
                </button>
                <div className="text-center p-8 bg-black/10 rounded-xl">
                    <p>กรุณาเข้าใช้งานตลาดซื้อขายผ่านเมนู "ตลาดซื้อขาย" ในหน้า Dashboard หลัก</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in py-6">
            {/* Uno Card */}
            <div 
                onClick={() => setSelectedGame('UNO')}
                className="group relative cursor-pointer glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-white/20 aspect-[4/3] flex flex-col"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-red-500/20 group-hover:opacity-100 opacity-80 transition-opacity"></div>
                <div className="flex-grow flex items-center justify-center bg-black/10 relative">
                    <div className="text-8xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg z-10 rotate-12">🃏</div>
                    <div className="absolute text-4xl top-8 left-8 animate-pulse text-yellow-300">UNO</div>
                </div>
                <div className="p-6 relative z-10 bg-white/10 backdrop-blur-md border-t border-white/10">
                    <h3 className="text-2xl font-bold text-shadow mb-1" style={{color: 'var(--text-primary)'}}>One Card Party</h3>
                    <p className="text-sm opacity-80" style={{color: 'var(--text-secondary)'}}>เกมไพ่ยอดฮิต เดิมพันด้วย Coins</p>
                    <div className="mt-3 flex items-center text-xs font-bold text-yellow-600">
                        <span className="bg-yellow-100 px-2 py-1 rounded-md border border-yellow-500">Betting</span>
                        <span className="ml-2 bg-red-100 px-2 py-1 rounded-md border border-red-500 text-red-600">PvP</span>
                    </div>
                </div>
            </div>

            {/* Gacha Card */}
            <div 
                onClick={() => setSelectedGame('GACHA')}
                className="group relative cursor-pointer glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-white/20 aspect-[4/3] flex flex-col"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-600/20 group-hover:opacity-100 opacity-80 transition-opacity"></div>
                <div className="flex-grow flex items-center justify-center bg-black/10 relative">
                    <div className="text-8xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg z-10 animate-bounce-slow">🎰</div>
                    <div className="absolute text-4xl top-8 left-8 animate-pulse text-yellow-300">✨</div>
                    <div className="absolute text-4xl bottom-8 right-8 animate-pulse delay-700 text-blue-300">🎁</div>
                </div>
                <div className="p-6 relative z-10 bg-white/10 backdrop-blur-md border-t border-white/10">
                    <h3 className="text-2xl font-bold text-shadow mb-1" style={{color: 'var(--text-primary)'}}>SRTC Lucky Gacha</h3>
                    <p className="text-sm opacity-80" style={{color: 'var(--text-secondary)'}}>ลุ้นรับไอเท็มหายากและของรางวัลพิเศษ</p>
                    <div className="mt-3 flex items-center text-xs font-bold text-pink-500">
                        <span className="bg-pink-100 px-2 py-1 rounded-md">Luck</span>
                        <span className="ml-2 bg-yellow-100 px-2 py-1 rounded-md text-yellow-700">Rewards</span>
                    </div>
                </div>
            </div>

            {/* Tech Runner Card */}
            <div 
                onClick={() => setSelectedGame('RUNNER')}
                className="group relative cursor-pointer glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-white/20 aspect-[4/3] flex flex-col"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-600/20 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                <div className="flex-grow flex items-center justify-center bg-black/10">
                    <div className="text-8xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">🏃</div>
                </div>
                <div className="p-6 relative z-10 bg-white/10 backdrop-blur-md border-t border-white/10">
                    <h3 className="text-2xl font-bold text-shadow mb-1" style={{color: 'var(--text-primary)'}}>Tech Runner</h3>
                    <p className="text-sm opacity-80" style={{color: 'var(--text-secondary)'}}>วิ่งเก็บของ หลบสิ่งกีดขวาง ชิงอันดับ 1</p>
                    <div className="mt-3 flex items-center text-xs font-bold text-orange-500">
                        <span className="bg-orange-100 px-2 py-1 rounded-md">Action</span>
                        <span className="ml-2 bg-yellow-100 px-2 py-1 rounded-md text-yellow-700">Leaderboard</span>
                    </div>
                </div>
            </div>

            {/* Werewolf Card */}
            <div 
                onClick={() => setSelectedGame('WEREWOLF')}
                className="group relative cursor-pointer glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-white/20 aspect-[4/3] flex flex-col"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-red-950 group-hover:opacity-100 opacity-90 transition-opacity"></div>
                <div className="flex-grow flex items-center justify-center relative">
                    <div className="text-8xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] z-10">🐺</div>
                    <div className="absolute text-4xl top-5 right-5 animate-pulse text-yellow-100">🌕</div>
                </div>
                <div className="p-6 relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10">
                    <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">Werewolf Extreme</h3>
                    <p className="text-sm text-gray-300">เกมล่าปริศนามนุษย์หมาป่า (5-30 คน)</p>
                    <div className="mt-3 flex items-center text-xs font-bold">
                        <span className="bg-red-900 text-red-100 px-2 py-1 rounded-md border border-red-700">Multiplayer</span>
                        <span className="ml-2 bg-gray-700 text-gray-200 px-2 py-1 rounded-md border border-gray-500">Social</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHub;
