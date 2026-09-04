const MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake',
  ShiftLeft: 'boost', ShiftRight: 'boost',
  ControlLeft: 'descend', ControlRight: 'descend'
};

class Input {
  constructor() {
    this.state = { up: 0, down: 0, left: 0, right: 0, handbrake: 0, boost: 0, descend: 0 };
    this.pressHandlers = new Map();
    this.enabled = true;
    this.blockedTags = new Set(['TEXTAREA', 'SELECT']);
    this.blockedInputTypes = new Set(['text', 'number', 'search', 'email', 'password', 'tel', 'url']);

    window.addEventListener('keydown', e => this.onKey(e, 1));
    window.addEventListener('keyup', e => this.onKey(e, 0));
    window.addEventListener('blur', () => this.releaseAll());
  }

  typing() {
    const el = document.activeElement;
    if (!el) return false;
    if (this.blockedTags.has(el.tagName)) return true;
    return el.tagName === 'INPUT' && this.blockedInputTypes.has(el.type);
  }

  onKey(e, down) {
    if (this.typing()) return;
    const action = MAP[e.code];
    if (action) {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.state[action] = down;
    }
    if (down && !e.repeat) {
      const handlers = this.pressHandlers.get(e.code);
      if (handlers) {
        e.preventDefault();
        handlers.forEach(fn => fn(e));
      }
    }
  }

  onPress(code, fn) {
    if (!this.pressHandlers.has(code)) this.pressHandlers.set(code, new Set());
    this.pressHandlers.get(code).add(fn);
  }

  releaseAll() {
    for (const k of Object.keys(this.state)) this.state[k] = 0;
  }

  get throttle() { return this.state.up ? 1 : 0; }
  get brake() { return this.state.down ? 1 : 0; }
  get steer() { return (this.state.left ? 1 : 0) - (this.state.right ? 1 : 0); }
  get handbrake() { return !!this.state.handbrake; }
  get boost() { return !!this.state.boost; }
}

export const input = new Input();
