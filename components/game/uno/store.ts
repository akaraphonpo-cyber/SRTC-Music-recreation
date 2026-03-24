
import { create } from 'zustand';
import { UnoGameState, GamePhase, GameMode, BotDifficulty, UnoCard, UnoColor, UnoValue, UnoPlayer } from './types';
import { StudentWithId } from '../../../types';

// --- Game Logic Helpers ---
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

const getNextPlayerIndex = (current: number, direction: number, total: number) => {
    return (current + direction + total) % total;
};

// --- Store Implementation ---
export const useUnoStore = create<UnoGameState>((set, get) => ({
    // Initial State
    phase: 'LOBBY',
    mode: 'SINGLE',
    roomId: null,
    difficulty: 'EASY',
    betAmount: 200,
    fee: 100,
    pot: 0,
    
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    discardPileTop: null,
    drawPile: [],
    winnerId: null,
    lastAction: '',

    // Actions
    setPhase: (phase) => set({ phase }),
    setBet: (amount) => set({ betAmount: amount }),
    setMode: (mode) => set({ mode }),
    setDifficulty: (difficulty) => set({ difficulty }),

    initializeSinglePlayer: (student) => {
        const { difficulty, betAmount } = get();
        const deck = generateDeck();
        
        // Config
        const config = {
            EASY: { reward: 200, botCount: 3 },
            NORMAL: { reward: 600, botCount: 3 },
            HARD: { reward: 2500, botCount: 3 }
        }[difficulty];

        // Players
        const players: UnoPlayer[] = [{
            id: student.studentId,
            name: student.firstName,
            avatar: student.photoUrl || '👤',
            handCount: 7,
            hand: deck.splice(0, 7),
            isUno: false,
            isBot: false
        }];

        const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
        const botAvatars = ['🤖', '👽', '🤡'];

        for(let i=0; i<config.botCount; i++) {
            players.push({
                id: `BOT_${i}`,
                name: botNames[i],
                avatar: botAvatars[i],
                handCount: 7,
                hand: deck.splice(0, 7),
                isUno: false,
                isBot: true
            });
        }

        const topCard = deck.pop()!;
        
        set({
            phase: 'PLAYING',
            mode: 'SINGLE',
            players,
            drawPile: deck,
            discardPileTop: topCard,
            currentPlayerIndex: 0,
            direction: 1,
            pot: config.reward,
            winnerId: null,
            lastAction: 'Game Started'
        });
    },

    initializeMultiPlayer: (student, roomId) => {
        set({
            phase: 'LOBBY',
            mode: 'MULTI',
            roomId: roomId,
            pot: 0,
            players: [{
                id: student.studentId,
                name: student.firstName,
                avatar: student.photoUrl || '👤',
                handCount: 0,
                isUno: false,
                isBot: false
            }]
        });
    },

    // Sync state from Firestore snapshot
    syncFromFirestore: (roomData: any, myStudentId: string) => {
        // Map Firestore room data to Game State
        const mappedPlayers: UnoPlayer[] = roomData.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            handCount: p.handCount,
            // Only keep my hand, hide others
            hand: p.id === myStudentId ? p.hand : undefined,
            isUno: p.isUno,
            isBot: false
        }));

        set({
            phase: roomData.status === 'ENDED' ? 'GAME_OVER' : roomData.status === 'PLAYING' ? 'PLAYING' : 'LOBBY',
            roomId: roomData.roomId,
            pot: roomData.pot,
            betAmount: roomData.betAmount,
            players: mappedPlayers,
            currentPlayerIndex: roomData.currentTurnIndex,
            direction: roomData.direction,
            discardPileTop: roomData.topCard,
            lastAction: roomData.lastAction,
            winnerId: roomData.winnerId
        });
    },

    playCard: (playerId, card, chosenColor) => {
        const state = get();
        // LOCAL LOGIC ONLY (For Single Player)
        // Multiplayer logic is handled via syncFromFirestore
        if (state.mode === 'MULTI') return;

        const players = [...state.players];
        const pIndex = players.findIndex(p => p.id === playerId);
        const player = { ...players[pIndex] };
        
        if (!player.hand) return;

        // Remove card
        player.hand = player.hand.filter(c => c.id !== card.id);
        player.handCount = player.hand.length;
        players[pIndex] = player;

        // Update Top Card
        const playedCard = { ...card };
        if (chosenColor) playedCard.color = chosenColor;

        let nextIndex = state.currentPlayerIndex;
        let direction = state.direction;
        let drawCount = 0;

        // Effects
        if (card.value === 'REVERSE') direction *= -1;
        
        if (card.value === 'SKIP') {
            nextIndex = getNextPlayerIndex(nextIndex, direction * 2, players.length);
        } else if (card.value === 'DRAW_2') {
            nextIndex = getNextPlayerIndex(nextIndex, direction, players.length);
            drawCount = 2;
        } else if (card.value === 'WILD_DRAW_4') {
            nextIndex = getNextPlayerIndex(nextIndex, direction, players.length);
            drawCount = 4;
        } else {
            nextIndex = getNextPlayerIndex(nextIndex, direction, players.length);
        }

        // Handle Draw Effects immediately for the victim (SP Only)
        if (drawCount > 0) {
            const victimIndex = getNextPlayerIndex(state.currentPlayerIndex, state.direction, players.length); // Victim is next in current dir
            const victim = { ...players[victimIndex] };
            
            // In SP, draw pile is local
            const drawn = state.drawPile.splice(0, drawCount);
            // If bot, just update count. If human, update hand.
            if (victim.hand) victim.hand.push(...drawn);
            victim.handCount += drawCount;
            players[victimIndex] = victim;
            
            // Usually victim loses turn on draw cards in basic Uno
            // already handled by skip logic above if we assume +2/+4 skips.
            // Adjust logic: Standard Uno skips next player after Draw 2/4.
            // If card.value was DRAW_2, we incremented once (next is victim), now we need to skip victim turn?
            // Actually, `nextIndex` calculation above for DRAW_2 was `getNextPlayerIndex(..., direction)`. 
            // This just moves to victim. We need to move PAST victim if victim loses turn.
            // Refined logic:
            // Current is P1. Play +2. Next is P2. P2 draws. Turn goes to P3.
            // So if `drawCount > 0`, we effectively skip the victim.
            nextIndex = getNextPlayerIndex(nextIndex, direction, players.length); 
        }

        if (player.handCount === 0) {
            set({
                players,
                discardPileTop: playedCard,
                phase: 'GAME_OVER',
                winnerId: playerId,
                lastAction: `${player.name} Won!`
            });
            return;
        }

        set({
            players,
            discardPileTop: playedCard,
            currentPlayerIndex: nextIndex,
            direction,
            drawPile: state.drawPile,
            lastAction: `${player.name} played ${card.value}`
        });
    },

    drawCard: (playerId) => {
        const state = get();
        if (state.mode === 'MULTI') return; // Handled by sync

        const players = [...state.players];
        const pIndex = players.findIndex(p => p.id === playerId);
        const player = { ...players[pIndex] };
        
        let deck = [...state.drawPile];
        if (deck.length === 0) {
            deck = generateDeck(); 
        }
        
        const newCard = deck.pop()!;
        if (player.hand) player.hand.push(newCard);
        player.handCount++;
        players[pIndex] = player;

        const nextIndex = getNextPlayerIndex(state.currentPlayerIndex, state.direction, players.length);

        set({
            players,
            drawPile: deck,
            currentPlayerIndex: nextIndex,
            lastAction: `${player.name} drew a card`
        });
    },

    processBotTurn: () => {
        const state = get();
        const player = state.players[state.currentPlayerIndex];
        
        if (!player.isBot || !player.hand) return;

        const top = state.discardPileTop!;
        const validCards = player.hand.filter(c => c.color === top.color || c.value === top.value || c.color === 'BLACK');
        
        setTimeout(() => {
            const currentState = get();
            if (currentState.phase !== 'PLAYING') return;

            if (validCards.length > 0) {
                let cardToPlay = validCards[0];
                let chosenColor: UnoColor | undefined = undefined;
                if (cardToPlay.color === 'BLACK') {
                    const counts: any = { RED:0, BLUE:0, GREEN:0, YELLOW:0 };
                    player.hand!.forEach(c => { if(c.color !== 'BLACK') counts[c.color]++; });
                    chosenColor = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as UnoColor;
                }
                get().playCard(player.id, cardToPlay, chosenColor);
            } else {
                get().drawCard(player.id);
            }
        }, 1500); 
    },

    resetGame: () => {
        set({
            phase: 'LOBBY',
            roomId: null,
            players: [],
            pot: 0,
            winnerId: null,
            drawPile: [],
            lastAction: ''
        });
    }
}));
