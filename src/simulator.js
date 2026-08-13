import { appendEvent, clamp, updateMetrics } from './state.js';
import {
  createInterrupt,
  enqueueInterrupt,
  ensureResourceCrisis,
  processQueue,
  resolveActiveChoice,
  selectRandomInterrupt,
} from './interrupt-system.js';
import { decayResources } from './resource-manager.js';

export const TICK_INTERVAL_MS = 1000;

export function calculateSystemLoad(state) {
  const physiologicalLoad =
    (100 - state.energy) * 0.28 +
    (100 - state.focus) * 0.28 +
    (100 - state.nutrition) * 0.14;
  const cognitiveLoad = state.habitStrength * 0.08;
  const interruptLoad = state.pendingInterrupts.length * 8 + (state.activePopup ? 8 : 0);
  return clamp(physiologicalLoad + cognitiveLoad + interruptLoad);
}

export function calculateNaturalDecay(state) {
  return {
    energy: -0.4 - (state.systemLoad / 200) * 0.3,
    focus:
      -0.2 - state.pendingInterrupts.length * 0.1 - (state.systemLoad / 100) * 0.08,
    nutrition: -0.1,
  };
}

export function calculateInterruptChance(systemLoad) {
  return 0.02 + (clamp(systemLoad) / 100) * 0.05;
}

export function runSimulationTick(
  state,
  { random = Math.random, now = Date.now } = {},
) {
  const load = calculateSystemLoad(state);
  let nextState = { ...state, tickCount: state.tickCount + 1, systemLoad: load };
  nextState = updateMetrics(nextState, calculateNaturalDecay(nextState));
  nextState = decayResources(nextState, { now });
  nextState = ensureResourceCrisis(nextState, { now });

  if (!nextState.activePopup && nextState.pendingInterrupts.length === 0) {
    const roll = random();
    if (roll < calculateInterruptChance(nextState.systemLoad)) {
      const timestamp = now();
      const type = selectRandomInterrupt(random);
      nextState = enqueueInterrupt(
        nextState,
        createInterrupt(type, {
          id: `${type}-${timestamp}-${nextState.tickCount}`,
          timestamp,
        }),
      );
    }
  }

  return processQueue(nextState);
}

export function createSimulator({
  store,
  render,
  random = Math.random,
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  intervalMs = TICK_INTERVAL_MS,
}) {
  let intervalId = null;

  function commit(updater) {
    const nextState = store.setState(updater);
    render(nextState);
    return nextState;
  }

  function tick() {
    return commit((state) => runSimulationTick(state, { random, now }));
  }

  function start() {
    if (intervalId !== null) return store.getState();
    commit((state) => ({ ...state, isRunning: true }));
    intervalId = setIntervalFn(tick, intervalMs);
    return store.getState();
  }

  function stop({ log = true } = {}) {
    if (intervalId === null) return store.getState();
    clearIntervalFn(intervalId);
    intervalId = null;
    return commit((state) => {
      const stoppedState = { ...state, isRunning: false };
      return log
        ? appendEvent(stoppedState, {
            time: now(),
            message: 'Scheduler paused by user.',
            type: 'warning',
          })
        : stoppedState;
    });
  }

  function toggle() {
    if (intervalId === null) {
      const startedState = start();
      return commit(
        appendEvent(startedState, {
          time: now(),
          message: 'Scheduler resumed.',
          type: 'info',
        }),
      );
    }
    return stop();
  }

  function reset() {
    const wasRunning = intervalId !== null;
    if (wasRunning) {
      clearIntervalFn(intervalId);
      intervalId = null;
    }
    const resetState = store.reset(now());
    render(resetState);
    if (wasRunning) start();
    return store.getState();
  }

  function resolve(choice) {
    return commit((state) => {
      const resolved = resolveActiveChoice(state, choice, { now });
      return processQueue(resolved);
    });
  }

  return { start, stop, toggle, tick, reset, resolve, getState: store.getState };
}
