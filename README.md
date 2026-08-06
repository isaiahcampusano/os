# os
human os


Excellent. Those final answers lock in the full technical and UX profile. 

**Here is your bulletproof handoff document.** Codex (or any AI coder) can execute this file‑by‑file with zero guesswork. I've prioritized **modularity**, **real‑time reactivity**, and the **cyberpunk aesthetic** you requested, while baking in the social/economic constraint (resource decay) as a first‑class citizen.

---

# 📁 HANDOFF DOCUMENT: HUMAN OS SIMULATOR

## 1. Project Overview
**Name:** `human-os-simulator`  
**Core Concept:** A real‑time cyberpunk dashboard that maps OS concepts (interrupts, kernel/system calls, scheduling) to human cognition. The user **reacts** to interrupt popups (e.g., hunger, fatigue) by choosing between **Conscious (Kernel)** and **Autopilot (Subconscious)** decisions. Environmental **resource decay** (limited budget for quality food) dynamically affects the cost and availability of these choices, forcing the user to reflect on how external constraints erode self‑awareness.  

**UX Flow:**
- The simulation runs continuously in the background, updating 6 core metrics (Energy, Focus, Self‑Awareness, Nutrition, Habit Strength, System Load).
- Random interrupts fire at variable frequencies. Each interrupt presents a binary popup.
- User's choices feed back into the metrics, creating a cyclical system.
- When resources (e.g., quality food budget) hit zero, the system **forces an autopilot interrupt** – mirroring the reality of food deserts.

---

## 2. Stack & Dependencies
- **Build Tool:** Vite (`npm create vite@latest`)
- **Rendering:** Vanilla JS (no framework – keeps it lightweight and debuggable)
- **Styling:** CSS with CSS custom properties (cyberpunk theme)
- **State Management:** A plain JavaScript object (`appState`) with pure functions for mutations (no external state library)
- **Charts/Visuals:** No external charting libs – all metrics will be displayed as **neon progress bars** and **animated SVG rings** for instant visual feedback.

**`package.json` (minimal):**
```json
{
  "name": "human-os-simulator",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

---

## 3. Folder Structure (MUST FOLLOW)
```
human-os-simulator/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js                # Entry point – initialises everything
│   ├── state.js               # appState definition, initial values, & pure update functions
│   ├── simulator.js           # The main simulation loop (tick-based scheduler)
│   ├── interrupt-system.js    # Generates random interrupts, manages popup lifecycle
│   ├── resource-manager.js    # Handles dynamic resource decay (budget, nutrition costs)
│   ├── ui-renderer.js         # Renders metrics, logs, and popups into the DOM
│   └── style.css              # All cyberpunk styles (global)
└── public/
    └── favicon.ico (optional)
```

---

## 4. Core State Management (`src/state.js`)

### 4.1 Initial State
```javascript
export const appState = {
  // ---- Metrics (all range 0–100) ----
  energy: 80,           // Depletes over time, restored by eating/sleep
  focus: 75,            // Drops under high system load
  selfAwareness: 50,    // Increases with Conscious choices, decreases with Autopilot
  nutrition: 70,        // Drops with junk food, rises with quality meals
  habitStrength: 30,    // Grows when Autopilot is chosen; makes Conscious choices harder

  // ---- Resource System ----
  budget: 15,           // Represents "money" or "access" (starts low to simulate scarcity)
  qualityFoodAvailable: 2,  // Number of "conscious-quality" meals left before forcing autopilot

  // ---- System Status ----
  systemLoad: 0,        // 0–100; high load means more frequent interrupts & sluggish response
  consciousCostMultiplier: 1.0, // Starts at 1x; increases as habitStrength grows

  // ---- Interrupt Queues ----
  pendingInterrupts: [],      // Queue of interrupt objects waiting to be displayed
  activePopup: null,          // { id, type, description, consciousCost, autopilotCost }

  // ---- Log / History ----
  eventLog: [],               // Array of { time, message, type: 'info'|'warning'|'critical' }
  tickCount: 0,
};
```

### 4.2 Pure Mutator Functions (Exported)
All mutators return a **new state object** (immutable pattern) to keep debugging simple.

| Function | Input | Effect |
| :--- | :--- | :--- |
| `updateMetrics(state, delta)` | `delta` (object with partial metric changes) | Applies deltas, clamps to 0–100 |
| `decayResources(state)` | – | Decrements `budget` by `0.05` per tick; if budget < 0, set to 0 and force a resource‑related interrupt |
| `consumeMeal(state, type)` | `'quality'` or `'junk'` | Quality: +15 nutrition, -3 budget. Junk: +5 nutrition, +3 habitStrength, -1 budget |
| `handleInterruptChoice(state, choice)` | `'conscious'` or `'autopilot'` | Applies consequences per interrupt type, updates selfAwareness and habitStrength |
| `toggleSystemLoad(state, loadDelta)` | `loadDelta` (number) | Updates systemLoad, which affects interrupt frequency |

---

## 5. Core Algorithms (Pseudocode for Codex)

### 5.1 Main Simulation Loop (`src/simulator.js`)
```javascript
import { appState, updateMetrics, decayResources } from './state';
import { generateInterrupt, processQueue } from './interrupt-system';
import { renderAll } from './ui-renderer';

let intervalId;

export function startSimulation() {
  intervalId = setInterval(() => {
    // 1. Tick counter
    appState.tickCount += 1;

    // 2. Natural metric decay (entropy)
    const decay = {
      energy: -0.4 + (appState.systemLoad / 200) * 0.3, // load burns energy faster
      focus: -0.2 - (appState.pendingInterrupts.length * 0.1),
      nutrition: -0.1,
    };
    updateMetrics(appState, decay);

    // 3. Dynamic resource decay (budget drains slowly over time)
    decayResources(appState);

    // 4. Check if resource crisis forces an autopilot interrupt
    if (appState.budget <= 2 && appState.qualityFoodAvailable === 0) {
      generateInterrupt(appState, { type: 'food_desert_crisis', forced: true });
    }

    // 5. Interrupt generation (based on system load and randomness)
    const interruptChance = 0.02 + (appState.systemLoad / 100) * 0.05;
    if (Math.random() < interruptChance && !appState.activePopup) {
      generateInterrupt(appState, { type: randomInterruptType() });
    }

    // 6. Process the popup queue (if no active popup, show next)
    processQueue(appState);

    // 7. Re‑render all UI elements
    renderAll(appState);

  }, 1000); // tick every second
}
```

### 5.2 Interrupt Generation (`src/interrupt-system.js`)
```javascript
const INTERRUPT_TYPES = {
  hunger: {
    description: 'Hunger IRQ: Blood sugar low. Decision needed.',
    consciousCost: { energy: -10, focus: -5, selfAwareness: +3, nutrition: +15, habitStrength: -2 },
    autopilotCost: { energy: +5, focus: -2, selfAwareness: -8, nutrition: +5, habitStrength: +5 },
  },
  fatigue: {
    description: 'Sleep Deprivation IRQ: Cognitive function impaired.',
    consciousCost: { energy: +10, focus: +5, selfAwareness: +2, nutrition: 0, habitStrength: -1 },
    autopilotCost: { energy: -5, focus: -10, selfAwareness: -5, nutrition: 0, habitStrength: +3 },
  },
  notification: {
    description: 'Digital Stimulus IRQ: Distraction detected.',
    consciousCost: { energy: -2, focus: -3, selfAwareness: +1, nutrition: 0, habitStrength: -1 },
    autopilotCost: { energy: 0, focus: -8, selfAwareness: -4, nutrition: 0, habitStrength: +2 },
  },
  food_desert_crisis: {
    description: 'CRITICAL: No quality food available. Autopilot forced.',
    consciousCost: null, // not selectable
    autopilotCost: { energy: -5, focus: -10, selfAwareness: -12, nutrition: -5, habitStrength: +10 },
  }
};

export function generateInterrupt(state, options) {
  const type = options.type || 'hunger';
  const template = INTERRUPT_TYPES[type];
  const newInterrupt = {
    id: Date.now() + Math.random(),
    type,
    description: template.description,
    consciousCost: template.consciousCost,
    autopilotCost: template.autopilotCost,
    forced: options.forced || false,
    timestamp: Date.now(),
  };
  state.pendingInterrupts.push(newInterrupt);
}
```

### 5.3 Choice Resolution (Popup Handler)
When the user clicks one of the two popup buttons:
```javascript
export function resolveChoice(state, interruptId, choice) {
  const interrupt = state.pendingInterrupts.find(i => i.id === interruptId);
  if (!interrupt) return;

  const costs = choice === 'conscious' ? interrupt.consciousCost : interrupt.autopilotCost;
  if (costs) {
    // Apply the cost deltas
    for (let key in costs) {
      if (state.hasOwnProperty(key)) {
        state[key] = Math.min(100, Math.max(0, state[key] + costs[key]));
      }
    }
  }

  // Log the event
  state.eventLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: `${choice.toUpperCase()} chosen for ${interrupt.type}`,
    type: choice === 'conscious' ? 'info' : 'warning'
  });

  // Remove from queue
  state.pendingInterrupts = state.pendingInterrupts.filter(i => i.id !== interruptId);
  state.activePopup = null;
}
```

### 5.4 Resource Decay Algorithm (`src/resource-manager.js`)
```javascript
export function decayResources(state) {
  // Budget slowly drains (simulating cost of living)
  state.budget = Math.max(0, state.budget - 0.02);

  // Each tick, quality food availability decrements if budget is low
  if (state.budget < 5 && state.qualityFoodAvailable > 0) {
    state.qualityFoodAvailable -= 0.01; // slow drain
  }

  // If quality food hits 0 and budget is critically low, trigger crisis
  if (state.qualityFoodAvailable <= 0 && state.budget <= 3) {
    generateInterrupt(state, { type: 'food_desert_crisis', forced: true });
    // Reset qualityFoodAvailable to a tiny amount after crisis to simulate "occasional access"
    state.qualityFoodAvailable = 0.5;
  }
}
```

---

## 6. HTML/CSS Layout (`index.html` + `src/style.css`)

### 6.1 HTML Structure (in `index.html`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HUMAN OS SIMULATOR</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app">
    <!-- Cyberpunk dashboard grid -->
    <header id="dashboard-header">
      <h1>⚡ HUMAN OS ⚡</h1>
      <div id="tick-counter">TICK: 0</div>
    </header>

    <!-- Metrics Grid (6 neon bars/rings) -->
    <section id="metrics-grid">
      <div class="metric-card" data-metric="energy">
        <label>ENERGY</label>
        <div class="neon-bar"><div class="fill" style="width:80%"></div></div>
        <span class="value">80</span>
      </div>
      <div class="metric-card" data-metric="focus">
        <label>FOCUS</label>
        <div class="neon-bar"><div class="fill" style="width:75%"></div></div>
        <span class="value">75</span>
      </div>
      <div class="metric-card" data-metric="selfAwareness">
        <label>SELF-AWARENESS</label>
        <div class="neon-bar"><div class="fill" style="width:50%"></div></div>
        <span class="value">50</span>
      </div>
      <div class="metric-card" data-metric="nutrition">
        <label>NUTRITION</label>
        <div class="neon-bar"><div class="fill" style="width:70%"></div></div>
        <span class="value">70</span>
      </div>
      <div class="metric-card" data-metric="habitStrength">
        <label>HABIT STRENGTH</label>
        <div class="neon-bar"><div class="fill" style="width:30%"></div></div>
        <span class="value">30</span>
      </div>
      <div class="metric-card" data-metric="systemLoad">
        <label>SYSTEM LOAD</label>
        <div class="neon-bar"><div class="fill" style="width:0%"></div></div>
        <span class="value">0</span>
      </div>
    </section>

    <!-- Resource Status -->
    <section id="resource-panel">
      <div>💰 BUDGET: <span id="budget-display">15</span></div>
      <div>🍎 QUALITY MEALS: <span id="quality-meals-display">2</span></div>
    </section>

    <!-- Interrupt Popup Overlay (hidden by default) -->
    <div id="popup-overlay" class="hidden">
      <div class="popup-card">
        <h2 id="popup-title">⚠️ INTERRUPT</h2>
        <p id="popup-description">Hunger IRQ: Blood sugar low.</p>
        <div class="popup-choices">
          <button id="btn-conscious" class="cyber-btn conscious">🧠 KERNEL OVERRIDE</button>
          <button id="btn-autopilot" class="cyber-btn autopilot">🤖 AUTOPILOT</button>
        </div>
        <small id="popup-cost-display">Conscious: -10 Energy | Autopilot: -8 Awareness</small>
      </div>
    </div>

    <!-- Event Log -->
    <section id="event-log">
      <h3>SYSTEM LOG</h3>
      <ul id="log-list"></ul>
    </section>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 6.2 Cyberpunk Styling (`src/style.css`)
- **Palette:** `#00f0ff` (cyan), `#ff00c8` (magenta), `#0a0a12` (deep dark), `#1a1a2e` (card bg), `#f0f0ff` (text).
- **Glow effects:** `text-shadow`, `box-shadow` with `0 0 10px` using the neon colours.
- **Bars:** Progress bars with a gradient from magenta to cyan; pulsating animation when metrics drop below 20%.
- **Popups:** Glass‑morphism with a blur backdrop, animated slide‑in from the centre.
- **Buttons:** Hollow, outlined, with a hover glow; `conscious` button is cyan, `autopilot` is magenta.

---

## 7. Interaction Bindings (`src/main.js`)

| DOM Element | Event | Handler |
| :--- | :--- | :--- |
| `#btn-conscious` | `click` | Calls `resolveChoice(state, activePopup.id, 'conscious')` |
| `#btn-autopilot` | `click` | Calls `resolveChoice(state, activePopup.id, 'autopilot')` |
| (Optional) Reset button | `click` | Reloads initial state and clears logs |

**Important:** The popup must lock out further interrupts while active (set a flag `state.popupActive = true`). The `processQueue` function only shows a new popup if `state.activePopup === null`.

---

## 8. UI Renderer (`src/ui-renderer.js`)

Exports a single `renderAll(state)` function that:
1. Updates each metric bar's width and text value.
2. Updates budget and quality meal numbers.
3. If `state.activePopup` exists, shows the overlay and populates the description/cost labels.
4. If no active popup, hides the overlay.
5. Renders the last 10 event log entries (newest first) inside the `<ul>`.

**Optimisation:** Use `requestAnimationFrame` for smooth bar transitions; but for simplicity, direct DOM manipulation inside a 1‑second interval is acceptable.

---

## 9. Testing Checklist (For Codex to verify)

| Test Case | Expected Behaviour |
| :--- | :--- |
| **1. Initial load** | All bars at correct initial values (Energy: 80, Focus: 75, etc.). Budget = 15, Quality Meals = 2. Log shows "System initialised." No popup. |
| **2. Natural decay** | After 10 seconds without interaction, Energy drops ~4 points, Nutrition ~1 point. Budget drops by ~0.2. |
| **3. Interrupt spawn** | Within 30–60 seconds, a hunger/fatigue popup appears. The overlay slides in with description and two buttons. |
| **4. Conscious choice** | Clicking "KERNEL OVERRIDE" applies positive selfAwareness (+3) and negative energy (–10). Log shows "CONSCIOUS chosen for hunger". Popup disappears. |
| **5. Autopilot choice** | Clicking "AUTOPILOT" applies negative selfAwareness (–8) and positive habitStrength (+5). Log shows "AUTOPILOT chosen". |
| **6. Forced crisis** | When budget ≤ 2 AND qualityMeals ≤ 0, a forced `food_desert_crisis` popup appears. It has ONLY an Autopilot button (Conscious disabled). Choosing it severely drops selfAwareness and nutrition. |
| **7. Popup queueing** | If a popup is active, no new interrupt can spawn (the `interruptChance` check should skip if `state.activePopup` is not null). |
| **8. System load effect** | If systemLoad is high (e.g., via simulated external input or if you manually set it), interrupt frequency should noticeably increase. |
| **9. Budget mechanics** | Budget should never go negative (clamped to 0). When it reaches 0, the crisis interrupt triggers. |
| **10. UI responsiveness** | All bars update live; log updates with timestamps; popup animations are smooth (CSS `transition`). |

---

## 10. Codex Execution Notes (Critical)
- **No external API calls** – all logic runs client‑side.
- **Use ES modules** (import/export) – Vite handles bundling.
- **Keep comments in code** – they help future maintainers understand the OS metaphor.
- **Deployment:** Run `npm run build`, then deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages).
- **Future extension:** The system is modular – you can easily add new interrupt types (e.g., "Social Pressure IRQ", "Financial Stress IRQ") by simply adding entries to `INTERRUPT_TYPES`.

---

**Handoff complete.** Codex now has everything it needs to build this from the ground up – folder structure, state machine, algorithms, UI components, and a clear test plan. Execute with confidence. 🧠⚡
