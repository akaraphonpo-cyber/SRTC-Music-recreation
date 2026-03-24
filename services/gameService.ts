import { db } from './firebase';
import { 
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
    query, orderBy, where, writeBatch, serverTimestamp, increment,
    onSnapshot, limit, setDoc, deleteField
} from "firebase/firestore";
import { collections } from './configService';
import { 
    ApiResponse, GachaLog, MarketplaceListing, 
    WerewolfRoom, UnoRoom, UnoCard, UnoPlayer, WerewolfPlayer, WerewolfRole,
    Tournament, TournamentWithId, StudentWithId
} from '../types';
import { ensureGameAuth } from './authService';
import { callCloudFunction } from './googleSheetService'; // Temporary import until moved

// --- Gacha ---
export const getGachaLogs = async (): Promise<ApiResponse<GachaLog[]>> => {
    try {
        const q = query(collections.gachaLogs, orderBy('timestamp', 'desc'), limit(50));
        const snap = await getDocs(q);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as GachaLog)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const saveGachaLog = async (log: Omit<GachaLog, 'id'|'timestamp'>): Promise<ApiResponse> => {
    try {
        await addDoc(collections.gachaLogs, { ...log, timestamp: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Marketplace ---
export const getMarketplaceListings = async (): Promise<ApiResponse<MarketplaceListing[]>> => {
    try {
        const snap = await getDocs(collections.marketplace);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceListing)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const createMarketplaceListing = async (listing: Omit<MarketplaceListing, 'id'|'createdAt'>): Promise<ApiResponse> => {
    try {
        await addDoc(collections.marketplace, { ...listing, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Werewolf ---
export const createWerewolfRoom = async (hostId: string, hostName: string, hostAvatar: string): Promise<ApiResponse<string>> => {
    try {
        const hostPlayer: WerewolfPlayer = {
            id: hostId,
            name: hostName,
            avatar: hostAvatar,
            role: WerewolfRole.MODERATOR,
            isAlive: true,
            isReady: true
        };
        const room: WerewolfRoom = {
            id: `ww_${Date.now()}`,
            hostId,
            status: 'WAITING',
            players: [hostPlayer],
            createdAt: new Date().toISOString(),
            config: {
                maxPlayers: 12,
                roleCounts: { [WerewolfRole.WEREWOLF]: 1, [WerewolfRole.SEER]: 1, [WerewolfRole.VILLAGER]: 1 },
                discussionTime: 60
            }
        };
        await setDoc(doc(collections.werewolf, room.id), room);
        return { success: true, data: room.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const subscribeToWerewolfRoom = (roomId: string, onUpdate: (room: WerewolfRoom | null) => void) => {
    return onSnapshot(doc(collections.werewolf, roomId), (doc) => {
        if (doc.exists()) onUpdate(doc.data() as WerewolfRoom);
        else onUpdate(null);
    });
};

export const subscribeToAllWerewolfRooms = (onUpdate: (rooms: WerewolfRoom[]) => void) => {
    return onSnapshot(collections.werewolf, (snap) => {
        onUpdate(snap.docs.map(d => d.data() as WerewolfRoom));
    });
};

export const joinWerewolfRoom = async (roomId: string, player: WerewolfPlayer): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.werewolf, roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return { success: false, message: 'Room not found' };
        
        const room = snap.data() as WerewolfRoom;
        if (room.status !== 'LOBBY') return { success: false, message: 'Game already started' };
        if (room.players.some(p => p.id === player.id)) return { success: true, message: 'Already joined' };
        
        await updateDoc(roomRef, {
            players: [...room.players, player]
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const leaveWerewolfRoom = async (roomId: string, playerId: string): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.werewolf, roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return { success: true };
        const room = snap.data() as WerewolfRoom;
        
        if (room.hostId === playerId) {
            await deleteDoc(roomRef);
        } else {
            const newPlayers = room.players.filter(p => p.id !== playerId);
            await updateDoc(roomRef, { players: newPlayers });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateWerewolfRoomState = async (roomId: string, updates: Partial<WerewolfRoom>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.werewolf, roomId), updates);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const forceDeleteWerewolfRoom = async (roomId: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.werewolf, roomId));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Uno ---
export const createUnoRoom = async (hostId: string, hostName: string, betAmount: number): Promise<ApiResponse<string>> => {
    try {
        const roomId = `uno_${Date.now()}`;
        const newRoom: UnoRoom = {
            id: roomId,
            hostId,
            status: 'WAITING',
            players: [{
                id: hostId,
                name: hostName,
                hand: [],
                handCount: 0,
                isUno: false,
                isReady: true
            }],
            pot: betAmount,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(collections.uno, roomId), newRoom);
        return { success: true, data: roomId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const subscribeToUnoRoom = (roomId: string, onUpdate: (room: UnoRoom | null) => void) => {
    return onSnapshot(doc(collections.uno, roomId), (doc) => {
        if (doc.exists()) onUpdate(doc.data() as UnoRoom);
        else onUpdate(null);
    });
};

export const joinUnoRoom = async (roomId: string, player: { id: string, name: string }): Promise<ApiResponse> => {
    try {
        await ensureGameAuth();
        
        const roomRef = doc(collections.uno, roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) return { success: false, message: 'ไม่พบห้อง' };
        const room = roomSnap.data() as UnoRoom;
        
        if (room.status !== 'LOBBY') return { success: false, message: 'เกมเริ่มแล้ว' };
        if (room.players.length >= 10) return { success: false, message: 'ห้องเต็ม (สูงสุด 10 คน)' };
        if (room.players.some(p => p.id === player.id)) return { success: true, message: 'อยู่ในห้องแล้ว' };
        
        const studentRef = doc(collections.students, player.id);
        const studentSnap = await getDoc(studentRef);
        const coins = studentSnap.data()?.coins || 0;
        
        if (coins < room.betAmount) return { success: false, message: 'เหรียญไม่พอเดิมพัน' };
        
        await updateDoc(studentRef, { coins: coins - room.betAmount });
        
        const newPlayer: UnoPlayer = {
            id: player.id,
            name: player.name,
            handCount: 0,
            hand: [],
            isUno: false,
            avatar: '👤'
        };
        
        await updateDoc(roomRef, {
            players: [...room.players, newPlayer],
            pot: room.pot + room.betAmount
        });
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const leaveUnoRoom = async (roomId: string, playerId: string): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.uno, roomId);
        const roomSnap = await getDoc(roomRef);
        if(!roomSnap.exists()) return { success: true };
        
        const room = roomSnap.data() as UnoRoom;
        
        if (room.status === 'LOBBY') {
            const studentRef = doc(collections.students, playerId);
            const refund = room.betAmount + (room.hostId === playerId ? 100 : 0); 
            await updateDoc(studentRef, { coins: increment(refund) });
        }
        
        if (room.hostId === playerId) {
            if (room.status === 'LOBBY') {
                for (const p of room.players) {
                    if (p.id !== playerId) {
                        const pRef = doc(collections.students, p.id);
                        await updateDoc(pRef, { coins: increment(room.betAmount) });
                    }
                }
            }
            await deleteDoc(roomRef);
        } else {
            const newPlayers = room.players.filter(p => p.id !== playerId);
            await updateDoc(roomRef, {
                players: newPlayers,
                pot: room.pot - room.betAmount
            });
        }
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const startUnoGame = async (roomId: string, deck: UnoCard[], firstCard: UnoCard, playerHands: Record<string, UnoCard[]>): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.uno, roomId);
        const roomSnap = await getDoc(roomRef);
        const room = roomSnap.data() as UnoRoom;
        
        const updatedPlayers = room.players.map(p => ({
            ...p,
            hand: playerHands[p.id],
            handCount: 7
        }));
        
        await updateDoc(roomRef, {
            status: 'PLAYING',
            fullDeck: deck,
            topCard: firstCard,
            players: updatedPlayers,
            currentTurnIndex: 0,
            drawPileCount: deck.length
        });
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const playUnoCard = async (roomId: string, playerId: string, card: UnoCard, nextTurnIndex: number, newHand: UnoCard[], isWin: boolean): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.uno, roomId);
        const batch = writeBatch(db);

        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) throw new Error("Room not found");
        const room = roomSnap.data() as UnoRoom;

        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) throw new Error("Player not in room");

        const updatedPlayers = [...room.players];
        updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            hand: newHand,
            handCount: newHand.length,
            isUno: false
        };
        
        if (isWin) {
            const winnerRef = doc(collections.students, playerId);
            const potAmount = room.pot || 0;
            batch.update(winnerRef, { coins: increment(potAmount) });
            batch.update(roomRef, {
                status: 'ENDED',
                winnerId: playerId,
                players: updatedPlayers,
                topCard: card,
                lastAction: `${updatedPlayers[playerIndex].name} Won!`
            });
        } else {
            batch.update(roomRef, {
                topCard: card,
                players: updatedPlayers,
                currentTurnIndex: nextTurnIndex,
                lastAction: `${updatedPlayers[playerIndex].name} played ${card.value}`
            });
        }
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const drawUnoCard = async (roomId: string, playerId: string, newCard: UnoCard, deckRemaining: UnoCard[]): Promise<ApiResponse> => {
    try {
        const roomRef = doc(collections.uno, roomId);
        const roomSnap = await getDoc(roomRef);
        const room = roomSnap.data() as UnoRoom;
        
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        const updatedPlayers = [...room.players];
        const currentHand = updatedPlayers[playerIndex].hand || [];
        
        updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            hand: [...currentHand, newCard],
            handCount: currentHand.length + 1
        };
        
        await updateDoc(roomRef, {
            players: updatedPlayers,
            fullDeck: deckRemaining,
            drawPileCount: deckRemaining.length
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

// --- Tournaments ---
export const getTournaments = async (): Promise<ApiResponse<TournamentWithId[]>> => {
    try {
        const snap = await getDocs(collections.tournaments);
        return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentWithId)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getTournamentsForStudent = async (studentId: string): Promise<ApiResponse<TournamentWithId[]>> => {
    try {
        const snap = await getDocs(collections.tournaments);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentWithId));
        const filtered = all.filter(t => t.teams.some(team => team.members.some(m => m.studentId === studentId)));
        return { success: true, data: filtered };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addTournament = async (tournament: Omit<Tournament, 'createdAt'>): Promise<ApiResponse> => {
    try {
        await addDoc(collections.tournaments, { ...tournament, createdAt: new Date().toISOString() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateTournament = async (id: string, data: Partial<Tournament>): Promise<ApiResponse> => {
    try {
        await updateDoc(doc(collections.tournaments, id), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteTournament = async (id: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.tournaments, id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Marketplace Actions ---
export const buyMarketplaceItem = async (listing: MarketplaceListing, buyerId: string): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('buyMarketplaceItem', { listingId: listing.id, buyerId });
    } catch (e: any) {
         // Fallback manual transaction logic could go here
         await deleteDoc(doc(collections.marketplace, listing.id));
         return { success: true };
    }
};

export const cancelMarketplaceListing = async (listingId: string): Promise<ApiResponse> => {
    try {
        await deleteDoc(doc(collections.marketplace, listingId));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const distributeWeeklyRewards = async (): Promise<ApiResponse> => {
    try {
        return await callCloudFunction('distributeWeeklyRewards');
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
