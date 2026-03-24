import { db, storage } from './firebase';
import { 
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
    query, orderBy, increment 
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { collections } from './configService';
import { 
    ApiResponse, Announcement, AnnouncementWithId, 
    PortfolioAlbum, PortfolioAlbumWithId, VideoContent 
} from '../types';

// --- Announcements ---
export const getAnnouncements = async (): Promise<ApiResponse<AnnouncementWithId[]>> => {
    const q = query(collections.announcements, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as AnnouncementWithId)) };
};

export const addAnnouncement = async (announcement: Announcement): Promise<ApiResponse> => {
    await addDoc(collections.announcements, { ...announcement, createdAt: new Date().toISOString() });
    return { success: true, message: 'Announcement added' };
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<ApiResponse> => {
    await updateDoc(doc(collections.announcements, id), { ...data, updatedAt: new Date().toISOString() });
    return { success: true, message: 'Announcement updated' };
};

export const deleteAnnouncement = async (id: string): Promise<ApiResponse> => {
    await deleteDoc(doc(collections.announcements, id));
    return { success: true };
};

// --- Portfolio ---
export const getPortfolioAlbums = async (): Promise<ApiResponse<PortfolioAlbumWithId[]>> => {
    const q = query(collections.portfolio, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as PortfolioAlbumWithId)) };
};

export const addPortfolioAlbum = async (album: Omit<PortfolioAlbum, 'createdAt'|'likes'|'loves'|'viewCount'>): Promise<ApiResponse<PortfolioAlbumWithId>> => {
    const docRef = await addDoc(collections.portfolio, { ...album, likes: 0, loves: 0, viewCount: 0, createdAt: new Date().toISOString() });
    return { success: true, data: { id: docRef.id, ...album, likes: 0, loves: 0, viewCount: 0 } as PortfolioAlbumWithId, message: 'Album created' };
};

export const updatePortfolioAlbum = async (id: string, data: Partial<PortfolioAlbum>): Promise<ApiResponse> => {
    await updateDoc(doc(collections.portfolio, id), data);
    return { success: true, message: 'Album updated' };
};

export const deletePortfolioAlbum = async (id: string): Promise<ApiResponse> => {
    await deleteDoc(doc(collections.portfolio, id));
    return { success: true };
};

export const uploadPortfolioImage = async (file: Blob, onProgress?: (p: number) => void): Promise<string> => {
    const storageRef = ref(storage, `portfolio/${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
        task.on('state_changed', 
            (snapshot) => { if (onProgress) onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100); },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                resolve(url);
            }
        );
    });
};

export const deletePortfolioImage = async (url: string): Promise<void> => {
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (e) {
        console.warn("Could not delete image from storage", e);
    }
};

export const incrementPortfolioReaction = async (id: string, type: 'likes' | 'loves'): Promise<void> => {
    const ref = doc(collections.portfolio, id);
    await updateDoc(ref, { [type]: increment(1) });
};

export const incrementPortfolioView = async (id: string): Promise<void> => {
    const ref = doc(collections.portfolio, id);
    await updateDoc(ref, { viewCount: increment(1) });
};

// --- Videos ---
export const getVideos = async (): Promise<ApiResponse<VideoContent[]>> => {
    const snap = await getDocs(collections.videos);
    return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoContent)) };
};

export const addVideo = async (video: Omit<VideoContent, 'id'|'createdAt'|'viewCount'>): Promise<ApiResponse> => {
    await addDoc(collections.videos, { ...video, createdAt: new Date().toISOString(), viewCount: 0 });
    return { success: true };
};

export const updateVideo = async (id: string, data: Partial<VideoContent>): Promise<ApiResponse> => {
    await updateDoc(doc(collections.videos, id), data);
    return { success: true };
};

export const deleteVideo = async (id: string): Promise<ApiResponse> => {
    await deleteDoc(doc(collections.videos, id));
    return { success: true };
};

export const incrementVideoView = async (id: string): Promise<void> => {
    await updateDoc(doc(collections.videos, id), { viewCount: increment(1) });
};
