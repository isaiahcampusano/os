import { appendEvent } from './state.js';

export const BUDGET_DECAY_PER_TICK = 0.02;
export const ACCESS_DECAY_PER_LOW_BUDGET_TICK = 0.5;
const ACCESS_THRESHOLDS = [66, 33];

export function decayResources(state, { now = Date.now } = {}) {
  const nextBudget = Math.max(0, state.budget - BUDGET_DECAY_PER_TICK);
  const shouldDecayAccess = nextBudget < 5 && state.resourceAccess > 0;
  const nextAccess = shouldDecayAccess
    ? Math.max(0, state.resourceAccess - ACCESS_DECAY_PER_LOW_BUDGET_TICK)
    : state.resourceAccess;

  const crossedThresholds = ACCESS_THRESHOLDS.filter(
    (threshold) => state.resourceAccess >= threshold && nextAccess < threshold,
  ).length;
  const nextMeals = Math.max(0, state.qualityFoodAvailable - crossedThresholds);

  let nextState = {
    ...state,
    budget: Number(nextBudget.toFixed(2)),
    resourceAccess: Number(nextAccess.toFixed(2)),
    qualityFoodAvailable: Math.trunc(nextMeals),
  };

  if (crossedThresholds > 0) {
    nextState = appendEvent(nextState, {
      time: now(),
      message: 'Environmental access declined. One quality meal became unavailable.',
      type: 'warning',
    });
  }

  return nextState;
}
