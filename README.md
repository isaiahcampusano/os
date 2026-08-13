# Human OS Simulator

A real-time cyberpunk dashboard that uses operating-system concepts to explore attention, habit, and environmental constraint. Random cognitive interrupts ask the user to choose between a deliberate **Kernel Override** and an automatic **Autopilot** response. Every choice changes the system.

**Live site:** [isaiahcampusano.github.io/os](https://isaiahcampusano.github.io/os/)

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the local address shown by Vite.

## Commands

- `npm run dev` — start the development server
- `npm test` — run deterministic unit tests
- `npm run build` — create a static production bundle in `dist/`
- `npm run preview` — serve the production bundle locally

## Simulation model

The scheduler advances once per second. Energy, focus, nutrition, resource access, and budget naturally decay while system load responds to physiological stress, habit strength, and unresolved interrupts. Higher load increases both energy loss and interrupt probability.

Interrupts are processed through an explicit queue:

- Waiting events live in `pendingInterrupts`.
- The dialog shown to the user lives in `activePopup`.
- Choice resolution operates only on `activePopup`.
- A displayed interrupt prevents additional random interrupts from spawning.

Resource scarcity is part of the simulation rather than decoration. Budget falls by exactly `0.02` per tick. Hidden continuous access can cross thresholds that remove whole quality meals, while the user-facing meal count always remains an integer. When budget and meal access are both exhausted, a latched crisis removes the conscious path.

## Architecture

```text
src/
├── main.js              Browser entry point and interaction bindings
├── state.js             Initial state, immutable helpers, and state store
├── simulator.js         Scheduler, load model, and deterministic tick function
├── interrupt-system.js  Interrupt templates, queueing, crisis, and choices
├── resource-manager.js  Budget and environmental access decay
├── ui-renderer.js       DOM projection and dialog presentation
└── style.css            Responsive cyberpunk visual system
```

All domain transitions return new state objects. Time and randomness are injected at the simulation boundary, which keeps timed and randomized behavior fast and deterministic under test.

## Controls and accessibility

- Pause or resume the scheduler with the header control.
- Reset restores the full initial state.
- When an interrupt is open, press `1` for Kernel Override or `2` for Autopilot.
- Keyboard focus is contained inside the modal while it is active.
- Forced or resource-blocked choices are disabled and explained in text.
- Reduced-motion preferences disable nonessential animation.

## Deployment

The application is entirely static and makes no API calls. Pushes to `main` are tested, built, and deployed to GitHub Pages by the workflow in `.github/workflows/deploy-pages.yml`.
