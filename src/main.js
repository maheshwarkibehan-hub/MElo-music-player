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



// Initialize
try {
    init();
} catch (e) {
    document.body.innerHTML = `<div style="padding:20px;color:#e53935;font-family:monospace;"><h2>App Crash</h2><pre>${e.message}\n${e.stack}</pre></div>`;
}
