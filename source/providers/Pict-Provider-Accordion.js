const libPictProvider = require('pict-provider');

const libPictViewAccordion = require('../views/PictView-Accordion.js');

// Themeable control CSS, registered once by hash. Host apps brand by defining the --theme-* tokens;
// the hardcoded values are fallbacks. Covers all three render modes (accordion / wizard / stepper).
const _AccordionCSS = /*css*/`
.psa { width: 100%; box-sizing: border-box; font-size: var(--theme-typography-size-md, 0.95rem); color: var(--theme-color-text-primary, #1f2733); }
.psa *, .psa *::before, .psa *::after { box-sizing: border-box; }

/* ---- Step bodies (shared by wizard + stepper): all present, only the active one shown. ---- */
.psa-step-body { display: none; }
.psa-step-body.psa-step-body-active { display: block; }

/* ---- Accordion mode ---- */
.psa-panel { border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: var(--theme-radius-lg, 10px);
	margin-bottom: var(--theme-spacing-sm, 0.6rem); overflow: hidden; background: var(--theme-color-background-panel, #fff); }
.psa-panel-header { display: flex; align-items: center; gap: var(--theme-spacing-sm, 0.6rem); width: 100%; cursor: pointer; text-align: left;
	font: inherit; padding: var(--theme-spacing-md, 0.75rem) var(--theme-spacing-md, 0.9rem); border: none;
	background: var(--theme-color-background-secondary, #f6f7f9); color: var(--theme-color-text-primary, #1f2733); }
.psa-panel-header:hover { background: var(--theme-color-background-hover, #eef1f5); }
.psa-panel-header:disabled { cursor: not-allowed; opacity: 0.55; }
.psa-panel-header:focus-visible { outline: none; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--theme-color-focus-outline, #156dd1) 45%, transparent); }
.psa-panel-active > .psa-panel-header { background: var(--theme-color-background-selected, #e7eefb); }
.psa-panel-title { flex: 1 1 auto; min-width: 0; font-weight: var(--theme-typography-weight-medium, 600); display: flex; flex-direction: column; }
.psa-panel-indicator { flex: 0 0 auto; display: inline-flex; }
.psa-panel-chevron { flex: 0 0 auto; display: inline-flex; color: var(--theme-color-text-muted, #6b7686); transition: transform var(--theme-duration-normal, 0.18s) ease; }
.psa-panel-open > .psa-panel-header .psa-panel-chevron { transform: rotate(180deg); }
.psa-panel-body { display: none; padding: var(--theme-spacing-lg, 1rem); border-top: 1px solid var(--theme-color-border-light, #e8ebf0); }
.psa-panel-open > .psa-panel-body { display: block; }

/* ---- Stepper mode ---- */
.psa-rail { display: flex; align-items: flex-start; gap: 0; margin-bottom: var(--theme-spacing-lg, 1rem); }
.psa-rail-item { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 0.35rem; cursor: pointer; position: relative;
	border: none; background: transparent; font: inherit; color: var(--theme-color-text-muted, #6b7686); padding: 0; }
.psa-rail-item:disabled { cursor: not-allowed; opacity: 0.5; }
.psa-rail-item::before { content: ""; position: absolute; top: 14px; left: -50%; width: 100%; height: 2px; background: var(--theme-color-border-default, #d7dce3); z-index: 0; }
.psa-rail-item:first-child::before { display: none; }
.psa-rail-item.psa-rail-complete::before { background: var(--theme-color-status-success, #2e7a3a); }
.psa-rail-medallion { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px;
	border-radius: var(--theme-radius-pill, 999px); background: var(--theme-color-background-tertiary, #eceef2); color: var(--theme-color-text-secondary, #45596b);
	font-size: var(--theme-typography-size-sm, 0.85rem); font-weight: var(--theme-typography-weight-medium, 600); }
.psa-rail-active .psa-rail-medallion { background: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-background-panel, #fff); }
.psa-rail-complete .psa-rail-medallion { background: var(--theme-color-status-success, #2e7a3a); color: var(--theme-color-background-panel, #fff); }
.psa-rail-error .psa-rail-medallion { background: var(--theme-color-status-error, #b62828); color: var(--theme-color-background-panel, #fff); }
.psa-rail-label { font-size: var(--theme-typography-size-sm, 0.82rem); text-align: center; max-width: 12ch; }
.psa-rail-active .psa-rail-label { color: var(--theme-color-text-primary, #1f2733); font-weight: var(--theme-typography-weight-medium, 600); }

/* ---- Wizard mode ---- */
.psa-wizard-head { margin-bottom: var(--theme-spacing-md, 0.9rem); }
.psa-wizard-step { font-size: var(--theme-typography-size-xs, 0.76rem); color: var(--theme-color-text-muted, #6b7686); text-transform: uppercase; letter-spacing: 0.04em; }
.psa-wizard-title { font-size: var(--theme-typography-size-lg, 1.15rem); font-weight: var(--theme-typography-weight-bold, 700); }

/* ---- Subtitles + state icons ---- */
.psa-subtitle { font-size: var(--theme-typography-size-xs, 0.78rem); font-weight: var(--theme-typography-weight-regular, 400); color: var(--theme-color-text-muted, #6b7686); }
.psa-ic-check { display: inline-flex; color: var(--theme-color-status-success, #2e7a3a); }
.psa-ic-warn { display: inline-flex; color: var(--theme-color-status-error, #b62828); }

/* ---- Error chrome ---- */
.psa-step-error { display: flex; align-items: center; gap: 0.4rem; margin-bottom: var(--theme-spacing-sm, 0.6rem);
	padding: 0.5rem 0.7rem; border-radius: var(--theme-radius-md, 6px); font-size: var(--theme-typography-size-sm, 0.86rem);
	color: var(--theme-color-status-error, #b62828); background: color-mix(in srgb, var(--theme-color-status-error, #b62828) 10%, transparent); }

/* ---- Nav footer (wizard + stepper) ---- */
.psa-nav { display: flex; justify-content: space-between; gap: var(--theme-spacing-sm, 0.6rem); margin-top: var(--theme-spacing-lg, 1rem); }
.psa-nav-back, .psa-nav-next { display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; font: inherit;
	padding: 0.45rem 0.9rem; border-radius: var(--theme-radius-md, 6px); }
.psa-nav-back { border: 1px solid var(--theme-color-border-default, #d7dce3); background: transparent; color: var(--theme-color-text-secondary, #45596b); }
.psa-nav-back:hover:not(:disabled) { background: var(--theme-color-background-hover, #eef1f5); }
.psa-nav-back:disabled { opacity: 0.5; pointer-events: none; }
.psa-nav-next { border: none; background: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-background-panel, #fff); margin-left: auto;
	font-weight: var(--theme-typography-weight-medium, 600); }
.psa-nav-next:hover { background: var(--theme-color-brand-primaryhover, #1257ab); }
.psa-nav-done { background: var(--theme-color-status-success, #2e7a3a); }
`;

/** @type {Record<string, any>} */
const _DEFAULT_CONFIGURATION =
{
	ProviderIdentifier: 'Pict-Section-Accordion',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,
};

/**
 * The pict-section-accordion provider — the primary API surface. Registers the control CSS once and
 * creates/manages accordion view instances. (The base icon set already supplies ChevronDown / Check /
 * Warning / ArrowLeft / ArrowRight, so no custom icon set is needed.)
 */
class PictProviderAccordion extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DEFAULT_CONFIGURATION, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Section-Accordion-CSS', _AccordionCSS, 500);
		}
	}

	/**
	 * Create (or reconfigure + reuse) an accordion view instance.
	 * @param {string} pAccordionHash - unique hash/id; renders into `#<hash>` unless a DestinationAddress is given.
	 * @param {Record<string, any>} pConfig - accordion configuration (see PictViewAccordion defaults).
	 * @return {any} The accordion view instance.
	 */
	createAccordion(pAccordionHash, pConfig)
	{
		const tmpConfig = Object.assign(
			{
				DestinationAddress: `#${pAccordionHash}`,
				RenderMode: 'accordion',
				Steps: [],
				AllowMultipleOpen: false,
				LinearGating: true,
			},
			pConfig || {},
			{ AccordionHash: pAccordionHash });

		if (this.pict.views[pAccordionHash])
		{
			const tmpView = this.pict.views[pAccordionHash];
			Object.assign(tmpView.options, tmpConfig);
			tmpView.reconfigureSteps(tmpConfig.Steps);
			return tmpView;
		}
		return this.pict.addView(pAccordionHash, tmpConfig, libPictViewAccordion);
	}
}

module.exports = PictProviderAccordion;

module.exports.default_configuration = _DEFAULT_CONFIGURATION;
