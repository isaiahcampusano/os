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

document.querySelector('#btn-pause').addEventListener('click', () => simulator.toggle());
document.querySelector('#btn-reset').addEventListener('click', () => simulator.reset());
consciousButton.addEventListener('click', () => simulator.resolve('conscious'));
autopilotButton.addEventListener('click', () => simulator.resolve('autopilot'));

overlay.addEventListener('keydown', (event) => {
  if (event.key === '1' && !consciousButton.disabled) simulator.resolve('conscious');
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
