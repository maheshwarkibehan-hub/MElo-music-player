import { player } from '../player.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { toast } from '../components/toast.js';
import { downloadManager } from '../downloadManager.js';
import { getLyrics } from '../api.js';

// Lyrics fetcher — uses centralized getLyrics (works on both web & native)
async function fetchLyrics(title, artist) {
  try {
    return await getLyrics(artist, title);
  } catch (e) {
    console.warn('Lyrics fetch failed:', e);
  }
  return null;
}

export function renderNowPlaying() {
  const page = document.createElement('div');
  page.className = 'page nowplaying-page';

  const track = player.currentTrack;
  if (!track) {
    page.innerHTML = `
      <div class="empty-state" style="padding-top: 30vh;">
        <span class="material-symbols-rounded">music_off</span>
        <p>No track playing</p>
        <p class="text-subtitle" style="margin-top: var(--space-sm);">Choose a song to get started</p>
      </div>
    `;
    return page;
  }

  const state = store.get();
  const isLiked = store.isLiked(track.id);

  page.innerHTML = `
    <div class="np-bg" id="np-bg"></div>
    <div class="np-header">
      <button class="btn-icon" id="np-back">
        <span class="material-symbols-rounded">keyboard_arrow_down</span>
      </button>
      <div class="np-header-title">
        <span class="text-tiny" style="text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Now Playing</span>
      </div>
      <button class="btn-icon" id="np-queue">
        <span class="material-symbols-rounded">queue_music</span>
      </button>
    </div>

    <div class="np-body">
      <div class="np-art-container ${player.isPlaying ? 'playing' : ''}">
        <img class="np-art" id="np-art" src="${track.cover}" alt="${track.title}" />
      </div>

      <div class="np-info">
        <div class="np-title-row">
          <div class="np-title-wrap">
            <h2 class="np-title" id="np-title">${track.title}</h2>
            <p class="np-artist" id="np-artist" style="pointer-events: auto;">${track.artist}</p>
          </div>
          <button class="btn-icon np-like ${isLiked ? 'liked' : ''}" id="np-like">
            <span class="material-symbols-rounded">${isLiked ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>

        <div class="np-progress">
          <div class="np-progress-bar" id="np-progress-bar">
            <div class="np-progress-fill" id="np-progress-fill"></div>
            <div class="np-progress-thumb" id="np-progress-thumb"></div>
          </div>
          <div class="np-time">
            <span id="np-time-current">0:00</span>
            <span id="np-time-total">${formatTime(track.duration)}</span>
          </div>
        </div>

        <div class="np-controls">
          <button class="btn-icon np-ctrl-btn ${state.shuffle ? 'active' : ''}" id="np-shuffle">
            <span class="material-symbols-rounded">shuffle</span>
          </button>
          <button class="btn-icon np-ctrl-btn np-ctrl-lg" id="np-prev">
            <span class="material-symbols-rounded">skip_previous</span>
          </button>
          <button class="btn-play np-play-btn" id="np-play">
            <span class="material-symbols-rounded">${player.isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <button class="btn-icon np-ctrl-btn np-ctrl-lg" id="np-next">
            <span class="material-symbols-rounded">skip_next</span>
          </button>
          <button class="btn-icon np-ctrl-btn ${store.isDownloadComplete(track.id) ? 'active' : ''}" id="np-download">
             <span class="material-symbols-rounded">${store.isDownloadComplete(track.id) ? 'download_done' : 'download'}</span>
          </button>
        </div>

        <!-- Caption / Lyrics Section -->
        <div class="np-caption" id="np-caption">
          <div class="np-caption-toggle" id="np-caption-toggle">
            <span class="material-symbols-rounded" style="font-size:18px;">lyrics</span>
            <span>Lyrics</span>
            <span class="material-symbols-rounded np-caption-arrow" id="np-caption-arrow">expand_more</span>
          </div>
          <div class="np-caption-body" id="np-caption-body" style="display:none;">
            <div class="np-caption-loading" id="np-caption-loading">
              <div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div>
              <span>Finding lyrics...</span>
            </div>
            <pre class="np-caption-text" id="np-caption-text" style="display:none;"></pre>
          </div>
        </div>
      </div>
    </div>
  `;

  // Set the album art as blurred background
  const bg = page.querySelector('#np-bg');
  bg.style.backgroundImage = `url(${track.cover})`;

  // Event binding
  page.querySelector('#np-back').addEventListener('click', () => {
    router.navigate('home');
  });

  page.querySelector('#np-artist').addEventListener('click', () => {
    const mainArtist = track.artist.split(',')[0].trim();
    router.navigate(`artist?name=${encodeURIComponent(mainArtist)}`);
  });

  page.querySelector('#np-download').addEventListener('click', async () => {
    const dlBtn = page.querySelector('#np-download');
    if (store.isDownloadComplete(track.id)) {
      toast.show('Already downloaded!', 'info');
      return;
    }
    toast.show(`Downloading ${track.title}...`, 'info');
    dlBtn.querySelector('.material-symbols-rounded').textContent = 'hourglass_top';
    const ok = await downloadManager.downloadTrack(track);
    if (ok) {
      dlBtn.classList.add('active');
      dlBtn.querySelector('.material-symbols-rounded').textContent = 'download_done';
      toast.show(`Downloaded: ${track.title}`, 'success');
    } else {
      dlBtn.querySelector('.material-symbols-rounded').textContent = 'download';
      toast.show('Download failed', 'error');
    }
  });

  page.querySelector('#np-play').addEventListener('click', () => player.togglePlay());
  page.querySelector('#np-prev').addEventListener('click', () => player.prev());
  page.querySelector('#np-next').addEventListener('click', () => player.next());

  page.querySelector('#np-shuffle').addEventListener('click', () => {
    store.toggleShuffle();
    page.querySelector('#np-shuffle').classList.toggle('active');
  });

  page.querySelector('#np-like').addEventListener('click', () => {
    store.toggleLike(track);
    const liked = store.isLiked(track.id);
    const btn = page.querySelector('#np-like');
    btn.classList.toggle('liked', liked);
    btn.querySelector('.material-symbols-rounded').textContent = liked ? 'favorite' : 'favorite_border';
  });

  // Lyrics toggle
  let lyricsLoaded = false;
  const captionToggle = page.querySelector('#np-caption-toggle');
  const captionBody = page.querySelector('#np-caption-body');
  const captionArrow = page.querySelector('#np-caption-arrow');
  const captionText = page.querySelector('#np-caption-text');
  const captionLoading = page.querySelector('#np-caption-loading');

  captionToggle.addEventListener('click', async () => {
    const isVisible = captionBody.style.display !== 'none';
    captionBody.style.display = isVisible ? 'none' : 'block';
    captionArrow.textContent = isVisible ? 'expand_more' : 'expand_less';

    if (!isVisible && !lyricsLoaded) {
      lyricsLoaded = true;
      const lyrics = await fetchLyrics(track.title, track.artist);
      captionLoading.style.display = 'none';
      captionText.style.display = 'block';
      if (lyrics) {
        // Clean up excessive blank lines and normalize line breaks from API
        captionText.textContent = lyrics.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      } else {
        captionText.textContent = 'Lyrics not available for this song.';
        captionText.style.textAlign = 'center';
        captionText.style.color = 'var(--text-tertiary)';
      }
    }
  });

  // Progress bar seeking
  const progressBar = page.querySelector('#np-progress-bar');
  let seeking = false;
  let seekPct = 0;

  function updateSeekUI(e) {
    const rect = progressBar.getBoundingClientRect();
    let clientX = rect.left;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    }
    const x = clientX - rect.left;
    seekPct = Math.max(0, Math.min(1, x / rect.width));

    const duration = player.currentTrack ? player.currentTrack.duration : parseInt(player.audio.duration || 0);
    if (!duration) return;

    updateProgress(seekPct * duration, duration);
  }

  function commitSeek() {
    if (!seeking) return;
    seeking = false;
    const duration = player.currentTrack ? player.currentTrack.duration : parseInt(player.audio.duration || 0);
    if (!duration) return;

    // Add 0.1 to force fractional mapping in Native Capacitor JSON bridging to avoid INT-to-LONG casting crash
    const targetTime = (duration * seekPct) + 0.1;
    player.seek(targetTime);
  }

  progressBar.addEventListener('mousedown', (e) => { seeking = true; updateSeekUI(e); });
  progressBar.addEventListener('touchstart', (e) => { seeking = true; updateSeekUI(e); }, { passive: true });
  document.addEventListener('mousemove', (e) => { if (seeking) updateSeekUI(e); });
  document.addEventListener('touchmove', (e) => { if (seeking) updateSeekUI(e); }, { passive: true });
  document.addEventListener('mouseup', () => { if (seeking) commitSeek(); });
  document.addEventListener('touchend', () => { if (seeking) commitSeek(); });

  // Update playback state
  const unsubState = player.on('statechange', ({ isPlaying }) => {
    const playBtn = page.querySelector('#np-play .material-symbols-rounded');
    if (playBtn) playBtn.textContent = isPlaying ? 'pause' : 'play_arrow';

    const artContainer = page.querySelector('.np-art-container');
    if (artContainer) artContainer.classList.toggle('playing', isPlaying);
  });

  const unsubTime = player.on('timeupdate', ({ currentTime, duration }) => {
    if (!seeking) updateProgress(currentTime, duration);
  });

  const unsubTrack = player.on('trackchange', (newTrack) => {
    const art = page.querySelector('#np-art');
    const title = page.querySelector('#np-title');
    const artist = page.querySelector('#np-artist');
    const total = page.querySelector('#np-time-total');
    const bg2 = page.querySelector('#np-bg');
    if (art) art.src = newTrack.cover;
    if (title) title.textContent = newTrack.title;
    if (artist) artist.textContent = newTrack.artist;
    if (total) {
      if (!newTrack.duration) total.textContent = 'Live';
      else total.textContent = formatTime(newTrack.duration);
    }
    if (bg2) bg2.style.backgroundImage = `url(${newTrack.cover})`;

    // Update like button
    const liked = store.isLiked(newTrack.id);
    const likeBtn = page.querySelector('#np-like');
    if (likeBtn) {
      likeBtn.classList.toggle('liked', liked);
      likeBtn.querySelector('.material-symbols-rounded').textContent = liked ? 'favorite' : 'favorite_border';
    }

    // Reset lyrics for new track
    lyricsLoaded = false;
    captionBody.style.display = 'none';
    captionArrow.textContent = 'expand_more';
    captionLoading.style.display = 'flex';
    captionText.style.display = 'none';
    captionText.textContent = '';
  });

  function updateProgress(currentTime, duration) {
    const timeCurrent = page.querySelector('#np-time-current');
    const total = page.querySelector('#np-time-total');

    if (timeCurrent) timeCurrent.textContent = formatTime(currentTime);

    if (!duration || !isFinite(duration) || duration === 0) {
      if (total && total.textContent !== 'Live') total.textContent = 'Live';
      return;
    }

    if (total) {
      const formattedDuration = formatTime(duration);
      if (total.textContent !== formattedDuration) total.textContent = formattedDuration;
    }

    const pct = (currentTime / duration) * 100;
    const fill = page.querySelector('#np-progress-fill');
    const thumb = page.querySelector('#np-progress-thumb');
    if (fill) fill.style.width = `${pct}%`;
    if (thumb) thumb.style.left = `${pct}%`;
  }

  return page;
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Now Playing CSS — compact layout
const style = document.createElement('style');
style.textContent = `
  .nowplaying-page {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding: 0 !important;
    padding-bottom: 0 !important;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .np-bg {
    position: fixed;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(80px) brightness(0.2) saturate(1.5);
    transform: scale(1.5);
    z-index: 0;
    transition: background-image 0.8s ease;
  }

  .np-header {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    z-index: 2;
  }

  .np-body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    padding: 0 var(--space-xl);
    padding-bottom: calc(var(--nav-height) + var(--safe-bottom) + 24px);
  }

  .np-art-container {
    position: relative;
    width: min(260px, 55vw);
    aspect-ratio: 1;
    margin-bottom: var(--space-xl);
    border-radius: var(--radius-xl);
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .np-art-container.playing {
    transform: scale(1.02);
  }

  .np-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .np-info {
    position: relative;
    z-index: 1;
    width: min(380px, 90vw);
  }

  .np-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .np-title-wrap {
    flex: 1;
    min-width: 0;
  }

  .np-title {
    font-size: var(--font-lg);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .np-artist {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    margin-top: 2px;
    margin-bottom: var(--space-lg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .np-progress-bar {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: var(--radius-full);
    cursor: pointer;
    position: relative;
  }

  .np-progress-fill {
    height: 100%;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
    border-radius: inherit;
  }

  .np-progress-thumb {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    background: var(--accent);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .np-time {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    margin-top: var(--space-xs);
  }

  .np-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-lg);
  }

  .np-play-btn {
    width: 56px;
    height: 56px;
    background: var(--text-primary);
    color: var(--bg-primary);
  }

  .np-play-btn:hover {
    transform: scale(1.08);
  }

  .np-ctrl-lg .material-symbols-rounded {
    font-size: 36px !important;
  }

  .np-ctrl-btn.active {
    color: var(--accent);
  }

  .np-like.liked {
    color: var(--accent);
  }

  /* Caption / Lyrics */
  .np-caption {
    margin-top: var(--space-xl);
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
  }

  .np-caption-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: var(--font-sm);
    font-weight: 600;
    -webkit-tap-highlight-color: transparent;
    transition: color var(--transition-fast);
  }

  .np-caption-toggle:hover {
    color: var(--text-primary);
  }

  .np-caption-arrow {
    margin-left: auto;
    transition: transform 0.3s ease;
  }

  .np-caption-body {
    padding: 0 var(--space-lg) var(--space-lg);
    max-height: 200px;
    overflow-y: auto;
  }

  .np-caption-loading {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--text-tertiary);
    font-size: var(--font-sm);
  }

  .np-caption-text {
    font-family: inherit;
    font-size: var(--font-sm);
    color: var(--text-secondary);
    line-height: 1.8;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }

  /* Scrollbar for lyrics */
  .np-caption-body::-webkit-scrollbar { width: 3px; }
  .np-caption-body::-webkit-scrollbar-thumb { background: var(--accent-dim); border-radius: 3px; }

  /* Tablet landscape split view */
  @media (min-width: 1024px) {
    .np-body {
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: var(--space-3xl);
      padding-top: var(--space-xl);
    }
    .np-art-container {
      width: min(320px, 35vw);
      margin-bottom: 0;
    }
    .np-info {
      width: min(400px, 40vw);
    }
  }
`;
document.head.appendChild(style);
