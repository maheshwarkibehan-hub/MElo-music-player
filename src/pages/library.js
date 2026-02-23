import { store } from '../store.js';
import { player } from '../player.js';
import { toast } from '../components/toast.js';
import { downloadManager } from '../downloadManager.js';

export function renderLibrary() {
  const page = document.createElement('div');
  page.className = 'page';

  page.innerHTML = `
    <div class="lib-header">
      <h1 class="lib-title">Your Library</h1>
    </div>
    <div id="library-content"></div>
  `;

  const content = page.querySelector('#library-content');

  async function render() {
    const currentState = store.get();
    content.innerHTML = '';

    // ── Quick Access Section ──
    const quickSection = document.createElement('div');
    quickSection.className = 'lib-section';
    quickSection.innerHTML = `<div class="lib-section-title">Quick Access</div>`;

    const quickGrid = document.createElement('div');
    quickGrid.className = 'lib-quick-grid';

    // Downloads chip
    const downloads = await downloadManager.getAllDownloads();
    quickGrid.innerHTML += `
      <div class="lib-quick-chip" id="lib-chip-downloads">
        <div class="lib-chip-icon downloads-gradient">
          <span class="material-symbols-rounded">download_done</span>
        </div>
        <span class="lib-chip-label">Downloads</span>
        <span class="lib-chip-count">${downloads.length}</span>
      </div>
    `;

    // Liked Songs chip
    const likedCount = currentState.likedSongs.length;
    quickGrid.innerHTML += `
      <div class="lib-quick-chip" id="lib-chip-liked">
        <div class="lib-chip-icon liked-gradient">
          <span class="material-symbols-rounded">favorite</span>
        </div>
        <span class="lib-chip-label">Liked Songs</span>
        <span class="lib-chip-count">${likedCount}</span>
      </div>
    `;

    // Recently Played chip
    if (currentState.recentlyPlayed.length > 0) {
      quickGrid.innerHTML += `
        <div class="lib-quick-chip" id="lib-chip-recent">
          <div class="lib-chip-icon recent-gradient">
            <span class="material-symbols-rounded">history</span>
          </div>
          <span class="lib-chip-label">Recent</span>
          <span class="lib-chip-count">${currentState.recentlyPlayed.length}</span>
        </div>
      `;
    }

    quickSection.appendChild(quickGrid);
    content.appendChild(quickSection);

    // Bind chip clicks
    quickSection.querySelector('#lib-chip-downloads')?.addEventListener('click', () => showDownloads(downloads, content));
    quickSection.querySelector('#lib-chip-liked')?.addEventListener('click', () => {
      if (likedCount > 0) showPlaylist('Liked Songs', currentState.likedSongs, content);
    });
    quickSection.querySelector('#lib-chip-recent')?.addEventListener('click', () => {
      showPlaylist('Recently Played', currentState.recentlyPlayed, content);
    });

    // ── Playlists Section ──
    const plSection = document.createElement('div');
    plSection.className = 'lib-section';
    plSection.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="lib-section-title">Playlists</div>
        <button class="lib-create-btn" id="lib-create-pl">
          <span class="material-symbols-rounded">add</span>
          <span>New</span>
        </button>
      </div>
    `;

    const plList = document.createElement('div');
    plList.className = 'lib-playlist-list';

    if (currentState.playlists.length === 0) {
      plList.innerHTML = `
        <div class="lib-empty">
          <span class="material-symbols-rounded">queue_music</span>
          <p>No playlists yet</p>
          <p class="lib-empty-sub">Tap + New to create one</p>
        </div>
      `;
    } else {
      currentState.playlists.forEach((pl, idx) => {
        const firstTrack = pl.trackIds.length > 0 ? player.getCachedTrack(pl.trackIds[0]) : null;
        const cover = firstTrack?.coverSmall || firstTrack?.cover || '';
        const item = document.createElement('div');
        item.className = 'lib-playlist-card';
        item.innerHTML = `
          <div class="lib-pl-art">
            ${cover ? `<img src="${cover}" alt="" loading="lazy" />` : '<span class="material-symbols-rounded">queue_music</span>'}
          </div>
          <div class="lib-pl-info">
            <div class="lib-pl-name">${pl.name}</div>
            <div class="lib-pl-meta">${pl.trackIds.length} song${pl.trackIds.length !== 1 ? 's' : ''}</div>
          </div>
          <span class="material-symbols-rounded lib-chevron">chevron_right</span>
        `;
        item.addEventListener('click', () => showPlaylist(pl.name, pl.trackIds, content));
        plList.appendChild(item);
      });
    }

    plSection.appendChild(plList);
    content.appendChild(plSection);

    // Bind create playlist
    plSection.querySelector('#lib-create-pl').addEventListener('click', () => {
      const name = prompt('Enter playlist name:');
      if (name?.trim()) {
        store.createPlaylist(name.trim());
        render();
      }
    });

    // ── Display Scaling Section ──
    const initialZoom = localStorage.getItem('melo-zoom') || '1.0';
    const scaleSection = document.createElement('div');
    scaleSection.className = 'lib-section';
    scaleSection.innerHTML = `
      <div class="lib-section-title">Display</div>
      <div class="lib-scale-card">
        <div class="lib-scale-header">
          <span class="material-symbols-rounded">zoom_in</span>
          <span class="lib-scale-label">Scaling</span>
          <span class="lib-scale-value">${Math.round(initialZoom * 100)}%</span>
        </div>
        <input type="range" id="zoom-slider" min="0.8" max="1.5" step="0.05" value="${initialZoom}" class="lib-zoom-slider">
        <div class="lib-zoom-labels">
          <span>Small</span>
          <span>Default</span>
          <span>Large</span>
        </div>
      </div>
    `;

    const slider = scaleSection.querySelector('#zoom-slider');
    const valDisplay = scaleSection.querySelector('.lib-scale-value');
    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      valDisplay.textContent = Math.round(val * 100) + '%';
      localStorage.setItem('melo-zoom', val);
      document.documentElement.style.setProperty('--zoom', val);
      document.body.style.zoom = val;
    });
    content.appendChild(scaleSection);
  }

  // ── Downloads View ──
  function showDownloads(downloads, container) {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'lib-view-header';
    header.innerHTML = `
      <button class="btn-icon" id="dl-back"><span class="material-symbols-rounded">arrow_back</span></button>
      <h2 class="lib-view-title">Downloads</h2>
      <span class="lib-view-count">${downloads.length} song${downloads.length !== 1 ? 's' : ''}</span>
      ${downloads.length > 0 ? `
        <button class="lib-play-btn" id="dl-play-all">
          <span class="material-symbols-rounded">play_arrow</span>
        </button>
      ` : ''}
    `;
    header.querySelector('#dl-back').addEventListener('click', () => render());
    container.appendChild(header);

    if (downloads.length > 0) {
      header.querySelector('#dl-play-all')?.addEventListener('click', () => player.playAll(downloads, downloads[0]));
    }

    if (downloads.length === 0) {
      container.innerHTML += `
        <div class="lib-empty">
          <span class="material-symbols-rounded">download</span>
          <p>No downloads yet</p>
          <p class="lib-empty-sub">Download songs to play offline</p>
        </div>
      `;
      return;
    }

    downloads.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.innerHTML = `
        <img class="track-item-art" src="${track.coverSmall || track.cover}" alt="" loading="lazy" />
        <div class="track-item-info">
          <div class="track-item-title">${track.title}</div>
          <div class="track-item-artist">${track.artist}</div>
        </div>
        <span class="track-item-duration">${formatSize(track.size || 0)}</span>
        <button class="btn-icon dl-delete-btn" data-id="${track.id}" title="Delete">
          <span class="material-symbols-rounded" style="font-size:20px;color:var(--text-tertiary);">delete</span>
        </button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.dl-delete-btn')) {
          e.stopPropagation();
          downloadManager.deleteDownload(e.target.closest('.dl-delete-btn').dataset.id).then(() => {
            toast.show('Download removed', 'info');
            downloadManager.getAllDownloads().then(updDl => showDownloads(updDl, container));
          });
          return;
        }
        player.playAll(downloads, track);
      });
      container.appendChild(item);
    });
  }

  // ── Playlist View ──
  function showPlaylist(name, trackIds, container) {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'lib-view-header';
    header.innerHTML = `
      <button class="btn-icon" id="lib-back"><span class="material-symbols-rounded">arrow_back</span></button>
      <h2 class="lib-view-title">${name}</h2>
      <button class="lib-play-btn" id="lib-play-all">
        <span class="material-symbols-rounded">play_arrow</span>
      </button>
    `;
    header.querySelector('#lib-back').addEventListener('click', () => render());
    container.appendChild(header);

    const playlistTracks = trackIds.map(id => player.getCachedTrack(id)).filter(Boolean);

    header.querySelector('#lib-play-all').addEventListener('click', () => {
      if (playlistTracks.length > 0) player.playAll(playlistTracks, playlistTracks[0]);
    });

    if (playlistTracks.length === 0) {
      container.innerHTML += `
        <div class="lib-empty">
          <span class="material-symbols-rounded">library_music</span>
          <p>No songs yet</p>
          <p class="lib-empty-sub">Search and play songs to see them here</p>
        </div>
      `;
      return;
    }

    playlistTracks.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.innerHTML = `
        <img class="track-item-art" src="${track.coverSmall || track.cover}" alt="" loading="lazy" />
        <div class="track-item-info">
          <div class="track-item-title">${track.title}</div>
          <div class="track-item-artist">${track.artist}</div>
        </div>
        <span class="track-item-duration">${formatTime(track.duration)}</span>
      `;
      item.addEventListener('click', () => player.playAll(playlistTracks, track));
      container.appendChild(item);
    });
  }

  render();

  store.subscribe((key) => {
    if (['likedSongs', 'playlists', 'recentlyPlayed', 'downloads'].includes(key)) {
      render();
    }
  });

  return page;
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// Library CSS
const style = document.createElement('style');
style.textContent = `
  /* ── Header ── */
  .lib-header { padding: 20px 0 10px; }
  .lib-title { font-size: 28px; font-weight: 700; color: var(--text-primary); }

  /* ── Sections ── */
  .lib-section { margin-bottom: 28px; }
  .lib-section-title {
    font-size: 13px; font-weight: 600; color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 12px; padding-left: 4px;
  }

  /* ── Quick Access Grid ── */
  .lib-quick-grid {
    display: flex; flex-wrap: wrap; gap: 10px;
  }
  .lib-quick-chip {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface); border: 1px solid var(--surface-border);
    border-radius: 14px; padding: 10px 14px;
    flex: 1; min-width: calc(50% - 5px);
    cursor: pointer; transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .lib-quick-chip:active { transform: scale(0.97); opacity: 0.9; }
  .lib-chip-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .lib-chip-icon .material-symbols-rounded { font-size: 20px; color: #fff; }
  .downloads-gradient { background: linear-gradient(135deg, #1ed760, #0ea5e9); }
  .liked-gradient { background: linear-gradient(135deg, #7c4dff, #e040fb); }
  .recent-gradient { background: linear-gradient(135deg, #ff6b6b, #ffa726); }
  .lib-chip-label {
    font-size: 14px; font-weight: 600; color: var(--text-primary);
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lib-chip-count {
    font-size: 12px; font-weight: 700; color: var(--accent);
    background: var(--accent-dim); padding: 2px 8px;
    border-radius: 20px; min-width: 22px; text-align: center;
  }

  /* ── Playlist Cards ── */
  .lib-playlist-list { display: flex; flex-direction: column; gap: 2px; }
  .lib-playlist-card {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px; border-radius: 14px;
    background: var(--surface); border: 1px solid var(--surface-border);
    cursor: pointer; transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 8px;
  }
  .lib-playlist-card:active { transform: scale(0.98); opacity: 0.9; }
  .lib-pl-art {
    width: 52px; height: 52px; border-radius: 12px;
    background: var(--bg-tertiary); display: flex;
    align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .lib-pl-art img { width: 100%; height: 100%; object-fit: cover; }
  .lib-pl-art .material-symbols-rounded { font-size: 24px; color: var(--text-tertiary); }
  .lib-pl-info { flex: 1; min-width: 0; }
  .lib-pl-name {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lib-pl-meta { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
  .lib-chevron { font-size: 20px; color: var(--text-tertiary); flex-shrink: 0; }

  /* ── Create Button ── */
  .lib-create-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 20px;
    border: 1px solid var(--accent); background: transparent;
    color: var(--accent); font-weight: 600; font-size: 13px;
    cursor: pointer; font-family: var(--font-family);
    transition: all 0.2s ease;
  }
  .lib-create-btn:active { background: var(--accent-dim); }
  .lib-create-btn .material-symbols-rounded { font-size: 18px; }

  /* ── Scale Card ── */
  .lib-scale-card {
    background: var(--surface); border: 1px solid var(--surface-border);
    border-radius: 16px; padding: 16px;
  }
  .lib-scale-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  }
  .lib-scale-header .material-symbols-rounded {
    font-size: 22px; color: var(--accent);
  }
  .lib-scale-label { flex: 1; font-size: 15px; font-weight: 500; color: var(--text-primary); }
  .lib-scale-value {
    font-size: 13px; font-weight: 700; color: var(--accent);
    background: var(--accent-dim); padding: 3px 10px; border-radius: 8px;
  }
  .lib-zoom-slider { width: 100%; accent-color: var(--accent); cursor: pointer; }
  .lib-zoom-labels {
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;
  }

  /* ── View Header (Downloads/Playlist) ── */
  .lib-view-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; padding: 4px 0;
  }
  .lib-view-title { flex: 1; font-size: 22px; font-weight: 700; color: var(--text-primary); }
  .lib-view-count { font-size: 13px; color: var(--text-secondary); }
  .lib-play-btn {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--accent); border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }
  .lib-play-btn .material-symbols-rounded { font-size: 22px; color: #000; }
  .lib-play-btn:active { transform: scale(0.93); }

  /* ── Empty State ── */
  .lib-empty {
    text-align: center; padding: 40px 20px; color: var(--text-secondary);
  }
  .lib-empty .material-symbols-rounded {
    font-size: 48px; color: var(--text-tertiary);
    margin-bottom: 12px; display: block;
  }
  .lib-empty p { margin: 0; font-size: 16px; font-weight: 500; }
  .lib-empty-sub { font-size: 13px; color: var(--text-tertiary); margin-top: 6px !important; }
`;
document.head.appendChild(style);
