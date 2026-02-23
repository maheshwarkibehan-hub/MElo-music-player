const CURRENT_VERSION = '1.0.10';
const VERSION_URL = 'https://api.github.com/repos/maheshwarkibehan-hub/MElo-music-player/contents/version.json';

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

export function renderSettings() {
  const page = document.createElement('div');
  page.className = 'page settings-page';

  page.innerHTML = `
    <div class="settings-header">
      <h1 class="settings-title">Settings</h1>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">App Info</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="material-symbols-rounded" style="color: var(--accent);">info</span>
          <div class="settings-row-text">
            <span class="settings-label">Current Version</span>
            <span class="settings-value" id="settings-version">${CURRENT_VERSION}</span>
          </div>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row">
          <span class="material-symbols-rounded" style="color: var(--accent);">cloud_done</span>
          <div class="settings-row-text">
            <span class="settings-label">Update Status</span>
            <span class="settings-value" id="settings-status">Checking...</span>
          </div>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row">
          <span class="material-symbols-rounded" style="color: var(--accent);">new_releases</span>
          <div class="settings-row-text">
            <span class="settings-label">Latest Version</span>
            <span class="settings-value" id="settings-latest">--</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Updates</div>
      <div class="settings-card">
        <button class="settings-btn" id="settings-check-update">
          <span class="material-symbols-rounded">system_update</span>
          <span>Check for Updates</span>
        </button>
        <div id="settings-update-area"></div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">About</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="material-symbols-rounded" style="color: var(--text-secondary);">code</span>
          <div class="settings-row-text">
            <span class="settings-label">Developer</span>
            <span class="settings-value">Maheshwar</span>
          </div>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row">
          <span class="material-symbols-rounded" style="color: var(--text-secondary);">music_note</span>
          <div class="settings-row-text">
            <span class="settings-label">App Name</span>
            <span class="settings-value">Melo Music Player</span>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => checkForUpdate(page), 500);
  page.querySelector('#settings-check-update').addEventListener('click', () => checkForUpdate(page));

  return page;
}

async function checkForUpdate(page) {
  const statusEl = page.querySelector('#settings-status');
  const latestEl = page.querySelector('#settings-latest');
  const updateArea = page.querySelector('#settings-update-area');
  const checkBtn = page.querySelector('#settings-check-update');

  checkBtn.disabled = true;
  checkBtn.querySelector('span:last-child').textContent = 'Checking...';
  statusEl.textContent = 'Checking...';
  statusEl.style.color = 'var(--text-secondary)';

  try {
    const resp = await fetch(VERSION_URL + '?t=' + Date.now(), {
      headers: { 'Accept': 'application/vnd.github.v3.raw' },
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Failed: ' + resp.status);
    const data = await resp.json();

    latestEl.textContent = data.version || '--';

    if (!isNewer(data.version, CURRENT_VERSION)) {
      statusEl.textContent = 'Up to date';
      statusEl.style.color = '#4caf50';
      updateArea.innerHTML = '';
    } else {
      statusEl.textContent = 'Update available!';
      statusEl.style.color = '#ff9800';
      updateArea.innerHTML = `
        <div class="settings-divider"></div>
        <p class="settings-hint" style="color:#ff9800;font-weight:600;">v${data.version} is available!</p>
      `;
    }
  } catch (e) {
    statusEl.textContent = 'Check failed';
    statusEl.style.color = '#e53935';
    latestEl.textContent = '--';
  }

  checkBtn.disabled = false;
  checkBtn.querySelector('span:last-child').textContent = 'Check for Updates';
}

// Settings page CSS
const settingsStyle = document.createElement('style');
settingsStyle.textContent = `
  .settings-page { padding: 20px 16px 120px; }
  .settings-header { padding: 20px 0 10px; }
  .settings-title { font-size: 28px; font-weight: 700; color: var(--text-primary); }
  .settings-section { margin-bottom: 24px; }
  .settings-section-title { font-size: 13px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-left: 4px; }
  .settings-card { background: var(--surface); border-radius: 16px; padding: 4px 0; border: 1px solid var(--surface-border); }
  .settings-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; }
  .settings-row .material-symbols-rounded { font-size: 22px; flex-shrink: 0; }
  .settings-row-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .settings-label { font-size: 15px; font-weight: 500; color: var(--text-primary); }
  .settings-value { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
  .settings-divider { height: 1px; background: var(--surface-border); margin: 0 18px; }
  .settings-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: calc(100% - 24px); margin: 10px 12px; padding: 14px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--text-primary); font-weight: 600; font-size: 15px; cursor: pointer; font-family: var(--font-family); transition: all 0.2s ease; }
  .settings-btn:active { transform: scale(0.97); }
  .settings-btn:disabled { opacity: 0.5; pointer-events: none; }
  .settings-hint { text-align: center; font-size: 13px; color: var(--text-secondary); margin: 8px 0 12px; padding: 0; }
`;
document.head.appendChild(settingsStyle);
