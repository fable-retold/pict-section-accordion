// The container for all the Pict-Section-Accordion related code.
//
// pict-section-accordion is a pict-native multi-step container: it renders the SAME step set as a
// collapsible accordion, a back/next wizard, or a numbered stepper, over one shared serializable nav
// state with per-step CanAdvance gating. It owns the chrome + navigation only — the HOST renders each
// step's body view into the step's always-present body container, so navigation never wipes content.

// The accordion provider (primary API surface — registers the view + CSS, exposes createAccordion()).
const PictProviderAccordion = require('./providers/Pict-Provider-Accordion.js');

// The multi-step view (also registered on demand by the provider's createAccordion()).
const PictViewAccordion = require('./views/PictView-Accordion.js');

module.exports = PictProviderAccordion;

module.exports.PictProviderAccordion = PictProviderAccordion;
module.exports.PictViewAccordion = PictViewAccordion;

module.exports.default_configuration = PictProviderAccordion.default_configuration;
