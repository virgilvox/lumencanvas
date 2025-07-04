const videoCache = new Map();

/**
 * Gets or creates a video element for a given source URL.
 * Manages reference counting to avoid creating duplicate elements.
 * @param {string} src - The URL of the video source.
 * @returns {HTMLVideoElement} The video element.
 */
function getVideoElement(src) {
    if (!videoCache.has(src)) {
        const video = document.createElement('video');
        video.src = src;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.preload = 'auto';
        videoCache.set(src, { element: video, refCount: 0 });
    }
    const cacheEntry = videoCache.get(src);
    cacheEntry.refCount++;
    return cacheEntry.element;
}

/**
 * Releases a video element. When its reference count reaches zero,
 * the video is paused and removed from the cache.
 * @param {string} src - The URL of the video source to release.
 */
function releaseVideoElement(src) {
    if (videoCache.has(src)) {
        const cacheEntry = videoCache.get(src);
        cacheEntry.refCount--;
        if (cacheEntry.refCount <= 0) {
            const video = cacheEntry.element;
            video.pause();
            video.removeAttribute('src'); 
            video.load(); 
            videoCache.delete(src);
        }
    }
}

export const videoManager = {
    get: getVideoElement,
    release: releaseVideoElement,
};
