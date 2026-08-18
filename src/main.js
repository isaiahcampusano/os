import './style.css';
import { createStateStore } from './state.js';
import { createSimulator } from './simulator.js';
import { createRenderer } from './ui-renderer.js';

const store = createStateStore();
const render = createRenderer();
const simulator = createSimulator({ store, render });

const consciousButton = document.querySelector('#btn-conscious');
const autopilotButton = document.querySelector('#btn-autopilot');
const overlay = document.querySelector('#popup-overlay');
let consciousChoicePending = false;

function resolveConscious() {
  if (consciousButton.disabled || consciousChoicePending) return;
  consciousChoicePending = true;
  consciousButton.classList.add('is-deliberating');
  consciousButton.setAttribute('aria-busy', 'true');

  window.setTimeout(() => {
    simulator.resolve('conscious');
    consciousButton.classList.remove('is-deliberating');
    consciousButton.removeAttribute('aria-busy');
    consciousChoicePending = false;
  }, 280);
}

document.querySelector('#btn-pause').addEventListener('click', () => simulator.toggle());
document.querySelector('#btn-reset').addEventListener('click', () => {
  document.body.classList.remove('is-rebooting');
  void document.body.offsetWidth;
  document.body.classList.add('is-rebooting');
  simulator.reset();
  window.setTimeout(() => document.body.classList.remove('is-rebooting'), 700);
});
consciousButton.addEventListener('click', resolveConscious);
autopilotButton.addEventListener('click', () => simulator.resolve('autopilot'));

overlay.addEventListener('keydown', (event) => {
  if (event.key === '1' && !consciousButton.disabled) resolveConscious();
  if (event.key === '2') simulator.resolve('autopilot');

  if (event.key === 'Tab') {
    const enabledButtons = [consciousButton, autopilotButton].filter((button) => !button.disabled);
    const first = enabledButtons[0];
    const last = enabledButtons.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

render(store.getState());
simulator.start();

window.addEventListener('beforeunload', () => simulator.stop({ log: false }));
