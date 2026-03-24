
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudentWithId, UnoRoom, UnoCard, UnoColor, UnoValue, UnoPlayer } from '../../types';
import { createUnoRoom, joinUnoRoom, leaveUnoRoom, subscribeToUnoRoom, startUnoGame, playUnoCard, drawUnoCard, updateStudent, grantGameXP } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { playSuccessSound, playErrorSound } from '../../utils/soundUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

interface UnoGameProps {
    student: StudentWithId;
    onBack: () => void;
}

// Card Image Assets (Synced with UnoBoard)
const CARD_ASSETS = {
    BLUE: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99.png?alt=media&token=03b287f3-e5d2-446f-ba11-05309ac5aa6f",
    GREEN: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7.png?alt=media&token=0d5fcde9-1ec0-4e8f-81b4-063e27f22a05",
    YELLOW: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%AB%E0%B8%A5%E0%B8%B7%E0%B8%AD%E0%B8%87.png?alt=media&token=960f5e4b-a621-4019-a5a6-6b294a33ef19",
    RED: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2F%E0%B8%AA%E0%B8%B5%E0%B9%81%E0%B8%94%E0%B8%87.png?alt=media&token=53263279-9815-4bf9-8fc6-93ad279e0a1b",
    DEFAULT: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2FUNO%20%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2.png?alt=media&token=1d533b0b-3d93-455a-9be6-bf56d66ebb15",
    BACK: "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2FUNO%20%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87.png?alt=media&token=10a78cae-3033-4080-8466-af66bd7ed1b8"
};

const COLORS: UnoColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const VALUES: UnoValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW_2'];

const generateDeck = (): UnoCard[] => {
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

const CardView: React.FC<{ card: UnoCard, onClick?: () => void, small?: boolean, disabled?: boolean }> = ({ card, onClick, small, disabled }) => {
    // Determine Image Source based on current card color
    let imageUrl = CARD_ASSETS.DEFAULT;
    if (card.color === 'BLUE') imageUrl = CARD_ASSETS.BLUE;
    else if (card.color === 'GREEN') imageUrl = CARD_ASSETS.GREEN;
    else if (card.color === 'YELLOW') imageUrl = CARD_ASSETS.YELLOW;
    else if (card.color === 'RED') imageUrl = CARD_ASSETS.RED;
    
    // For Black/Wild cards, we use the default front with a dark overlay
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
            
            {/* Gloss/Highlight for plastic effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 z-0 pointer-events-none"></div>

            {/* Content Layer */}
            <span className={`drop-shadow-md z-10 relative ${textColor}`} style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{displayValue}</span>
            
            {/* Corner Indicators */}
            <div className={`absolute top-1 left-1 text-[8px] sm:text-[10px] opacity-90 z-10 ${textColor}`}>{displayValue}</div>
            <div className={`absolute bottom-1 right-1 text-[8px] sm:text-[10px] opacity-90 transform rotate-180 z-10 ${textColor}`}>{displayValue}</div>
        </div>
    );
};

// --- Helper Functions ---
const getActiveColorStyles = (color?: UnoColor) => {
    switch (color) {
        case 'RED': return 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        case 'BLUE': return 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.4)]';
        case 'GREEN': return 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
        case 'YELLOW': return 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(250,204,21,0.4)]';
        default: return 'border-slate-600 bg-white/5';
    }
};

// --- Bot Logic Helper ---
const getBotMove = (hand: UnoCard[], topCard: UnoCard, difficulty: 'EASY' | 'NORMAL' | 'HARD'): UnoCard | null => {
    const validCards = hand.filter(c => c.color === topCard.color || c.value === topCard.value || c.color === 'BLACK');
    
    if (validCards.length === 0) return null; // Must draw

    if (difficulty === 'EASY') {
        // Random valid card
        return validCards[Math.floor(Math.random() * validCards.length)];
    }

    if (difficulty === 'NORMAL') {
        // Prioritize Action Cards or Wilds if losing, else match color to save wild
        const actionCard = validCards.find(c => ['SKIP', 'REVERSE', 'DRAW_2', 'WILD_DRAW_4'].includes(c.value));
        if (actionCard) return actionCard;
        // Try to match color (save wilds)
        const colorMatch = validCards.find(c => c.color === topCard.color && c.color !== 'BLACK');
        return colorMatch || validCards[0];
    }

    if (difficulty === 'HARD') {
        // Prioritize attacking if opponent has few cards (simulated logic)
        // For simplicity: Prioritize +4 / +2 / Skip
        const attackCard = validCards.find(c => ['WILD_DRAW_4', 'DRAW_2', 'SKIP'].includes(c.value));
        if (attackCard) return attackCard;

        // Choose card that matches the most abundant color in hand
        const colorCounts = hand.reduce((acc, c) => {
            if (c.color !== 'BLACK') acc[c.color] = (acc[c.color] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        // Sort valid cards by abundance of their color in hand
        validCards.sort((a, b) => {
            if (a.color === 'BLACK') return 1; // Play wilds last
            if (b.color === 'BLACK') return -1;
            return (colorCounts[b.color] || 0) - (colorCounts[a.color] || 0);
        });

        return validCards[0];
    }

    return validCards[0];
};

const UnoGame: React.FC<UnoGameProps> = ({ student, onBack }) => {
    // Mode State
    const [mode, setMode] = useState<'MENU' | 'SINGLE' | 'MULTI'>('MENU');
    const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('EASY');
    
    // Multiplayer State
    const [roomId, setRoomId] = useState('');
    const [room, setRoom] = useState<UnoRoom | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [betAmount, setBetAmount] = useState(200);
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Single Player Local State
    const [localRoom, setLocalRoom] = useState<UnoRoom | null>(null);
    const botTurnTimeout = useRef<any>(null);
    
    // UI State
    const [wildColorModal, setWildColorModal] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null); // Card waiting for color selection

    const notification = useNotification();

    // --- Multiplayer Effects ---
    useEffect(() => {
        if (mode !== 'MULTI' || !roomId) return;
        const unsubscribe = subscribeToUnoRoom(roomId, (updatedRoom) => {
            if (!updatedRoom) {
                setRoom(null);
                setRoomId('');
                setMode('MENU');
                notification.addToast({ type: 'info', title: 'Room Closed', message: 'The room has been closed.' });
            } else {
                setRoom(updatedRoom);
            }
        });
        return () => unsubscribe();
    }, [roomId, mode]);

    // --- Multiplayer Handlers ---
    const handleCreateRoom = async () => {
        setIsLoading(true);
        const res = await createUnoRoom(student.studentId, student.firstName, betAmount);
        setIsLoading(false);
        if (res.success && res.data) {
            setRoomId(res.data);
            setMode('MULTI');
            setIsCreating(false);
        } else {
            notification.addToast({ type: 'error', title: 'Failed', message: res.message });
        }
    };

    const handleJoin = async () => {
        if (!joinCode) return;
        setIsLoading(true);
        const res = await joinUnoRoom(joinCode, { id: student.studentId, name: student.firstName });
        setIsLoading(false);
        if (res.success) {
            setRoomId(joinCode);
            setMode('MULTI');
        } else {
            notification.addToast({ type: 'error', title: 'Failed', message: res.message });
        }
    };

    const handleMultiStart = async () => {
        if (!room) return;
        const deck = generateDeck();
        const firstCard = deck.pop()!;
        const hands: Record<string, UnoCard[]> = {};
        room.players.forEach(p => {
            hands[p.id] = deck.splice(0, 7);
        });
        await startUnoGame(room.roomId, deck, firstCard, hands);
    };

    const handleMultiLeave = async () => {
        if (room) await leaveUnoRoom(room.roomId, student.studentId);
        setRoomId('');
        setRoom(null);
        setMode('MENU');
    };

    // --- Single Player Handlers ---
    const startSinglePlayer = async () => {
        // Config based on difficulty
        const config = {
            EASY: { entry: 100, reward: 200, botCount: 3 },
            NORMAL: { entry: 300, reward: 600, botCount: 3 },
            HARD: { entry: 500, reward: 2500, botCount: 3 }
        }[difficulty];

        if ((student.coins || 0) < config.entry) {
            notification.addToast({ type: 'error', title: 'Coins ไม่พอ', message: `ต้องการ ${config.entry} Coins` });
            return;
        }

        // Deduct Entry Fee
        await updateStudent({ ...student, coins: (student.coins || 0) - config.entry });

        const deck = generateDeck();
        const firstCard = deck.pop()!;
        
        // Generate Bots
        const players: UnoPlayer[] = [{
            id: student.studentId,
            name: student.firstName,
            handCount: 7,
            hand: deck.splice(0, 7),
            isUno: false,
            avatar: '👤'
        }];

        const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
        const botAvatars = ['🤖', '👽', '🤡'];

        for(let i=0; i<config.botCount; i++) {
            players.push({
                id: `BOT_${i}`,
                name: botNames[i],
                handCount: 7,
                hand: deck.splice(0, 7),
                isUno: false,
                avatar: botAvatars[i]
            });
        }

        const newRoom: UnoRoom = {
            roomId: 'SINGLE_PLAYER',
            hostId: student.studentId,
            status: 'PLAYING',
            betAmount: config.entry,
            pot: config.reward, // Winner takes this
            players: players,
            currentTurnIndex: 0,
            direction: 1,
            topCard: firstCard,
            drawPileCount: deck.length,
            fullDeck: deck,
            lastAction: 'Game Started',
            createdAt: new Date().toISOString()
        };

        setLocalRoom(newRoom);
        setMode('SINGLE');
    };

    const getNextPlayerIndex = useCallback((current: number, direction: number, total: number) => {
        return (current + direction + total) % total;
    }, []);

    const processMove = useCallback((playerId: string, card: UnoCard) => {
        if (!localRoom) return;
        
        let nextState = { ...localRoom };
        const playerIndex = nextState.players.findIndex(p => p.id === playerId);
        const player = nextState.players[playerIndex];
        
        // Remove card from hand
        // Note: For bot wildcard logic, card.id matches the black card in hand
        const cardInHandIndex = player.hand!.findIndex(c => c.id === card.id);
        if (cardInHandIndex === -1) return;
        
        player.hand!.splice(cardInHandIndex, 1);
        player.handCount = player.hand!.length;
        
        // Handle Effects
        let skipNext = false;
        if (card.value === 'SKIP') skipNext = true;
        if (card.value === 'REVERSE') nextState.direction *= -1;
        
        if (card.value === 'DRAW_2') {
            const nextPIndex = getNextPlayerIndex(nextState.currentTurnIndex, nextState.direction, nextState.players.length);
            const nextP = nextState.players[nextPIndex];
            const cardsToDraw = nextState.fullDeck!.splice(0, 2);
            nextP.hand = [...(nextP.hand || []), ...cardsToDraw];
            nextP.handCount += 2;
            skipNext = true; // Uno rules often skip the drawer
        }
        
        if (card.value === 'WILD_DRAW_4') {
            const nextPIndex = getNextPlayerIndex(nextState.currentTurnIndex, nextState.direction, nextState.players.length);
            const nextP = nextState.players[nextPIndex];
            const cardsToDraw = nextState.fullDeck!.splice(0, 4);
            nextP.hand = [...(nextP.hand || []), ...cardsToDraw];
            nextP.handCount += 4;
            skipNext = true;
        }

        // Update Top Card (ensure effective color is set for visual)
        nextState.topCard = card;
        nextState.lastAction = `${player.name} played ${card.value}`;

        // Check Win
        if (player.handCount === 0) {
            nextState.status = 'ENDED';
            nextState.winnerId = playerId;
            
            if (playerId === student.studentId) {
                // Human Won
                updateStudent({ ...student, coins: (student.coins || 0) + localRoom.pot });
                grantGameXP(student.studentId, 100 + (difficulty === 'HARD' ? 100 : 0), 'Uno Win');
                playSuccessSound();
            } else {
                playErrorSound();
            }
        } else {
            // Next Turn
            let steps = skipNext ? 2 : 1;
            let nextIndex = nextState.currentTurnIndex;
            for(let i=0; i<steps; i++) {
                nextIndex = getNextPlayerIndex(nextIndex, nextState.direction, nextState.players.length);
            }
            nextState.currentTurnIndex = nextIndex;
        }

        setLocalRoom(nextState);
    }, [localRoom, student, difficulty, updateStudent, grantGameXP, getNextPlayerIndex]);

    const processDraw = useCallback((playerId: string) => {
        if (!localRoom) return;
        let nextState = { ...localRoom };
        const playerIndex = nextState.players.findIndex(p => p.id === playerId);
        const player = nextState.players[playerIndex];

        if (nextState.fullDeck!.length === 0) {
            // Reshuffle (simplified: just regen deck minus hands)
            // Ideally, shuffle discard pile. For MVP, regen a fresh part deck.
            const newDeck = generateDeck(); 
            nextState.fullDeck = newDeck;
        }

        const newCard = nextState.fullDeck!.pop()!;
        player.hand!.push(newCard);
        player.handCount++;
        
        nextState.lastAction = `${player.name} drew a card`;
        nextState.drawPileCount = nextState.fullDeck!.length;
        
        // Pass turn
        nextState.currentTurnIndex = getNextPlayerIndex(nextState.currentTurnIndex, nextState.direction, nextState.players.length);
        
        setLocalRoom(nextState);
    }, [localRoom, getNextPlayerIndex]);

    const handleBotTurn = useCallback((bot: UnoPlayer) => {
        if (!localRoom || !bot.hand) return;

        // Bot Logic
        const move = getBotMove(bot.hand, localRoom.topCard!, difficulty);
        
        if (move) {
            // Play Card
            let playedCard = { ...move };
            
            // Handle Wild Color Choice
            if (playedCard.color === 'BLACK') {
                const colors = bot.hand.filter(c => c.color !== 'BLACK').map(c => c.color);
                // Pick most frequent color or random
                const pickedColor = colors.length > 0 ? colors[Math.floor(Math.random() * colors.length)] : COLORS[Math.floor(Math.random() * 4)];
                playedCard.color = pickedColor as UnoColor; // Temporarily mutate to set effective color
            }

            processMove(bot.id, playedCard);
        } else {
            // Draw Card
            processDraw(bot.id);
        }
    }, [localRoom, difficulty, processMove, processDraw]);

    // --- Single Player Game Loop ---
    useEffect(() => {
        if (mode !== 'SINGLE' || !localRoom || localRoom.status !== 'PLAYING') return;

        const currentPlayer = localRoom.players[localRoom.currentTurnIndex];
        const isBot = currentPlayer.id.startsWith('BOT_');

        if (isBot) {
            // Bot Turn
            botTurnTimeout.current = setTimeout(() => {
                handleBotTurn(currentPlayer);
            }, 1500); // Thinking delay
        }

        return () => {
            if (botTurnTimeout.current) clearTimeout(botTurnTimeout.current);
        };
    }, [localRoom, mode, handleBotTurn]);

    // --- Human Interaction (Single Player) ---
    const handleHumanCardClick = (card: UnoCard) => {
        if (!localRoom || mode !== 'SINGLE') return;
        if (localRoom.players[localRoom.currentTurnIndex].id !== student.studentId) return;

        const top = localRoom.topCard!;
        if (card.color !== top.color && card.value !== top.value && card.color !== 'BLACK') {
            notification.addToast({ type: 'warning', title: 'Invalid Move' });
            return;
        }

        if (card.color === 'BLACK') {
            setPendingWildCard(card);
            setWildColorModal(true);
        } else {
            processMove(student.studentId, card);
        }
    };

    const handleWildColorSelect = (color: UnoColor) => {
        if (pendingWildCard) {
            // Construct card with selected color but keeping original WILD value
            const cardToPlay = { ...pendingWildCard, color: color }; 
            
            if (mode === 'SINGLE') {
                processMove(student.studentId, cardToPlay);
            } else {
                submitMove(cardToPlay);
            }

            setWildColorModal(false);
            setPendingWildCard(null);
        }
    };

    const handleHumanDraw = () => {
        if (!localRoom || mode !== 'SINGLE') return;
        if (localRoom.players[localRoom.currentTurnIndex].id !== student.studentId) return;
        processDraw(student.studentId);
    };

    // --- Multiplayer Handlers (Interaction) ---
    const submitMove = async (card: UnoCard) => {
        if (!room) return;
        
        const player = room.players.find(p => p.id === student.studentId);
        if (!player || !player.hand) return;
        
        // Remove card from hand
        const newHand = player.hand.filter(c => c.id !== card.id);
        
        // Calculate Next Turn
        let direction = room.direction;
        if (card.value === 'REVERSE') direction *= -1; // Local calculation for next index
        
        let steps = 1;
        if (['SKIP', 'DRAW_2', 'WILD_DRAW_4'].includes(card.value)) steps = 2;
        if (room.players.length === 2 && card.value === 'REVERSE') steps = 2; // Reverse acts like skip in 2 player

        let nextIndex = room.currentTurnIndex;
        for(let i=0; i<steps; i++) {
            nextIndex = getNextPlayerIndex(nextIndex, direction, room.players.length);
        }
        
        const isWin = newHand.length === 0;
        
        await playUnoCard(room.roomId, student.studentId, card, nextIndex, newHand, isWin);
    };

    const handleCardClick = async (card: UnoCard) => {
        if (!room || !isMyTurn) return;
        const top = room.topCard!;
        
        // Basic validation
        if (card.color !== top.color && card.value !== top.value && card.color !== 'BLACK') {
            notification.addToast({ type: 'warning', title: 'Invalid Move' });
            return;
        }

        if (card.color === 'BLACK') {
            setPendingWildCard(card);
            setWildColorModal(true);
        } else {
            await submitMove(card);
        }
    };

    const handleDraw = async () => {
        if (!room || !isMyTurn) return;
        
        // In a real app, deck management should be server-side or more robust.
        // Here we simulate by using room.fullDeck or generating if empty.
        let deck = room.fullDeck ? [...room.fullDeck] : [];
        if (deck.length === 0) {
            deck = generateDeck();
        }
        
        // Draw one card
        const newCard = deck.pop();
        if (!newCard) return;

        await drawUnoCard(room.roomId, student.studentId, newCard, deck);
    };

    // --- Common Render Logic ---
    const activeRoom = mode === 'SINGLE' ? localRoom : room;
    const isMyTurn = activeRoom?.status === 'PLAYING' && activeRoom.players[activeRoom.currentTurnIndex].id === student.studentId;
    const myHand = activeRoom?.players.find(p => p.id === student.studentId)?.hand || [];

    // --- Render ---
    if (mode === 'MENU') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4 animate-fade-in text-white">
                <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-white/10 rounded-full hover:bg-white/20">← Back</button>
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-2 drop-shadow-lg" style={{fontFamily: "'RushDriver', sans-serif"}}>ONE CARD PARTY</h1>
                <p className="text-slate-400 mb-10 tracking-widest uppercase">Uno Style Card Game</p>
                
                <div className="glass-card p-8 w-full max-w-md space-y-6 bg-white/5 border border-white/10">
                    
                    {/* Single Player Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Single Player</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setDifficulty('EASY')} className={`py-2 rounded-lg border text-sm font-bold transition-all ${difficulty === 'EASY' ? 'bg-green-500 text-white border-green-400' : 'bg-transparent border-gray-600 text-gray-400'}`}>Easy</button>
                            <button onClick={() => setDifficulty('NORMAL')} className={`py-2 rounded-lg border text-sm font-bold transition-all ${difficulty === 'NORMAL' ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-transparent border-gray-600 text-gray-400'}`}>Normal</button>
                            <button onClick={() => setDifficulty('HARD')} className={`py-2 rounded-lg border text-sm font-bold transition-all ${difficulty === 'HARD' ? 'bg-red-500 text-white border-red-400' : 'bg-transparent border-gray-600 text-gray-400'}`}>Hard</button>
                        </div>
                        <button onClick={startSinglePlayer} className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                            <span>🤖</span> Play vs AI
                            <span className="text-xs bg-black/30 px-2 py-1 rounded text-yellow-300">
                                {difficulty === 'EASY' ? 'Win 200' : difficulty === 'NORMAL' ? 'Win 600' : 'Win 2500'}
                            </span>
                        </button>
                    </div>

                    <div className="border-t border-white/10 my-4"></div>

                    {/* Multiplayer Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Multiplayer</label>
                        <button onClick={() => setIsCreating(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold border border-white/20 text-slate-200">
                            Create Room (PvP)
                        </button>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Room Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="flex-1 p-3 rounded-xl bg-black/40 border border-white/20 text-center font-mono text-white placeholder-gray-600" />
                            <button onClick={handleJoin} disabled={isLoading} className="px-6 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold shadow-lg">Join</button>
                        </div>
                    </div>
                </div>

                <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create Multiplayer Room">
                    <div className="space-y-4">
                        <label className="block text-sm text-gray-400">Select Bet Amount</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[200, 300, 400, 500, 1000, 5000].map(amt => (
                                <button key={amt} onClick={() => setBetAmount(amt)} className={`py-2 rounded-lg border ${betAmount === amt ? 'bg-yellow-500 text-black border-yellow-500' : 'border-gray-500 text-gray-400'}`}>
                                    {amt}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCreateRoom} disabled={isLoading} className="w-full py-3 bg-green-600 rounded-lg font-bold mt-4">Confirm Create ({betAmount} Bet + 100 Fee)</button>
                    </div>
                </Modal>
            </div>
        );
    }

    if (!activeRoom) return <LoadingSpinner />;

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-black">
            {/* Top Bar */}
            <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md z-10 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="text-white font-bold text-lg">{mode === 'SINGLE' ? '🤖 Single Player' : `Room: ${activeRoom.roomId}`}</div>
                    <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30">Pot: {activeRoom.pot} 🪙</div>
                </div>
                <button onClick={mode === 'SINGLE' ? () => setMode('MENU') : handleMultiLeave} className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors">Quit</button>
            </div>

            {/* Waiting Lobby State (Multiplayer Only) */}
            {mode === 'MULTI' && activeRoom.status === 'LOBBY' && (
                <div className="flex-grow flex flex-col items-center justify-center text-white">
                    <h2 className="text-3xl mb-8 font-light tracking-wide">Waiting for players...</h2>
                    <div className="flex gap-6 mb-12">
                        {activeRoom.players.map(p => (
                            <div key={p.id} className="flex flex-col items-center animate-fade-in">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-4xl border-4 border-gray-600 shadow-xl">{p.avatar}</div>
                                <span className="mt-3 text-sm font-bold bg-black/30 px-3 py-1 rounded-full">{p.name}</span>
                            </div>
                        ))}
                        {[...Array(10 - activeRoom.players.length)].map((_, i) => (
                            <div key={i} className="w-20 h-20 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-700 text-3xl">+</div>
                        ))}
                    </div>
                    {activeRoom.hostId === student.studentId && (
                        <button onClick={handleMultiStart} disabled={activeRoom.players.length < 2} className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-full font-bold text-xl shadow-[0_0_20px_rgba(22,163,74,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all">Start Game</button>
                    )}
                </div>
            )}

            {/* Playing State */}
            {activeRoom.status !== 'LOBBY' && (
                <div className="flex-grow relative flex flex-col">
                    {/* Game Info / Last Action */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-1 rounded-full text-xs text-gray-300 pointer-events-none z-0">
                        {activeRoom.lastAction}
                    </div>

                    {/* Opponents Area (Top & Sides) - Modified for up to 9 opponents */}
                    <div className="flex-grow p-4 grid grid-cols-5 grid-rows-3 gap-2 pointer-events-none">
                        {/* We use a grid to place avatars. Center is the table. */}
                        {activeRoom.players.filter(p => p.id !== student.studentId).map((p, i) => {
                            const isTurn = activeRoom.status === 'PLAYING' && activeRoom.players[activeRoom.currentTurnIndex].id === p.id;
                            return (
                                <div key={p.id} className={`flex flex-col items-center justify-center transition-all duration-500 ${isTurn ? 'scale-110 z-10' : 'opacity-80 scale-90'}`}>
                                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center bg-gray-800 relative ${isTurn ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'border-gray-600'}`}>
                                        <span className="text-2xl sm:text-3xl">{p.avatar}</span>
                                        {isTurn && <div className="absolute -top-6 text-[10px] font-bold text-yellow-400 animate-bounce bg-black/50 px-2 rounded">THINKING</div>}
                                        {p.handCount <= 2 && <div className="absolute -right-2 -bottom-2 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded animate-pulse">UNO!</div>}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-white mt-1 font-bold bg-black/40 px-2 rounded truncate max-w-[80px]">{p.name}</div>
                                    <div className="mt-1 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                                        <div className="w-2 h-3 bg-red-500 rounded-sm"></div>
                                        <span className="text-[10px] font-mono">{p.handCount}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Center Table (Absolute Positioned over Grid) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                        <div className="flex items-center gap-8 sm:gap-12">
                            {/* Draw Pile */}
                            <div 
                                onClick={mode === 'SINGLE' ? handleHumanDraw : handleDraw} 
                                className={`w-20 h-32 sm:w-24 sm:h-36 rounded-xl bg-cover bg-center shadow-2xl flex items-center justify-center cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all relative group border border-white/10 ${!isMyTurn ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                style={{
                                    backgroundImage: `url('${CARD_ASSETS.BACK}')`,
                                    backgroundSize: '100% 100%'
                                }}
                            >
                                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-slate-900 shadow-md z-10">
                                    {activeRoom.drawPileCount}
                                </div>
                            </div>
                            
                            {/* Discard Pile Zone */}
                            <div className={`relative w-24 h-36 sm:w-32 sm:h-44 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 ${getActiveColorStyles(activeRoom.topCard?.color)}`}>
                                {/* Active Color Label */}
                                {activeRoom.topCard?.color && activeRoom.topCard.color !== 'BLACK' && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold tracking-widest text-white shadow-lg uppercase animate-bounce"
                                         style={{backgroundColor: activeRoom.topCard.color === 'RED' ? '#ef4444' : activeRoom.topCard.color === 'BLUE' ? '#3b82f6' : activeRoom.topCard.color === 'GREEN' ? '#22c55e' : '#eab308'}}>
                                        {activeRoom.topCard.color}
                                    </div>
                                )}
                                
                                {activeRoom.topCard ? (
                                    <div className="transform rotate-6 transition-transform hover:rotate-0 hover:scale-110 duration-300 z-10">
                                        <CardView card={activeRoom.topCard} disabled small={window.innerWidth < 640} />
                                    </div>
                                ) : (
                                    <div className="text-white/20 font-bold tracking-widest text-xs">DISCARD</div>
                                )}
                                
                                {/* Ambient Background Light matching color */}
                                 {activeRoom.topCard?.color && activeRoom.topCard.color !== 'BLACK' && (
                                    <div className="absolute inset-0 rounded-3xl opacity-30 animate-pulse" 
                                         style={{backgroundColor: activeRoom.topCard.color === 'RED' ? '#ef4444' : activeRoom.topCard.color === 'BLUE' ? '#3b82f6' : activeRoom.topCard.color === 'GREEN' ? '#22c55e' : '#facc15'}}>
                                    </div>
                                 )}
                            </div>
                        </div>
                    </div>

                    {/* My Hand (Bottom) */}
                    <div className="p-2 pb-6 sm:p-4 sm:pb-8 overflow-x-auto relative min-h-[140px] z-20 bg-gradient-to-t from-black/80 to-transparent">
                        {isMyTurn && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-green-400 font-bold text-sm sm:text-lg animate-pulse drop-shadow-md bg-black/50 px-4 py-1 rounded-full">YOUR TURN</div>}
                        
                        <div className="flex justify-center items-end -space-x-6 sm:-space-x-8 hover:space-x-1 transition-all duration-300 min-w-max px-4 sm:px-8 py-2">
                            {myHand.map((card, i) => (
                                <div key={`${card.id}-${i}`} className={`transform transition-all duration-200 hover:-translate-y-6 hover:z-50 hover:rotate-0 origin-bottom ${!isMyTurn ? 'brightness-50' : ''}`} style={{zIndex: i}}>
                                    <CardView 
                                        card={card} 
                                        onClick={() => mode === 'SINGLE' ? handleHumanCardClick(card) : handleCardClick(card)} 
                                        disabled={!isMyTurn}
                                        small={window.innerWidth < 640}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Game Over Modal */}
                    {activeRoom.status === 'ENDED' && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
                            <div className="text-8xl mb-6 animate-bounce">{activeRoom.winnerId === student.studentId ? '🏆' : '💀'}</div>
                            <h2 className={`text-5xl font-black mb-4 uppercase tracking-wider ${activeRoom.winnerId === student.studentId ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'text-gray-400'}`}>
                                {activeRoom.winnerId === student.studentId ? 'YOU WIN!' : 'DEFEAT'}
                            </h2>
                            <p className="text-white text-xl mb-10 opacity-80">
                                {activeRoom.winnerId === student.studentId ? `Reward: +${activeRoom.pot} Coins` : 'Better luck next time!'}
                            </p>
                            <button onClick={mode === 'SINGLE' ? () => setMode('MENU') : handleMultiLeave} className="px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-xl">
                                Return to Lobby
                            </button>
                        </div>
                    )}

                    {/* Wild Color Selection Modal (Single Player) */}
                    <Modal isOpen={wildColorModal} onClose={() => setWildColorModal(false)} title="Choose Color" size="sm">
                        <div className="grid grid-cols-2 gap-4 p-4">
                            <button onClick={() => handleWildColorSelect('RED')} className="bg-red-500 h-20 rounded-xl shadow-lg hover:brightness-110"></button>
                            <button onClick={() => handleWildColorSelect('BLUE')} className="bg-blue-500 h-20 rounded-xl shadow-lg hover:brightness-110"></button>
                            <button onClick={() => handleWildColorSelect('GREEN')} className="bg-green-500 h-20 rounded-xl shadow-lg hover:brightness-110"></button>
                            <button onClick={() => handleWildColorSelect('YELLOW')} className="bg-yellow-400 h-20 rounded-xl shadow-lg hover:brightness-110"></button>
                        </div>
                    </Modal>
                </div>
            )}
        </div>
    );
};

export default UnoGame;
