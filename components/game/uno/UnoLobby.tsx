
import React, { useState } from 'react';
import { useUnoStore } from './store';
import { StudentWithId } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';
import { createUnoRoom, startUnoGame, leaveUnoRoom, joinUnoRoom } from '../../../services/gameService';
import { updateStudent } from '../../../services/studentService';
import { BotDifficulty, UnoCard } from './types';

interface UnoLobbyProps {
    student: StudentWithId;
    onJoinGame: () => void;
    onBack: () => void;
}

const BET_OPTIONS = [200, 300, 500, 1000];

// Simplified Deck Generation for Host
const generateDeck = (): UnoCard[] => {
    const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const;
    const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW_2'] as const;
    let deck: UnoCard[] = [];
    COLORS.forEach(color => {
        deck.push({ id: `${color}-0`, color, value: '0' });
        for (let i = 0; i < 2; i++) {
            VALUES.slice(1).forEach(val => deck.push({ id: `${color}-${val}-${i}`, color, value: val }));
        }
    });
    for (let i = 0; i < 4; i++) {
        deck.push({ id: `wild-${i}`, color: 'BLACK', value: 'WILD' });
        deck.push({ id: `wild4-${i}`, color: 'BLACK', value: 'WILD_DRAW_4' });
    }
    return deck.sort(() => Math.random() - 0.5);
};

const UnoLobby: React.FC<UnoLobbyProps> = ({ student, onJoinGame, onBack }) => {
    const { betAmount, fee, setBet, initializeSinglePlayer, setMode, setDifficulty, mode, roomId, players } = useUnoStore();
    const notification = useNotification();
    
    // UI State for Lobby Steps
    const [lobbyStep, setLobbyStep] = useState<'MENU' | 'SINGLE_SETUP' | 'MULTI_SETUP' | 'MULTI_WAITING'>('MENU');
    const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('EASY');
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If connected to room (via store sync), show waiting room
    React.useEffect(() => {
        if (mode === 'MULTI' && roomId) {
            void Promise.resolve().then(() => setLobbyStep('MULTI_WAITING'));
        }
    }, [mode, roomId]);

    const totalCost = betAmount + fee;
    const canAfford = (student.coins || 0) >= totalCost;

    const handleSinglePlayerStart = async () => {
        const spConfig = {
            EASY: { cost: 100 },
            NORMAL: { cost: 300 },
            HARD: { cost: 500 }
        }[selectedDifficulty];

        if ((student.coins || 0) < spConfig.cost) {
            notification.addToast({ type: 'error', title: 'Coins ไม่พอ', message: `ต้องการ ${spConfig.cost} Coins` });
            return;
        }

        await updateStudent({ ...student, coins: (student.coins || 0) - spConfig.cost });
        
        setMode('SINGLE');
        setDifficulty(selectedDifficulty);
        setBet(spConfig.cost);
        initializeSinglePlayer(student);
        onJoinGame();
    };

    const handleCreateMultiRoom = async () => {
        if (!canAfford) {
            notification.addToast({ type: 'error', title: 'Coins ไม่พอ', message: `ต้องการ ${totalCost} Coins` });
            return;
        }

        setIsLoading(true);
        const res = await createUnoRoom(student.studentId, student.firstName, betAmount);
        setIsLoading(false);

        if (res.success && res.data) {
            // Store update is handled via subscription in Container, we just set mode here to trigger effect
            useUnoStore.getState().initializeMultiPlayer(student, res.data);
            onJoinGame(); 
        } else {
            notification.addToast({ type: 'error', title: 'Error', message: res.message });
        }
    };

    const handleJoin = async () => {
        if (!joinCode) return;
        setIsLoading(true);
        const res = await joinUnoRoom(joinCode, { id: student.studentId, name: student.firstName });
        setIsLoading(false);
        if (res.success) {
            // Update store to trigger container subscription
            useUnoStore.getState().initializeMultiPlayer(student, joinCode);
            onJoinGame();
        } else {
            notification.addToast({ type: 'error', title: 'Failed', message: res.message });
        }
    };

    const handleStartGame = async () => {
        if (!roomId) return;
        const deck = generateDeck();
        const firstCard = deck.pop()!;
        const hands: Record<string, UnoCard[]> = {};
        players.forEach(p => {
            hands[p.id] = deck.splice(0, 7);
        });
        
        setIsLoading(true);
        await startUnoGame(roomId, deck, firstCard, hands);
        // Phase update will come from subscription
        setIsLoading(false);
    };

    const handleLeave = async () => {
        if (roomId) await leaveUnoRoom(roomId, student.studentId);
        localStorage.removeItem('srtc_uno_active_room_id'); // Clear session
        useUnoStore.getState().resetGame();
        setLobbyStep('MENU');
    };

    const renderMenu = () => (
        <div className="space-y-6 w-full max-w-md animate-fade-in">
            <button 
                onClick={() => setLobbyStep('SINGLE_SETUP')}
                className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-xl hover:scale-[1.02] transition-transform"
            >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="text-left">
                        <h3 className="text-2xl font-black italic text-white">SINGLE PLAYER</h3>
                        <p className="text-blue-200 text-sm">Play against AI Bots</p>
                    </div>
                    <span className="text-4xl">🤖</span>
                </div>
            </button>

            <button 
                onClick={() => setLobbyStep('MULTI_SETUP')}
                className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 p-6 shadow-xl hover:scale-[1.02] transition-transform"
            >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="text-left">
                        <h3 className="text-2xl font-black italic text-white">MULTIPLAYER</h3>
                        <p className="text-red-200 text-sm">PvP with Friends (Max 10)</p>
                    </div>
                    <span className="text-4xl">⚔️</span>
                </div>
            </button>
            
            <button onClick={onBack} className="text-gray-500 hover:text-white mt-4 text-sm w-full">Back to Game Hub</button>
        </div>
    );

    const renderMultiSetup = () => (
        <div className="glass-card p-8 w-full max-w-md bg-black/40 border border-white/10 rounded-3xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Multiplayer Lobby</h2>
            
            <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Create Room</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {BET_OPTIONS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBet(amt)}
                                className={`py-1 rounded border text-xs ${betAmount === amt ? 'bg-yellow-500 text-black border-yellow-500 font-bold' : 'border-gray-600 text-gray-400'}`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleCreateMultiRoom} disabled={isLoading} className={`w-full py-2 rounded-lg font-bold text-sm ${canAfford ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-500'}`}>
                        Create (Fee: {fee + betAmount})
                    </button>
                </div>

                <div className="flex items-center justify-center text-xs text-gray-500">OR</div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Join Room</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Room Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="flex-1 p-2 rounded-lg bg-black/40 border border-white/20 text-center text-white placeholder-gray-600 text-sm" />
                        <button onClick={handleJoin} disabled={isLoading} className="px-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm">Join</button>
                    </div>
                </div>
            </div>

            <button onClick={() => setLobbyStep('MENU')} className="w-full mt-4 text-sm text-gray-500 hover:text-white">Back</button>
        </div>
    );

    const renderWaitingRoom = () => (
        <div className="glass-card p-6 w-full max-w-lg bg-black/60 border border-white/10 rounded-3xl animate-fade-in text-center">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">Room: {roomId}</h2>
            <p className="text-gray-400 text-sm mb-6">Share this code with your friends</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {players.map(p => (
                    <div key={p.id} className="flex flex-col items-center animate-bounce-in">
                        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-3xl shadow-lg border-2 border-white/20">
                            {p.avatar}
                        </div>
                        <span className="mt-2 text-xs font-bold text-white bg-black/30 px-2 py-1 rounded-full truncate max-w-[100px]">{p.name}</span>
                        {p.id === roomId && <span className="text-[10px] text-yellow-500">👑 Host</span>}
                    </div>
                ))}
                {[...Array(Math.max(0, 4 - players.length))].map((_, i) => (
                    <div key={i} className="flex flex-col items-center opacity-30">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-2xl text-gray-500">+</div>
                    </div>
                ))}
            </div>

            {players[0]?.id === student.studentId ? (
                <button 
                    onClick={handleStartGame} 
                    disabled={players.length < 2 || isLoading}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Starting...' : 'START GAME'}
                </button>
            ) : (
                <div className="w-full py-3 bg-white/10 rounded-xl font-bold text-sm text-gray-400 animate-pulse">
                    Waiting for host to start...
                </div>
            )}
            
            <button onClick={handleLeave} className="mt-4 text-red-400 hover:text-red-300 text-sm font-bold">Leave Room</button>
        </div>
    );

    const renderSingleSetup = () => (
        <div className="glass-card p-8 w-full max-w-md bg-black/40 border border-white/10 rounded-3xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Select Difficulty</h2>
            <div className="space-y-3 mb-8">
                {[
                    { id: 'EASY', label: 'EASY', cost: 100, reward: 200, color: 'bg-green-500', border: 'border-green-400' },
                    { id: 'NORMAL', label: 'NORMAL', cost: 300, reward: 600, color: 'bg-yellow-500', border: 'border-yellow-400' },
                    { id: 'HARD', label: 'HARD', cost: 500, reward: 2500, color: 'bg-red-600', border: 'border-red-500' },
                ].map((level) => (
                    <button
                        key={level.id}
                        onClick={() => setSelectedDifficulty(level.id as BotDifficulty)}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition-all ${selectedDifficulty === level.id ? `${level.color} border-white text-white shadow-lg scale-105` : 'bg-transparent border-gray-600 text-gray-400 hover:bg-white/5'}`}
                    >
                        <span className="font-bold">{level.label}</span>
                        <div className="text-right text-xs">
                            <div>Fee: {level.cost}</div>
                            <div>Win: {level.reward}</div>
                        </div>
                    </button>
                ))}
            </div>
            <button onClick={handleSinglePlayerStart} className="w-full py-4 rounded-xl font-black text-xl bg-white text-black shadow-lg hover:scale-[1.02] transition-transform">START GAME</button>
            <button onClick={() => setLobbyStep('MENU')} className="w-full mt-4 text-sm text-gray-500 hover:text-white">Back</button>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-white p-4">
            {lobbyStep !== 'MULTI_WAITING' && (
                <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-8 drop-shadow-lg italic" style={{fontFamily: "'RushDriver', sans-serif"}}>
                    ONE CARD PARTY
                </h1>
            )}
            
            {lobbyStep === 'MENU' && renderMenu()}
            {lobbyStep === 'SINGLE_SETUP' && renderSingleSetup()}
            {lobbyStep === 'MULTI_SETUP' && renderMultiSetup()}
            {lobbyStep === 'MULTI_WAITING' && renderWaitingRoom()}
        </div>
    );
};

export default UnoLobby;
