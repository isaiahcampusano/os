import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  createStateStore,
  deriveConsciousCostMultiplier,
  updateMetrics,
} from '../src/state.js';

test('metric updates are immutable and clamp values to the 0-100 range', () => {
  const original = createInitialState(1);
  const updated = updateMetrics(original, { energy: 50, focus: -100, budget: -99 });

  assert.notStrictEqual(updated, original);
  assert.equal(original.energy, 80);
  assert.equal(updated.energy, 100);
  assert.equal(updated.focus, 0);
  assert.equal(updated.budget, 15);
});

test('conscious effort cost increases only after habits exceed the baseline', () => {
  assert.equal(deriveConsciousCostMultiplier(30), 1);
  assert.equal(deriveConsciousCostMultiplier(55), 1.25);
  assert.equal(deriveConsciousCostMultiplier(100), 1.7);
});

test('state store resets every field to a fresh initial state', () => {
  const store = createStateStore(createInitialState(1));
  store.setState((state) => ({ ...state, energy: 2, tickCount: 400, eventLog: [] }));

  const resetState = store.reset(99);
  assert.equal(resetState.energy, 80);
  assert.equal(resetState.tickCount, 0);
  assert.equal(resetState.eventLog.length, 1);
  assert.equal(resetState.eventLog[0].time, 99);
});
