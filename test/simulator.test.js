import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, createStateStore } from '../src/state.js';
import {
  calculateInterruptChance,
  calculateNaturalDecay,
  createSimulator,
  runSimulationTick,
} from '../src/simulator.js';

test('high system load increases energy loss and interrupt probability', () => {
  const initial = createInitialState(1);
  const lowLoadDecay = calculateNaturalDecay({ ...initial, systemLoad: 0 });
  const highLoadDecay = calculateNaturalDecay({ ...initial, systemLoad: 100 });

  assert.equal(lowLoadDecay.energy, -0.4);
  assert.equal(highLoadDecay.energy, -0.55);
  assert.ok(highLoadDecay.energy < lowLoadDecay.energy);
  assert.ok(calculateInterruptChance(100) > calculateInterruptChance(0));
});

test('simulation tick uses injected random values to spawn a deterministic interrupt', () => {
  const values = [0, 0];
  const state = runSimulationTick(createInitialState(1), {
    random: () => values.shift(),
    now: () => 100,
  });

  assert.equal(state.tickCount, 1);
  assert.equal(state.activePopup.type, 'hunger');
  assert.equal(state.pendingInterrupts.length, 0);
});

test('an active popup locks out additional random interrupts', () => {
  const state = {
    ...createInitialState(1),
    activePopup: { id: 'existing', type: 'notification' },
  };
  let randomCalls = 0;
  const nextState = runSimulationTick(state, {
    random: () => {
      randomCalls += 1;
      return 0;
    },
    now: () => 100,
  });

  assert.equal(randomCalls, 0);
  assert.equal(nextState.activePopup.id, 'existing');
});

test('simulator prevents duplicate timers and supports reset', () => {
  const store = createStateStore(createInitialState(1));
  let intervalStarts = 0;
  let intervalClears = 0;
  const simulator = createSimulator({
    store,
    render: () => {},
    random: () => 1,
    now: () => 10,
    setIntervalFn: () => {
      intervalStarts += 1;
      return 42;
    },
    clearIntervalFn: () => {
      intervalClears += 1;
    },
  });

  simulator.start();
  simulator.start();
  simulator.tick();
  assert.equal(intervalStarts, 1);
  assert.equal(simulator.getState().tickCount, 1);

  simulator.reset();
  assert.equal(intervalClears, 1);
  assert.equal(intervalStarts, 2);
  assert.equal(simulator.getState().tickCount, 0);
  assert.equal(simulator.getState().isRunning, true);
});
