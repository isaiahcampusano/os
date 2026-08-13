export const METRIC_KEYS = [
  'energy',
  'focus',
  'selfAwareness',
  'nutrition',
  'habitStrength',
  'systemLoad',
];

export const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

export function createInitialState(now = Date.now()) {
  return {
    energy: 80,
    focus: 75,
    selfAwareness: 50,
    nutrition: 70,
    habitStrength: 30,
    budget: 15,
    qualityFoodAvailable: 2,
    resourceAccess: 100,
    systemLoad: 0,
    consciousCostMultiplier: 1,
    pendingInterrupts: [],
    activePopup: null,
    resourceCrisisLatched: false,
    eventLog: [
      {
        id: `boot-${now}`,
        time: now,
        message: 'Cognitive runtime initialized.',
        type: 'info',
      },
    ],
    tickCount: 0,
    isRunning: false,
  };
}

export function updateMetrics(state, delta) {
  const updates = {};

  for (const key of METRIC_KEYS) {
    if (Object.hasOwn(delta, key)) {
      updates[key] = clamp(state[key] + delta[key]);
    }
  }

  return { ...state, ...updates };
}

export function appendEvent(state, event) {
  const normalizedEvent = {
    id: event.id ?? `${event.time}-${state.eventLog.length}`,
    time: event.time,
    message: event.message,
    type: event.type ?? 'info',
  };

  return {
    ...state,
    eventLog: [normalizedEvent, ...state.eventLog].slice(0, 50),
  };
}

export function deriveConsciousCostMultiplier(habitStrength) {
  return Number((1 + Math.max(0, habitStrength - 30) / 100).toFixed(2));
}

export function createStateStore(initialState = createInitialState()) {
  let currentState = initialState;

  return {
    getState() {
      return currentState;
    },
    setState(nextStateOrUpdater) {
      currentState =
        typeof nextStateOrUpdater === 'function'
          ? nextStateOrUpdater(currentState)
          : nextStateOrUpdater;
      return currentState;
    },
    reset(now = Date.now()) {
      currentState = createInitialState(now);
      return currentState;
    },
  };
}
