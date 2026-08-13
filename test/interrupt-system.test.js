import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../src/state.js';
import {
  canChooseConscious,
  createInterrupt,
  enqueueInterrupt,
  ensureResourceCrisis,
  processQueue,
  resolveActiveChoice,
} from '../src/interrupt-system.js';

test('queue processing moves one waiting interrupt into activePopup', () => {
  const initial = createInitialState(1);
  const hunger = createInterrupt('hunger', { id: 'hunger-1', timestamp: 2 });
  const queued = enqueueInterrupt(initial, hunger);
  const active = processQueue(queued);

  assert.equal(queued.pendingInterrupts.length, 1);
  assert.equal(active.pendingInterrupts.length, 0);
  assert.equal(active.activePopup.id, 'hunger-1');
});

test('choice resolution uses activePopup and leaves waiting interrupts untouched', () => {
  const active = createInterrupt('notification', { id: 'active', timestamp: 2 });
  const waiting = createInterrupt('fatigue', { id: 'waiting', timestamp: 3 });
  const state = {
    ...createInitialState(1),
    activePopup: active,
    pendingInterrupts: [waiting],
  };

  const resolved = resolveActiveChoice(state, 'autopilot', { now: () => 4 });
  assert.equal(resolved.activePopup, null);
  assert.equal(resolved.pendingInterrupts[0].id, 'waiting');
  assert.equal(resolved.focus, 67);
  assert.equal(resolved.eventLog[0].message.includes('notification'), true);
});

test('forced crisis is generated once and disables the conscious path', () => {
  const constrained = {
    ...createInitialState(1),
    budget: 2,
    qualityFoodAvailable: 0,
  };
  const queued = ensureResourceCrisis(constrained, { now: () => 10 });
  const secondAttempt = ensureResourceCrisis(queued, { now: () => 11 });
  const active = processQueue(secondAttempt);

  assert.equal(secondAttempt.pendingInterrupts.length, 1);
  assert.equal(secondAttempt.resourceCrisisLatched, true);
  assert.equal(active.activePopup.forced, true);
  assert.equal(canChooseConscious(active), false);
  assert.strictEqual(resolveActiveChoice(active, 'conscious'), active);
});

test('hunger choice consumes budget and one discrete meal', () => {
  const hunger = createInterrupt('hunger', { id: 'meal', timestamp: 2 });
  const state = { ...createInitialState(1), activePopup: hunger };
  const resolved = resolveActiveChoice(state, 'conscious', { now: () => 3 });

  assert.equal(resolved.budget, 12);
  assert.equal(resolved.qualityFoodAvailable, 1);
  assert.equal(Number.isInteger(resolved.qualityFoodAvailable), true);
});

test('habit strength multiplier changes conscious effort cost', () => {
  const notification = createInterrupt('notification', { id: 'effort', timestamp: 2 });
  const state = {
    ...createInitialState(1),
    energy: 80,
    habitStrength: 80,
    consciousCostMultiplier: 1.5,
    activePopup: notification,
  };
  const resolved = resolveActiveChoice(state, 'conscious', { now: () => 3 });

  assert.equal(resolved.energy, 77);
  assert.equal(resolved.focus, 70.5);
  assert.equal(resolved.consciousCostMultiplier, 1.49);
});
