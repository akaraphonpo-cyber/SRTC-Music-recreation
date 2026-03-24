


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SRTC_LOGO_URL } from '../constants';
import { getPortfolioAlbums, incrementPortfolioReaction, getVideos, incrementVideoView, incrementPortfolioView } from '../services/contentService';
import { PortfolioAlbumWithId, PortfolioImage, VideoContent } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { getOptimizedImage } from '../utils/imageUtils';
import { getYouTubeThumbnail, getVideoProvider, getEmbedSrc } from '../utils/videoUtils';

// --- Styles for Background Animation ---
const backgroundStyles = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  
  .text-gradient {
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-image: linear-gradient(45deg, rgb(var(--accent-color)), #fcd34d);
  }
`;

// --- Background Component ---
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <style>{backgroundStyles}</style>
    <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    <div className="absolute top-1/3 right-10 w-64 h-64 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="glass-card p-8 text-center flex flex-col items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:bg-white/10 border border-white/20 h-full rounded-3xl relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="rounded-2xl p-4 mb-6 shadow-inner bg-white/10 backdrop-blur-sm text-accent group-hover:scale-110 transition-transform duration-300" style={{ color: 'rgba(var(--accent-color), 1)' }}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-shadow relative z-10" style={{color: 'var(--text-primary)'}}>{title}</h3>
    <p className="text-sm leading-relaxed opacity-80 relative z-10" style={{color: 'var(--text-secondary)'}}>{description}</p>
  </div>
);

const CardSlideshow: React.FC<{ images: PortfolioImage[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const displayImages = useMemo(() => {
        const list = images && images.length > 0 ? images : [{ imageUrl: SRTC_LOGO_URL }];
        return list.slice(0, 5);
    }, [images]);

    useEffect(() => {
        if (displayImages.length <= 1) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % displayImages.length);
        }, 4000); 

        return () => clearInterval(interval);
    }, [displayImages.length]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-gray-900">
            {displayImages.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                >
                    <div 
                        className={`w-full h-full transition-transform duration-[5000ms] ease-out ${
                            index === currentIndex ? 'scale-110' : 'scale-100'
                        }`}
                    >
                         <img 
                            src={getOptimizedImage(img.imageUrl, 600)} 
                            alt={`Slide ${index}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                         />
                    </div>
                </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20 pointer-events-none"></div>
        </div>
    );
};

const GalleryViewer: React.FC<{ album: PortfolioAlbumWithId }> = ({ album }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToPrevious = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev === 0 ? album.images.length - 1 : prev - 1));
            setIsTransitioning(false);
        }, 300);
    }, [album.images.length]);

    const goToNext = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev === album.images.length - 1 ? 0 : prev + 1));
            setIsTransitioning(false);
        }, 300);
    }, [album.images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrevious]);

    if (!album.images || album.images.length === 0) {
        return <div className="flex items-center justify-center h-full" style={{color: 'var(--text-secondary)'}}>ไม่มีรูปภาพในอัลบั้มนี้</div>;
    }
    
    return (
        <div className="flex flex-col h-full select-none">
            <div className="flex-grow relative flex items-center justify-center bg-black/90 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <div className={`relative w-full h-full flex items-center justify-center p-2 transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                  <img 
                      key={currentIndex}
                      src={getOptimizedImage(album.images[currentIndex].imageUrl, 1200)} 
                      alt={`${album.title} - ${currentIndex + 1}`} 
                      className="max-h-full max-w-full object-contain animate-fade-in shadow-2xl drop-shadow-2xl"
                  />
                </div>

                {album.images.length > 1 && (
                    <>
                        <button 
                            onClick={goToPrevious} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all hover:scale-110 focus:outline-none"
                            aria-label="Previous image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            onClick={goToNext} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all hover:scale-110 focus:outline-none"
                            aria-label="Next image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </>
                )}
                
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
                    {currentIndex + 1} / {album.images.length}
                </div>
            </div>

            <div className="flex-shrink-0 pt-6 pb-2 px-4 text-center">
                <h3 className="text-lg font-bold text-shadow mb-1" style={{color: 'var(--text-primary)'}}>{album.title}</h3>
                {album.description && <p className="text-sm max-w-3xl mx-auto opacity-80 leading-relaxed" style={{color: 'var(--text-secondary)'}}>{album.description}</p>}
                
                {album.images.length > 1 && album.images.length < 15 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {album.images.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-accent' : 'bg-gray-400 hover:bg-gray-300'}`}
                                aria-label={`Go to image ${idx + 1}`}
                                style={idx === currentIndex ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Video Thumbnail Card Component
const VideoCard: React.FC<{ video: VideoContent; onClick: () => void }> = ({ video, onClick }) => {
    const provider = getVideoProvider(video.youtubeUrl);
    
    return (
        <div 
            onClick={onClick}
            className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 glass-card border border-white/10 flex flex-col h-full"
        >
            <div className="aspect-video w-full relative bg-black flex-shrink-0 overflow-hidden">
                {provider === 'youtube' ? (
                    <img 
                        src={getYouTubeThumbnail(video.videoId)} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-800 to-indigo-900 flex flex-col items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="text-6xl text-white/50 mb-2 font-black tracking-tighter">f</div>
                        <span className="text-xs text-white/70 font-bold uppercase tracking-widest border border-white/20 px-2 py-1 rounded">Facebook Video</span>
                    </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform backdrop-blur-sm ${provider === 'facebook' ? 'bg-blue-600 text-white' : 'bg-red-600/90 text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 ml-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-md flex-grow flex flex-col border-t border-white/5">
                <h4 className="font-bold text-lg line-clamp-1 mb-1" style={{color: 'var(--text-primary)'}}>{video.title}</h4>
                <p className="text-xs line-clamp-2 opacity-80 mb-2" style={{color: 'var(--text-secondary)'}}>{video.description}</p>
                <div className="mt-auto flex items-center text-xs text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {video.viewCount || 0} views
                </div>
            </div>
        </div>
    );
};

const HeartButton: React.FC<{ href: string; children: React.ReactNode; className?: string }> = ({ href, children, className }) => {
    const isExternal = href.startsWith('http');
    const commonClasses = `heart-btn ${className || ''}`;
    
    const content = (
        <>
            <span></span>
            <span>{children}</span>
        </>
    );

    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={commonClasses}>
                {content}
            </a>
        );
    }
    
    return (
        <Link to={href} className={commonClasses}>
            {content}
        </Link>
    );
};


const LandingPage: React.FC = () => {
  const facebookUrl = 'https://www.facebook.com/SRTCband/';
  
  const [portfolioAlbums, setPortfolioAlbums] = useState<PortfolioAlbumWithId[]>([]);
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, 'like' | 'love'>>(() => {
      try {
          const saved = localStorage.getItem('portfolio_reactions');
          return saved ? JSON.parse(saved) : {};
      } catch (error) {
          return {};
      }
  });

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<PortfolioAlbumWithId | null>(null);
  
  // Video Modal State
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);

  useEffect(() => {
      const fetchItems = async () => {
          setIsLoading(true);
          const [portfolioRes, videoRes] = await Promise.all([
              getPortfolioAlbums(),
              getVideos()
          ]);
          
          if (portfolioRes.success && portfolioRes.data) {
              setPortfolioAlbums(portfolioRes.data);
          }
          if (videoRes.success && videoRes.data) {
              setVideos(videoRes.data);
          }
          setIsLoading(false);
      };
      fetchItems();
  }, []);

  const handleReaction = useCallback(async (id: string, reaction: 'likes' | 'loves') => {
      if (reactions[id]) return;

      setPortfolioAlbums(prev => prev.map(album => 
          album.id === id ? { ...album, [reaction]: album[reaction] + 1 } : album
      ));

      const newReactionType = reaction === 'likes' ? 'like' : 'love';
      const updatedReactions: Record<string, 'like' | 'love'> = { ...reactions, [id]: newReactionType };
      setReactions(updatedReactions);
      localStorage.setItem('portfolio_reactions', JSON.stringify(updatedReactions));

      await incrementPortfolioReaction(id, reaction);
  }, [reactions]);

  const openGallery = (album: PortfolioAlbumWithId) => {
    setSelectedAlbum(album);
    setIsGalleryOpen(true);
    // Increment view count
    incrementPortfolioView(album.id);
    // Optimistic update for UI
    setPortfolioAlbums(prev => prev.map(a => a.id === album.id ? { ...a, viewCount: (a.viewCount || 0) + 1 } : a));
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setSelectedAlbum(null);
  }

  const handleVideoClick = (video: VideoContent) => {
      setSelectedVideo(video);
      // Increment view count
      incrementVideoView(video.id);
      // Optimistic update
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, viewCount: (v.viewCount || 0) + 1 } : v));
  };


  return (
    <div className="w-full relative">
      <AnimatedBackground />
      
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center py-20 px-4">
          <div className="z-10 flex flex-col items-center w-full max-w-5xl">
            
            {/* Main Glass Card with Prism Effect */}
            <div className="glass-card p-10 md:p-16 rounded-[3rem] border border-white/30 shadow-2xl backdrop-blur-xl bg-white/10 relative overflow-hidden group transition-all hover:shadow-orange-500/10">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full filter blur-2xl"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-400/20 rounded-full filter blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="mb-8 inline-block relative">
                    <div className="absolute inset-0 bg-orange-400 blur-lg opacity-20 rounded-full animate-pulse"></div>
                    <img src={getOptimizedImage("https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/LOGO%20music%20srtc.png?alt=media&token=4b64383d-5873-4ca9-9ac3-e59c9be9da0d", 300)} alt="SRTC Music & Recreation Logo" className="h-40 w-40 md:h-60 md:w-60 object-contain relative z-10 drop-shadow-2xl" />
                </div>
                
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 tracking-wider leading-tight" style={{ fontFamily: "'RushDriver', sans-serif" }}>
                  <span className="text-gradient block mb-2">SRTC Music</span>
                  <span className="text-shadow" style={{color: 'var(--text-primary)'}}>& Recreation</span>
                </h1>
                
                <p className="text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 font-light opacity-90 leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  พื้นที่สร้างสรรค์สำหรับคนรุ่นใหม่ ปลดปล่อยพลังในตัวคุณผ่านดนตรี กีฬา และกิจกรรมสุดมันส์
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <HeartButton href="/register" className="w-full sm:w-auto scale-110">
                      ลงทะเบียนร่วมกิจกรรม
                  </HeartButton>
                  <Link 
                    to="/student-portal" 
                    className="group flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-300 hover:bg-white/10 border-2 border-transparent hover:border-white/30 text-lg"
                    style={{color: 'var(--text-primary)'}}
                  >
                      เข้าสู่ระบบ
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats / Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full max-w-4xl">
                {[
                    { label: 'สมาชิก', value: '500+' },
                    { label: 'กิจกรรม', value: '20+' },
                    { label: 'รางวัล', value: '15+' },
                    { label: 'ความสนุก', value: '100%' }
                ].map((stat, idx) => (
                    <div key={idx} className="glass-card py-3 px-4 rounded-2xl text-center bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="text-2xl font-bold text-gradient">{stat.value}</div>
                        <div className="text-xs font-medium opacity-70" style={{color: 'var(--text-secondary)'}}>{stat.label}</div>
                    </div>
                ))}
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
                <span className="text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-orange-100 text-orange-600 mb-3 inline-block">What we do</span>
                <h2 className="text-3xl md:text-4xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>
                กิจกรรมไฮไลท์
                </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3a1 1 0 00-1.447-.894L4 6.424V12a1 1 0 001 1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l3.553-2.091A1 1 0 0018 3z" /></svg>}
                title="ชมรมดนตรี"
                description="เวทีของคุณพร้อมแล้ว! ไม่ว่าจะร้อง เล่น หรือเต้น เรามีห้องซ้อมและอุปกรณ์ครบครัน พร้อมโค้ชที่จะช่วยดึงศักยภาพของคุณออกมา"
              />
               <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
                title="E-Sport League"
                description="สมรภูมิเดือดสำหรับเกมเมอร์! เข้าร่วมการแข่งขัน ROV, Valorant, และเกมฮิตอื่นๆ ชิงรางวัลและเกียรติยศระดับวิทยาลัย"
              />
               <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                title="Recreation & Fun"
                description="กิจกรรมนันทนาการที่หลากหลาย เพื่อผ่อนคลายความเครียด สร้างมิตรภาพใหม่ๆ และพัฒนาบุคลิกภาพในบรรยากาศที่เป็นกันเอง"
              />
            </div>
          </div>
        </section>

        {/* Video Gallery Section (NEW) */}
        {videos.length > 0 && (
            <section className="py-24 px-4 relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="container mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-shadow mb-2" style={{color: 'var(--text-primary)'}}>
                            Video Highlights
                        </h2>
                        <p className="text-sm md:text-base opacity-70" style={{color: 'var(--text-secondary)'}}>ชมวิดีโอกิจกรรมและผลงานที่ผ่านมา</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {videos.map(video => (
                            <VideoCard key={video.id} video={video} onClick={() => handleVideoClick(video)} />
                        ))}
                    </div>
                </div>
            </section>
        )}
        
        {/* Portfolio Section */}
        <section className="py-24 px-4 relative">
           {/* Subtle background divider */}
           <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
           
           <div className="container mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-end mb-12 px-4">
                <div className="text-left">
                    <h2 className="text-3xl md:text-4xl font-bold text-shadow mb-2" style={{color: 'var(--text-primary)'}}>
                    Gallery & Activities
                    </h2>
                    <p className="text-sm md:text-base opacity-70" style={{color: 'var(--text-secondary)'}}>รวมภาพความประทับใจจากกิจกรรมต่างๆ ของเรา</p>
                </div>
             </div>

             {isLoading ? (
                <div className="flex justify-center"><LoadingSpinner size="lg" /></div>
             ) : portfolioAlbums.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {portfolioAlbums.map(album => {
                    return (
                      <div key={album.id} className="glass-card rounded-3xl overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-white/10">
                          {/* Card Slideshow Area */}
                          <div className="relative cursor-pointer h-72 w-full bg-gray-900 overflow-hidden" onClick={() => openGallery(album)}>
                            <CardSlideshow images={album.images} />
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300"></div>

                            {/* Text Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 z-30 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/20 text-white backdrop-blur-md inline-block mb-2">
                                    {album.category}
                                </span>
                                <h4 className="font-bold text-white text-xl text-shadow-md drop-shadow-lg line-clamp-1 mb-1">{album.title}</h4>
                                <p className="text-white/70 text-xs line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">คลิกเพื่อดูรูปภาพเพิ่มเติม</p>
                            </div>
                        </div>
                        
                        {/* Action Footer */}
                        <div className="p-4 flex justify-between items-center mt-auto bg-white/5 backdrop-blur-md border-t border-white/5">
                            <div className="flex items-center space-x-3 text-xs font-medium opacity-70" style={{color: 'var(--text-primary)'}}>
                                <div className="flex items-center space-x-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span>{album.images.length}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    <span>{album.viewCount || 0}</span>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => handleReaction(album.id, 'likes')} disabled={!!reactions[album.id]} className="group/btn flex items-center space-x-1.5 disabled:opacity-50 transition-all hover:bg-white/10 px-2 py-1 rounded-full">
                                    <span className={`transition-transform group-hover/btn:scale-125 ${reactions[album.id] === 'like' ? 'grayscale-0' : 'grayscale'}`} style={{fontSize: '1.1rem'}}>👍</span> 
                                    <span className="text-sm font-bold" style={{color: 'var(--text-secondary)'}}>{album.likes}</span>
                                </button>
                                <button onClick={() => handleReaction(album.id, 'loves')} disabled={!!reactions[album.id]} className="group/btn flex items-center space-x-1.5 disabled:opacity-50 transition-all hover:bg-white/10 px-2 py-1 rounded-full">
                                    <span className={`transition-transform group-hover/btn:scale-125 ${reactions[album.id] === 'love' ? 'grayscale-0' : 'grayscale'}`} style={{fontSize: '1.1rem'}}>❤️</span>
                                    <span className="text-sm font-bold" style={{color: 'var(--text-secondary)'}}>{album.loves}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    )
                  })}
                </div>
             ) : (
                <div className="glass-card p-10 text-center rounded-2xl">
                    <p className="text-xl opacity-60" style={{color: 'var(--text-secondary)'}}>เร็วๆ นี้... เตรียมพบกับภาพกิจกรรมสุดมันส์</p>
                </div>
             )}
           </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-24 px-4 mb-10">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="glass-card p-12 md:p-16 rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                
              <h2 className="text-3xl md:text-4xl font-bold text-shadow mb-6 relative z-10" style={{color: 'var(--text-primary)'}}>
                พร้อมที่จะเป็นส่วนหนึ่งกับเราหรือยัง?
              </h2>
              <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-80 relative z-10" style={{color: 'var(--text-secondary)'}}>
                ติดตามข่าวสาร อัปเดตตารางกิจกรรม และพูดคุยกับเพื่อนๆ ได้ที่ Facebook Fanpage ของเรา
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                 <HeartButton href={facebookUrl} className="w-full sm:w-auto">
                    ติดตาม Facebook
                 </HeartButton>
                 <HeartButton href="/register" className="w-full sm:w-auto">
                    สมัครสมาชิกเลย
                 </HeartButton>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Portfolio Gallery Modal */}
      <Modal isOpen={isGalleryOpen} onClose={closeGallery} title="" size="fullscreen">
        {selectedAlbum && <GalleryViewer album={selectedAlbum} />}
      </Modal>

      {/* Video Player Modal */}
      {selectedVideo && (
          <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedVideo(null)}>
              <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative border border-white/20" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedVideo(null)} className="absolute top-2 right-2 text-white/70 hover:text-white z-10 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="aspect-video w-full bg-black">
                      <iframe 
                          className="w-full h-full"
                          src={getEmbedSrc(selectedVideo.youtubeUrl) || ''}
                          title={selectedVideo.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                      ></iframe>
                  </div>
                  <div className="p-5 glass-card bg-white/90 border-t border-gray-200 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold mb-2 text-gray-900" style={{color: 'var(--text-primary)'}}>{selectedVideo.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>{selectedVideo.description}</p>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center whitespace-nowrap ml-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {selectedVideo.viewCount || 0} views
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LandingPage;
