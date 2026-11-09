const synthTest = !process.env.HOSTNAME;

const assert = require('assert');
const onvif = require('../lib/onvif');
let serverMockup;
if (synthTest) {
	serverMockup = require('../test/serverMockup');
}

describe('PTZ', () => {
	let cam = null;
	before((done) => {
		const options = {
			hostname: process.env.HOSTNAME || 'localhost',
			username: process.env.USERNAME || 'admin',
			password: process.env.PASSWORD || '9999',
			port: process.env.PORT ? parseInt(process.env.PORT) : 10101,
		};
		cam = new onvif.Cam(options, done);
	});

	describe('getPresets', () => {
		const isValidPrest = (preset) => {
			return typeof preset == 'object' &&
				// name and PTZPosition are optional in the standard onvif specs
				// https://www.onvif.org/ver20/ptz/wsdl/ptz.wsdl
				// only token is required
				typeof preset.$.token == 'string';
		};
		const assertPresetsShape = (presetsByName, presetsByToken) => {
			assert.ok(Object.keys(presetsByName).length > 0);
			assert.ok(Object.keys(presetsByToken).length > 0);
			// original API: name → token (also stored on #presets); duplicate names overwrite — last wins
			assert.strictEqual(cam.presets, presetsByName);
			Object.keys(presetsByName).forEach((name) => {
				const token = presetsByName[name];
				assert.strictEqual(typeof token, 'string');
				assert.ok(isValidPrest(presetsByToken[token]));
				assert.strictEqual(presetsByToken[token].name, name);
				assert.strictEqual(presetsByToken[token].$.token, token);
			});
			// token → full preset object (unique even when names duplicate)
			Object.keys(presetsByToken).forEach((token) => {
				const preset = presetsByToken[token];
				assert.ok(isValidPrest(preset));
				assert.strictEqual(preset.$.token, token);
			});
			// mock has two presets named Home (tokens Home and Home2) — name map keeps the last
			if (presetsByToken.Home && presetsByToken.Home2) {
				assert.strictEqual(presetsByToken.Home.name, 'Home');
				assert.strictEqual(presetsByToken.Home2.name, 'Home');
				assert.strictEqual(presetsByName.Home, 'Home2');
			}
		};
		it('should return name→token and token→preset maps and set #presets', (done) => {
			cam.getPresets({}, (err, presetsByName, presetsByToken) => {
				assert.strictEqual(err, null);
				assertPresetsShape(presetsByName, presetsByToken);
				done();
			});
		});
		it('should return name→token and token→preset maps without options', (done) => {
			cam.getPresets((err, presetsByName, presetsByToken) => {
				assert.strictEqual(err, null);
				assertPresetsShape(presetsByName, presetsByToken);
				done();
			});
		});
		if (synthTest) {
			it('should work with one preset', (done) => {
				serverMockup.conf.one = true;
				cam.getPresets((err, presetsByName, presetsByToken) => {
					assert.strictEqual(err, null);
					assert.strictEqual(Object.keys(presetsByName).length, 1);
					assert.strictEqual(Object.keys(presetsByToken).length, 1);
					assertPresetsShape(presetsByName, presetsByToken);
					delete serverMockup.conf.one;
					done();
				});
			});
		}
	});

	describe('gotoPreset', () => {
		it('should just run', (done) => {
			cam.gotoPreset({preset: Object.keys(cam.profiles)[0]}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		it('should run with speed definition', (done) => {
			cam.gotoPreset({preset: Object.keys(cam.profiles)[0], speed: 0.1}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('setPreset', () => {
		it('should run with preset name (new)', (done) => {
			cam.setPreset({presetName: 'testPreset'}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		it('should run with preset token (update)', (done) => {
			cam.setPreset({presetToken: 1}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('removePreset', () => {
		it('should just run', (done) => {
			cam.removePreset({presetToken: Object.keys(cam.profiles)[0]}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('gotoHomePosition', () => {
		it('should just run', (done) => {
			cam.gotoHomePosition({speed: {x: 1.0, y: 1.0, zoom: 1.0}}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('setHomePosition', () => {
		it('should just run', (done) => {
			cam.setHomePosition({}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('absolute move', () => {
		it('should returns empty RelativeResponseObject', (done) => {
			cam.absoluteMove({
				x: 1,
				y: 1,
				zoom: 1,
			}, done);
		});
		it('should works without callback', () => {
			cam.absoluteMove({
				x: 0,
				y: 0,
				zoom: 1,
			});
		});
	});

	describe('relative move', () => {
		it('should returns empty RelativeResponseObject', (done) => {
			cam.relativeMove({
				speed: {
					x: 0.1,
					y: 0.1,
				},
				x: 1,
				y: 1,
				zoom: 1,
			}, done);
		});
		it('should works without callback', () => {
			cam.relativeMove({
				speed: {
					x: 0.1,
					y: 0.1,
				},
				x: 1,
				y: 1,
				zoom: 1,
			});
		});
	});

	describe('continuous move', () => {
		it('should returns empty ContinuousResponseObject', (done) => {
			cam.continuousMove({
				x: 0.1,
				y: 0.1,
				zoom: 0,
			}, done);
		});
		it('should set omitted pan-tilt parameters to zero', (done) => {
			cam.continuousMove({
				x: 0.1,
				zoom: 0,
			}, done);
		});
	});

	describe('stop', () => {
		it('should stop all movements when options are ommited', (done) => cam.stop(done));
		it('should stop only zoom movement', (done) => cam.stop({zoom: true}, done));
		it('should stop only pan-tilt movement', (done) => cam.stop({panTilt: true}, done));
		it('should stop all movements', (done) => cam.stop({zoom: true, panTilt: true}, done));
		it('should work without callback', (done) => {
			cam.stop({});
			cam.stop();
			done();
		});
	});

	describe('getStatus', () => {
		it('should returns position status', (done) => {
			cam.getStatus({}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});
});
