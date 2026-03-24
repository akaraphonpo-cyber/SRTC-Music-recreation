
import { StudentWithId } from '../../../types';

export type GamePhase = 'LOBBY' | 'PLAYING' | 'GAME_OVER';
export type GameMode = 'SINGLE' | 'MULTI';
export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export type UnoColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'BLACK';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'SKIP' | 'REVERSE' | 'DRAW_2' | 'WILD' | 'WILD_DRAW_4';

export interface UnoCard {
    id: string;
    color: UnoColor;
    value: UnoValue;
}

export interface UnoPlayer {
    id: string;
    name: string;
    avatar: string;
    handCount: number;
    hand?: UnoCard[]; // Only populated for local player or in single player
    isUno: boolean;
    isBot?: boolean;
}

export interface UnoGameState {
    phase: GamePhase;
    mode: GameMode;
    roomId: string | null;
    difficulty: BotDifficulty;
    
    // Betting
    betAmount: number;
    fee: number;
    pot: number;

    // Game Data
    players: UnoPlayer[];
    currentPlayerIndex: number;
    direction: 1 | -1;
    discardPileTop: UnoCard | null;
    drawPile: UnoCard[]; // Local only (for SP)
    winnerId: string | null;
    lastAction: string;
    
    // Actions
    setPhase: (phase: GamePhase) => void;
    setBet: (amount: number) => void;
    setMode: (mode: GameMode) => void;
    setDifficulty: (diff: BotDifficulty) => void;
    initializeSinglePlayer: (student: StudentWithId) => void;
    initializeMultiPlayer: (student: StudentWithId, roomId: string) => void;
    playCard: (playerId: string, card: UnoCard, chosenColor?: UnoColor) => void;
    drawCard: (playerId: string) => void;
    resetGame: () => void;
    processBotTurn: () => void; // Trigger bot logic
    syncFromFirestore: (roomData: any, myStudentId: string) => void; // New sync action
}
