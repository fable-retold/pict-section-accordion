const libPictApplication = require('pict-application');

// The module under test — required by relative path so edits to source/ land in the build.
const libPictSectionAccordion = require('../../../source/Pict-Section-Accordion.js');

const _STEPS =
[
	{ Hash: 'details', Title: 'Details', Subtitle: 'Who & what' },
	{ Hash: 'options', Title: 'Options' },
	{ Hash: 'review', Title: 'Review' },
];

class AccordionDemoApplication extends libPictApplication
{
	onAfterInitializeAsync(fCallback)
	{
		this.pict.addProvider('Pict-Section-Accordion', libPictSectionAccordion.default_configuration, libPictSectionAccordion);
		const tmpAccordion = this.pict.providers['Pict-Section-Accordion'];

		// 1. Accordion mode — collapsible panels, one open at a time.
		tmpAccordion.createAccordion('DemoAccordion',
			{
				DestinationAddress: '#DemoAccordion',
				RenderMode: 'accordion',
				Steps: _STEPS,
				OnStepChange: (pTo) => this._fillBody('DemoAccordion', pTo),
			});
		this.pict.views['DemoAccordion'].render();
		this._fillAllBodies('DemoAccordion', _STEPS);

		// 2. Wizard mode — back/next, with a gate on the first step (must tick the box).
		tmpAccordion.createAccordion('DemoWizard',
			{
				DestinationAddress: '#DemoWizard',
				RenderMode: 'wizard',
				Steps:
				[
					{ Hash: 'details', Title: 'Details', Subtitle: 'Who & what',
						CanAdvance: () =>
						{
							const tmpBox = document.getElementById('wiz-agree');
							return (tmpBox && tmpBox.checked) ? true : { allow: false, message: 'Tick the box to continue.' };
						} },
					{ Hash: 'options', Title: 'Options' },
					{ Hash: 'review', Title: 'Review' },
				],
				OnComplete: () => this.pict.ContentAssignment.assignContent('#WizardReadout', '<span class="demo-ok">Wizard complete! 🎉</span>'),
			});
		this.pict.views['DemoWizard'].render();
		this._fillAllBodies('DemoWizard', _STEPS, { details: '<label class="demo-check"><input type="checkbox" id="wiz-agree" /> I agree to the terms</label>' });

		// 3. Stepper mode — numbered rail; also the target of the external-control buttons.
		tmpAccordion.createAccordion('DemoStepper',
			{
				DestinationAddress: '#DemoStepper',
				RenderMode: 'stepper',
				Steps: _STEPS,
				OnStepChange: () => this._showState(),
				OnComplete: () => this._showState(),
			});
		this.pict.views['DemoStepper'].render();
		this._fillAllBodies('DemoStepper', _STEPS);
		this._showState();

		return super.onAfterInitializeAsync(fCallback);
	}

	/** Fill every step's body container with demo content (host owns the bodies). */
	_fillAllBodies(pAccHash, pSteps, pOverrides)
	{
		const tmpOverrides = pOverrides || {};
		pSteps.forEach((pStep) =>
		{
			const tmpExtra = tmpOverrides[pStep.Hash] || '';
			const tmpHTML = `<p class="demo-body">This is the <b>${pStep.Title}</b> step body — rendered by the host into the accordion's body container.</p>${tmpExtra}`;
			this.pict.ContentAssignment.assignContent(`#PSA_Body_${pAccHash}_${pStep.Hash}`, tmpHTML);
		});
	}

	/** OnStepChange convenience for the accordion: (re)fill a single body when its panel opens. */
	_fillBody(pAccHash, pStep)
	{
		if (!pStep) { return; }
		this.pict.ContentAssignment.assignContent(`#PSA_Body_${pAccHash}_${pStep.Hash}`,
			`<p class="demo-body">This is the <b>${pStep.Title}</b> step body — rendered by the host into the accordion's body container.</p>`);
	}

	// --- External programmatic control of the stepper (a host driving the control from outside) ---

	completeStep(pHash) { this.pict.views['DemoStepper'].setStepComplete(pHash, true); this._showState(); }
	errorStep(pHash) { this.pict.views['DemoStepper'].setStepError(pHash, 'Flagged by an external control.'); this._showState(); }
	toggleEnabled(pHash)
	{
		const tmpView = this.pict.views['DemoStepper'];
		const tmpEnabled = (tmpView._flags()[pHash] || {}).Enabled !== false;
		tmpView.setStepEnabled(pHash, !tmpEnabled);
		this._showState();
	}
	goStep(pHash) { this.pict.views['DemoStepper'].goToStep(pHash); }

	/** Paint the stepper's serializable state. */
	_showState()
	{
		const tmpState = this.pict.views['DemoStepper'].getState();
		this.pict.ContentAssignment.assignContent('#StateReadout', `<pre>${JSON.stringify(tmpState, null, 2)}</pre>`);
	}
}

AccordionDemoApplication.default_configuration =
{
	Name: 'Accordion Demo',
	Hash: 'AccordionDemo',
};

module.exports = AccordionDemoApplication;

module.exports.default_configuration = AccordionDemoApplication.default_configuration;
