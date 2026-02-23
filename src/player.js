import { store } from './store.js';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { downloadManager } from './downloadManager.js';
import { registerPlugin } from '@capacitor/core';

// Native Media3 bridge — talks to Android ForegroundService + ExoPlayer
const MediaPlugin = registerPlugin('MediaPlugin');

const hapticImpact = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) { }
};

class AudioPlayer {
    constructor() {
        // We keep a lightweight Audio element for web fallback & duration tracking
        this.audio = new Audio();
        this.audio.preload = 'none';
        this.isPlaying = false;
        this.currentTrack = null;
        this._listeners = new Map();
        this._trackCache = new Map();
        this._useNative = false; // will be set true on Android

        // Detect if native plugin is available (Android only)
        this._detectNative();

        // Audio events (web fallback)
        this.audio.addEventListener('ended', () => this._onEnded());
        this.audio.addEventListener('timeupdate', () => {
            this._emit('timeupdate', {
                currentTime: this.audio.currentTime,
                duration: this.audio.duration || 0
            });
        });
        this.audio.addEventListener('loadedmetadata', () => this._emit('loaded', {
            duration: this.audio.duration
        }));
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this._emit('statechange', { isPlaying: true });
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this._emit('statechange', { isPlaying: false });
        });
        this.audio.addEventListener('error', (e) => {
            console.warn('Audio error:', e);
            this._emit('error', e);
            setTimeout(() => this.next(), 1000);
        });

        // Web MediaSession (still useful for desktop PWA)
        this._setupMediaSession();
    }

    async _detectNative() {
        try {
            // If we can reach the plugin, we're on Android
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                this._useNative = true;
                console.log('[Melo] Native Media3 bridge active');

                // Listen for next/prev from notification buttons
                MediaPlugin.addListener('mediaNext', () => {
                    console.log('[Melo] Notification: next');
                    this.next();
                });
                MediaPlugin.addListener('mediaPrev', () => {
                    console.log('[Melo] Notification: prev');
                    this.prev();
                });
                MediaPlugin.addListener('mediaEnded', () => {
                    console.log('[Melo] Native playback ended. Triggering auto-play/queue...');
                    this._onEnded();
                });
                MediaPlugin.addListener('timeupdate', (data) => {
                    this._emit('timeupdate', {
                        currentTime: data.position,
                        duration: data.duration || (this.currentTrack ? this.currentTrack.duration : 0)
                    });
                });
            }
        } catch (e) {
            console.log('[Melo] Web fallback mode');
        }
    }

    // Event system
    on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(fn);
        return () => this._listeners.get(event)?.delete(fn);
    }

    _emit(event, data) {
        this._listeners.get(event)?.forEach(fn => fn(data));
    }

    // Cache
    cacheTrack(track) {
        if (track && track.id) {
            this._trackCache.set(track.id, track);
        }
    }

    cacheTracks(tracks) {
        tracks.forEach(t => this.cacheTrack(t));
    }

    getCachedTrack(trackId) {
        return this._trackCache.get(trackId) || store.get().trackMetadata[trackId] || null;
    }

    // ───── Core Playback ─────

    async playTrack(track) {
        if (!track || !track.url) return;

        this.currentTrack = track;
        this.cacheTrack(track);

        const offlineUrl = await downloadManager.getPlaybackUrl(track.id);
        const url = offlineUrl || track.url;

        if (this._useNative) {
            // ★ NATIVE PATH: Send to Android Media3 ForegroundService
            try {
                const artworkUrl = (track.cover || '').replace(/^http:\/\//i, 'https://');
                await MediaPlugin.play({
                    url: url,
                    title: track.title || 'Melo Music',
                    artist: track.artist || 'Melo',
                    cover: artworkUrl
                });
                this.isPlaying = true;
                this._emit('statechange', { isPlaying: true });
            } catch (e) {
                console.warn('[Melo] Native play failed, falling back to web:', e);
                this._playWeb(url);
            }
        } else {
            // ★ WEB FALLBACK: Desktop PWA / browser
            this._playWeb(url);
        }

        store.addRecentlyPlayed(track);
        this._emit('trackchange', track);
    }

    _playWeb(url) {
        this.audio.src = url;
        this.audio.play().catch(e => console.warn('Play failed:', e));
        this._updateMediaSession();
    }

    playTrackById(trackId) {
        const track = this.getCachedTrack(trackId);
        if (track) this.playTrack(track);
    }

    playAll(tracks, startTrack) {
        this.cacheTracks(tracks);
        const trackIds = tracks.map(t => t.id);
        const startIndex = startTrack ? trackIds.indexOf(startTrack.id) : 0;
        store.setQueue(trackIds, Math.max(0, startIndex));
        this.playTrack(tracks[Math.max(0, startIndex)]);
    }

    async play() {
        if (this._useNative) {
            try {
                await MediaPlugin.resume();
                this.isPlaying = true;
                this._emit('statechange', { isPlaying: true });
            } catch (e) {
                if (this.audio.src) this.audio.play().catch(() => { });
            }
        } else {
            if (this.audio.src) this.audio.play().catch(e => console.warn('Play failed:', e));
        }
    }

    async pause() {
        if (this._useNative) {
            try {
                await MediaPlugin.pause();
            } catch (e) { }
        }
        this.audio.pause();
        this.isPlaying = false;
        this._emit('statechange', { isPlaying: false });
    }

    togglePlay() {
        hapticImpact();
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    next() {
        hapticImpact();
        const nextId = store.nextInQueue();
        if (nextId) {
            const track = this.getCachedTrack(nextId);
            if (track) {
                this.playTrack(track);
            }
        } else {
            this.pause();
            this.audio.currentTime = 0;
        }
    }

    prev() {
        hapticImpact();
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            if (this._useNative) {
                MediaPlugin.seek({ position: 0 }).catch(() => { });
            }
            return;
        }
        const prevId = store.prevInQueue();
        if (prevId) {
            const track = this.getCachedTrack(prevId);
            if (track) {
                this.playTrack(track);
            }
        }
    }

    seek(time) {
        if (isFinite(time)) {
            this.audio.currentTime = time;
            if (this._useNative) {
                MediaPlugin.seek({ position: parseInt(Math.round(time * 1000)) }).catch(() => { });
            }
        }
    }

    seekPercent(pct) {
        if (this.currentTrack && isFinite(this.currentTrack.duration) && this.currentTrack.duration > 0) {
            this.seek(this.currentTrack.duration * pct);
        } else if (this.audio.duration && isFinite(this.audio.duration)) {
            this.seek(this.audio.duration * pct);
        }
    }

    setVolume(v) {
        this.audio.volume = Math.max(0, Math.min(1, v));
        store.setVolume(v);
    }

    // Mood detection for smart auto-play
    _detectMood(track) {
        if (!track) return 'hindi songs';
        const text = `${track.title || ''} ${track.artist || ''} ${track.album || ''}`.toLowerCase();

        const moodMap = [
            { keywords: ['sad', 'dard', 'dil', 'tanha', 'alvida', 'bewafa', 'rona', 'aansu', 'judai', 'broken', 'heartbreak', 'emotional'], query: 'sad emotional hindi songs' },
            { keywords: ['romantic', 'love', 'pyar', 'ishq', 'mohabbat', 'prem', 'valentine', 'couple'], query: 'romantic love hindi songs' },
            { keywords: ['party', 'dance', 'club', 'dj', 'remix', 'bass', 'beat', 'drop', 'edm'], query: 'party dance hindi songs' },
            { keywords: ['lofi', 'lo-fi', 'chill', 'relax', 'sleep', 'calm', 'acoustic', 'unplugged', 'slowed'], query: 'lofi chill hindi songs' },
            { keywords: ['motivat', 'inspire', 'workout', 'gym', 'energy', 'power', 'pump'], query: 'motivational workout hindi songs' },
            { keywords: ['sufi', 'qawwali', 'devotion', 'bhajan', 'spiritual'], query: 'sufi devotional songs' },
            { keywords: ['rap', 'hip hop', 'hiphop', 'rapper', 'bars'], query: 'hindi rap hip hop songs' },
            { keywords: ['old', 'classic', '90s', '80s', '70s', 'retro', 'purana'], query: 'old classic bollywood hits' },
            { keywords: ['punjabi', 'bhangra', 'jatt'], query: 'punjabi latest songs' },
        ];

        for (const mood of moodMap) {
            if (mood.keywords.some(kw => text.includes(kw))) {
                return mood.query;
            }
        }

        // Fallback: use the current artist for continuity
        if (track.artist) {
            const mainArtist = track.artist.split(',')[0].trim();
            return `${mainArtist} best songs`;
        }

        return 'trending hindi songs 2025';
    }

    async _onEnded() {
        const nextId = store.nextInQueue();
        if (nextId) {
            const track = this.getCachedTrack(nextId);
            if (track) {
                this.playTrack(track);
                return;
            }
        }

        // Queue ended — auto-load more based on mood
        if (this.currentTrack) {
            if (this.currentTrack.type === 'podcast_episode') {
                console.log('[Melo] Podcast ended, auto-play disabled for podcasts.');
                this.pause();
                this.audio.currentTime = 0;
                return;
            }

            try {
                const { searchSongs } = await import('./api.js');
                const query = this._detectMood(this.currentTrack);
                console.log('[Melo] Auto-play mood query:', query);
                const moreSongs = await searchSongs(query);
                if (moreSongs.length > 0) {
                    const oldQueue = new Set(store.get().queue);
                    const fresh = moreSongs.filter(s => !oldQueue.has(s.id));
                    const toPlay = fresh.length > 0 ? fresh : moreSongs;
                    this.cacheTracks(toPlay);
                    const ids = toPlay.map(t => t.id);
                    store.setQueue(ids, 0);
                    this.playTrack(toPlay[0]);
                    return;
                }
            } catch (e) {
                console.warn('Auto-play fetch failed:', e);
            }
        }

        this.pause();
        this.audio.currentTime = 0;
    }

    // Web MediaSession (desktop PWA fallback)
    _setupMediaSession() {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) this.seek(details.seekTime);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
            this.pause();
            this.audio.currentTime = 0;
        });
    }

    _updateMediaSession() {
        if (!this.currentTrack || !('mediaSession' in navigator)) return;
        const artworkUrl = (this.currentTrack.cover || '').replace(/^http:\/\//i, 'https://');
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentTrack.title || 'Melo Music',
                artist: this.currentTrack.artist || 'Melo',
                album: this.currentTrack.album || 'Melo Music',
                artwork: [
                    { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        } catch (e) { }
    }
}

export const player = new AudioPlayer();
