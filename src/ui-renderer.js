import { canChooseConscious } from './interrupt-system.js';

const METRIC_LABELS = {
  energy: { low: 'DEPLETED', mid: 'DRAINING', high: 'STABLE', inverse: false },
  focus: { low: 'FRAGMENTED', mid: 'VARIABLE', high: 'STABLE', inverse: false },
  selfAwareness: { low: 'DIMMED', mid: 'NOMINAL', high: 'LUCID', inverse: false },
  nutrition: { low: 'CRITICAL', mid: 'LIMITED', high: 'STABLE', inverse: false },
  habitStrength: { low: 'FLEXIBLE', mid: 'FORMING', high: 'ENTRENCHED', inverse: true },
  systemLoad: { low: 'IDLE', mid: 'ELEVATED', high: 'SATURATED', inverse: true },
};

const METRIC_NAMES = {
  energy: 'Energy',
  focus: 'Focus',
  selfAwareness: 'Self-awareness',
  nutrition: 'Nutrition',
  habitStrength: 'Habit strength',
  systemLoad: 'System load',
  budget: 'Budget',
  qualityFoodAvailable: 'Quality meals',
};

function formatValue(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function describeMetric(key, value) {
  const config = METRIC_LABELS[key];
  if (value < 25) return config.low;
  if (value < 70) return config.mid;
  return config.high;
}

function formatCost(costs, multiplier = 1) {
  if (!costs) return 'Unavailable';

  const prioritizedKeys = [
    'energy',
    'focus',
    'selfAwareness',
    'nutrition',
    'habitStrength',
    'budget',
    'qualityFoodAvailable',
  ];

  return prioritizedKeys
    .filter((key) => Object.hasOwn(costs, key) && costs[key] !== 0)
    .slice(0, 3)
    .map((key) => {
      const isEffort = (key === 'energy' || key === 'focus') && costs[key] < 0;
      const value = isEffort ? costs[key] * multiplier : costs[key];
      const sign = value > 0 ? '+' : '';
      return `${sign}${formatValue(value)} ${METRIC_NAMES[key]}`;
    })
    .join(' · ');
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function createRenderer(documentRef = document) {
  const metricCards = [...documentRef.querySelectorAll('[data-metric]')];
  const overlay = documentRef.querySelector('#popup-overlay');
  const consciousButton = documentRef.querySelector('#btn-conscious');
  const autopilotButton = documentRef.querySelector('#btn-autopilot');
  let lastPopupId = null;

  function renderMetrics(state) {
    const previewCosts = state.activePopup?.consciousCost;
    for (const card of metricCards) {
      const key = card.dataset.metric;
      const value = state[key];
      const roundedValue = formatValue(value);
      const ring = card.querySelector('.ring-value');
      const circumference = 2 * Math.PI * 34;
      const riskConfig = METRIC_LABELS[key];
      const isCritical = riskConfig.inverse ? value >= 80 : value <= 20;

      card.querySelector('.value').textContent = roundedValue;
      card.querySelector('.metric-state').textContent = describeMetric(key, value);
      card.querySelector('.fill').style.width = `${value}%`;
      ring.style.strokeDasharray = `${circumference}`;
      ring.style.strokeDashoffset = `${circumference * (1 - value / 100)}`;
      card.classList.toggle('is-critical', isCritical);
      const previewValue = previewCosts?.[key];
      const adjustedPreview =
        (key === 'energy' || key === 'focus') && previewValue < 0
          ? previewValue * state.consciousCostMultiplier
          : previewValue;
      card.classList.toggle('has-cost-preview', adjustedPreview < 0);
      card.dataset.preview = adjustedPreview < 0 ? `${formatValue(adjustedPreview)}` : '';
      card.setAttribute('aria-label', `${METRIC_NAMES[key]}: ${roundedValue} out of 100`);
    }
  }

  function renderSystemVisual(state) {
    const visual = documentRef.querySelector('#system-visual');
    if (!visual) return;
    visual.style.setProperty('--system-load', `${state.systemLoad}`);
    visual.style.setProperty('--energy-level', `${state.energy / 100}`);
    visual.style.setProperty('--focus-level', `${state.focus / 100}`);
    visual.style.setProperty('--habit-level', `${state.habitStrength / 100}`);
    visual.classList.toggle('is-strained', state.systemLoad >= 50);
    visual.classList.toggle('is-overloaded', state.systemLoad >= 75);
    visual.classList.toggle('is-choosing', Boolean(state.activePopup));
    documentRef.querySelector('#core-load').textContent = `${Math.round(state.systemLoad)}%`;
    documentRef.querySelector('#core-energy').textContent = formatValue(state.energy);
    documentRef.querySelector('#core-focus').textContent = formatValue(state.focus);
    documentRef.querySelector('#core-habit').textContent = formatValue(state.habitStrength);
    documentRef.querySelector('#core-status').textContent =
      state.systemLoad >= 75 ? 'OVERLOAD RISK' : state.systemLoad >= 50 ? 'FLOW STRAINED' : 'FLOW NOMINAL';
  }

  function renderResources(state) {
    documentRef.querySelector('#budget-display').textContent = state.budget.toFixed(2);
    documentRef.querySelector('#quality-meals-display').textContent =
      state.qualityFoodAvailable;
    documentRef.querySelector('#budget-bar').style.width = `${(state.budget / 15) * 100}%`;

    const pips = documentRef.querySelector('#meal-pips');
    pips.innerHTML = Array.from(
      { length: 2 },
      (_, index) => `<span class="${index < state.qualityFoodAvailable ? 'is-active' : ''}"></span>`,
    ).join('');
    pips.setAttribute(
      'aria-label',
      `${state.qualityFoodAvailable} quality ${state.qualityFoodAvailable === 1 ? 'meal' : 'meals'} available`,
    );

    const resourceStatus = documentRef.querySelector('#resource-status');
    const status =
      state.budget <= 2 && state.qualityFoodAvailable === 0
        ? 'CRITICAL'
        : state.budget < 5
          ? 'SCARCE'
          : 'CONSTRAINED';
    resourceStatus.textContent = status;
    resourceStatus.dataset.status = status.toLowerCase();
  }

  function renderLog(state) {
    documentRef.querySelector('#log-list').innerHTML = state.eventLog
      .slice(0, 6)
      .map(
        (entry) => `
          <li class="log-entry log-entry--${entry.type}">
            <time datetime="${new Date(entry.time).toISOString()}">${formatTime(entry.time)}</time>
            <span class="log-marker"></span>
            <p>${entry.message}</p>
          </li>`,
      )
      .join('');
  }

  function renderRuntime(state) {
    documentRef.querySelector('#tick-counter').textContent = `TICK ${String(
      state.tickCount,
    ).padStart(6, '0')}`;
    documentRef.querySelector('#runtime-label').textContent = state.isRunning
      ? 'SYSTEM ONLINE'
      : 'SCHEDULER PAUSED';
    documentRef.querySelector('#status-indicator').classList.toggle('is-paused', !state.isRunning);
    documentRef.querySelector('#btn-pause').classList.toggle('is-paused', !state.isRunning);
    documentRef.querySelector('#btn-pause').querySelector('.control-icon').textContent =
      state.isRunning ? 'Ⅱ' : '▶';
    documentRef.querySelector('#btn-pause').querySelector('span:last-child').textContent =
      state.isRunning ? 'Pause' : 'Resume';
  }

  function renderPopup(state) {
    const popup = state.activePopup;
    overlay.hidden = !popup;
    documentRef.body.classList.toggle('has-dialog', Boolean(popup));

    if (!popup) {
      lastPopupId = null;
      return;
    }

    documentRef.querySelector('#popup-title').textContent = popup.title;
    documentRef.querySelector('#popup-description').textContent = popup.description;
    documentRef.querySelector('#interrupt-code').textContent = popup.code;
    documentRef.querySelector('#interrupt-severity').textContent = popup.forced
      ? 'CONSTRAINT LOCK'
      : 'ACTION REQUIRED';
    overlay.style.setProperty('--irq-rate', `${Math.max(0.34, 1.25 - state.systemLoad / 110)}s`);

    const consciousAllowed = canChooseConscious(state, popup);
    consciousButton.disabled = !consciousAllowed;
    consciousButton.setAttribute('aria-disabled', `${!consciousAllowed}`);

    const comparison = documentRef.querySelector('#popup-cost-display');
    comparison.innerHTML = `
      <div><span>CONSCIOUS</span><p>${formatCost(
        popup.consciousCost,
        state.consciousCostMultiplier,
      )}</p></div>
      <div><span>AUTOPILOT</span><p>${formatCost(popup.autopilotCost)}</p></div>`;

    const constraint = documentRef.querySelector('#constraint-message');
    constraint.hidden = consciousAllowed;
    constraint.textContent = popup.forced
      ? 'External constraints have removed the conscious path.'
      : 'The conscious path requires one quality meal and a budget of ¤3.00.';

    if (lastPopupId !== popup.id) {
      lastPopupId = popup.id;
      window.requestAnimationFrame(() => {
        (consciousAllowed ? consciousButton : autopilotButton).focus();
      });
    }
  }

  return function renderAll(state) {
    renderMetrics(state);
    renderSystemVisual(state);
    renderResources(state);
    renderLog(state);
    renderRuntime(state);
    renderPopup(state);
  };
}
