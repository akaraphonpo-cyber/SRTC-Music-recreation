
/**
 * Extracts the YouTube Video ID from various URL formats.
 * Supports: standard watch, embed, short URL, shorts
 */
export const getYouTubeID = (url: string): string | null => {
    if (!url) return null;
    // Added 'shorts/' to regex to support YouTube Shorts URLs
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Returns the max resolution thumbnail URL for a YouTube video ID.
 */
export const getYouTubeThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Determines the video provider based on the URL.
 */
export const getVideoProvider = (url: string): 'youtube' | 'facebook' | 'unknown' => {
    if (!url) return 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    return 'unknown';
};

/**
 * Generates the embed URL for the video player based on provider.
 */
export const getEmbedSrc = (url: string): string | null => {
    const provider = getVideoProvider(url);
    if (provider === 'youtube') {
        const id = getYouTubeID(url);
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
    }
    if (provider === 'facebook') {
        // Facebook requires the full URL encoded in the href parameter
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560&autoplay=1`;
    }
    return null;
};
