/*
	The heart of pict-section-accordion: the step-state machine — navigation, CanAdvance gating
	(sync + async), per-step flags, serializable state, and mode parity.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictSectionAccordion = require('../source/Pict-Section-Accordion.js');

const configureTestPict = () =>
{
	const tmpPict = new libPict({ LogStreams: [ { loggertype: 'console', streamtype: 'console', level: 'error' } ] });
	tmpPict.ContentAssignment.customAssignFunction = () => '';
	tmpPict.ContentAssignment.customReadFunction = () => '';
	tmpPict.ContentAssignment.customGetElementFunction = () => '';
	tmpPict.ContentAssignment.customAppendElementFunction = () => '';
	return tmpPict;
};

const newProvider = () =>
{
	const tmpPict = configureTestPict();
	return tmpPict.addProvider('Pict-Section-Accordion', libPictSectionAccordion.default_configuration, libPictSectionAccordion);
};

const STEPS =
[
	{ Hash: 'a', Title: 'Account' },
	{ Hash: 'b', Title: 'Plan' },
	{ Hash: 'c', Title: 'Review' },
];

suite
(
	'Pict-Section-Accordion — step state',
	() =>
	{
		suite
		(
			'navigation',
			() =>
			{
				test
				(
					'goToStep (accordion) activates a step and fires OnStepChange(to, from)',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpChanges = [];
						const tmpView = tmpProvider.createAccordion('NavAcc',
							{ RenderMode: 'accordion', Steps: STEPS, OnStepChange: (pTo, pFrom) => tmpChanges.push([ pTo && pTo.Hash, pFrom && pFrom.Hash ]) });
						tmpView.goToStep('b').then((pOk) =>
						{
							Expect(pOk).to.equal(true);
							Expect(tmpView.getActiveStep().Hash).to.equal('b');
							Expect(tmpChanges).to.deep.equal([ [ 'b', 'a' ] ]);
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'goToStep refuses a disabled step',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('NavDis', { RenderMode: 'accordion', Steps: STEPS });
						tmpView.setStepEnabled('c', false);
						tmpView.goToStep('c').then((pOk) =>
						{
							Expect(pOk).to.equal(false);
							Expect(tmpView.getActiveStep().Hash).to.equal('a');
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'LinearGating blocks jumping ahead past the furthest-reached step (wizard)',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('NavLin', { RenderMode: 'wizard', Steps: STEPS });
						tmpView.goToStep('c').then((pOk) =>
						{
							Expect(pOk).to.equal(false, 'cannot skip to step 3 from step 1');
							Expect(tmpView.getActiveStep().Hash).to.equal('a');
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'back() returns to the previous enabled step',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('NavBack', { RenderMode: 'wizard', Steps: STEPS });
						tmpView.next().then(() => tmpView.back()).then(() =>
						{
							Expect(tmpView.getActiveStep().Hash).to.equal('a');
							return fDone();
						}).catch(fDone);
					}
				);
			}
		);

		suite
		(
			'next() gating',
			() =>
			{
				test
				(
					'a CanAdvance returning false blocks the advance and sets the step error',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('GateF',
							{ RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A', CanAdvance: () => false }, { Hash: 'b', Title: 'B' } ] });
						tmpView.next().then((pOk) =>
						{
							Expect(pOk).to.equal(false);
							Expect(tmpView.getActiveStep().Hash).to.equal('a');
							Expect(tmpView._flags()['a'].Error).to.be.a('string');
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'a CanAdvance returning true advances and marks the prior step complete',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('GateT', { RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A' }, { Hash: 'b', Title: 'B' } ] });
						tmpView.next().then((pOk) =>
						{
							Expect(pOk).to.equal(true);
							Expect(tmpView.getActiveStep().Hash).to.equal('b');
							Expect(tmpView._flags()['a'].Complete).to.equal(true);
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'an async CanAdvance (Promise<false>) is awaited and blocks',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('GateAsync',
							{ RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A', CanAdvance: () => Promise.resolve(false) }, { Hash: 'b', Title: 'B' } ] });
						tmpView.next().then((pOk) =>
						{
							Expect(pOk).to.equal(false);
							Expect(tmpView.getActiveStep().Hash).to.equal('a');
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'a CanAdvance returning { allow:false, message } sets that message',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('GateMsg',
							{ RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A', CanAdvance: () => ({ allow: false, message: 'Pick a plan first.' }) }, { Hash: 'b', Title: 'B' } ] });
						tmpView.next().then(() =>
						{
							Expect(tmpView._flags()['a'].Error).to.equal('Pick a plan first.');
							return fDone();
						}).catch(fDone);
					}
				);
				test
				(
					'next() on the last step fires OnComplete exactly once',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						let tmpCompleted = 0;
						const tmpView = tmpProvider.createAccordion('GateDone',
							{ RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A' }, { Hash: 'b', Title: 'B' } ], OnComplete: () => { tmpCompleted++; } });
						tmpView.next().then(() => tmpView.next()).then(() =>
						{
							Expect(tmpView.getActiveStep().Hash).to.equal('b');
							Expect(tmpCompleted).to.equal(1);
							return fDone();
						}).catch(fDone);
					}
				);
			}
		);

		suite
		(
			'flags + serialization',
			() =>
			{
				test
				(
					'setStepComplete / setStepEnabled / setStepError mutate the flags',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('Flags', { Steps: STEPS });
						tmpView.setStepComplete('a', true);
						tmpView.setStepError('b', 'oops');
						tmpView.setStepEnabled('c', false);
						Expect(tmpView._flags()['a'].Complete).to.equal(true);
						Expect(tmpView._flags()['b'].Error).to.equal('oops');
						Expect(tmpView._flags()['c'].Enabled).to.equal(false);
						tmpView.setStepError('b', null);
						Expect(tmpView._flags()['b'].Error).to.equal(null);
						return fDone();
					}
				);
				test
				(
					'getState() is function-free and round-trips through JSON',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('Serialize',
							{ RenderMode: 'wizard', Steps: [ { Hash: 'a', Title: 'A', CanAdvance: () => true }, { Hash: 'b', Title: 'B' } ] });
						const tmpState = tmpView.getState();
						const tmpRound = JSON.parse(JSON.stringify(tmpState));
						Expect(tmpRound.ActiveStepHash).to.equal('a');
						Expect(tmpRound.StepFlags.a.Enabled).to.equal(true);
						Expect(tmpRound).to.deep.equal(tmpState);
						return fDone();
					}
				);
				test
				(
					'a saved state can be re-seeded and reproduces the active step',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('Resume', { RenderMode: 'wizard', Steps: STEPS });
						tmpView.next().then(() =>
						{
							const tmpSaved = JSON.parse(JSON.stringify(tmpView.getState()));
							Expect(tmpSaved.ActiveStepHash).to.equal('b');
							// Re-seed a fresh accordion's state slot from the saved snapshot.
							const tmpView2 = tmpProvider.createAccordion('Resume2', { RenderMode: 'wizard', Steps: STEPS });
							const tmpSlot = tmpView2._state();
							tmpSlot.StepFlags = tmpSaved.StepFlags;
							tmpSlot.ActiveStepHash = tmpSaved.ActiveStepHash;
							tmpSlot.OpenHashes = tmpSaved.OpenHashes;
							tmpSlot.MaxReachedIndex = tmpSaved.MaxReachedIndex;
							Expect(tmpView2.getActiveStep().Hash).to.equal('b');
							return fDone();
						}).catch(fDone);
					}
				);
			}
		);

		suite
		(
			'mode parity',
			() =>
			{
				test
				(
					'the same steps under different RenderModes share nav state but differ in mode slots',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpAccordion = tmpProvider.createAccordion('MP-acc', { RenderMode: 'accordion', Steps: STEPS });
						const tmpWizard = tmpProvider.createAccordion('MP-wiz', { RenderMode: 'wizard', Steps: STEPS });
						const tmpStepper = tmpProvider.createAccordion('MP-step', { RenderMode: 'stepper', Steps: STEPS });
						const tmpAccState = tmpAccordion._buildState();
						const tmpWizState = tmpWizard._buildState();
						const tmpStepState = tmpStepper._buildState();
						// Same nav cursor (each starts at the first step).
						Expect(tmpAccordion._activeStepHash()).to.equal('a');
						Expect(tmpWizard._activeStepHash()).to.equal('a');
						Expect(tmpStepper._activeStepHash()).to.equal('a');
						// Different mode dispatch.
						Expect(tmpAccState.IsAccordion).to.equal(true);
						Expect(tmpWizState.IsWizard).to.equal(true);
						Expect(tmpStepState.IsStepper).to.equal(true);
						Expect(tmpAccState.WizardSlot).to.have.lengthOf(0);
						Expect(tmpWizState.AccordionSlot).to.have.lengthOf(0);
						return fDone();
					}
				);
			}
		);
	}
);
