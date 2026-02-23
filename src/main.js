import './styles/global.css';
import { router } from './router.js';
import { store } from './store.js';
import { createNavbar } from './components/navbar.js';
import { createMiniPlayer } from './components/miniplayer.js';
import { renderHome } from './pages/home.js';
import { renderSearch } from './pages/search.js';
import { renderLibrary } from './pages/library.js';
import { renderNowPlaying } from './pages/nowplaying.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderArtistProfile } from './pages/artist.js';
import { renderPodcastProfile } from './pages/podcast.js';
import { renderSettings } from './pages/settings.js';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

// Native Android Optimizations
async function initNative() {
    try {
        // Transparent status bar for edge-to-edge look
        try { await StatusBar.setOverlaysWebView({ overlay: true }); } catch (e) { }
        try { await StatusBar.setStyle({ style: Style.Dark }); } catch (e) { }

        // Android 13+ requires notification permission for media controls
        try {
            const status = await LocalNotifications.checkPermissions();
            if (status.display !== 'granted') {
                await LocalNotifications.requestPermissions();
            }
        } catch (e) { }

        // Create media channel for the native foreground service notification
        try {
            await LocalNotifications.createChannel({
                id: 'media_playback',
                name: 'Music Controls',
                description: 'Music playback controls',
                importance: 5,
                visibility: 1,
                sound: null,
                vibration: false
            });
        } catch (e) { }

        // Fire-and-forget: don't await notifyAppReady (it can hang with corrupt state)
        CapacitorUpdater.notifyAppReady().catch(() => { });

        // Self-hosted OTA: Check version.json, download zip, prompt user
        const CURRENT_VERSION = '1.0.10';
        const VERSION_URL = 'https://api.github.com/repos/maheshwarkibehan-hub/MElo-music-player/contents/version.json';

        // Simple version comparison: returns true if a > b
        function isNewer(a, b) {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                const na = pa[i] || 0;
                const nb = pb[i] || 0;
                if (na > nb) return true;
                if (na < nb) return false;
            }
            return false;
        }

        // Only check once per session
        if (!window.__otaChecked) {
            window.__otaChecked = true;
            window.setTimeout(async () => {
                try {
                    console.log('[OTA] Checking for updates...');

                    let versionData;
                    try {
                        const resp = await fetch(VERSION_URL + '?t=' + Date.now(), {
                            headers: { 'Accept': 'application/vnd.github.v3.raw' },
                            cache: 'no-store'
                        });
                        if (!resp.ok) throw new Error('Version check failed: ' + resp.status);
                        versionData = await resp.json();
                    } catch (fetchErr) {
                        console.log('[OTA] Version check unavailable:', fetchErr.message);
                        return;
                    }

                    if (!versionData || !versionData.version || !versionData.url) {
                        console.log('[OTA] Invalid version data');
                        return;
                    }

                    if (!isNewer(versionData.version, CURRENT_VERSION)) {
                        console.log('[OTA] Already up to date:', CURRENT_VERSION);
                        return;
                    }

                    console.log('[OTA] New version available:', versionData.version);

                    // Show update notification
                    const modal = document.createElement('div');
                    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:999999;opacity:0;transition:opacity 0.3s ease;padding:20px;';
                    modal.innerHTML = `
                      <div style="background:#1a1a2e;border-radius:20px;padding:28px;max-width:340px;width:100%;text-align:center;transform:translateY(20px);transition:transform 0.3s ease;border:1px solid rgba(255,255,255,0.08);">
                        <span class="material-symbols-rounded" style="font-size:48px;color:#bb86fc;margin-bottom:12px;display:block;">system_update</span>
                        <h2 style="color:#fff;margin:0 0 8px;font-size:20px;">Update Available</h2>
                        <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;font-size:14px;">v${CURRENT_VERSION} → v${versionData.version}</p>
                        <p style="color:rgba(255,255,255,0.4);margin:0 0 20px;font-size:12px;">Check Settings for details</p>
                        <button id="ota-ok" style="width:100%;padding:14px;border-radius:12px;border:none;background:#bb86fc;color:#1a1a2e;font-weight:700;font-size:15px;cursor:pointer;">OK</button>
                      </div>`;
                    document.body.appendChild(modal);
                    requestAnimationFrame(() => {
                        modal.style.opacity = '1';
                        modal.firstElementChild.style.transform = 'translateY(0)';
                    });

                    document.getElementById('ota-ok').onclick = () => {
                        modal.style.opacity = '0';
                        setTimeout(() => modal.remove(), 300);
                    };

                } catch (err) {
                    console.log('[OTA] Update check error:', err);
                }
            }, 3000);
        }

    } catch (e) {
        console.warn('Native APIs not available:', e);
    }
}

const hapticImpact = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) { }
};

// Load and apply scale/zoom
const applyZoom = () => {
    const zoom = localStorage.getItem('melo-zoom') || '1.0';
    document.documentElement.style.setProperty('--zoom', zoom);
    document.body.style.zoom = zoom;
};
applyZoom();

initNative();

// Handle Android Hardware Back Button
App.addListener('backButton', ({ canGoBack }) => {
    if (window.location.hash && window.location.hash !== '#/home') {
        window.history.back();
    } else {
        App.exitApp();
    }
});

// Initialize the app
function init() {
    const app = document.getElementById('app');
    const state = store.get();

    if (!state.onboarded) {
        app.innerHTML = '';
        app.appendChild(renderOnboarding());
        const unsub = store.subscribe((key) => {
            if (key === 'interests') {
                unsub();
                initApp();
            }
        });
        return;
    }

    initApp();
}

function initApp() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const content = document.createElement('main');
    content.id = 'page-content';
    app.appendChild(content);

    app.appendChild(createMiniPlayer());
    app.appendChild(createNavbar());

    router.register('home', renderHome);
    router.register('search', renderSearch);
    router.register('library', renderLibrary);
    router.register('nowplaying', renderNowPlaying);
    router.register('artist', renderArtistProfile);
    router.register('podcast', renderPodcastProfile);
    router.register('settings', renderSettings);

    router.init(content);

    if (!window.location.hash || window.location.hash === '#') {
        router.navigate('home');
    }

    window.addEventListener('routechange', () => {
        hapticImpact();
    });
}

// Global error handler
window.onerror = (msg, src, line, col, err) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:20px;background:#e53935;color:#fff;z-index:99999;font-size:14px;white-space:pre-wrap;font-family:monospace;';
    d.textContent = `ERROR: ${msg}\nFile: ${src}\nLine: ${line}:${col}\n${err?.stack || ''}`;
    document.body.appendChild(d);
};
window.addEventListener('unhandledrejection', (e) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:20px;background:#e53935;color:#fff;z-index:99999;font-size:14px;white-space:pre-wrap;font-family:monospace;';
    d.textContent = `PROMISE ERROR: ${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`;
    document.body.appendChild(d);
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.warn('SW registration failed:', err));
    });
}

// Initialize
try {
    init();
} catch (e) {
    document.body.innerHTML = `<div style="padding:20px;color:#e53935;font-family:monospace;"><h2>App Crash</h2><pre>${e.message}\n${e.stack}</pre></div>`;
}
