


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioAlbum, PortfolioAlbumWithId, PortfolioCategory, PortfolioImage } from '../../types';
import { 
    getPortfolioAlbums, 
    addPortfolioAlbum, 
    updatePortfolioAlbum, 
    deletePortfolioAlbum,
    uploadPortfolioImage,
    deletePortfolioImage
} from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';
import { PORTFOLIO_CATEGORIES } from '../../constants';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { getOptimizedImage } from '../../utils/imageUtils';

const emptyAlbum: Omit<PortfolioAlbum, 'createdAt' | 'likes' | 'loves' | 'images' | 'coverImageUrl' | 'viewCount'> = {
  title: '',
  description: '',
  category: PORTFOLIO_CATEGORIES[0],
};

// Interface for handling both existing images and new uploads uniformly
interface EditableImage {
    id: string; // Unique ID for React keys (url or temp ID)
    url: string; // Display URL (firebase URL or blob URL)
    file?: File; // Present only if it's a new upload
    isExisting: boolean;
}

const PortfolioManagement: React.FC = () => {
    const [albums, setAlbums] = useState<PortfolioAlbumWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<PortfolioAlbumWithId>>(emptyAlbum);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notification = useNotification();

    // Unified state for images (both existing and new)
    const [editableImages, setEditableImages] = useState<EditableImage[]>([]);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const response = await getPortfolioAlbums();
        if (response.success && response.data) {
            setAlbums(response.data);
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลผลงานได้' });
        }
        setIsLoading(false);
    }, [notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const resetModalState = () => {
        // Revoke old object URLs to prevent memory leaks
        editableImages.forEach(img => {
            if (!img.isExisting) URL.revokeObjectURL(img.url);
        });
        setEditableImages([]);
        setIsSubmitting(false);
        setDraggedItemIndex(null);
    };

    const openAddModal = () => {
        resetModalState();
        setIsEditing(false);
        setCurrentItem(emptyAlbum);
        setIsModalOpen(true);
    };

    const openEditModal = (album: PortfolioAlbumWithId) => {
        resetModalState();
        setIsEditing(true);
        setCurrentItem(album);
        
        // Populate editableImages with existing images
        if (album.images && album.images.length > 0) {
            setEditableImages(album.images.map(img => ({
                id: img.imageUrl, // Use URL as ID for existing
                url: img.imageUrl,
                isExisting: true
            })));
        }
        
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Cleanup happens in openAddModal/openEditModal via resetModalState before state clear,
        // but we should also clean up here if just closing.
        editableImages.forEach(img => {
            if (!img.isExisting) URL.revokeObjectURL(img.url);
        });
        setEditableImages([]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentItem(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newImages: EditableImage[] = [];

            files.forEach((file: File) => {
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    notification.addToast({ type: 'warning', title: 'ไฟล์ใหญ่เกินไป', message: `${file.name} มีขนาดเกิน 10MB` });
                    return;
                }
                
                const tempId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                newImages.push({
                    id: tempId,
                    url: URL.createObjectURL(file),
                    file: file,
                    isExisting: false
                });
            });

            setEditableImages(prev => [...prev, ...newImages]);
            
            // Reset input value to allow selecting the same file again if needed
            e.target.value = '';
        }
    };
    
    const handleRemoveImage = (index: number) => {
        setEditableImages(prev => {
            const newArr = [...prev];
            const removed = newArr[index];
            if (!removed.isExisting) URL.revokeObjectURL(removed.url);
            newArr.splice(index, 1);
            return newArr;
        });
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedItemIndex(index);
        // Required for Firefox
        e.dataTransfer.effectAllowed = "move";
        // Hide the ghost image a bit or set a custom one if desired
        // e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";

        if (draggedItemIndex === null || draggedItemIndex === index) return;

        // Perform the swap in real-time for visual feedback
        setEditableImages(prev => {
            const newList = [...prev];
            const draggedItem = newList[draggedItemIndex];
            
            // Remove the dragged item
            newList.splice(draggedItemIndex, 1);
            // Insert it at the new position
            newList.splice(index, 0, draggedItem);
            
            return newList;
        });
        
        setDraggedItemIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentItem.title || !currentItem.category) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหัวข้อและเลือกหมวดหมู่' });
            return;
        }
        
        if (editableImages.length === 0) {
            notification.addToast({ type: 'warning', title: 'ไม่มีรูปภาพ', message: 'กรุณาอัปโหลดหรือเลือกอย่างน้อยหนึ่งรูปภาพ' });
            return;
        }

        setIsSubmitting(true);
        
        try {
            // 1. Separate new files that need uploading
            const imagesToUpload = editableImages.filter(img => !img.isExisting && img.file);
            
            // 2. Upload new files in parallel
            const uploadPromises = imagesToUpload.map(img => uploadPortfolioImage(img.file!, () => {}));
            const uploadedUrls = await Promise.all(uploadPromises);
            
            // 3. Map temp IDs to uploaded URLs
            const uploadedUrlMap = new Map<string, string>();
            imagesToUpload.forEach((img, index) => {
                uploadedUrlMap.set(img.id, uploadedUrls[index]);
            });

            // 4. Construct final images array preserving the user's sort order
            const finalImages: PortfolioImage[] = editableImages.map(img => {
                if (img.isExisting) {
                    return { imageUrl: img.url };
                } else {
                    return { imageUrl: uploadedUrlMap.get(img.id)! };
                }
            });

            // 5. Determine Cover Image (First one)
            const coverImageUrl = finalImages[0].imageUrl;

            const { id, createdAt, likes, loves, viewCount, ...data } = currentItem;
            const albumData = {
                ...data,
                title: currentItem.title!,
                description: currentItem.description!,
                category: currentItem.category!,
                images: finalImages,
                coverImageUrl: coverImageUrl,
            };

            let response;
            if (isEditing && id) {
                // Handle deletion of removed existing images from Storage
                if (currentItem.images) {
                    const finalUrls = new Set(finalImages.map(img => img.imageUrl));
                    const imagesToDelete = currentItem.images.filter(orig => !finalUrls.has(orig.imageUrl));
                    imagesToDelete.forEach(img => deletePortfolioImage(img.imageUrl).catch(console.error));
                }

                response = await updatePortfolioAlbum(id, albumData);
                if (response.success) {
                     // Update local state immediately
                     setAlbums(prev => prev.map(a => a.id === id ? { ...a, ...albumData, id } as PortfolioAlbumWithId : a));
                     closeModal();
                     notification.addToast({ type: 'success', title: 'สำเร็จ!', message: response.message });
                }
            } else {
                response = await addPortfolioAlbum(albumData as Omit<PortfolioAlbum, 'createdAt'|'likes'|'loves'|'viewCount'>);
                if (response.success && response.data) {
                    // Add to local state immediately
                    const newAlbumWithId = { 
                        ...albumData, 
                        id: response.data.id, 
                        likes: 0, 
                        loves: 0, 
                        viewCount: 0,
                        createdAt: new Date().toISOString() 
                    } as PortfolioAlbumWithId;
                    setAlbums(prev => [newAlbumWithId, ...prev]);
                    closeModal();
                    notification.addToast({ type: 'success', title: 'สำเร็จ!', message: response.message });
                }
            }
            
            if (!response.success) {
                throw new Error(response.message);
            }
        } catch (err: any) {
            console.error(err);
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = (album: PortfolioAlbumWithId) => {
        notification.showConfirmation({
            title: 'ยืนยันการลบ?',
            message: `คุณต้องการลบอัลบั้ม "${album.title}" ใช่หรือไม่? รูปภาพทั้งหมดในอัลบั้มจะถูกลบออกจากระบบด้วย`,
            confirmText: 'ใช่, ลบเลย',
            onConfirm: async () => {
                const res = await deletePortfolioAlbum(album.id);
                if(res.success) {
                    // Remove from local state immediately
                    setAlbums(prev => prev.filter(a => a.id !== album.id));
                    notification.addToast({ type: 'success', title: 'ลบสำเร็จ' });
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
            }
        });
    };
    
    const commonInputClass = "mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };


    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการผลงาน</h2>
                <button onClick={openAddModal} className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:scale-105">+ เพิ่มอัลบั้มใหม่</button>
            </div>
            
            {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div> : (
                albums.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {albums.map(album => (
                            <div key={album.id} className="glass-card rounded-xl flex flex-col">
                                <img src={getOptimizedImage(album.coverImageUrl, 600)} alt={album.title} className="w-full h-48 object-cover rounded-t-xl"/>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{album.title}</h3>
                                    <span className="text-xs font-semibold my-1 px-2 py-1 rounded-full self-start" style={{backgroundColor: 'rgba(var(--accent-color), 0.2)', color: 'rgba(var(--accent-color), 1)'}}>{album.category}</span>
                                    <p className="text-sm line-clamp-3 my-2 flex-grow" style={{color: 'var(--text-secondary)'}}>{album.description}</p>
                                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                        <div className="flex items-center space-x-3">
                                            <span title="Likes">👍 {album.likes}</span>
                                            <span title="Loves">❤️ {album.loves}</span>
                                            <span title="Views">👀 {album.viewCount || 0}</span>
                                        </div>
                                        <span>🖼️ {album.images.length} รูป</span>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 border-t p-3" style={{borderColor: 'var(--glass-border)'}}>
                                    <button onClick={() => openEditModal(album)} className="text-sm font-medium" style={{color: 'rgb(var(--accent-color))'}}>แก้ไข</button>
                                    <button onClick={() => handleDelete(album)} className="text-sm font-medium" style={{color: 'rgb(var(--text-danger-rgb))'}}>ลบ</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8" style={{color: 'var(--text-muted)'}}>ยังไม่มีผลงาน</p>
                )
            )}
            
             <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขอัลบั้มผลงาน' : 'เพิ่มอัลบั้มใหม่'} size="fullscreen">
                <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
                    <div className="flex-shrink-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>ชื่ออัลบั้ม</label>
                                <input type="text" name="title" id="title" value={currentItem.title || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>หมวดหมู่</label>
                                <select name="category" id="category" value={currentItem.category || ''} onChange={handleInputChange} required className={commonInputClass} style={inputStyle}>
                                    {PORTFOLIO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>รายละเอียด</label>
                            <textarea name="description" id="description" value={currentItem.description || ''} onChange={handleInputChange} rows={3} className={commonInputClass} style={inputStyle}></textarea>
                        </div>
                        <div>
                            <label htmlFor="imageFile" className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                                เพิ่มรูปภาพ (เลือกหลายไฟล์ได้)
                            </label>
                            <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-black/5 transition-colors group" style={{borderColor: 'var(--input-border)'}}>
                                <div className="flex flex-col items-center justify-center pt-7">
                                    <svg className="w-10 h-10 text-gray-400 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <p className="pt-1 text-sm tracking-wider text-gray-400 group-hover:text-accent transition-colors">คลิกเพื่อเลือกรูปภาพ</p>
                                </div>
                                <input type="file" name="imageFile" id="imageFile" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} multiple className="opacity-0" />
                            </label>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>
                                รูปภาพในอัลบั้ม ({editableImages.length}) 
                                <span className="font-normal text-xs ml-2 text-gray-400">- ลากเพื่อเปลี่ยนลำดับ, รูปแรกจะเป็นปก</span>
                            </p>
                        </div>
                        
                        {editableImages.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-2 rounded-lg" style={{backgroundColor: 'rgba(0,0,0,0.03)'}}>
                                {editableImages.map((image, index) => (
                                    <div 
                                        key={image.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`relative group aspect-square rounded-lg overflow-hidden shadow-sm cursor-move transition-transform ${draggedItemIndex === index ? 'opacity-50 scale-95 ring-2 ring-accent' : 'hover:ring-2 hover:ring-accent/50'}`}
                                        style={{backgroundColor: 'var(--input-bg)'}}
                                    >
                                        <img src={getOptimizedImage(image.url, 200)} alt={`img-${index}`} className="w-full h-full object-cover pointer-events-none" />
                                        {index === 0 && (
                                            <div className="absolute top-0 left-0 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-br-md shadow-sm font-bold z-10">
                                                ปก
                                            </div>
                                        )}
                                        {!image.isExisting && (
                                            <div className="absolute bottom-0 right-0 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-tl-md shadow-sm font-bold z-10">
                                                ใหม่
                                            </div>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveImage(index)} 
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity shadow-md"
                                            title="ลบรูปภาพ"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg" style={{borderColor: 'var(--glass-border)', color: 'var(--text-muted)'}}>
                                <p>ยังไม่มีรูปภาพ</p>
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-2" style={{borderColor: 'var(--glass-border)'}}>
                        <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm" style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}>ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting} className="btn-accent px-4 py-2 text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
                            {isSubmitting && <LoadingSpinner size="sm" color="border-white" />}
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
export default PortfolioManagement;
