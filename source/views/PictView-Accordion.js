const libPictView = require('pict-view');

/**
 * Normalize a host step list into the internal step shape (defaults filled, unique-Hash enforced).
 * The CanAdvance function rides ONLY on these instance steps — never in AppData — so the AppData
 * nav state stays JSON-serializable.
 * @param {string} pAccordionHash @param {Array<any>} pSteps
 * @return {Array<Record<string, any>>}
 */
const normalizeSteps = (pAccordionHash, pSteps) =>
{
	const tmpSteps = Array.isArray(pSteps) ? pSteps : [];
	const tmpSeen = {};
	return tmpSteps.map((pStep, pIndex) =>
	{
		if (!pStep || !pStep.Hash) { throw new Error('pict-section-accordion: every step needs a unique Hash.'); }
		if (tmpSeen[pStep.Hash]) { throw new Error(`pict-section-accordion: duplicate step Hash "${pStep.Hash}".`); }
		tmpSeen[pStep.Hash] = true;
		return {
			Hash: pStep.Hash,
			Title: (pStep.Title !== undefined) ? pStep.Title : pStep.Hash,
			Subtitle: pStep.Subtitle || '',
			DestinationAddress: pStep.DestinationAddress || `#PSA_Body_${pAccordionHash}_${pStep.Hash}`,
			Enabled: (pStep.Enabled !== false),
			Complete: !!pStep.Complete,
			Active: !!pStep.Active,
			Error: pStep.Error || null,
			CanAdvance: (typeof pStep.CanAdvance === 'function') ? pStep.CanAdvance : null,
			BodyViewHash: pStep.BodyViewHash || '',
			Index: pIndex,
		};
	});
};

/** @type {Record<string, any>} */
const _DEFAULT_CONFIGURATION =
{
	ViewIdentifier: 'Pict-Section-Accordion-View',

	AutoInitialize: false,
	AutoRender: false,
	AutoSolveWithApp: false,

	DefaultRenderable: 'Pict-Section-Accordion-Renderable',

	// Per-instance options (supplied by PictProviderAccordion.createAccordion):
	AccordionHash: false,
	DestinationAddress: false,
	// Optional override of the AppData slot holding the serializable nav state.
	StateAddress: false,
	// 'accordion' | 'wizard' | 'stepper'.
	RenderMode: 'accordion',
	Steps: [],
	// Accordion: allow more than one panel open at once.
	AllowMultipleOpen: false,
	// Wizard/stepper: block rail-jumps past the furthest-reached step.
	LinearGating: true,
	BackLabel: 'Back',
	NextLabel: 'Next',
	DoneLabel: 'Done',
	GateBlockedMessage: 'Please complete this step before continuing.',
	OnStepChange: false,
	OnComplete: false,

	Templates:
	[
		{
			// Mode dispatch: exactly one of the slots is a single-element array, so only that mode's
			// layout renders. Each slot record carries everything its mode template references.
			Hash: 'Pict-Section-Accordion-Container',
			Template: /*html*/`<div class="psa psa--{~D:Record.RenderMode~}" id="PSA_{~D:Record.AccordionHash~}">{~TS:Pict-Section-Accordion-AccordionMode:Record.AccordionSlot~}{~TS:Pict-Section-Accordion-WizardMode:Record.WizardSlot~}{~TS:Pict-Section-Accordion-StepperMode:Record.StepperSlot~}</div>`
		},

		// ---- Accordion mode ----
		{
			Hash: 'Pict-Section-Accordion-AccordionMode',
			Template: /*html*/`{~TS:Pict-Section-Accordion-Panel:Record.Steps~}`
		},
		{
			// A panel: a header button + an always-present body container. Open/active/error state lives
			// in classes toggled at navigation time (so the host-rendered body is never re-created); the
			// header's inner content is repainted on flag changes via PanelHeaderInner.
			Hash: 'Pict-Section-Accordion-Panel',
			Template: /*html*/`
<div class="psa-panel{~NE:Record.IsOpen^ psa-panel-open~}{~NE:Record.Active^ psa-panel-active~}{~NE:Record.NotEnabled^ psa-panel-disabled~}{~NE:Record.HasError^ psa-panel-error~}" id="PSA_Panel_{~D:Record.AccordionHash~}_{~D:Record.Hash~}">
	<button type="button" class="psa-panel-header" id="PSA_Header_{~D:Record.AccordionHash~}_{~D:Record.Hash~}"{~NE:Record.NotEnabled^ disabled~} aria-expanded="{~D:Record.IsOpenStr~}" onclick="_Pict.views['{~D:Record.AccordionHash~}'].toggleStep('{~D:Record.Hash~}')">{~T:Pict-Section-Accordion-PanelHeaderInner~}</button>
	<div class="psa-panel-body" id="{~D:Record.BodyDomId~}"></div>
</div>`
		},
		{
			Hash: 'Pict-Section-Accordion-PanelHeaderInner',
			Template: /*html*/`<span class="psa-panel-indicator">{~TS:Pict-Section-Accordion-Check:Record.CompleteSlot~}{~TS:Pict-Section-Accordion-Warn:Record.ErrorIconSlot~}</span><span class="psa-panel-title">{~D:Record.Title~}{~TS:Pict-Section-Accordion-Subtitle:Record.SubtitleSlot~}</span><span class="psa-panel-chevron">{~I:ChevronDown~}</span>`
		},

		// ---- Wizard mode ----
		{
			Hash: 'Pict-Section-Accordion-WizardMode',
			Template: /*html*/`
<div class="psa-wizard">
	<div class="psa-wizard-head" id="PSA_WizHead_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-WizardHeadInner~}</div>
	<div class="psa-err" id="PSA_Err_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-ErrorRegion~}</div>
	<div class="psa-bodies">{~TS:Pict-Section-Accordion-StepBody:Record.Steps~}</div>
	<div class="psa-nav-wrap" id="PSA_Nav_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-NavFooterInner~}</div>
</div>`
		},
		{
			Hash: 'Pict-Section-Accordion-WizardHeadInner',
			Template: /*html*/`<div class="psa-wizard-step">{~D:Record.StepNumberLabel~}</div><div class="psa-wizard-title">{~D:Record.ActiveTitle~}{~TS:Pict-Section-Accordion-Subtitle:Record.ActiveSubtitleSlot~}</div>`
		},

		// ---- Stepper mode ----
		{
			Hash: 'Pict-Section-Accordion-StepperMode',
			Template: /*html*/`
<div class="psa-stepper">
	<div class="psa-rail" id="PSA_Rail_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-RailInner~}</div>
	<div class="psa-err" id="PSA_Err_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-ErrorRegion~}</div>
	<div class="psa-bodies">{~TS:Pict-Section-Accordion-StepBody:Record.Steps~}</div>
	<div class="psa-nav-wrap" id="PSA_Nav_{~D:Record.AccordionHash~}">{~T:Pict-Section-Accordion-NavFooterInner~}</div>
</div>`
		},
		{
			Hash: 'Pict-Section-Accordion-RailInner',
			Template: /*html*/`{~TS:Pict-Section-Accordion-RailItem:Record.Steps~}`
		},
		{
			Hash: 'Pict-Section-Accordion-RailItem',
			Template: /*html*/`
<button type="button" class="psa-rail-item{~NE:Record.Active^ psa-rail-active~}{~NE:Record.Complete^ psa-rail-complete~}{~NE:Record.HasError^ psa-rail-error~}{~NE:Record.NotEnabled^ psa-rail-disabled~}"{~NE:Record.NotEnabled^ disabled~} aria-current="{~D:Record.AriaCurrent~}" onclick="_Pict.views['{~D:Record.AccordionHash~}'].goToStep('{~D:Record.Hash~}')">
	<span class="psa-rail-medallion">{~TS:Pict-Section-Accordion-Check:Record.CompleteSlot~}{~TS:Pict-Section-Accordion-Warn:Record.ErrorIconSlot~}{~TS:Pict-Section-Accordion-Number:Record.NumberSlot~}</span>
	<span class="psa-rail-label">{~D:Record.Title~}</span>
</button>`
		},

		// ---- Shared ----
		{
			// A step body container — present for every step; CSS shows only the active one (wizard/stepper).
			Hash: 'Pict-Section-Accordion-StepBody',
			Template: /*html*/`<div class="psa-step-body{~NE:Record.Active^ psa-step-body-active~}" id="{~D:Record.BodyDomId~}"></div>`
		},
		{
			Hash: 'Pict-Section-Accordion-NavFooterInner',
			Template: /*html*/`
<div class="psa-nav">
	<button type="button" class="psa-nav-back"{~NE:Record.NoBack^ disabled~} onclick="_Pict.views['{~D:Record.AccordionHash~}'].back()">{~I:ArrowLeft~} {~D:Record.BackLabel~}</button>
	{~TS:Pict-Section-Accordion-NavNext:Record.NextSlot~}{~TS:Pict-Section-Accordion-NavDone:Record.DoneSlot~}
</div>`
		},
		{
			Hash: 'Pict-Section-Accordion-NavNext',
			Template: /*html*/`<button type="button" class="psa-nav-next" onclick="_Pict.views['{~D:Record.AccordionHash~}'].next()">{~D:Record.NextLabel~} {~I:ArrowRight~}</button>`
		},
		{
			Hash: 'Pict-Section-Accordion-NavDone',
			Template: /*html*/`<button type="button" class="psa-nav-next psa-nav-done" onclick="_Pict.views['{~D:Record.AccordionHash~}'].next()">{~D:Record.DoneLabel~} {~I:Check~}</button>`
		},
		{
			Hash: 'Pict-Section-Accordion-ErrorRegion',
			Template: /*html*/`{~TS:Pict-Section-Accordion-StepError:Record.ActiveErrorSlot~}`
		},
		{
			Hash: 'Pict-Section-Accordion-StepError',
			Template: /*html*/`<div class="psa-step-error">{~I:Warning~} <span>{~D:Record.Message~}</span></div>`
		},
		{
			Hash: 'Pict-Section-Accordion-Subtitle',
			Template: /*html*/`<span class="psa-subtitle">{~D:Record.Text~}</span>`
		},
		{ Hash: 'Pict-Section-Accordion-Check', Template: /*html*/`<span class="psa-ic-check">{~I:Check~}</span>` },
		{ Hash: 'Pict-Section-Accordion-Warn', Template: /*html*/`<span class="psa-ic-warn">{~I:Warning~}</span>` },
		{ Hash: 'Pict-Section-Accordion-Number', Template: /*html*/`{~D:Record.Number~}` },
	],

	Renderables:
	[
		{
			RenderableHash: 'Pict-Section-Accordion-Renderable',
			TemplateHash: 'Pict-Section-Accordion-Container',
			RenderMethod: 'replace',
		},
	],
};

class PictViewAccordion extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DEFAULT_CONFIGURATION, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.options.DefaultDestinationAddress = this.options.DestinationAddress || `#${this.options.AccordionHash}`;
		this._StateAddress = this.options.StateAddress || `AppData.PictSectionAccordion.${this.options.AccordionHash}`;
		this.options.DefaultTemplateRecordAddress = this._StateAddress;
		if (Array.isArray(this.options.Renderables) && this.options.Renderables[0])
		{
			this.options.Renderables[0].ContentDestinationAddress = this.options.DefaultDestinationAddress;
		}

		// Step config (incl. CanAdvance fns) lives on the instance; nav state lives in AppData.
		this._steps = normalizeSteps(this.options.AccordionHash, this.options.Steps);

		try { this._ensureState(); this._buildState(); } catch (pError) { /* AppData not ready — onBeforeRender will build it */ }
	}

	/** @return {Record<string, any>} The AppData nav-state slot (resolved from StateAddress). */
	_state()
	{
		let tmpState = this.pict.manifest.getValueAtAddress(this.pict, this._StateAddress);
		if (!tmpState || typeof tmpState !== 'object')
		{
			tmpState = {};
			this.pict.manifest.setValueAtAddress(this.pict, this._StateAddress, tmpState);
		}
		return tmpState;
	}

	/** Seed the serializable nav state (StepFlags + ActiveStepHash + OpenHashes + MaxReachedIndex). */
	_ensureState()
	{
		const tmpState = this._state();
		if (!tmpState.StepFlags) { tmpState.StepFlags = {}; }
		this._steps.forEach((pStep) =>
		{
			if (!tmpState.StepFlags[pStep.Hash])
			{
				tmpState.StepFlags[pStep.Hash] = { Enabled: pStep.Enabled !== false, Complete: !!pStep.Complete, Error: pStep.Error || null };
			}
		});
		if (tmpState.ActiveStepHash === undefined || tmpState.ActiveStepHash === null || !this._steps.find((pStep) => pStep.Hash === tmpState.ActiveStepHash))
		{
			const tmpActive = this._steps.find((pStep) => pStep.Active)
				|| this._steps.find((pStep) => tmpState.StepFlags[pStep.Hash].Enabled)
				|| this._steps[0];
			tmpState.ActiveStepHash = tmpActive ? tmpActive.Hash : null;
		}
		if (!Array.isArray(tmpState.OpenHashes))
		{
			tmpState.OpenHashes = tmpState.ActiveStepHash ? [ tmpState.ActiveStepHash ] : [];
		}
		if (typeof tmpState.MaxReachedIndex !== 'number')
		{
			const tmpActiveStep = this._steps.find((pStep) => pStep.Hash === tmpState.ActiveStepHash);
			tmpState.MaxReachedIndex = tmpActiveStep ? tmpActiveStep.Index : 0;
		}
	}

	/** @return {Record<string, any>} The per-step flags map. */
	_flags() { return this._state().StepFlags || {}; }
	/** @return {string|null} The active step hash. */
	_activeStepHash() { return this._state().ActiveStepHash; }
	/** @param {string} pHash */
	_setActiveStepHash(pHash) { this._state().ActiveStepHash = pHash; }
	/** @param {string} pHash @return {string} The DOM id of a step's body container. */
	_bodyDomId(pHash) { return `PSA_Body_${this.options.AccordionHash}_${pHash}`; }

	/** @return {Set<string>} The hashes whose body should currently be visible. */
	_visibleStepHashes()
	{
		if ((this.options.RenderMode || 'accordion') === 'accordion') { return new Set(this._state().OpenHashes || []); }
		return new Set([ this._activeStepHash() ]);
	}

	/** Build one step's render projection. */
	_stepProjection(pStep, pActiveHash, pVisibleSet, pFlags)
	{
		const tmpFlags = pFlags[pStep.Hash] || {};
		const tmpEnabled = (tmpFlags.Enabled !== false);
		const tmpComplete = !!tmpFlags.Complete;
		const tmpError = tmpFlags.Error || null;
		const tmpActive = (pStep.Hash === pActiveHash);
		const tmpOpen = pVisibleSet.has(pStep.Hash);
		return {
			AccordionHash: this.options.AccordionHash,
			Hash: pStep.Hash,
			Title: pStep.Title,
			Number: pStep.Index + 1,
			Index: pStep.Index,
			Active: tmpActive,
			Enabled: tmpEnabled,
			NotEnabled: !tmpEnabled,
			Complete: tmpComplete,
			HasError: !!tmpError,
			IsOpen: tmpOpen,
			IsOpenStr: tmpOpen ? 'true' : 'false',
			AriaCurrent: tmpActive ? 'step' : 'false',
			BodyDomId: this._bodyDomId(pStep.Hash),
			SubtitleSlot: pStep.Subtitle ? [ { Text: pStep.Subtitle } ] : [],
			CompleteSlot: (tmpComplete && !tmpError) ? [ {} ] : [],
			ErrorIconSlot: tmpError ? [ {} ] : [],
			NumberSlot: (!tmpComplete && !tmpError) ? [ { Number: pStep.Index + 1 } ] : [],
		};
	}

	/** (Re)compute the full render state into AppData. */
	_buildState()
	{
		this._ensureState();
		const tmpState = this._state();
		const tmpHash = this.options.AccordionHash;
		const tmpMode = this.options.RenderMode || 'accordion';
		const tmpFlags = this._flags();
		const tmpActiveHash = this._activeStepHash();
		const tmpVisible = this._visibleStepHashes();

		tmpState.AccordionHash = tmpHash;
		tmpState.RenderMode = tmpMode;
		tmpState.IsAccordion = (tmpMode === 'accordion');
		tmpState.IsWizard = (tmpMode === 'wizard');
		tmpState.IsStepper = (tmpMode === 'stepper');

		tmpState.Steps = this._steps.map((pStep) => this._stepProjection(pStep, tmpActiveHash, tmpVisible, tmpFlags));

		const tmpActiveStep = this._steps.find((pStep) => pStep.Hash === tmpActiveHash) || this._steps[0] || null;
		const tmpActiveIndex = tmpActiveStep ? tmpActiveStep.Index : 0;
		const tmpActiveFlags = (tmpActiveStep && tmpFlags[tmpActiveStep.Hash]) || {};
		const tmpActiveErrorSlot = (tmpActiveStep && tmpActiveFlags.Error) ? [ { Message: tmpActiveFlags.Error } ] : [];
		const tmpActiveBodyDomId = tmpActiveStep ? this._bodyDomId(tmpActiveStep.Hash) : '';

		const tmpIsLast = (tmpActiveIndex >= this._steps.length - 1);
		const tmpNavBase = {
			AccordionHash: tmpHash,
			NoBack: (tmpActiveIndex <= 0),
			BackLabel: this.options.BackLabel,
			NextSlot: tmpIsLast ? [] : [ { AccordionHash: tmpHash, NextLabel: this.options.NextLabel } ],
			DoneSlot: tmpIsLast ? [ { AccordionHash: tmpHash, DoneLabel: this.options.DoneLabel } ] : [],
		};

		tmpState.AccordionSlot = tmpState.IsAccordion ? [ { AccordionHash: tmpHash, Steps: tmpState.Steps } ] : [];
		tmpState.WizardSlot = tmpState.IsWizard ? [ Object.assign({
			Steps: tmpState.Steps,
			StepNumberLabel: `Step ${tmpActiveIndex + 1} of ${this._steps.length}`,
			ActiveTitle: tmpActiveStep ? tmpActiveStep.Title : '',
			ActiveSubtitleSlot: (tmpActiveStep && tmpActiveStep.Subtitle) ? [ { Text: tmpActiveStep.Subtitle } ] : [],
			ActiveBodyDomId: tmpActiveBodyDomId,
			ActiveErrorSlot: tmpActiveErrorSlot,
		}, tmpNavBase) ] : [];
		tmpState.StepperSlot = tmpState.IsStepper ? [ Object.assign({
			Steps: tmpState.Steps,
			ActiveBodyDomId: tmpActiveBodyDomId,
			ActiveErrorSlot: tmpActiveErrorSlot,
		}, tmpNavBase) ] : [];

		return tmpState;
	}

	/**
	 * @param {import('pict-view').Renderable} pRenderable
	 */
	onBeforeRender(pRenderable)
	{
		this._buildState();
		return super.onBeforeRender(pRenderable);
	}

	/**
	 * @param {import('pict-view').Renderable} pRenderable
	 */
	onAfterRender(pRenderable)
	{
		if (this.pict.CSSMap && typeof this.pict.CSSMap.injectCSS === 'function') { this.pict.CSSMap.injectCSS(); }
		this._applyActiveClasses();
		return super.onAfterRender(pRenderable);
	}

	/** Toggle visibility classes (no body re-creation) — the navigation counterpart to picker._paintOpen. */
	_applyActiveClasses()
	{
		if (typeof document === 'undefined') { return; }
		const tmpHash = this.options.AccordionHash;
		const tmpMode = this.options.RenderMode || 'accordion';
		const tmpActiveHash = this._activeStepHash();
		const tmpVisible = this._visibleStepHashes();
		this._steps.forEach((pStep) =>
		{
			if (tmpMode === 'accordion')
			{
				const tmpPanel = document.getElementById(`PSA_Panel_${tmpHash}_${pStep.Hash}`);
				if (tmpPanel && tmpPanel.classList)
				{
					tmpPanel.classList.toggle('psa-panel-open', tmpVisible.has(pStep.Hash));
					tmpPanel.classList.toggle('psa-panel-active', pStep.Hash === tmpActiveHash);
				}
			}
			else
			{
				const tmpBody = document.getElementById(this._bodyDomId(pStep.Hash));
				if (tmpBody && tmpBody.classList) { tmpBody.classList.toggle('psa-step-body-active', tmpVisible.has(pStep.Hash)); }
			}
		});
	}

	/** Repaint ONLY the chrome (headers / rail / wizard head / nav / error) — never the body containers. */
	_renderChrome()
	{
		const tmpState = this._buildState();
		const tmpHash = this.options.AccordionHash;
		if (typeof document === 'undefined') { this._applyActiveClasses(); return; }

		if (tmpState.IsAccordion)
		{
			tmpState.Steps.forEach((pStepProjection) =>
			{
				const tmpHTML = this.pict.parseTemplateByHash('Pict-Section-Accordion-PanelHeaderInner', pStepProjection);
				this.pict.ContentAssignment.assignContent(`#PSA_Header_${tmpHash}_${pStepProjection.Hash}`, tmpHTML);
			});
		}
		else if (tmpState.IsWizard && tmpState.WizardSlot[0])
		{
			const tmpRecord = tmpState.WizardSlot[0];
			this.pict.ContentAssignment.assignContent(`#PSA_WizHead_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-WizardHeadInner', tmpRecord));
			this.pict.ContentAssignment.assignContent(`#PSA_Err_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-ErrorRegion', tmpRecord));
			this.pict.ContentAssignment.assignContent(`#PSA_Nav_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-NavFooterInner', tmpRecord));
		}
		else if (tmpState.IsStepper && tmpState.StepperSlot[0])
		{
			const tmpRecord = tmpState.StepperSlot[0];
			this.pict.ContentAssignment.assignContent(`#PSA_Rail_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-RailInner', tmpRecord));
			this.pict.ContentAssignment.assignContent(`#PSA_Err_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-ErrorRegion', tmpRecord));
			this.pict.ContentAssignment.assignContent(`#PSA_Nav_${tmpHash}`, this.pict.parseTemplateByHash('Pict-Section-Accordion-NavFooterInner', tmpRecord));
		}
		this._applyActiveClasses();
	}

	/** @param {number} pFromIndex @return {Record<string, any>|null} The next enabled step after an index. */
	_nextEnabledStep(pFromIndex)
	{
		const tmpFlags = this._flags();
		for (let i = pFromIndex + 1; i < this._steps.length; i++)
		{
			if ((tmpFlags[this._steps[i].Hash] || {}).Enabled !== false) { return this._steps[i]; }
		}
		return null;
	}

	/** @param {number} pFromIndex @return {Record<string, any>|null} The previous enabled step before an index. */
	_prevEnabledStep(pFromIndex)
	{
		const tmpFlags = this._flags();
		for (let i = pFromIndex - 1; i >= 0; i--)
		{
			if ((tmpFlags[this._steps[i].Hash] || {}).Enabled !== false) { return this._steps[i]; }
		}
		return null;
	}

	/** @param {string} pTo @param {string} pFrom */
	_fireStepChange(pTo, pFrom)
	{
		if (typeof this.options.OnStepChange !== 'function') { return; }
		const tmpTo = this._steps.find((pStep) => pStep.Hash === pTo) || null;
		const tmpFrom = this._steps.find((pStep) => pStep.Hash === pFrom) || null;
		try { this.options.OnStepChange(tmpTo, tmpFrom); }
		catch (pError) { this.pict.log.warn(`pict-section-accordion [${this.options.AccordionHash}] OnStepChange threw.`, pError); }
	}

	// --- Public navigation API ---

	/**
	 * Navigate to a step (wizard/stepper) or open it (accordion). Honors Enabled + LinearGating.
	 * @param {string} pHash
	 * @return {Promise<boolean>} resolves true if the navigation happened.
	 */
	goToStep(pHash)
	{
		const tmpStep = this._steps.find((pStep) => pStep.Hash === pHash);
		if (!tmpStep) { return Promise.resolve(false); }
		if ((this._flags()[pHash] || {}).Enabled === false) { return Promise.resolve(false); }
		if (this.options.LinearGating && (this.options.RenderMode !== 'accordion') && tmpStep.Index > this._state().MaxReachedIndex)
		{
			return Promise.resolve(false);
		}
		const tmpFrom = this._activeStepHash();
		if (tmpFrom === pHash && (this.options.RenderMode !== 'accordion')) { return Promise.resolve(true); }
		this._setActiveStepHash(pHash);
		if ((this.options.RenderMode || 'accordion') === 'accordion')
		{
			const tmpState = this._state();
			if (!this.options.AllowMultipleOpen) { tmpState.OpenHashes = []; }
			if (tmpState.OpenHashes.indexOf(pHash) < 0) { tmpState.OpenHashes.push(pHash); }
		}
		if (tmpStep.Index > this._state().MaxReachedIndex) { this._state().MaxReachedIndex = tmpStep.Index; }
		this._renderChrome();
		this._fireStepChange(pHash, tmpFrom);
		return Promise.resolve(true);
	}

	/**
	 * Accordion: open/close a panel (single-open unless AllowMultipleOpen). Wizard/stepper: navigate.
	 * @param {string} pHash
	 */
	toggleStep(pHash)
	{
		if ((this.options.RenderMode || 'accordion') !== 'accordion') { return this.goToStep(pHash); }
		const tmpStep = this._steps.find((pStep) => pStep.Hash === pHash);
		if (!tmpStep) { return; }
		if ((this._flags()[pHash] || {}).Enabled === false) { return; }
		const tmpState = this._state();
		const tmpFrom = this._activeStepHash();
		const tmpIndex = tmpState.OpenHashes.indexOf(pHash);
		if (tmpIndex >= 0)
		{
			tmpState.OpenHashes.splice(tmpIndex, 1);
		}
		else
		{
			if (!this.options.AllowMultipleOpen) { tmpState.OpenHashes = []; }
			tmpState.OpenHashes.push(pHash);
			this._setActiveStepHash(pHash);
		}
		this._renderChrome();
		if (tmpState.OpenHashes.indexOf(pHash) >= 0) { this._fireStepChange(pHash, tmpFrom); }
	}

	/**
	 * Advance: run the active step's CanAdvance gate; on pass, mark it complete and move to the next
	 * enabled step (or fire OnComplete on the last step). On block, set the step's error.
	 * @return {Promise<boolean>} resolves true if advanced (or completed), false if gated.
	 */
	next()
	{
		const tmpActiveHash = this._activeStepHash();
		const tmpStep = this._steps.find((pStep) => pStep.Hash === tmpActiveHash);
		if (!tmpStep) { return Promise.resolve(false); }
		return Promise.resolve(this._evaluateCanAdvance(tmpStep)).then((pResult) =>
		{
			const tmpAllow = (pResult === true) || (pResult && pResult.allow === true);
			if (!tmpAllow)
			{
				const tmpMessage = (pResult && pResult.message) ? pResult.message : this.options.GateBlockedMessage;
				this.setStepError(tmpActiveHash, tmpMessage);
				return false;
			}
			this.setStepError(tmpActiveHash, null);
			this.setStepComplete(tmpActiveHash, true);
			const tmpNext = this._nextEnabledStep(tmpStep.Index);
			if (!tmpNext)
			{
				if (typeof this.options.OnComplete === 'function') { this.options.OnComplete(); }
				return true;
			}
			if (tmpNext.Index > this._state().MaxReachedIndex) { this._state().MaxReachedIndex = tmpNext.Index; }
			this.goToStep(tmpNext.Hash);
			return true;
		});
	}

	/** Go back to the previous enabled step (never gated). */
	back()
	{
		const tmpStep = this._steps.find((pStep) => pStep.Hash === this._activeStepHash());
		if (!tmpStep) { return Promise.resolve(false); }
		const tmpPrev = this._prevEnabledStep(tmpStep.Index);
		if (!tmpPrev) { return Promise.resolve(false); }
		return this.goToStep(tmpPrev.Hash);
	}

	/** @param {Record<string, any>} pStep @return {boolean|Promise<boolean>|{allow:boolean,message?:string}} */
	_evaluateCanAdvance(pStep)
	{
		if (typeof pStep.CanAdvance !== 'function') { return true; }
		const tmpContext = { Step: pStep, AccordionHash: this.options.AccordionHash, AppData: this.pict.AppData, view: this };
		try { return pStep.CanAdvance(tmpContext); }
		catch (pError) { this.pict.log.warn(`pict-section-accordion [${this.options.AccordionHash}] CanAdvance threw; allowing.`, pError); return true; }
	}

	/** @param {string} pHash @param {boolean} pBool */
	setStepComplete(pHash, pBool)
	{
		const tmpFlags = this._flags();
		if (!tmpFlags[pHash]) { tmpFlags[pHash] = {}; }
		tmpFlags[pHash].Complete = !!pBool;
		this._renderChrome();
	}

	/** @param {string} pHash @param {boolean} pBool */
	setStepEnabled(pHash, pBool)
	{
		const tmpFlags = this._flags();
		if (!tmpFlags[pHash]) { tmpFlags[pHash] = {}; }
		tmpFlags[pHash].Enabled = !!pBool;
		this._renderChrome();
	}

	/** @param {string} pHash @param {string|null} pMessage */
	setStepError(pHash, pMessage)
	{
		const tmpFlags = this._flags();
		if (!tmpFlags[pHash]) { tmpFlags[pHash] = {}; }
		tmpFlags[pHash].Error = pMessage || null;
		this._renderChrome();
	}

	/** Re-normalize the step list (provider reconfigure path); resets nav state. @param {Array<any>} pSteps */
	reconfigureSteps(pSteps)
	{
		this._steps = normalizeSteps(this.options.AccordionHash, pSteps);
		const tmpState = this._state();
		delete tmpState.StepFlags;
		delete tmpState.ActiveStepHash;
		delete tmpState.OpenHashes;
		delete tmpState.MaxReachedIndex;
		this._ensureState();
	}

	/** @return {Record<string, any>|null} The active step config (incl. its DestinationAddress). */
	getActiveStep()
	{
		return this._steps.find((pStep) => pStep.Hash === this._activeStepHash()) || null;
	}

	/** @return {Array<string>} The open step hashes (accordion) or the single active hash. */
	getOpenSteps()
	{
		return Array.from(this._visibleStepHashes());
	}

	/** @return {Record<string, any>} The serializable nav state (function-free; round-trips through JSON). */
	getState()
	{
		const tmpState = this._state();
		return {
			AccordionHash: this.options.AccordionHash,
			RenderMode: this.options.RenderMode || 'accordion',
			ActiveStepHash: tmpState.ActiveStepHash,
			StepFlags: JSON.parse(JSON.stringify(tmpState.StepFlags || {})),
			OpenHashes: (tmpState.OpenHashes || []).slice(),
			MaxReachedIndex: tmpState.MaxReachedIndex,
		};
	}
}

module.exports = PictViewAccordion;

module.exports.default_configuration = _DEFAULT_CONFIGURATION;
