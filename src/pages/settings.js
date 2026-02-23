const CURRENT_VERSION = '1.1.0';

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
            <span class="settings-label">Version</span>
            <span class="settings-value">${CURRENT_VERSION}</span>
          </div>
        </div>
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

  return page;
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
`;
document.head.appendChild(settingsStyle);
