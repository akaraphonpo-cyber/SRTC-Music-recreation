
import React, { useEffect, useState } from 'react';
import { StudentWithId } from '../../../types';
import { useUnoStore } from './store';
import UnoLobby from './UnoLobby';
import UnoBoard from './UnoBoard';
import { subscribeToUnoRoom } from '../../../services/gameService';
import { useNotification } from '../../../contexts/NotificationContext';

interface UnoGameContainerProps {
    student: StudentWithId;
    onBack: () => void;
    onUpdateStudent?: (student: StudentWithId) => void;
}

const STORAGE_KEY = 'srtc_uno_active_room_id';

const UnoGameContainer: React.FC<UnoGameContainerProps> = ({ student, onBack, onUpdateStudent }) => {
    const { phase, mode, roomId, resetGame, syncFromFirestore, initializeMultiPlayer } = useUnoStore();
    const notification = useNotification();
    const [isReconnecting, setIsReconnecting] = useState(true);

    // 1. Auto-Reconnect on Mount
    useEffect(() => {
        const savedRoomId = localStorage.getItem(STORAGE_KEY);
        if (savedRoomId) {
            console.log("Found active Uno session, reconnecting to:", savedRoomId);
            // Initialize store with saved ID to trigger subscription
            initializeMultiPlayer(student, savedRoomId);
        }
        void Promise.resolve().then(() => setIsReconnecting(false));
    }, []);

    // 2. Cleanup on unmount (only if manually backing out, not refresh)
    useEffect(() => {
        return () => {
            // We don't resetGame() here immediately to allow refresh-reconnect.
            // Reset is handled by "Leave" buttons explicitly.
        };
    }, [resetGame]);

    // 3. Multiplayer Subscription & Sync
    useEffect(() => {
        if (mode === 'MULTI' && roomId) {
            // Save to storage for persistence
            localStorage.setItem(STORAGE_KEY, roomId);

            const unsubscribe = subscribeToUnoRoom(roomId, (roomData) => {
                if (roomData) {
                    syncFromFirestore(roomData, student.studentId);
                    
                    // Check if I was kicked
                    const amIInRoom = roomData.players.some(p => p.id === student.studentId);
                    if (!amIInRoom) {
                        notification.addToast({ type: 'warning', title: 'Removed', message: 'คุณไม่อยู่ในห้องนี้แล้ว' });
                        localStorage.removeItem(STORAGE_KEY);
                        resetGame();
                        onBack();
                    }
                } else {
                    // Room deleted/closed
                    // notification.addToast({ type: 'info', title: 'Room Closed', message: 'ห้องถูกปิดแล้ว' });
                    localStorage.removeItem(STORAGE_KEY);
                    resetGame();
                    // Don't force back immediately to let user see "Game Over" or empty state if needed, 
                    // but usually room null means deleted.
                    onBack();
                }
            });
            return () => unsubscribe();
        }
    }, [mode, roomId, syncFromFirestore, student.studentId, resetGame, onBack, notification]);

    const handleJoinGame = () => {
        // Triggered when room is created/joined from Lobby.
        // Store is updated, Subscription above kicks in.
    };

    if (isReconnecting) {
        return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">Reconnecting...</div>;
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-black">
            {phase === 'LOBBY' && (
                <UnoLobby 
                    student={student} 
                    onJoinGame={handleJoinGame} 
                    onBack={() => {
                        localStorage.removeItem(STORAGE_KEY); // Clear session on explicit back
                        resetGame();
                        onBack();
                    }} 
                />
            )}

            {(phase === 'PLAYING' || phase === 'GAME_OVER') && (
                <div className="relative w-full h-full">
                    {/* Escape Hatch */}
                    <button 
                        onClick={() => {
                            // Confirm before leaving active game
                            const confirmLeave = window.confirm("หากออกจากเกมระหว่างเล่น คุณจะเสียเงินเดิมพันและปรับแพ้ ยืนยัน?");
                            if (confirmLeave) {
                                localStorage.removeItem(STORAGE_KEY);
                                resetGame();
                                onBack();
                            }
                        }} 
                        className="absolute top-4 left-4 z-50 p-2 bg-red-500/20 hover:bg-red-500 text-white rounded-full transition-colors border border-white/10"
                        title="Leave Game"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <UnoBoard />
                </div>
            )}
        </div>
    );
};

export default UnoGameContainer;
    