import {
  appendEvent,
  deriveConsciousCostMultiplier,
  updateMetrics,
} from './state.js';

export const INTERRUPT_TYPES = {
  hunger: {
    title: 'Hunger signal',
    code: 'IRQ / HUNGER',
    description: 'Blood glucose is trending low. Allocate resources to the next meal process.',
    consciousCost: {
      energy: -10,
      focus: -5,
      selfAwareness: 3,
      nutrition: 15,
      habitStrength: -2,
      budget: -3,
      qualityFoodAvailable: -1,
    },
    autopilotCost: {
      energy: 5,
      focus: -2,
      selfAwareness: -8,
      nutrition: 5,
      habitStrength: 5,
      budget: -1,
    },
  },
  fatigue: {
    title: 'Fatigue threshold',
    code: 'IRQ / FATIGUE',
    description: 'Cognitive throughput is degraded. Choose recovery or continue the current process.',
    consciousCost: {
      energy: 10,
      focus: 5,
      selfAwareness: 2,
      nutrition: 0,
      habitStrength: -1,
    },
    autopilotCost: {
      energy: -5,
      focus: -10,
      selfAwareness: -5,
      nutrition: 0,
      habitStrength: 3,
    },
  },
  notification: {
    title: 'Digital stimulus',
    code: 'IRQ / NOTIFY',
    description: 'An external signal is requesting attention. Decide whether to context-switch.',
    consciousCost: {
      energy: -2,
      focus: -3,
      selfAwareness: 1,
      nutrition: 0,
      habitStrength: -1,
    },
    autopilotCost: {
      energy: 0,
      focus: -8,
      selfAwareness: -4,
      nutrition: 0,
      habitStrength: 2,
    },
  },
  food_desert_crisis: {
    title: 'Access failure',
    code: 'IRQ / CRITICAL',
    description: 'Quality food is unavailable and the budget is exhausted. Autopilot is now the only executable path.',
    consciousCost: null,
    autopilotCost: {
      energy: -5,
      focus: -10,
      selfAwareness: -12,
      nutrition: -5,
      habitStrength: 10,
    },
  },
};

const RANDOM_INTERRUPT_TYPES = ['hunger', 'fatigue', 'notification'];

export function createInterrupt(type, { id, timestamp, forced = false } = {}) {
  const template = INTERRUPT_TYPES[type];
  if (!template) throw new Error(`Unknown interrupt type: ${type}`);

  const interruptTimestamp = timestamp ?? Date.now();
  return {
    id: id ?? `${type}-${interruptTimestamp}`,
    type,
    title: template.title,
    code: template.code,
    description: template.description,
    consciousCost: template.consciousCost ? { ...template.consciousCost } : null,
    autopilotCost: { ...template.autopilotCost },
    forced,
    timestamp: interruptTimestamp,
  };
}

export function selectRandomInterrupt(random = Math.random) {
  const index = Math.min(
    RANDOM_INTERRUPT_TYPES.length - 1,
    Math.floor(random() * RANDOM_INTERRUPT_TYPES.length),
  );
  return RANDOM_INTERRUPT_TYPES[index];
}

export function enqueueInterrupt(state, interrupt) {
  const duplicate =
    state.activePopup?.id === interrupt.id ||
    state.pendingInterrupts.some((item) => item.id === interrupt.id);
  if (duplicate) return state;

  return {
    ...state,
    pendingInterrupts: [...state.pendingInterrupts, interrupt],
  };
}

export function processQueue(state) {
  if (state.activePopup || state.pendingInterrupts.length === 0) return state;

  const [nextInterrupt, ...remainingInterrupts] = state.pendingInterrupts;
  return {
    ...state,
    activePopup: nextInterrupt,
    pendingInterrupts: remainingInterrupts,
  };
}

export function ensureResourceCrisis(state, { now = Date.now } = {}) {
  const crisisCondition = state.budget <= 2 && state.qualityFoodAvailable <= 0;

  if (!crisisCondition) {
    return state.resourceCrisisLatched ? { ...state, resourceCrisisLatched: false } : state;
  }

  const crisisAlreadyExists =
    state.resourceCrisisLatched ||
    state.activePopup?.type === 'food_desert_crisis' ||
    state.pendingInterrupts.some((item) => item.type === 'food_desert_crisis');

  if (crisisAlreadyExists) return state;

  const timestamp = now();
  const crisis = createInterrupt('food_desert_crisis', {
    id: `crisis-${timestamp}`,
    timestamp,
    forced: true,
  });

  return {
    ...enqueueInterrupt(state, crisis),
    resourceCrisisLatched: true,
  };
}

export function canChooseConscious(state, interrupt = state.activePopup) {
  if (!interrupt?.consciousCost || interrupt.forced) return false;
  if (interrupt.type !== 'hunger') return true;
  return state.budget >= 3 && state.qualityFoodAvailable >= 1;
}

function applyConsciousMultiplier(costs, multiplier) {
  return Object.fromEntries(
    Object.entries(costs).map(([key, value]) => {
      const isEffortCost = (key === 'energy' || key === 'focus') && value < 0;
      return [key, isEffortCost ? value * multiplier : value];
    }),
  );
}

function applyCosts(state, costs) {
  let nextState = updateMetrics(state, costs);

  if (Object.hasOwn(costs, 'budget')) {
    nextState = { ...nextState, budget: Math.max(0, state.budget + costs.budget) };
  }

  if (Object.hasOwn(costs, 'qualityFoodAvailable')) {
    nextState = {
      ...nextState,
      qualityFoodAvailable: Math.max(
        0,
        Math.trunc(state.qualityFoodAvailable + costs.qualityFoodAvailable),
      ),
    };
  }

  return nextState;
}

export function resolveActiveChoice(state, choice, { now = Date.now } = {}) {
  const interrupt = state.activePopup;
  if (!interrupt || !['conscious', 'autopilot'].includes(choice)) return state;

  if (choice === 'conscious' && !canChooseConscious(state, interrupt)) return state;

  const baseCosts =
    choice === 'conscious' ? interrupt.consciousCost : interrupt.autopilotCost;
  const costs =
    choice === 'conscious'
      ? applyConsciousMultiplier(baseCosts, state.consciousCostMultiplier)
      : baseCosts;

  let nextState = applyCosts(state, costs);
  nextState = {
    ...nextState,
    activePopup: null,
    consciousCostMultiplier: deriveConsciousCostMultiplier(nextState.habitStrength),
  };

  const resultSummary = Object.entries(costs)
    .filter(([key, value]) => ['energy', 'focus', 'selfAwareness', 'habitStrength'].includes(key) && value !== 0)
    .slice(0, 2)
    .map(([key, value]) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
    .join(', ');
  const reflection = choice === 'conscious'
    ? `Conscious override sustained. ${resultSummary}. The decision leaves a measurable trace.`
    : interrupt.forced
      ? `Autopilot forced by environmental constraint. ${resultSummary}. No alternate path remained.`
      : `Autopilot engaged. ${resultSummary}. The familiar pathway strengthens.`;

  return appendEvent(nextState, {
    id: `choice-${interrupt.id}-${choice}`,
    time: now(),
    message: `${reflection} [${interrupt.type.replaceAll('_', ' ')}]`,
    type: choice === 'conscious' ? 'info' : interrupt.forced ? 'critical' : 'warning',
  });
}
