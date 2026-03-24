
import React, { useEffect, useState, useRef } from 'react';
import { useUnoStore } from './store';
import { UnoCard, UnoColor } from './types';
import Modal from '../../common/Modal';
import { useNotification } from '../../../contexts/NotificationContext';
import { grantGameXP } from '../../../services/studentService';
import { playUnoCard, drawUnoCard, leaveUnoRoom } from '../../../services/gameService';

// --- 3D CARD COMPONENT ---
const UnoCard3D: React.FC<{ 
    card: UnoCard, 
    onClick?: () => void, 
    disabled?: boolean, 
    isFaceDown?: boolean,
    isSelected?: boolean,
    style?: React.CSSProperties,
    className?: string
}> = ({ card, onClick, disabled, isFaceDown = false, isSelected = false, style, className = '' }) => {
    
    // Determine Colors
    let bgColor = '#333';
    let textColor = '#333';

    if (card.color === 'BLUE') { bgColor = '#5555ff'; textColor = '#5555ff'; }
    else if (card.color === 'GREEN') { bgColor = '#55aa55'; textColor = '#55aa55'; }
    else if (card.color === 'YELLOW') { bgColor = '#ffaa00'; textColor = '#ffaa00'; }
    else if (card.color === 'RED') { bgColor = '#ff5555'; textColor = '#ff5555'; }
    else if (card.color === 'BLACK') { bgColor = '#333'; textColor = 'white'; } // Wild

    const displayValue = card.value === 'WILD' ? '🌈' : card.value === 'WILD_DRAW_4' ? '+4' : card.value === 'DRAW_2' ? '+2' : card.value === 'SKIP' ? '🚫' : card.value === 'REVERSE' ? '🔁' : card.value;

    return (
        <div 
            onClick={!disabled ? onClick : undefined}
            className={`card-3d-wrapper w-24 h-36 sm:w-28 sm:h-40 cursor-pointer transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            style={style}
        >
            <div className={`card-3d-inner ${isFaceDown ? 'flipped' : ''}`}>
                
                {/* BACK FACE (SRTC Logo) */}
                <div className="card-back card-face">
                    <div className="card-logo-text text-3xl">UNO</div>
                    <div className="font-sans font-bold text-sm mt-1 text-white">SRTC</div>
                </div>

                {/* FRONT FACE (Value) */}
                <div className="card-front card-face" style={{ backgroundColor: bgColor }}>
                    <span className="card-corner text-xl top-1 left-2">{displayValue}</span>
                    
                    <div className="card-oval">
                        <span className="card-main-number text-5xl sm:text-6xl" style={{ color: textColor }}>{displayValue}</span>
                    </div>
                    
                    <span className="card-corner text-xl bottom-1 right-2 transform rotate-180">{displayValue}</span>
                    
                    {/* Selected Indicator */}
                    {isSelected && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs font-bold animate-bounce bg-black/70 px-3 py-1 rounded-full whitespace-nowrap border border-white/30 shadow-lg z-50">
                            แตะเพื่อทิ้ง
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper to calculate next turn index
const getNextPlayerIndex = (current: number, direction: number, total: number) => {
    return (current + direction + total) % total;
};

// Asset constants
const CARD_ASSETS = {
    BLUE: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99.png?alt=media&token=03b287f3-e5d2-446f-ba11-05309ac5aa6f",
    GREEN: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7.png?alt=media&token=0d5fcde9-1ec0-4e8f-81b4-063e27f22a05",
    YELLOW: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%AB%E0%B8%A5%E0%B8%B7%E0%B8%AD%E0%B8%87.png?alt=media&token=960f5e4b-a621-4019-a5a6-6b294a33ef19",
    RED: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%81%E0%B8%94%E0%B8%87.png?alt=media&token=53263279-9815-4bf9-8fc6-93ad279e0a1b",
    DEFAULT: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2FUNO%20%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2.png?alt=media&token=1d533b0b-3d93-455a-9be6-bf56d66ebb15",
    BACK: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2FUNO%20%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87.png?alt=media&token=10a78cae-3033-4080-8466-af66bd7ed1b8"
};

// 2D Card View fallback / alternate
const CardView: React.FC<{ card: UnoCard, onClick?: () => void, small?: boolean, disabled?: boolean }> = ({ card, onClick, small, disabled }) => {
    let imageUrl = CARD_ASSETS.DEFAULT;
    if (card.color === 'BLUE') imageUrl = CARD_ASSETS.BLUE;
    else if (card.color === 'GREEN') imageUrl = CARD_ASSETS.GREEN;
    else if (card.color === 'YELLOW') imageUrl = CARD_ASSETS.YELLOW;
    else if (card.color === 'RED') imageUrl = CARD_ASSETS.RED;
    
    const isWild = card.color === 'BLACK';
    const displayValue = card.value === 'WILD' ? '🌈' : card.value === 'WILD_DRAW_4' ? '+4' : card.value === 'DRAW_2' ? '+2' : card.value === 'SKIP' ? '🚫' : card.value === 'REVERSE' ? '🔁' : card.value;
    const textColor = 'text-white'; 

    return (
        <div 
            onClick={!disabled ? onClick : undefined}
            className={`${small ? 'w-8 h-12 text-xs' : 'w-16 h-24 text-xl sm:w-20 sm:h-32 sm:text-3xl'} rounded-lg shadow-md flex items-center justify-center font-black cursor-pointer ${!disabled && 'hover:-translate-y-2'} transition-transform border border-white/20 select-none relative overflow-hidden bg-white ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            style={{
                backgroundImage: `url('${imageUrl}')`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {isWild && <div className="absolute inset-0 bg-black/60 mix-blend-multiply z-0"></div>}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 z-0 pointer-events-none"></div>
            <span className={`drop-shadow-md z-10 relative ${textColor}`} style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{displayValue}</span>
            <div className={`absolute top-1 left-1 text-[8px] sm:text-[10px] opacity-90 z-10 ${textColor}`}>{displayValue}</div>
            <div className={`absolute bottom-1 right-1 text-[8px] sm:text-[10px] opacity-90 transform rotate-180 z-10 ${textColor}`}>{displayValue}</div>
        </div>
    );
};

const getActiveColorStyles = (color?: UnoColor) => {
    switch (color) {
        case 'RED': return 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        case 'BLUE': return 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.4)]';
        case 'GREEN': return 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
        case 'YELLOW': return 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(250,204,21,0.4)]';
        default: return 'border-slate-600 bg-white/5';
    }
};

const generateDeck = (): UnoCard[] => {
    // Generate dummy deck for local display of draw pile if needed
    // Real logic is handled by store/server for critical parts
    return []; 
};

const UnoBoard: React.FC = () => {
    const { players, currentPlayerIndex, discardPileTop, playCard, drawCard, processBotTurn, lastAction, mode, phase, winnerId, pot, difficulty, resetGame, roomId, direction } = useUnoStore();
    const notification = useNotification();
    
    const [wildModalOpen, setWildModalOpen] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    const deckRef = useRef<HTMLDivElement>(null);
    const [dealtCards, setDealtCards] = useState<boolean>(false);

    const myStudentId = sessionStorage.getItem('srtc_student_auth_id');
    const myPlayerIndex = players.findIndex(p => p.id === myStudentId) !== -1 ? players.findIndex(p => p.id === myStudentId) : 0;
    
    const myPlayer = players[myPlayerIndex];
    const isMyTurn = currentPlayerIndex === myPlayerIndex && phase === 'PLAYING';

    useEffect(() => {
        if (phase === 'PLAYING') {
            const timer = setTimeout(() => setDealtCards(true), 100);
            return () => clearTimeout(timer);
        } else {
            void Promise.resolve().then(() => {
                setDealtCards(false);
                setSelectedCardId(null);
            });
        }
    }, [phase]);

    useEffect(() => {
        if (mode === 'SINGLE' && phase === 'PLAYING' && currentPlayerIndex !== myPlayerIndex) {
            void Promise.resolve().then(() => processBotTurn());
        }
    }, [currentPlayerIndex, phase, mode, processBotTurn, myPlayerIndex]);

    useEffect(() => {
        if (!isMyTurn) {
            void Promise.resolve().then(() => setSelectedCardId(null));
        }
    }, [isMyTurn]);

    const submitMultiMove = async (card: UnoCard, chosenColor?: UnoColor) => {
        if (!roomId || !myPlayer.hand) return;

        const playedCard = { ...card };
        if (chosenColor) playedCard.color = chosenColor;
        
        const newHand = myPlayer.hand.filter(c => c.id !== card.id);
        const isWin = newHand.length === 0;
        
        let nextDirection = direction;
        if (card.value === 'REVERSE') nextDirection *= -1;
        
        let steps = 1;
        if (['SKIP', 'DRAW_2', 'WILD_DRAW_4'].includes(card.value)) steps = 2;
        if (players.length === 2 && card.value === 'REVERSE') steps = 2;

        let nextIndex = currentPlayerIndex;
        for(let i=0; i<steps; i++) {
            nextIndex = getNextPlayerIndex(nextIndex, nextDirection, players.length);
        }

        await playUnoCard(roomId, myPlayer.id, playedCard, nextIndex, newHand, isWin);
    };

    const submitMultiDraw = async () => {
        if (!roomId) return;
        const randomCard = { 
            id: `drawn-${Date.now()}`, 
            color: ['RED','BLUE','GREEN','YELLOW'][Math.floor(Math.random()*4)] as UnoColor, 
            value: ['1','2','3','4','5','6','7','8','9'][Math.floor(Math.random()*9)] as any 
        }; 
        await drawUnoCard(roomId, myPlayer.id, randomCard, []);
    };

    const handleCardClick = (card: UnoCard) => {
        if (!isMyTurn) return;

        if (selectedCardId !== card.id) {
            setSelectedCardId(card.id);
            return;
        }

        const top = discardPileTop!;
        if (card.color !== top.color && card.value !== top.value && card.color !== 'BLACK') {
            notification.addToast({ type: 'warning', title: 'ลงไพ่ไม่ได้', message: 'ต้องมีสีหรือเลขตรงกัน' });
            setSelectedCardId(null);
            return;
        }

        if (card.color === 'BLACK') {
            setPendingWildCard(card);
            setWildModalOpen(true);
        } else {
            if (mode === 'SINGLE') playCard(myPlayer.id, card);
            else submitMultiMove(card);
            
            setSelectedCardId(null);
        }
    };

    const handleWildSelect = (color: UnoColor) => {
        if (pendingWildCard) {
            if (mode === 'SINGLE') playCard(myPlayer.id, pendingWildCard, color);
            else submitMultiMove(pendingWildCard, color);
            
            setWildModalOpen(false);
            setPendingWildCard(null);
            setSelectedCardId(null);
        }
    };

    const handleDraw = () => {
        if (!isMyTurn) return;
        setSelectedCardId(null);
        if (mode === 'SINGLE') drawCard(myPlayer.id);
        else submitMultiDraw();
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedCardId(null);
        }
    };

    const handleMultiLeave = async () => {
        if (roomId && myPlayer) await leaveUnoRoom(roomId, myPlayer.id);
        localStorage.removeItem('srtc_uno_active_room_id'); // Clear session
        resetGame();
    };

    const handleMenu = () => {
        localStorage.removeItem('srtc_uno_active_room_id'); // Clear session
        resetGame();
    };

    const opponents = players.filter((_, i) => i !== myPlayerIndex);

    const renderHand = () => {
        const hand = myPlayer.hand || [];
        const totalCards = hand.length;
        const cardSpacing = 40; 
        const startX = -((totalCards - 1) * cardSpacing) / 2;

        return hand.map((card, i) => {
            const isSelected = selectedCardId === card.id;
            const x = startX + (i * cardSpacing);
            const rotateAngle = isSelected ? 0 : (i - (totalCards - 1) / 2) * 5; 
            const archY = Math.abs(i - (totalCards - 1) / 2) * 5; 
            const liftY = isSelected ? -80 : 0; 
            const finalY = archY + liftY;

            const style: React.CSSProperties = dealtCards ? {
                transform: `translateX(${x}px) translateY(${finalY}px) rotate(${rotateAngle}deg) scale(${isSelected ? 1.2 : 1})`,
                opacity: 1,
                zIndex: isSelected ? 50 : i,
                transitionDelay: dealtCards && !isSelected ? '0s' : `${i * 0.05}s`
            } : {
                transform: `translateX(0px) translateY(-400px) rotate(0deg) scale(0.5)`,
                opacity: 0,
                zIndex: i
            };

            return (
                <div 
                    key={card.id} 
                    className="absolute left-1/2 -translate-x-1/2 bottom-6 transition-all duration-300 ease-out origin-bottom" 
                    style={style}
                >
                    <UnoCard3D 
                        card={card} 
                        onClick={() => handleCardClick(card)} 
                        disabled={!isMyTurn}
                        isSelected={isSelected}
                        isFaceDown={!dealtCards} 
                    />
                </div>
            );
        });
    };

    return (
        <div className="relative w-full h-full overflow-hidden" 
             onClick={handleBackgroundClick}
             style={{ background: 'radial-gradient(circle, #358f46 0%, #1a4d25 100%)' }}>
            
            <div className="bg-pattern-uno pointer-events-none"></div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/20 text-white text-sm font-bold shadow-lg animate-pulse mb-2">
                    {lastAction || 'Game Started'}
                </div>
                {roomId && <div className="text-white/50 text-xs">Room: {roomId}</div>}
            </div>
            
            {/* Opponents Area */}
            <div className="absolute top-16 left-0 right-0 flex justify-center gap-4 z-20 px-4 pointer-events-none">
                {opponents.map((p, i) => {
                    const pIdx = players.findIndex(pl => pl.id === p.id);
                    const isTurn = pIdx === currentPlayerIndex;
                    return (
                        <div key={p.id} className={`flex flex-col items-center transition-all duration-300 ${isTurn ? 'scale-110' : 'scale-90 opacity-80'}`}>
                            <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center bg-gray-800 relative shadow-lg ${isTurn ? 'border-yellow-400' : 'border-gray-600'}`}>
                                <span className="text-2xl sm:text-3xl">{p.avatar}</span>
                                {isTurn && <div className="absolute -top-6 text-[10px] font-bold text-yellow-400 bg-black/70 px-2 rounded">THINKING</div>}
                                {p.handCount <= 2 && <div className="absolute -right-2 -bottom-2 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded animate-pulse">UNO!</div>}
                            </div>
                            <div className="text-white text-xs font-bold mt-1 text-shadow">{p.name}</div>
                            <div className="flex items-center gap-1 bg-black/40 px-2 rounded-full mt-1">
                                <div className="w-2 h-3 bg-red-500 rounded-sm"></div>
                                <span className="text-xs text-white">{p.handCount}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="flex gap-12 items-center pointer-events-auto">
                    <div 
                        ref={deckRef}
                        onClick={handleDraw} 
                        className={`card-3d-wrapper w-24 h-36 sm:w-28 sm:h-40 cursor-pointer ${!isMyTurn ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-2'} transition-transform`}
                    >
                        <div className="card-3d-inner flipped">
                            <div className="card-back card-face shadow-2xl border-white/50">
                                <div className="card-logo-text text-3xl">UNO</div>
                                <div className="font-sans font-bold text-sm mt-1 text-white">DECK</div>
                            </div>
                        </div>
                        <div className="absolute top-1 left-1 w-full h-full bg-black/20 rounded-xl -z-10"></div>
                        <div className="absolute top-2 left-2 w-full h-full bg-black/20 rounded-xl -z-20"></div>
                    </div>
                    
                    <div className="relative">
                        {discardPileTop ? (
                             <div className="transform rotate-6 transition-transform hover:scale-105 duration-300">
                                <UnoCard3D card={discardPileTop} disabled />
                            </div>
                        ) : (
                            <div className="w-24 h-36 border-4 border-dashed border-white/30 rounded-xl flex items-center justify-center text-white/30 font-bold">
                                DROP
                            </div>
                        )}
                        
                        {discardPileTop?.color && (
                             <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-lg uppercase animate-bounce`}
                                 style={{backgroundColor: discardPileTop.color === 'RED' ? '#ef4444' : discardPileTop.color === 'BLUE' ? '#3b82f6' : discardPileTop.color === 'GREEN' ? '#22c55e' : discardPileTop.color === 'YELLOW' ? '#eab308' : '#333'}}>
                                {discardPileTop.color}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-56 z-40 flex justify-center items-end pointer-events-none">
                 <div className="relative w-full max-w-4xl h-full pointer-events-auto">
                    {isMyTurn && <div className="absolute top-0 left-1/2 -translate-x-1/2 text-white font-bold text-lg animate-pulse drop-shadow-md bg-black/50 px-6 py-1 rounded-full border border-white/20 z-50">YOUR TURN</div>}
                    {renderHand()}
                 </div>
            </div>

            <Modal isOpen={wildModalOpen} onClose={() => setWildModalOpen(false)} title="เลือกสี (Choose Color)" size="sm">
                <div className="grid grid-cols-2 gap-4 p-4">
                    <button onClick={() => handleWildSelect('RED')} className="h-20 bg-red-500 rounded-2xl shadow-lg hover:brightness-110 transition-transform border-4 border-red-700"></button>
                    <button onClick={() => handleWildSelect('BLUE')} className="h-20 bg-blue-500 rounded-2xl shadow-lg hover:brightness-110 transition-transform border-4 border-blue-700"></button>
                    <button onClick={() => handleWildSelect('GREEN')} className="h-20 bg-green-500 rounded-2xl shadow-lg hover:brightness-110 transition-transform border-4 border-green-700"></button>
                    <button onClick={() => handleWildSelect('YELLOW')} className="h-20 bg-yellow-400 rounded-2xl shadow-lg hover:brightness-110 transition-transform border-4 border-yellow-600"></button>
                </div>
            </Modal>

            {phase === 'GAME_OVER' && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm pointer-events-auto">
                    <div className="text-9xl mb-6 animate-bounce">
                        {winnerId === myPlayer.id ? '🏆' : '💀'}
                    </div>
                    <h2 className={`text-6xl font-black mb-2 uppercase tracking-tighter ${winnerId === myPlayer.id ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600' : 'text-gray-500'}`}>
                        {winnerId === myPlayer.id ? 'VICTORY!' : 'DEFEATED'}
                    </h2>
                    <p className="text-white text-2xl mb-12 opacity-80 font-light">
                        {winnerId === myPlayer.id ? `+${pot} Coins` : 'Better luck next time!'}
                    </p>
                    <button onClick={mode === 'SINGLE' ? handleMenu : handleMultiLeave} className="px-12 py-4 bg-white text-black font-black text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                        RETURN TO LOBBY
                    </button>
                </div>
            )}
        </div>
    );
};

export default UnoBoard;
    