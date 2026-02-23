import { router } from '../router.js';

export function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <button class="nav-item active" data-route="home" id="nav-home">
      <span class="material-symbols-rounded">home</span>
      <span class="nav-label">Home</span>
    </button>
    <button class="nav-item" data-route="search" id="nav-search">
      <span class="material-symbols-rounded">search</span>
      <span class="nav-label">Search</span>
    </button>
    <button class="nav-item" data-route="library" id="nav-library">
      <span class="material-symbols-rounded">library_music</span>
      <span class="nav-label">Library</span>
    </button>
    <button class="nav-item" data-route="settings" id="nav-settings">
      <span class="material-symbols-rounded">settings</span>
      <span class="nav-label">Settings</span>
    </button>
  `;

  const buttons = nav.querySelectorAll('.nav-item');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(btn.dataset.route);
    });
  });

  // Update active state on route change
  window.addEventListener('routechange', (e) => {
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === e.detail.route);
    });
  });

  return nav;
}

// Navbar CSS (injected once)
const style = document.createElement('style');
style.textContent = `
  .navbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: var(--nav-height);
    background: linear-gradient(to top, var(--bg-primary) 60%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding-bottom: var(--safe-bottom);
    border-top: 1px solid var(--surface-border);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-sm) var(--space-xl);
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: color var(--transition-fast), transform var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
    font-family: var(--font-family);
    border-radius: var(--radius-lg);
  }

  .nav-item:active {
    transform: scale(0.9);
  }

  .nav-item .material-symbols-rounded {
    font-size: 26px;
    transition: font-variation-settings var(--transition-fast);
  }

  .nav-item.active {
    color: var(--text-primary);
  }

  .nav-item.active .material-symbols-rounded {
    font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
  }

  .nav-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
`;
document.head.appendChild(style);
