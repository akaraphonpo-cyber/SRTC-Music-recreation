
import React, { useState, useEffect, useMemo } from 'react';
import { WerewolfRoom, StudentWithId, GachaLog, GameConfig, CustomGameItem, GameItem, ShopItemConfig, GachaPoolItemConfig } from '../../types';
import { subscribeToAllWerewolfRooms, forceDeleteWerewolfRoom, getGameLeaderboard, resetGameLeaderboard, getGachaLogs, giveGachaTicketToAll, distributeWeeklyRewards, getGameConfig, setGameConfig } from '../../services/googleSheetService';
import { GACHA_POOL, getAllGameItems, SYSTEM_SHOP_LIST } from '../../utils/gamification';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

const GameManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'settings' | 'shop' | 'werewolf' | 'runner' | 'gacha'>('settings');
    
    // Werewolf State
    const [werewolfRooms, setWerewolfRooms] = useState<WerewolfRoom[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    
    // Runner State
    const [leaderboard, setLeaderboard] = useState<StudentWithId[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
    
    // Gacha State
    const [gachaLogs, setGachaLogs] = useState<GachaLog[]>([]);
    const [isLoadingGacha, setIsLoadingGacha] = useState(false);

    // Game Settings State
    const [gameConfig, setGameConfigState] = useState<GameConfig>({
        gacha: { pool: [], coinCost: 500 },
        runner: { baseSpeed: 6, gravity: 0.6 },
        shop: { items: [] },
        customItems: {}
    });
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Shop Editor State
    const [localShopItems, setLocalShopItems] = useState<ShopItemConfig[]>([]);
    const [newItemIdToAdd, setNewItemIdToAdd] = useState('');
    const [newItemPrice, setNewItemPrice] = useState(100);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Custom Item Creator State
    const [newCustomItem, setNewCustomItem] = useState<Partial<CustomGameItem>>({
        name: '',
        icon: '📦',
        description: '',
        rarity: 'common',
        type: 'special',
        baseValue: 100
    });

    const notification = useNotification();

    // Subscribe to Werewolf Rooms
    useEffect(() => {
        if (activeTab === 'werewolf') {
            const unsubscribe = subscribeToAllWerewolfRooms((rooms) => {
                setWerewolfRooms(rooms);
                setIsLoadingRooms(false);
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'runner') fetchLeaderboard();
        if (activeTab === 'gacha') fetchGachaLogs();
        if (activeTab === 'settings' || activeTab === 'shop') fetchGameConfig();
    }, [activeTab]);

    // Update local shop items when config loads
    useEffect(() => {
        if (gameConfig.shop?.items) {
            setLocalShopItems(gameConfig.shop.items);
        } else {
            // Fallback default
            setLocalShopItems(SYSTEM_SHOP_LIST.map(i => ({ ...i, enabled: true })));
        }
        setHasUnsavedChanges(false);
    }, [gameConfig]);

    const fetchGameConfig = async () => {
        const res = await getGameConfig();
        if (res.success && res.data) {
            setGameConfigState(res.data);
        }
    };

    const fetchLeaderboard = async () => {
        setIsLoadingLeaderboard(true);
        const res = await getGameLeaderboard();
        if (res.success && res.data) setLeaderboard(res.data);
        setIsLoadingLeaderboard(false);
    };

    const fetchGachaLogs = async () => {
        setIsLoadingGacha(true);
        const res = await getGachaLogs();
        if (res.success && res.data) setGachaLogs(res.data);
        setIsLoadingGacha(false);
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        const res = await setGameConfig(gameConfig);
        if (res.success) notification.addToast({ type: 'success', title: 'บันทึกสำเร็จ' });
        else notification.addToast({ type: 'error', title: 'Error', message: res.message });
        setIsSavingConfig(false);
    };

    // Used for Price Updates primarily
    const handleSaveShop = async () => {
        setIsSavingConfig(true);
        const newConfig = {
            ...gameConfig,
            shop: { items: localShopItems }
        };
        const res = await setGameConfig(newConfig);
        if (res.success) {
            setGameConfigState(newConfig);
            setHasUnsavedChanges(false);
            notification.addToast({ type: 'success', title: 'บันทึกร้านค้าสำเร็จ' });
        } else {
            notification.addToast({ type: 'error', title: 'Error', message: res.message });
        }
        setIsSavingConfig(false);
    };

    // --- Actions ---
    const handleResetScores = () => {
        notification.showConfirmation({
            title: 'รีเซ็ตคะแนนทั้งหมด?',
            message: 'คะแนน High Score ของทุกคนจะกลายเป็น 0',
            confirmText: 'รีเซ็ตเลย',
            onConfirm: async () => {
                await resetGameLeaderboard();
                fetchLeaderboard();
                notification.addToast({ type: 'success', title: 'รีเซ็ตเรียบร้อย' });
            }
        });
    };

    const handleGiveGachaTickets = () => {
        notification.showConfirmation({
            title: 'แจกตั๋วกาชาฟรี?',
            message: 'นักศึกษาทุกคนจะได้รับตั๋ว 1 ใบ',
            confirmText: 'แจกเลย',
            onConfirm: async () => {
                const res = await giveGachaTicketToAll();
                if (res.success) notification.addToast({ type: 'success', title: 'แจกตั๋วสำเร็จ', message: res.message });
            }
        });
    };

    const handleWeeklyReward = () => {
        notification.showConfirmation({
            title: 'มอบรางวัลประจำสัปดาห์?',
            message: 'อันดับ 1 จะได้รับ 300 XP และ 2 ตั๋ว',
            confirmText: 'มอบรางวัล',
            onConfirm: async () => {
                const res = await distributeWeeklyRewards();
                if (res.success) notification.addToast({ type: 'success', title: 'มอบรางวัลสำเร็จ', message: res.message });
                else notification.addToast({ type: 'error', title: 'Error', message: res.message });
            }
        });
    };

    // --- Werewolf Bulk Actions ---
    const handleDeleteAllRooms = () => {
        notification.showConfirmation({
            title: 'ลบห้องทั้งหมด?',
            message: `คุณกำลังจะลบห้อง Werewolf ทั้งหมด ${werewolfRooms.length} ห้อง การกระทำนี้ไม่สามารถกู้คืนได้`,
            confirmText: 'ยืนยันลบทั้งหมด',
            confirmButtonColor: 'red',
            onConfirm: async () => {
                setIsLoadingRooms(true);
                try {
                    // Create an array of delete promises
                    const deletePromises = werewolfRooms.map(room => forceDeleteWerewolfRoom(room.roomId));
                    await Promise.all(deletePromises);
                    notification.addToast({ type: 'success', title: 'ลบเรียบร้อย', message: 'ลบห้องทั้งหมดสำเร็จแล้ว' });
                } catch (error) {
                    console.error("Error deleting all rooms:", error);
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถลบห้องทั้งหมดได้' });
                } finally {
                    setIsLoadingRooms(false);
                }
            }
        });
    };

    // --- Gacha Pool Logic ---
    const handleGachaWeightChange = (itemId: string, newWeight: number) => {
        setGameConfigState(prevState => {
            const currentPool = prevState.gacha.pool && prevState.gacha.pool.length > 0 
                ? prevState.gacha.pool 
                : GACHA_POOL.map(p => ({ ...p, enabled: true }));

            // Check if item exists in current pool config
            const existingItemIndex = currentPool.findIndex(p => p.itemId === itemId);
            let updatedPool;

            if (existingItemIndex > -1) {
                updatedPool = currentPool.map((p, idx) => idx === existingItemIndex ? { ...p, weight: newWeight } : p);
            } else {
                updatedPool = [...currentPool, { itemId, weight: newWeight, enabled: true }];
            }

            return {
                ...prevState,
                gacha: {
                    ...prevState.gacha,
                    pool: updatedPool
                }
            };
        });
    };

    // --- Shop Management Handlers (Auto-Save Enabled) ---
    const handleAddItemToShop = async () => {
        if (!newItemIdToAdd) return;
        
        // Check for duplicates
        if (localShopItems.some(i => i.itemId === newItemIdToAdd)) {
            notification.addToast({type: 'warning', title: 'มีสินค้านี้อยู่แล้ว'});
            return;
        }

        const newItem = { itemId: newItemIdToAdd, price: newItemPrice, enabled: true };
        const newList = [...localShopItems, newItem];
        
        setLocalShopItems(newList);
        setNewItemIdToAdd('');
        
        // Auto-Save
        setIsSavingConfig(true);
        const newConfig = {
            ...gameConfig,
            shop: { items: newList }
        };
        const res = await setGameConfig(newConfig);
        if (res.success) {
            setGameConfigState(newConfig);
            setHasUnsavedChanges(false);
            notification.addToast({ type: 'success', title: 'เพิ่มสินค้าลงร้านเรียบร้อย' });
        } else {
            notification.addToast({ type: 'error', title: 'Error', message: res.message });
        }
        setIsSavingConfig(false);
    };

    const handleRemoveShopItem = async (itemId: string) => {
        const newList = localShopItems.filter(item => item.itemId !== itemId);
        setLocalShopItems(newList);
        
        // Auto-Save
        setIsSavingConfig(true);
        const newConfig = {
            ...gameConfig,
            shop: { items: newList }
        };
        const res = await setGameConfig(newConfig);
        if (res.success) {
            setGameConfigState(newConfig);
            setHasUnsavedChanges(false);
            notification.addToast({ type: 'success', title: 'ลบสินค้าเรียบร้อย' });
        } else {
            notification.addToast({ type: 'error', title: 'Error', message: res.message });
        }
        setIsSavingConfig(false);
    };

    const handleUpdateShopItemPrice = (itemId: string, newPrice: number) => {
        setLocalShopItems(prev => prev.map(item => item.itemId === itemId ? { ...item, price: newPrice } : item));
        setHasUnsavedChanges(true);
    };

    // --- Custom Item Handlers ---
    const handleCreateCustomItem = async () => {
        if (!newCustomItem.name || !newCustomItem.icon) return;
        
        const newId = `custom_${Date.now()}`;
        const item: CustomGameItem = {
            id: newId,
            name: newCustomItem.name!,
            icon: newCustomItem.icon!,
            description: newCustomItem.description || '',
            rarity: newCustomItem.rarity || 'common',
            type: newCustomItem.type || 'special',
            color: 'text-gray-500', // Default
            baseValue: newCustomItem.baseValue || 100
        };

        const updatedConfig = {
            ...gameConfig,
            // Sync local shop items to avoid losing pending price changes
            shop: { items: localShopItems }, 
            customItems: {
                ...gameConfig.customItems,
                [newId]: item
            }
        };

        setIsSavingConfig(true);
        const res = await setGameConfig(updatedConfig);
        if (res.success) {
            setGameConfigState(updatedConfig);
            setNewCustomItem({ name: '', icon: '📦', description: '', rarity: 'common', type: 'special', baseValue: 100 });
            notification.addToast({ type: 'success', title: 'สร้างไอเท็มสำเร็จ' });
        }
        setIsSavingConfig(false);
    };

    const handleDeleteCustomItem = async (itemId: string) => {
        const updatedCustomItems = { ...gameConfig.customItems };
        delete updatedCustomItems[itemId];
        
        const updatedConfig = { 
            ...gameConfig, 
            // Sync local shop items
            shop: { items: localShopItems },
            customItems: updatedCustomItems 
        };
        
        setIsSavingConfig(true);
        const res = await setGameConfig(updatedConfig);
        if (res.success) {
            setGameConfigState(updatedConfig);
            notification.addToast({ type: 'success', title: 'ลบไอเท็มสำเร็จ' });
        }
        setIsSavingConfig(false);
    };

    // Combined Items List
    const allItems = useMemo(() => getAllGameItems(gameConfig.customItems), [gameConfig.customItems]);

    // Calculate Total Gacha Weight for Percentage Display
    const currentGachaPool = useMemo(() => {
        return gameConfig.gacha.pool && gameConfig.gacha.pool.length > 0 
            ? gameConfig.gacha.pool 
            : GACHA_POOL.map(p => ({ ...p, enabled: true }));
    }, [gameConfig.gacha.pool]);

    const totalGachaWeight = useMemo(() => {
        return currentGachaPool.reduce((sum, item) => sum + (item.enabled ? item.weight : 0), 0);
    }, [currentGachaPool]);

    // Helper to format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการเกมและร้านค้า (Game Center)</h2>
            
            <div className="flex space-x-2 overflow-x-auto border-b border-white/10 pb-2">
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>ตั้งค่าระบบ</button>
                <button onClick={() => setActiveTab('shop')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'shop' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>ร้านค้า & ไอเท็ม</button>
                <button onClick={() => setActiveTab('werewolf')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'werewolf' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-red-400'}`}>Werewolf Rooms</button>
                <button onClick={() => setActiveTab('runner')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'runner' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-orange-400'}`}>Tech Runner</button>
                <button onClick={() => setActiveTab('gacha')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'gacha' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-pink-400'}`}>Gacha Logs</button>
            </div>

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-pink-400">Gacha Config</h3>
                            <div className={`text-xs px-2 py-1 rounded-full font-bold border ${Math.abs(totalGachaWeight - 100) < 0.1 ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                                Total: {totalGachaWeight.toFixed(2)}%
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">ราคาต่อการสุ่ม (Coins)</label>
                                <input 
                                    type="number" 
                                    value={gameConfig.gacha.coinCost}
                                    onChange={(e) => setGameConfigState({...gameConfig, gacha: {...gameConfig.gacha, coinCost: parseInt(e.target.value)}})}
                                    className="w-full p-2 rounded bg-black/20 border border-white/10"
                                />
                            </div>
                            <div className="bg-black/20 p-4 rounded-lg max-h-80 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
                                    <span>Item Name</span>
                                    <span>Rate %</span>
                                </div>
                                {GACHA_POOL.map(poolItem => {
                                    const itemDef = allItems[poolItem.itemId];
                                    const customPool = currentGachaPool.find(p => p.itemId === poolItem.itemId);
                                    const weight = customPool ? customPool.weight : poolItem.weight;
                                    const actualPercent = totalGachaWeight > 0 ? (weight / totalGachaWeight) * 100 : 0;
                                    
                                    return (
                                        <div key={poolItem.itemId} className="flex justify-between items-center mb-2 text-sm bg-white/5 p-2 rounded border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{itemDef?.icon}</span>
                                                <span className="truncate max-w-[100px]">{itemDef?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    value={weight}
                                                    className="w-16 p-1 text-center bg-black/40 rounded border border-white/10 text-white"
                                                    onChange={(e) => handleGachaWeightChange(poolItem.itemId, parseFloat(e.target.value) || 0)}
                                                />
                                                <span className="text-xs text-gray-400 w-12 text-right">({actualPercent.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-xl font-bold mb-4 text-orange-400">Tech Runner Config</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">Base Speed</label>
                                <input 
                                    type="number" 
                                    value={gameConfig.runner.baseSpeed}
                                    onChange={(e) => setGameConfigState({...gameConfig, runner: {...gameConfig.runner, baseSpeed: parseFloat(e.target.value)}})}
                                    className="w-full p-2 rounded bg-black/20 border border-white/10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Gravity</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={gameConfig.runner.gravity}
                                    onChange={(e) => setGameConfigState({...gameConfig, runner: {...gameConfig.runner, gravity: parseFloat(e.target.value)}})}
                                    className="w-full p-2 rounded bg-black/20 border border-white/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-full flex justify-end">
                        <button onClick={handleSaveConfig} disabled={isSavingConfig} className="btn-accent px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">
                            {isSavingConfig ? 'Saving...' : 'บันทึกการตั้งค่าเกม'}
                        </button>
                    </div>
                </div>
            )}

            {/* SHOP & ITEMS TAB */}
            {activeTab === 'shop' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Shop Manager */}
                    <div className="glass-card p-6 rounded-2xl flex flex-col h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-2xl">🏪</span> จัดการร้านค้า (System Shop)
                        </h3>
                        
                        {/* Add Item Form */}
                        <div className="bg-black/10 p-4 rounded-xl mb-4 border border-white/5">
                            <h4 className="font-bold text-sm mb-2 opacity-80">เพิ่มสินค้าลงร้าน</h4>
                            <div className="flex flex-col gap-2">
                                <select 
                                    value={newItemIdToAdd}
                                    onChange={(e) => setNewItemIdToAdd(e.target.value)}
                                    className="w-full p-2 rounded-lg bg-white/90 text-black text-sm"
                                >
                                    <option value="">-- เลือกไอเท็ม --</option>
                                    {Object.values(allItems).map((item: any) => (
                                        <option key={item.id} value={item.id}>{item.icon} {item.name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(parseInt(e.target.value))}
                                        className="flex-grow p-2 rounded-lg bg-black/20 border border-white/10 text-white"
                                        placeholder="ราคา"
                                    />
                                    <button 
                                        onClick={handleAddItemToShop} 
                                        disabled={isSavingConfig}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md whitespace-nowrap"
                                    >
                                        เพิ่มลงร้าน
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Current Shop List */}
                        <div className="space-y-2 flex-grow overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-2 rounded-xl mb-4 max-h-[400px]">
                            <div className="flex justify-between text-xs font-bold opacity-50 px-2 mb-1">
                                <span>สินค้าที่วางขาย (ใน Dashboard นักศึกษา)</span>
                                <span>ราคา (Coins)</span>
                            </div>
                            {localShopItems.length === 0 ? (
                                <p className="text-center py-4 opacity-50">ร้านค้าว่างเปล่า</p>
                            ) : (
                                localShopItems.map((shopItem, index) => {
                                    const itemDef = allItems[shopItem.itemId];
                                    if (!itemDef) return null;
                                    return (
                                        <div key={index} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl bg-black/20 p-1.5 rounded-lg">{itemDef.icon}</div>
                                                <div>
                                                    <div className="font-bold text-sm">{itemDef.name}</div>
                                                    <div className="text-xs opacity-50">{itemDef.type}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    value={shopItem.price}
                                                    onChange={(e) => handleUpdateShopItemPrice(shopItem.itemId, parseInt(e.target.value))}
                                                    className="w-20 p-1.5 text-center bg-black/20 border border-white/10 rounded-lg text-yellow-400 font-bold focus:border-yellow-500 outline-none"
                                                />
                                                <button onClick={() => handleRemoveShopItem(shopItem.itemId)} className="text-red-400 hover:text-red-300 p-1" title="ลบสินค้า (Auto-Save)">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        
                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleSaveShop} 
                                disabled={isSavingConfig || !hasUnsavedChanges}
                                className={`font-bold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 w-full justify-center ${hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse' : 'bg-gray-600 text-gray-400'}`}
                            >
                                {isSavingConfig && <LoadingSpinner size="sm" color="border-white" />}
                                {hasUnsavedChanges ? '⚠️ บันทึกราคา (Save Prices)' : 'ราคาเป็นปัจจุบัน'}
                            </button>
                        </div>
                    </div>

                    {/* Custom Item Creator */}
                    <div className="glass-card p-6 rounded-2xl border border-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-300">
                            <span className="text-2xl">🛠️</span> สร้างไอเท็มใหม่ (Custom Items)
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm mb-1">ชื่อไอเท็ม</label>
                                <input type="text" value={newCustomItem.name} onChange={e => setNewCustomItem({...newCustomItem, name: e.target.value})} className="w-full p-2 rounded bg-black/20 border border-white/10" placeholder="เช่น บัตรผ่านพิเศษ" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-1">ไอคอน (Emoji)</label>
                                    <input type="text" value={newCustomItem.icon} onChange={e => setNewCustomItem({...newCustomItem, icon: e.target.value})} className="w-full p-2 rounded bg-black/20 border border-white/10 text-center text-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">ระดับ (Rarity)</label>
                                    <select value={newCustomItem.rarity} onChange={e => setNewCustomItem({...newCustomItem, rarity: e.target.value as any})} className="w-full p-2 rounded bg-black/20 border border-white/10">
                                        <option value="common">Common</option>
                                        <option value="uncommon">Uncommon</option>
                                        <option value="rare">Rare</option>
                                        <option value="epic">Epic</option>
                                        <option value="legendary">Legendary</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">รายละเอียด</label>
                                <textarea value={newCustomItem.description} onChange={e => setNewCustomItem({...newCustomItem, description: e.target.value})} className="w-full p-2 rounded bg-black/20 border border-white/10" placeholder="คำอธิบายไอเท็ม..." rows={2}></textarea>
                            </div>
                            <button onClick={handleCreateCustomItem} disabled={isSavingConfig} className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold shadow-md">สร้างไอเท็ม (Auto-Save)</button>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            <h4 className="font-bold text-sm mb-3 opacity-80">รายการไอเท็มพิเศษที่สร้างไว้</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {Object.values(gameConfig.customItems || {}).map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center bg-purple-900/20 p-2 rounded-lg border border-purple-500/20">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{item.icon}</span>
                                            <div>
                                                <div className="font-bold text-xs">{item.name}</div>
                                                <div className="text-[10px] opacity-60">{item.rarity}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteCustomItem(item.id)} className="text-red-400 hover:text-red-300 p-1 text-xs">ลบ</button>
                                    </div>
                                ))}
                                {Object.keys(gameConfig.customItems || {}).length === 0 && <p className="text-center text-xs opacity-40">ยังไม่มีไอเท็มพิเศษ</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WEREWOLF ROOMS */}
            {activeTab === 'werewolf' && (
                <div className="space-y-4">
                    {/* Header with Delete All Button */}
                    <div className="flex justify-end mb-2">
                         <button
                            onClick={handleDeleteAllRooms}
                            disabled={werewolfRooms.length === 0}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            ลบห้องทั้งหมด
                        </button>
                    </div>

                    {isLoadingRooms ? <LoadingSpinner size="lg" /> : (
                        werewolfRooms.length > 0 ? werewolfRooms.map(room => (
                            <div key={room.roomId} className="glass-card p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-red-400">Room {room.roomId}</h3>
                                    <p className="text-sm text-gray-400">Status: {room.status} | Phase: {room.phase} | Players: {room.players.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Created: {formatDate(room.createdAt)}
                                    </p>
                                </div>
                                <button onClick={() => {
                                    notification.showConfirmation({
                                        title: 'ลบห้อง?',
                                        message: `ยืนยันการลบห้อง ${room.roomId}`,
                                        confirmText: 'ลบเลย',
                                        onConfirm: async () => {
                                            await forceDeleteWerewolfRoom(room.roomId);
                                            notification.addToast({type:'success', title:'Deleted'});
                                        }
                                    });
                                }} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm">Force Delete</button>
                            </div>
                        )) : <p className="text-center py-10 opacity-50">ไม่มีห้องที่กำลังเล่นอยู่</p>
                    )}
                </div>
            )}

            {/* TECH RUNNER */}
            {activeTab === 'runner' && (
                <div className="space-y-6">
                    <div className="flex justify-end gap-2">
                        <button onClick={handleResetScores} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-bold">รีเซ็ตคะแนนทั้งหมด</button>
                    </div>
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-xl font-bold mb-4 text-orange-400">Leaderboard</h3>
                        {isLoadingLeaderboard ? <LoadingSpinner /> : (
                            <table className="w-full text-sm">
                                <thead className="bg-white/10 text-left">
                                    <tr>
                                        <th className="p-2">Rank</th>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((s, i) => (
                                        <tr key={s.id} className="border-b border-white/5">
                                            <td className="p-2">{i+1}</td>
                                            <td className="p-2">{s.firstName} {s.lastName}</td>
                                            <td className="p-2 font-mono text-orange-300">{s.highScore}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* GACHA LOGS */}
            {activeTab === 'gacha' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-bold text-pink-400 flex items-center gap-2">
                            <span className="text-2xl">🎰</span> Gacha History
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={fetchGachaLogs} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                                🔄 รีเฟรช
                            </button>
                            <button onClick={handleGiveGachaTickets} className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-pink-900/20">
                                🎟️ แจกตั๋วฟรี (+1)
                            </button>
                            <button onClick={handleWeeklyReward} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-yellow-900/20">
                                🏆 มอบรางวัลวีค
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-1 rounded-2xl overflow-hidden border border-white/10">
                        {isLoadingGacha ? (
                            <div className="p-10 flex justify-center"><LoadingSpinner /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-left text-gray-400 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="p-4 font-medium">Time</th>
                                            <th className="p-4 font-medium">Student</th>
                                            <th className="p-4 font-medium">Item</th>
                                            <th className="p-4 font-medium text-center">Rarity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {gachaLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                                    ยังไม่มีประวัติการสุ่ม
                                                </td>
                                            </tr>
                                        ) : (
                                            gachaLogs.map((log) => {
                                                const itemDef = allItems[log.itemId];
                                                const rarityColors: Record<string, string> = {
                                                    common: 'bg-gray-600 text-gray-200',
                                                    uncommon: 'bg-green-900 text-green-300 border border-green-700',
                                                    rare: 'bg-blue-900 text-blue-300 border border-blue-700',
                                                    epic: 'bg-purple-900 text-purple-300 border border-purple-700',
                                                    legendary: 'bg-yellow-900 text-yellow-300 border border-yellow-700 animate-pulse',
                                                };
                                                
                                                return (
                                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 whitespace-nowrap text-gray-400">
                                                            {new Date(log.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-white">{log.studentName}</div>
                                                            <div className="text-xs text-gray-500">{log.studentId}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-2xl bg-black/20 w-10 h-10 flex items-center justify-center rounded-lg">
                                                                    {itemDef?.icon || '🎁'}
                                                                </div>
                                                                <span className="font-medium text-gray-200">{log.itemName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${rarityColors[log.rarity] || rarityColors['common']}`}>
                                                                {log.rarity}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameManagement;
