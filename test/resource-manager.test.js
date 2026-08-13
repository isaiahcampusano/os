import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../src/state.js';
import { decayResources } from '../src/resource-manager.js';

test('budget decays by exactly 0.02 per tick and never goes below zero', () => {
  const initial = createInitialState(1);
  const decayed = decayResources(initial, { now: () => 2 });
  const exhausted = decayResources({ ...initial, budget: 0.01 }, { now: () => 3 });

  assert.equal(decayed.budget, 14.98);
  assert.equal(exhausted.budget, 0);
  assert.equal(initial.budget, 15);
});

test('quality meals remain discrete while hidden access decays', () => {
  let state = {
    ...createInitialState(1),
    budget: 4,
    resourceAccess: 66,
    qualityFoodAvailable: 2,
  };

  state = decayResources(state, { now: () => 2 });
  assert.equal(state.resourceAccess, 65.5);
  assert.equal(state.qualityFoodAvailable, 1);
  assert.equal(Number.isInteger(state.qualityFoodAvailable), true);

  for (let index = 0; index < 20; index += 1) {
    state = decayResources(state, { now: () => index + 3 });
    assert.equal(Number.isInteger(state.qualityFoodAvailable), true);
  }
});
