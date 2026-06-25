/*
	Unit tests for pict-section-accordion — module exports, createAccordion() reuse, and step
	normalization defaults.
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
	'Pict-Section-Accordion',
	() =>
	{
		suite
		(
			'Module exports',
			() =>
			{
				test
				(
					'exports the provider class + named pieces',
					(fDone) =>
					{
						Expect(libPictSectionAccordion).to.be.a('function');
						Expect(libPictSectionAccordion.PictProviderAccordion).to.be.a('function');
						Expect(libPictSectionAccordion.PictViewAccordion).to.be.a('function');
						return fDone();
					}
				);
				test
				(
					'exports a default_configuration with the provider identifier',
					(fDone) =>
					{
						Expect(libPictSectionAccordion.default_configuration).to.be.an('object');
						Expect(libPictSectionAccordion.default_configuration.ProviderIdentifier).to.equal('Pict-Section-Accordion');
						return fDone();
					}
				);
			}
		);

		suite
		(
			'Provider createAccordion',
			() =>
			{
				test
				(
					'creates an accordion view instance reachable through pict.views',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('A-Create', { Steps: STEPS });
						Expect(tmpView).to.be.an('object');
						Expect(tmpProvider.pict.views['A-Create']).to.equal(tmpView);
						return fDone();
					}
				);
				test
				(
					'reuses (reconfigures) an existing instance for the same hash',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpFirst = tmpProvider.createAccordion('A-Reuse', { RenderMode: 'accordion', Steps: STEPS });
						const tmpSecond = tmpProvider.createAccordion('A-Reuse', { RenderMode: 'wizard', Steps: STEPS });
						Expect(tmpSecond).to.equal(tmpFirst);
						Expect(tmpFirst.options.RenderMode).to.equal('wizard');
						return fDone();
					}
				);
			}
		);

		suite
		(
			'Step normalization',
			() =>
			{
				test
				(
					'fills defaults (Title <- Hash, Enabled true) and activates the first enabled step',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						const tmpView = tmpProvider.createAccordion('A-Norm', { Steps: [ { Hash: 'x' }, { Hash: 'y', Enabled: false } ] });
						Expect(tmpView._steps[0].Title).to.equal('x');
						Expect(tmpView._steps[0].Enabled).to.equal(true);
						Expect(tmpView._steps[1].Enabled).to.equal(false);
						Expect(tmpView.getActiveStep().Hash).to.equal('x');
						return fDone();
					}
				);
				test
				(
					'throws on a duplicate step Hash',
					(fDone) =>
					{
						const tmpProvider = newProvider();
						Expect(() => tmpProvider.createAccordion('A-Dup', { Steps: [ { Hash: 'a' }, { Hash: 'a' } ] })).to.throw(/duplicate step Hash/);
						return fDone();
					}
				);
			}
		);
	}
);
