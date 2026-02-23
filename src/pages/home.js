import { store } from '../store.js';
import { genres } from '../data/genres.js';
import { artists } from '../data/artists.js';
import { createTrackCard } from '../components/trackcard.js';
import { searchSongs } from '../api.js';
import { player } from '../player.js';
import { downloadManager } from '../downloadManager.js';

// Genre-to-search-query mapping
const genreQueries = {
  pop: 'latest pop hits',
  hiphop: 'hip hop trending',
  rock: 'rock hits',
  lofi: 'lofi chill beats',
  electronic: 'electronic dance',
  rnb: 'r&b soul',
  jazz: 'jazz classics',
  classical: 'classical music',
  indie: 'indie music',
  kpop: 'kpop trending',
  bollywood: 'bollywood latest songs',
  ambient: 'ambient relax'
};

export function renderHome() {
  const page = document.createElement('div');
  page.className = 'page';

  const state = store.get();
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  page.innerHTML = `
    <div class="home-header">
      <img src="/icons/icon.svg" class="home-logo" alt="Melo" />
      <h1 class="text-greeting">${greeting} <span style="font-size: 14px; color: var(--accent); vertical-align: middle; margin-left: 10px;">v1.0.6</span></h1>
    </div>
    <div class="section" style="margin-top: var(--space-xl);">
      <div class="horizontal-scroll" id="home-chips"></div>
    </div>
    <div id="home-sections">
      <div class="home-loading">
        <div class="loading-spinner"></div>
        <p class="text-subtitle">Loading your music...</p>
      </div>
    </div>
  `;

  // Quick pick chips
  const chipsRow = page.querySelector('#home-chips');
  const allChip = document.createElement('button');
  allChip.className = 'chip active';
  allChip.textContent = 'For You';
  chipsRow.appendChild(allChip);

  const userGenres = state.interests.length > 0 ? state.interests : ['bollywood', 'pop', 'lofi', 'hiphop'];
  userGenres.forEach(gid => {
    const genre = genres.find(g => g.id === gid);
    if (genre) {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = genre.name;
      chip.dataset.genre = gid;
      chipsRow.appendChild(chip);
    }
  });

  let activeGenre = null;
  chipsRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chipsRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeGenre = chip.dataset.genre || null;
    loadContent();
  });

  const sectionsContainer = page.querySelector('#home-sections');

  async function loadContent() {
    sectionsContainer.innerHTML = `
      <div class="home-loading">
        <div class="loading-spinner"></div>
        <p class="text-subtitle">Loading...</p>
      </div>
    `;

    try {
      if (activeGenre) {
        const query = genreQueries[activeGenre] || activeGenre;
        const songs = await searchSongs(query);
        sectionsContainer.innerHTML = '';
        if (songs.length > 0) {
          const genreName = genres.find(g => g.id === activeGenre)?.name || activeGenre;
          sectionsContainer.appendChild(createSection(`${genreName} Hits`, songs, query));
        } else {
          sectionsContainer.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded">music_off</span><p>No tracks found</p></div>`;
        }
      } else {
        // ===== "For You" — Personalized home built from user interests =====
        sectionsContainer.innerHTML = '';

        // 1. Recently played (from cache — instant)
        if (state.recentlyPlayed.length > 0) {
          const recentTracks = state.recentlyPlayed
            .map(id => player.getCachedTrack(id))
            .filter(Boolean)
            .slice(0, 10);
          if (recentTracks.length > 0) {
            sectionsContainer.appendChild(createSection('Recently played', recentTracks));
          }
        }

        // 2. Downloads section (if any)
        const downloads = await downloadManager.getAllDownloads();
        if (downloads.length > 0) {
          sectionsContainer.appendChild(createSection('Downloaded · Offline', downloads.slice(0, 20)));
        }

        // 3. Build personalized sections from user interests
        const sections = [];

        // Interest-to-queries mapping (2 queries per interest for variety)
        const interestQueries = {
          pop: [
            { title: 'Pop Hits 🎵', query: 'latest pop songs new 2025' },
            { title: 'International Pop', query: 'top english pop songs trending' },
          ],
          hiphop: [
            { title: 'Hip Hop Fire 🔥', query: 'hindi rap songs trending 2025' },
            { title: 'Underground Beats', query: 'indian hip hop rapper tracks' },
          ],
          rock: [
            { title: 'Rock Anthems 🎸', query: 'rock songs hindi best' },
            { title: 'Alt Rock Picks', query: 'alternative rock band songs' },
          ],
          lofi: [
            { title: 'Lo-Fi Chill 🌙', query: 'lofi hindi chill beats study' },
            { title: 'Late Night Vibes', query: 'slowed reverb songs hindi aesthetic' },
          ],
          electronic: [
            { title: 'EDM Drops ⚡', query: 'edm electronic dance songs' },
            { title: 'Bass & Beats', query: 'electronic bass music remix' },
          ],
          rnb: [
            { title: 'R&B Smooth 🎤', query: 'rnb soul music smooth' },
            { title: 'Soulful Vibes', query: 'soul music relaxing' },
          ],
          jazz: [
            { title: 'Jazz Sessions 🎷', query: 'jazz songs instrumental smooth' },
            { title: 'Jazz Classics', query: 'jazz classic legends vocals' },
          ],
          classical: [
            { title: 'Classical Ragas 🎻', query: 'indian classical music raga' },
            { title: 'Timeless Melodies', query: 'classical instrumental piano soothing' },
          ],
          indie: [
            { title: 'Indie Picks 🌿', query: 'indie music hindi artist' },
            { title: 'Fresh Indie', query: 'independent artist songs new' },
          ],
          kpop: [
            { title: 'K-Pop Faves 💜', query: 'kpop trending songs BTS' },
            { title: 'K-Pop New Releases', query: 'kpop latest songs 2025' },
          ],
          bollywood: [
            { title: 'Bollywood Hits 🎬', query: 'bollywood songs latest trending 2025' },
            { title: 'Filmi Favorites', query: 'best bollywood movie songs romantic' },
          ],
          ambient: [
            { title: 'Ambient Escape 🧘', query: 'ambient meditation music calm' },
            { title: 'Nature & Peace', query: 'relaxing music nature sounds sleep' },
          ],
        };

        // Add sections from user's selected interests
        const userInterests = state.interests.length > 0 ? state.interests : ['bollywood', 'pop', 'lofi'];
        userInterests.forEach(interest => {
          const queries = interestQueries[interest] || [];
          queries.forEach(q => sections.push(q));
        });

        // Add "Because you listened to X" from recent history (top 2 artists)
        const seenArtists = new Set();
        if (state.recentlyPlayed.length > 0) {
          for (const trackId of state.recentlyPlayed.slice(0, 10)) {
            const recentTrack = player.getCachedTrack(trackId);
            if (recentTrack?.artist) {
              const artistName = recentTrack.artist.split(',')[0].trim();
              if (!seenArtists.has(artistName.toLowerCase()) && seenArtists.size < 2) {
                seenArtists.add(artistName.toLowerCase());
                sections.splice(2 + seenArtists.size, 0, {
                  title: `Because you listened to ${artistName}`,
                  query: `${artistName} best songs more`
                });
              }
            }
          }
        }

        // Limit total sections for performance
        const limitedSections = sections.slice(0, 8);

        // Load in parallel
        const results = await Promise.allSettled(
          limitedSections.map(s => searchSongs(s.query).then(songs => ({ ...s, songs })))
        );

        // Remove loading spinner if still there
        const loader = sectionsContainer.querySelector('.home-loading');
        if (loader) loader.remove();

        // Staggered rendering to prevent lag
        let index = 0;
        async function renderNext() {
          if (index >= results.length) return;
          if (sectionsContainer.parentElement !== page) return; // Stop if navigated away

          const result = results[index];
          if (result.status === 'fulfilled' && result.value.songs.length > 0) {
            sectionsContainer.appendChild(createSection(result.value.title, result.value.songs, result.value.query));
          }

          index++;
          // Small delay between sections to keep UI responsive
          setTimeout(renderNext, 30);
        }

        renderNext().then(() => {
          // Artist section at the bottom
          if (sectionsContainer.parentElement === page) {
            sectionsContainer.appendChild(createArtistSection());
          }
        });

        if (results.length === 0) {
          sectionsContainer.innerHTML = `
            <div class="empty-state">
              <span class="material-symbols-rounded">wifi_off</span>
              <p>Couldn't load music</p>
              <p class="text-subtitle" style="margin-top: var(--space-sm);">Check your internet and try again</p>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error('Failed to load home content:', e);
      sectionsContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">error</span>
          <p>Something went wrong</p>
        </div>
      `;
    }
  }

  function createSection(title, sectionTracks, query = null) {
    const section = document.createElement('div');
    section.className = 'section';
    let currentPage = 1;
    section.innerHTML = `
      <div class="section-header">
        <h2 class="text-section-title">${title}</h2>
        <span class="text-subtitle">${sectionTracks.length} songs</span>
      </div>
    `;

    const scroll = document.createElement('div');
    scroll.className = 'horizontal-scroll';

    // Show first 10
    sectionTracks.slice(0, 10).forEach(track => {
      scroll.appendChild(createTrackCard(track, sectionTracks));
    });

    // Add "Load More" card if we started with at least 10 items and have a query
    if (sectionTracks.length >= 10 && query) {
      const viewMore = document.createElement('div');
      viewMore.className = 'view-more-card';
      let isLoadingMore = false;
      viewMore.innerHTML = `
        <div class="view-more-inner">
          <span class="material-symbols-rounded">arrow_forward</span>
          <span>Load More</span>
        </div>
      `;
      viewMore.addEventListener('click', async () => {
        if (isLoadingMore) return;
        isLoadingMore = true;

        viewMore.innerHTML = `<div class="loading-spinner" style="width:24px;height:24px;border-width:2px;"></div>`;
        currentPage++;

        try {
          const moreSongs = await searchSongs(query, currentPage, 10);
          if (moreSongs && moreSongs.length > 0) {
            moreSongs.forEach(track => {
              sectionTracks.push(track);
              // Insert before the viewMore card
              scroll.insertBefore(createTrackCard(track, sectionTracks), viewMore);
            });
            section.querySelector('.text-subtitle').textContent = `${sectionTracks.length} songs`;
            viewMore.innerHTML = `
              <div class="view-more-inner">
                <span class="material-symbols-rounded">arrow_forward</span>
                <span>Load More</span>
              </div>
            `;
          } else {
            viewMore.remove(); // No more songs
          }
        } catch (e) {
          viewMore.innerHTML = `<div class="view-more-inner"><span>Error</span></div>`;
        }
        isLoadingMore = false;
      });
      scroll.appendChild(viewMore);
    }

    section.appendChild(scroll);
    return section;
  }

  // ===== ARTIST SECTION =====
  function createArtistSection() {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-header">
        <h2 class="text-section-title">Popular Artists</h2>
      </div>
    `;

    const scroll = document.createElement('div');
    scroll.className = 'horizontal-scroll artist-scroll';

    artists.forEach(artist => {
      const card = document.createElement('div');
      card.className = 'artist-card';
      const initials = artist.name.split(' ').map(w => w[0]).join('').slice(0, 2);
      card.innerHTML = `
        <div class="artist-avatar" style="background: ${artist.gradient};">
          ${artist.image ? `<img class="artist-img" src="${artist.image}" alt="${artist.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="artist-initials" style="display:none;">${initials}</span>` : `<span class="artist-initials">${initials}</span>`}
        </div>
        <div class="artist-name">${artist.name}</div>
      `;
      card.addEventListener('click', async () => {
        // Load artist songs in a dedicated section
        sectionsContainer.innerHTML = `
          <div class="home-loading">
            <div class="loading-spinner"></div>
            <p class="text-subtitle">Loading ${artist.name} songs...</p>
          </div>
        `;
        const songs = await searchSongs(artist.query);
        sectionsContainer.innerHTML = '';

        // Back button
        const backRow = document.createElement('div');
        backRow.style.cssText = 'display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-xl);';
        backRow.innerHTML = `
          <button class="btn-icon" id="artist-back"><span class="material-symbols-rounded">arrow_back</span></button>
          <div class="artist-avatar" style="background:${artist.gradient};width:48px;height:48px;"><span class="material-symbols-rounded" style="font-size:24px;">person</span></div>
          <div>
            <h2 class="text-section-title">${artist.name}</h2>
            <span class="text-subtitle">${songs.length} songs</span>
          </div>
          ${songs.length > 0 ? `<button class="btn-play" id="artist-play-all" style="margin-left:auto;width:44px;height:44px;"><span class="material-symbols-rounded" style="font-size:22px;">play_arrow</span></button>` : ''}
        `;
        backRow.querySelector('#artist-back').addEventListener('click', () => {
          activeGenre = null;
          loadContent();
        });
        sectionsContainer.appendChild(backRow);

        if (songs.length > 0) {
          backRow.querySelector('#artist-play-all')?.addEventListener('click', () => {
            player.playAll(songs, songs[0]);
          });
          sectionsContainer.appendChild(createSection(`${artist.name} Songs`, songs, artist.query));
        } else {
          sectionsContainer.innerHTML += `<div class="empty-state"><span class="material-symbols-rounded">music_off</span><p>No songs found</p></div>`;
        }
      });
      scroll.appendChild(card);
    });

    section.appendChild(scroll);
    return section;
  }

  // Initial load
  loadContent();

  return page;
}

// CSS
const style = document.createElement('style');
style.textContent = `
  .home-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  .home-logo {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 0 8px var(--accent-glow));
    cursor: pointer;
    transition: transform var(--transition-fast);
  }
  .home-logo:active {
    transform: scale(0.9);
  }

  .home-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-3xl);
    gap: var(--space-lg);
  }

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--bg-active);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* View More card at end of row */
  .view-more-card {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 100px;
    height: 130px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }

  .view-more-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    color: var(--text-secondary);
    font-size: var(--font-sm);
    font-weight: 500;
    text-align: center;
    transition: color var(--transition-fast), transform var(--transition-fast);
  }

  .view-more-inner .material-symbols-rounded {
    font-size: 32px;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: var(--surface-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--surface-border);
    transition: background var(--transition-fast), transform var(--transition-fast);
  }

  .view-more-card:hover .view-more-inner {
    color: var(--accent);
  }

  .view-more-card:hover .material-symbols-rounded {
    background: var(--accent-dim);
    transform: scale(1.05);
  }

  .view-more-card:active .view-more-inner {
    transform: scale(0.95);
  }

  .view-more-inner small {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
  }

  /* Artist cards */
  .artist-scroll {
    gap: var(--space-xl);
  }

  .artist-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    transition: transform var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
    width: 90px;
  }

  .artist-card:active {
    transform: scale(0.95);
  }

  .artist-avatar {
    width: 72px;
    height: 72px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
    overflow: hidden;
  }

  .artist-card:hover .artist-avatar {
    transform: scale(1.05);
    box-shadow: var(--shadow-lg);
  }

  .artist-avatar .material-symbols-rounded {
    font-size: 32px;
    opacity: 0.9;
  }

  .artist-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-full);
  }

  .artist-initials {
    font-size: 24px;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .artist-name {
    font-size: var(--font-xs);
    font-weight: 500;
    color: var(--text-primary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Tablet: bigger artist cards */
  @media (min-width: 768px) {
    .artist-card {
      width: 110px;
    }
    .artist-avatar {
      width: 88px;
      height: 88px;
    }
    .artist-name {
      font-size: var(--font-sm);
    }
    .artist-initials {
      font-size: 30px;
    }
  }

  @media (min-width: 1024px) {
    .artist-card {
      width: 130px;
    }
    .artist-avatar {
      width: 100px;
      height: 100px;
    }
    .artist-avatar .material-symbols-rounded {
      font-size: 40px;
    }
    .artist-initials {
      font-size: 36px;
    }
  }
`;
document.head.appendChild(style);
