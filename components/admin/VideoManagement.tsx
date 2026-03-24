


import React, { useState, useEffect, useCallback } from 'react';
import { VideoContent } from '../../types';
import { getVideos, addVideo, deleteVideo, updateVideo } from '../../services/googleSheetService';
import { getYouTubeID, getYouTubeThumbnail, getVideoProvider, getEmbedSrc } from '../../utils/videoUtils';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

const VideoManagement: React.FC = () => {
    const [videos, setVideos] = useState<VideoContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [description, setDescription] = useState('');
    
    // Derived State for Preview
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [provider, setProvider] = useState<'youtube' | 'facebook' | 'unknown'>('unknown');

    const notification = useNotification();

    const fetchVideos = useCallback(async () => {
        await Promise.resolve();
        setIsLoading(true);
        const res = await getVideos();
        if (res.success && res.data) {
            setVideos(res.data);
        } else {
            notification.addToast({ type: 'error', title: 'Error', message: res.message });
        }
        setIsLoading(false);
    }, [notification]);

    useEffect(() => {
        void fetchVideos();
    }, [fetchVideos]);

    // Auto-generate preview on URL change
    useEffect(() => {
        const prov = getVideoProvider(youtubeUrl);
        setProvider(prov);
        setPreviewSrc(getEmbedSrc(youtubeUrl));
    }, [youtubeUrl]);

    const handleAddVideo = () => {
        setEditingId(null);
        setTitle('');
        setYoutubeUrl('');
        setDescription('');
        setIsModalOpen(true);
    };

    const handleEditVideo = (video: VideoContent) => {
        setEditingId(video.id);
        setTitle(video.title);
        setYoutubeUrl(video.youtubeUrl);
        setDescription(video.description);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !youtubeUrl || !previewSrc) {
            notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อและลิงก์วิดีโอที่ถูกต้อง' });
            return;
        }

        setIsSubmitting(true);
        
        // For YouTube, we store the ID in videoId. For FB, we store a marker or the ID if extraction logic exists.
        // But mainly we rely on youtubeUrl now.
        const ytId = getYouTubeID(youtubeUrl);
        const storedVideoId = ytId || 'FACEBOOK_VIDEO';

        const videoData = {
            title,
            description,
            youtubeUrl,
            videoId: storedVideoId
        };

        let res;
        if (editingId) {
            res = await updateVideo(editingId, videoData);
        } else {
            res = await addVideo(videoData);
        }

        if (res.success) {
            notification.addToast({ type: 'success', title: 'สำเร็จ', message: editingId ? 'แก้ไขวิดีโอเรียบร้อย' : 'เพิ่มวิดีโอเรียบร้อย' });
            setIsModalOpen(false);
            fetchVideos();
        } else {
            notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
        }
        setIsSubmitting(false);
    };

    const handleDelete = (video: VideoContent) => {
        notification.showConfirmation({
            title: 'ลบวิดีโอ?',
            message: `ยืนยันการลบวิดีโอ "${video.title}"`,
            confirmText: 'ลบเลย',
            onConfirm: async () => {
                const res = await deleteVideo(video.id);
                if (res.success) {
                    notification.addToast({ type: 'success', title: 'ลบสำเร็จ' });
                    fetchVideos();
                } else {
                    notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
                }
            }
        });
    };

    const inputClass = "block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm";
    const inputStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center p-4 glass-card rounded-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-shadow" style={{ color: 'var(--text-primary)' }}>จัดการวิดีโอ (Video Gallery)</h2>
                    <p className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>รองรับ YouTube และ Facebook</p>
                </div>
                <button onClick={handleAddVideo} className="btn-accent px-6 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">
                    + เพิ่มวิดีโอใหม่
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>
            ) : videos.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl">
                    <p className="text-lg opacity-60" style={{ color: 'var(--text-secondary)' }}>ยังไม่มีวิดีโอในระบบ</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map(video => {
                        const vidProvider = getVideoProvider(video.youtubeUrl);
                        
                        return (
                        <div key={video.id} className="glass-card rounded-xl overflow-hidden flex flex-col group hover:shadow-xl transition-all border border-white/10">
                            <div className="relative aspect-video bg-black">
                                {vidProvider === 'youtube' ? (
                                    <img 
                                        src={getYouTubeThumbnail(video.videoId)} 
                                        alt={video.title} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-900/50 flex flex-col items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="text-4xl text-white mb-2">f</div>
                                        <span className="text-xs text-white font-bold uppercase tracking-widest">Facebook Video</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${vidProvider === 'facebook' ? 'bg-blue-600 text-white' : 'bg-red-600/90 text-white'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-bold text-lg mb-1 line-clamp-1" style={{ color: 'var(--text-primary)' }}>{video.title}</h3>
                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    {video.viewCount || 0} views
                                </div>
                                <p className="text-xs opacity-70 line-clamp-2 flex-grow mb-3" style={{ color: 'var(--text-secondary)' }}>{video.description || 'ไม่มีคำอธิบาย'}</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEditVideo(video)}
                                        className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/30 text-sm font-bold transition-colors"
                                    >
                                        แก้ไข
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(video)}
                                        className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 text-sm font-bold transition-colors"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "แก้ไขวิดีโอ" : "เพิ่มวิดีโอใหม่"} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ลิงก์วิดีโอ (YouTube / Facebook)</label>
                        <input 
                            type="text" 
                            placeholder="https://www.youtube.com/... หรือ https://www.facebook.com/..." 
                            value={youtubeUrl} 
                            onChange={e => setYoutubeUrl(e.target.value)} 
                            className={inputClass} 
                            style={inputStyle} 
                            required 
                        />
                        <p className="text-xs text-gray-500 mt-1">รองรับลิงก์จาก YouTube และ Facebook Video (ต้องเป็น Public)</p>
                        
                        {previewSrc ? (
                            <div className="mt-3 relative aspect-video rounded-lg overflow-hidden border border-white/20 bg-black shadow-inner">
                                 <iframe
                                    className="w-full h-full"
                                    src={previewSrc}
                                    title="Video Preview"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : youtubeUrl && (
                            <p className="text-xs text-red-400 mt-1">❌ ลิงก์ไม่ถูกต้อง หรือไม่รองรับแพลตฟอร์มนี้</p>
                        )}
                        
                        {previewSrc && <p className="text-xs text-green-500 mt-1 text-center">✅ พบวิดีโอจาก {provider === 'youtube' ? 'YouTube' : 'Facebook'} (ลองกดเล่นเพื่อตรวจสอบ)</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">หัวข้อวิดีโอ</label>
                        <input 
                            type="text" 
                            placeholder="ชื่อคลิป..." 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className={inputClass} 
                            style={inputStyle} 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">คำอธิบายเพิ่มเติม</label>
                        <textarea 
                            rows={3} 
                            placeholder="รายละเอียดเกี่ยวกับวิดีโอนี้..." 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className={inputClass} 
                            style={inputStyle} 
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t border-white/10 gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium">ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting || !previewSrc} className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'เพิ่มวิดีโอ')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default VideoManagement;
