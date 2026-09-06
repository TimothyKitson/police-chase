import { Game } from './game.js';
import { preloadModels } from './models.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

async function boot() {
  try {
    await preloadModels();
    window.game = new Game(canvas);
    loading.classList.add('gone');
    setTimeout(() => loading.remove(), 500);
  } catch (err) {
    loading.innerHTML = '<span style="letter-spacing:.1em;max-width:520px;text-align:center;line-height:1.6">'
      + 'Could not start the game.<br>' + String(err && err.message ? err.message : err) + '</span>';
    console.error(err);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  requestAnimationFrame(boot);
} else {
  window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(boot));
}
