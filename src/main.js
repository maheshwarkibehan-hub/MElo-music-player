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
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

// Native Android Optimizations
async function initNative() {
    try {
        // Transparent status bar for edge-to-edge look
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });

        // Android 13+ requires notification permission for media controls
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
            await LocalNotifications.requestPermissions();
        }

        // Create media channel for the native foreground service notification
        await LocalNotifications.createChannel({
            id: 'media_playback',
            name: 'Music Controls',
            description: 'Music playback controls',
            importance: 5,
            visibility: 1,
            sound: null,
            vibration: false
        });

        // Notify Capgo OTA Updater that the app has successfully booted so it doesn't rollback
        await CapacitorUpdater.notifyAppReady();

        // Self-hosted OTA: Check version.json, download zip, prompt user
        const CURRENT_VERSION = '1.0.10';
        const VERSION_URL = 'https://api.github.com/repos/maheshwarkibehan-hub/MElo-music-player/contents/version.json';

        window.setTimeout(async () => {
            try {
                console.log('[OTA] Checking for updates...');

                // Try fetching version info via GitHub API (never cached unlike raw CDN)
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

                if (versionData.version === CURRENT_VERSION) {
                    console.log('[OTA] Already up to date:', CURRENT_VERSION);
                    return;
                }

                console.log('[OTA] New version available:', versionData.version);

                // Download the bundle
                const bundle = await CapacitorUpdater.download({
                    url: versionData.url,
                    version: versionData.version,
                });

                console.log('[OTA] Bundle downloaded:', bundle);

                // Show beautiful update modal
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:999999;opacity:0;transition:opacity 0.3s ease;padding:20px;';
                modal.innerHTML = `
                    <div style="background:var(--surface,#1a1a2e);padding:30px;border-radius:20px;text-align:center;max-width:320px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.5);transform:translateY(20px);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);">
                        <div style="background:var(--accent,#6c63ff);width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                            <span class="material-symbols-rounded" style="color:black;font-size:30px;">system_update</span>
                        </div>
                        <h2 style="margin:0 0 10px;font-size:22px;color:var(--text-primary,#fff);font-weight:700;">Update Ready</h2>
                        <p style="margin:0 0 6px;color:var(--text-secondary,#aaa);font-size:13px;">v${CURRENT_VERSION} → v${versionData.version}</p>
                        <p style="margin:0 0 25px;color:var(--text-secondary,#aaa);line-height:1.5;font-size:15px;">A new version of Melo is ready!</p>
                        <div style="display:flex;gap:12px;">
                            <button id="ota-skip" style="flex:1;padding:14px;border-radius:12px;border:none;background:rgba(255,255,255,0.05);color:var(--text-primary,#fff);font-weight:600;font-size:15px;cursor:pointer;">Later</button>
                            <button id="ota-update" style="flex:1;padding:14px;border-radius:12px;border:none;background:var(--accent,#6c63ff);color:black;font-weight:600;font-size:15px;cursor:pointer;">Update Now</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                    modal.firstElementChild.style.transform = 'translateY(0)';
                });

                document.getElementById('ota-skip').onclick = () => {
                    modal.style.opacity = '0';
                    setTimeout(() => modal.remove(), 300);
                };

                document.getElementById('ota-update').onclick = async () => {
                    const btn = document.getElementById('ota-update');
                    btn.textContent = 'Installing...';
                    try {
                        await CapacitorUpdater.set(bundle);
                        // Bundle is set — app must fully restart to use it
                        btn.textContent = 'Restarting...';
                        setTimeout(() => App.exitApp(), 500);
                    } catch (e) {
                        console.warn('[OTA] Set failed:', e);
                        btn.textContent = 'Retry';
                        btn.style.background = '#e53935';
                        btn.style.color = '#fff';
                    }
                };

            } catch (err) {
                console.log('[OTA] Update check error:', err);
            }
        }, 3000);

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
