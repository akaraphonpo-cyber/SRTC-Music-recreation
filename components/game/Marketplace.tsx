
import React, { useState, useEffect, useMemo } from 'react';
import { StudentWithId, MarketplaceListing, GameConfig, ShopItemConfig } from '../../types';
import { createMarketplaceListing, getMarketplaceListings, buyMarketplaceItem, cancelMarketplaceListing } from '../../services/gameService';
import { updateStudent, buySystemItem } from '../../services/studentService';
import { getGameConfig } from '../../services/configService';
import { GAME_ITEMS, SYSTEM_SHOP_LIST, getAllGameItems } from '../../utils/gamification';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface MarketplaceProps {
    student: StudentWithId;
    onUpdateStudent: (student: StudentWithId) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ student, onUpdateStudent }) => {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'mylist' | 'system'>('buy');
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sellItemId, setSellItemId] = useState<string>('');
    const [sellPrice, setSellPrice] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
    
    const notification = useNotification();

    const fetchListings = useCallback(async () => {
        await Promise.resolve();
        setIsLoading(true);
        const res = await getMarketplaceListings();
        if (res.success && res.data) {
            setListings(res.data);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Fetch config initially
        const fetchConfig = async () => {
            await Promise.resolve();
            const res = await getGameConfig();
            if (res.success && res.data) setGameConfig(res.data);
        };
        void fetchConfig();
    }, []);

    useEffect(() => {
        if (activeTab === 'buy' || activeTab === 'mylist') {
            void fetchListings();
        }
    }, [activeTab, fetchListings]);

    // Merge static and custom items
    const allGameItems = useMemo(() => {
        return getAllGameItems(gameConfig?.customItems);
    }, [gameConfig?.customItems]);

    // Determine System Shop Items (Use Config > Hardcoded)
    const systemShopItems = useMemo(() => {
        if (gameConfig?.shop && gameConfig.shop.items.length > 0) {
            return gameConfig.shop.items.filter(i => i.enabled);
        }
        // Fallback for empty config
        return SYSTEM_SHOP_LIST.map(i => ({ itemId: i.itemId, price: i.price, enabled: true }));
    }, [gameConfig?.shop]);

    // Calculate Limits
    const priceLimits = useMemo(() => {
        if (!sellItemId || !allGameItems[sellItemId]) return null;
        const base = allGameItems[sellItemId].baseValue || 10;
        return {
            min: Math.max(1, Math.floor(base * 0.5)), // 50%
            max: Math.ceil(base * 3.0), // 300%
            base: base,
            systemPrice: Math.floor(base * 0.5) // System buys at 50% value
        };
    }, [sellItemId, allGameItems]);

    const handleSellItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseInt(sellPrice);
        if (!sellItemId || isNaN(price)) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาเลือกไอเท็มและระบุราคา' });
            return;
        }

        // Validate Price Limits
        if (priceLimits) {
            if (price < priceLimits.min || price > priceLimits.max) {
                notification.addToast({ 
                    type: 'error', 
                    title: 'ราคาไม่อยู่ในเกณฑ์', 
                    message: `ต้องตั้งราคาในช่วง ${priceLimits.min} - ${priceLimits.max} Coins` 
                });
                return;
            }
        }

        // Deduct item from inventory locally first
        const newInventory = { ...student.inventory };
        if (!newInventory[sellItemId] || newInventory[sellItemId] <= 0) {
             notification.addToast({ type: 'error', title: 'ไอเท็มไม่พอ', message: 'คุณไม่มีไอเท็มนี้' });
             return;
        }
        
        newInventory[sellItemId]--;
        if (newInventory[sellItemId] <= 0) delete newInventory[sellItemId];

        // Optimistic update
        const updatedStudent = { ...student, inventory: newInventory };
        onUpdateStudent(updatedStudent); // Update parent state
        await updateStudent(updatedStudent); // Sync DB

        const listing: Omit<MarketplaceListing, 'id' | 'createdAt'> = {
            sellerId: student.studentId,
            sellerName: student.firstName,
            itemId: sellItemId,
            price: price
        };

        const res = await createMarketplaceListing(listing);
        if (res.success) {
            notification.addToast({ type: 'success', title: 'ลงขายสำเร็จ' });
            setSellItemId('');
            setSellPrice('');
            setActiveTab('mylist');
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
        }
    };

    const handleSellToSystem = async () => {
        if (!sellItemId || !priceLimits) return;

        const itemName = allGameItems[sellItemId]?.name || 'Unknown Item';
        const earnAmount = priceLimits.systemPrice;

        notification.showConfirmation({
            title: 'ขายคืนเข้าระบบ?',
            message: `ยืนยันการขาย "${itemName}" ให้กับระบบในราคา ${earnAmount} Coins? (ได้รับเงินทันที)`,
            confirmText: 'ขายเลย',
            confirmButtonColor: 'rgb(234, 179, 8)', // Yellow/Gold
            onConfirm: async () => {
                // Deduct Item & Add Coins locally
                const newInventory = { ...student.inventory };
                if (!newInventory[sellItemId] || newInventory[sellItemId] <= 0) {
                    notification.addToast({ type: 'error', title: 'ไอเท็มไม่พอ', message: 'คุณไม่มีไอเท็มนี้' });
                    return;
                }

                newInventory[sellItemId]--;
                if (newInventory[sellItemId] <= 0) delete newInventory[sellItemId];

                const currentCoins = student.coins || 0;
                const updatedStudent = { 
                    ...student, 
                    inventory: newInventory,
                    coins: currentCoins + earnAmount
                };

                onUpdateStudent(updatedStudent);
                await updateStudent(updatedStudent);

                notification.addToast({ type: 'success', title: 'ขายสำเร็จ', message: `ได้รับ ${earnAmount} Coins` });
                setSellItemId('');
                setSellPrice('');
            }
        });
    };

    const handleBuyItem = async (listing: MarketplaceListing) => {
        if (listing.sellerId === student.studentId) return; // Cannot buy own
        
        if ((student.coins || 0) < listing.price) {
            notification.addToast({ type: 'error', title: 'เงินไม่พอ', message: 'คุณมีเหรียญไม่พอซื้อสินค้านี้' });
            return;
        }

        const itemName = allGameItems[listing.itemId]?.name || 'Unknown Item';

        notification.showConfirmation({
            title: 'ยืนยันการซื้อ',
            message: `ต้องการซื้อ ${itemName} ในราคา ${listing.price} Coins?`,
            confirmText: 'ซื้อเลย',
            onConfirm: async () => {
                const res = await buyMarketplaceItem(listing, student.studentId);
                if (res.success) {
                    notification.addToast({ type: 'success', title: 'ซื้อสำเร็จ!' });
                    // Update local coins
                    const updatedStudent = { ...student, coins: (student.coins || 0) - listing.price };
                    
                    // Add item locally
                    const inv = { ...updatedStudent.inventory };
                    inv[listing.itemId] = (inv[listing.itemId] || 0) + 1;
                    updatedStudent.inventory = inv;
                    
                    onUpdateStudent(updatedStudent);
                    fetchListings();
                } else {
                    notification.addToast({ type: 'error', title: 'ซื้อไม่สำเร็จ', message: res.message });
                    fetchListings(); // Refresh as item might be gone
                }
            }
        });
    };

    const handleCancelListing = async (listing: MarketplaceListing) => {
        notification.showConfirmation({
            title: 'ยกเลิกการขาย',
            message: 'ต้องการนำสินค้าออกจากตลาดใช่หรือไม่? (ไอเท็มจะคืนเข้ากระเป๋า)',
            confirmText: 'ยกเลิกขาย',
            confirmButtonColor: 'red',
            onConfirm: async () => {
                const res = await cancelMarketplaceListing(listing.id);
                if (res.success) {
                    // Return item to inventory
                    const newInventory = { ...student.inventory };
                    newInventory[listing.itemId] = (newInventory[listing.itemId] || 0) + 1;
                    const updatedStudent = { ...student, inventory: newInventory };
                    
                    onUpdateStudent(updatedStudent);
                    await updateStudent(updatedStudent);
                    
                    notification.addToast({ type: 'success', title: 'ยกเลิกสำเร็จ' });
                    fetchListings();
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
            }
        });
    };

    // --- SYSTEM SHOP LOGIC ---
    const handleBuySystemItem = async (itemId: string, price: number) => {
        if ((student.coins || 0) < price) {
            notification.addToast({ type: 'error', title: 'เงินไม่พอ', message: 'Coins ของคุณไม่เพียงพอ' });
            return;
        }

        const itemName = allGameItems[itemId]?.name || 'Unknown Item';

        notification.showConfirmation({
            title: 'ยืนยันการซื้อ',
            message: `ต้องการซื้อสินค้าพิเศษ "${itemName}" ราคา ${price} Coins?`,
            confirmText: 'ยืนยัน',
            onConfirm: async () => {
                setIsProcessing(true);
                const res = await buySystemItem(student.studentId, itemId, price);
                if (res.success) {
                    // Local Update
                    const updatedStudent = { ...student, coins: (student.coins || 0) - price };
                    const inv = { ...updatedStudent.inventory };
                    inv[itemId] = (inv[itemId] || 0) + 1;
                    updatedStudent.inventory = inv;
                    
                    onUpdateStudent(updatedStudent);
                    notification.addToast({ type: 'success', title: 'ชำระเงินสำเร็จ', message: 'ได้รับไอเท็มแล้ว' });
                } else {
                    notification.addToast({ type: 'error', title: 'ซื้อไม่สำเร็จ', message: res.message });
                }
                setIsProcessing(false);
            }
        });
    };

    return (
        <div className="animate-fade-in p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-shadow flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                    <span className="text-3xl">🏪</span> ตลาดซื้อขาย (Marketplace)
                </h3>
                <div className="glass-card px-3 py-1 rounded-full text-yellow-500 font-bold bg-black/20 border border-yellow-500/30">
                    🪙 {student.coins || 0} Coins
                </div>
            </div>

            <div className="flex space-x-2 border-b border-white/10 mb-4 overflow-x-auto">
                <button onClick={() => setActiveTab('buy')} className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'buy' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>ซื้อของ</button>
                <button onClick={() => setActiveTab('sell')} className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'sell' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>ลงขาย</button>
                <button onClick={() => setActiveTab('mylist')} className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'mylist' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>รายการของฉัน</button>
                <button onClick={() => setActiveTab('system')} className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'system' ? 'border-purple-500 text-purple-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>🏆 ร้านค้าทางการ</button>
            </div>

            {/* BUY TAB */}
            {activeTab === 'buy' && (
                <div>
                    {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : listings.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">ไม่มีสินค้าวางขายในขณะนี้</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {listings.map(listing => {
                                const item = allGameItems[listing.itemId];
                                if (!item) return null;
                                const isMyItem = listing.sellerId === student.studentId;
                                return (
                                    <div key={listing.id} className={`glass-card p-4 rounded-xl flex items-center justify-between border ${isMyItem ? 'border-orange-500/30' : 'border-white/10'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl bg-black/20 p-2 rounded-lg">{item.icon}</div>
                                            <div>
                                                <h4 className="font-bold text-sm" style={{color: 'var(--text-primary)'}}>{item.name}</h4>
                                                <p className="text-xs text-gray-400">ผู้ขาย: {listing.sellerName}</p>
                                                {/* Price Trend Indicator (Optional) */}
                                                <p className="text-[10px] text-slate-500">ราคากลาง: {item.baseValue}</p>
                                            </div>
                                        </div>
                                        {isMyItem ? (
                                            <span className="text-xs font-bold text-orange-400 px-2 py-1 bg-orange-900/20 rounded">สินค้าของคุณ</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleBuyItem(listing)}
                                                className="px-3 py-1.5 rounded-lg text-sm font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1 bg-yellow-500 text-black hover:bg-yellow-400"
                                            >
                                                {listing.price} 🪙
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* SELL TAB */}
            {activeTab === 'sell' && (
                <div className="glass-card p-6 rounded-2xl max-w-md mx-auto">
                    <h4 className="font-bold mb-4 text-center text-blue-400">เลือกไอเท็มที่จะขาย</h4>
                    <div className="space-y-6">
                        {/* 1. Select Item */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">กระเป๋าของฉัน</label>
                            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                                {Object.entries(student.inventory || {}).map(([itemId, count]) => {
                                    const item = allGameItems[itemId];
                                    if (!item || itemId === 'gacha_ticket' || item.type === 'special') return null; // Exclude non-tradeable items
                                    return (
                                        <div 
                                            key={itemId} 
                                            onClick={() => { setSellItemId(itemId); setSellPrice(''); }}
                                            className={`cursor-pointer p-2 rounded-lg text-center border-2 transition-all ${sellItemId === itemId ? 'border-blue-500 bg-blue-500/20' : 'border-transparent hover:bg-white/5'}`}
                                        >
                                            <div className="text-2xl">{item.icon}</div>
                                            <div className="text-[10px] truncate">{item.name}</div>
                                            <div className="text-[10px] text-gray-400">x{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {sellItemId && priceLimits && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                                <p><strong>💰 ราคากลาง:</strong> {priceLimits.base} Coins</p>
                            </div>
                        )}

                        {/* 2. Choose Sell Method */}
                        {sellItemId && priceLimits && (
                            <div className="flex flex-col gap-4 animate-fade-in">
                                {/* Option A: Market Listing */}
                                <div className="border border-white/10 rounded-xl p-4 bg-white/5">
                                    <h5 className="font-bold text-sm text-blue-300 mb-2">🏷️ วางขายในตลาด (กำหนดราคาเอง)</h5>
                                    <form onSubmit={handleSellItem} className="space-y-3">
                                        <div>
                                            <input 
                                                type="number" 
                                                value={sellPrice} 
                                                onChange={(e) => setSellPrice(e.target.value)} 
                                                className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-blue-500 outline-none"
                                                placeholder={`ช่วงราคา: ${priceLimits.min} - ${priceLimits.max}`}
                                                min={priceLimits.min}
                                                max={priceLimits.max}
                                            />
                                        </div>
                                        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-colors text-sm">
                                            ลงขาย (รอคนซื้อ)
                                        </button>
                                    </form>
                                </div>

                                <div className="flex items-center justify-center text-xs text-gray-500 font-bold">OR</div>

                                {/* Option B: System Sell */}
                                <div className="border border-white/10 rounded-xl p-4 bg-white/5">
                                    <h5 className="font-bold text-sm text-yellow-300 mb-2">⚡ ขายด่วนให้ระบบ (ได้เงินทันที)</h5>
                                    <div className="flex justify-between items-center mb-3 text-sm">
                                        <span className="text-gray-400">ราคารับซื้อ (50%):</span>
                                        <span className="font-bold text-yellow-400 text-lg">{priceLimits.systemPrice} Coins</span>
                                    </div>
                                    <button 
                                        onClick={handleSellToSystem}
                                        className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold shadow-lg transition-colors text-sm"
                                    >
                                        ขายทันที
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {!sellItemId && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                                กรุณาเลือกไอเท็มที่ต้องการขาย
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MY LISTINGS TAB */}
            {activeTab === 'mylist' && (
                <div>
                    {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : (
                        <div className="space-y-3">
                            {listings.filter(l => l.sellerId === student.studentId).length === 0 ? (
                                <p className="text-center py-8 text-gray-500">คุณยังไม่มีรายการขาย</p>
                            ) : (
                                listings.filter(l => l.sellerId === student.studentId).map(listing => {
                                    const item = allGameItems[listing.itemId];
                                    return (
                                        <div key={listing.id} className="glass-card p-3 rounded-xl flex items-center justify-between border border-orange-500/30">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">{item?.icon}</div>
                                                <div>
                                                    <h4 className="font-bold text-sm" style={{color: 'var(--text-primary)'}}>{item?.name}</h4>
                                                    <p className="text-xs text-yellow-500 font-bold">{listing.price} 🪙</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleCancelListing(listing)}
                                                className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg text-xs hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* SYSTEM SHOP TAB */}
            {activeTab === 'system' && (
                <div className="animate-fade-in">
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl border border-purple-500/30 text-center">
                        <h4 className="text-xl font-bold text-purple-300 mb-1">👑 ร้านค้าทางการ (System Shop)</h4>
                        <p className="text-sm text-purple-200 opacity-80">แลกรับสิทธิพิเศษด้วย Music Coins</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {systemShopItems.map(shopItem => {
                            const itemDef = allGameItems[shopItem.itemId];
                            if (!itemDef) return null; // Skip invalid
                            
                            const canAfford = (student.coins || 0) >= shopItem.price;
                            
                            return (
                                <div key={shopItem.itemId} className="glass-card p-5 rounded-2xl border border-purple-500/40 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">OFFICIAL</div>
                                    
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-6xl mb-3 animate-bounce-slow filter drop-shadow-lg">{itemDef.icon}</div>
                                        <h4 className={`text-lg font-bold ${itemDef.color}`}>{itemDef.name}</h4>
                                        <p className="text-xs text-gray-400 mt-1 mb-4 h-8 line-clamp-2">{itemDef.description}</p>
                                        
                                        <button 
                                            onClick={() => handleBuySystemItem(shopItem.itemId, shopItem.price)}
                                            disabled={!canAfford || isProcessing}
                                            className={`w-full py-2 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg hover:scale-105' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            {shopItem.price.toLocaleString()} 🪙
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
