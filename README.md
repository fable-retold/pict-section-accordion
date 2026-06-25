# pict-section-accordion

A pict-native **multi-step container** that renders the *same* step set as a collapsible
**accordion**, a back/next **wizard**, or a numbered **stepper** — over one shared, serializable nav
state with per-step `CanAdvance` gating.

The control owns the chrome + navigation only. **The host renders each step's body** into the step's
always-present body container, so switching steps is pure visibility toggling — it never wipes the
content a host rendered.

## Install

```bash
npm install pict-section-accordion
```

Depends only on `pict-provider` + `pict-view`.

## Usage

```javascript
const libPictSectionAccordion = require('pict-section-accordion');
pict.addProvider('Pict-Section-Accordion', libPictSectionAccordion.default_configuration, libPictSectionAccordion);
const tmpAccordion = pict.providers['Pict-Section-Accordion'];

tmpAccordion.createAccordion('Setup',
{
    DestinationAddress: '#Setup',
    RenderMode: 'wizard',                 // 'accordion' | 'wizard' | 'stepper'
    Steps:
    [
        { Hash: 'account', Title: 'Account', Subtitle: 'Your details',
          CanAdvance: () => pict.views['AccountForm'].validate() },   // gate Next
        { Hash: 'plan',    Title: 'Plan' },
        { Hash: 'review',  Title: 'Review' },
    ],
    OnStepChange: (pTo, pFrom) => { /* render the body for pTo into its container */ },
    OnComplete:   () => { /* last step's Next was accepted */ },
});
pict.views['Setup'].render();
// Host renders each step's body into #PSA_Body_Setup_<stepHash> (or the step's DestinationAddress).
```

### The host renders bodies

Each step has a body container at `#PSA_Body_<accordionHash>_<stepHash>` (overridable via the step's
`DestinationAddress`). Render your body views/content there — once. The accordion shows/hides them as
the active (wizard/stepper) or open (accordion) step changes; it never re-creates them. Use
`OnStepChange(to, from)` to lazily render a body the first time its step is shown.

### Gating

A step's `CanAdvance(ctx)` runs when `next()` is called. Return `true` to allow, `false` to block, or
`{ allow:false, message:'…' }` to block with a specific error shown on the step. Async is supported
(return a `Promise`). `LinearGating` (default on, wizard/stepper) stops rail-jumps past the
furthest-reached step.

## API (view methods)

| Method | Purpose |
|---|---|
| `goToStep(hash)` → Promise<bool> | Navigate to / open a step (honors Enabled + gating). |
| `next()` → Promise<bool> | Run the gate, mark complete, advance (or fire `OnComplete` on the last step). |
| `back()` → Promise<bool> | Go to the previous enabled step. |
| `toggleStep(hash)` | Accordion: open/close a panel. Wizard/stepper: navigate. |
| `setStepComplete/Enabled/Error(hash, …)` | Mutate a step's flags (targeted chrome repaint — bodies untouched). |
| `getActiveStep()` / `getOpenSteps()` | Inspect current state. |
| `getState()` | The serializable nav state (function-free; persist + re-seed to resume). |

## Theming

All chrome CSS uses `var(--theme-color-*, fallback)` tokens (registered at priority 500), so panels,
the stepper rail, the wizard footer, and state icons follow the host theme.

## Demo

`example_applications/accordion_demo` — the same step set in all three modes, a gated wizard step, and
external `setStep*` / `goToStep` controls driving the stepper. Build with `npm run build`, serve `dist/`.

## Test

```bash
npm test     # mocha TDD
```
