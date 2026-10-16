const assert = require('assert');
const onvif = require('../lib/onvif');

describe('Imaging', () => {
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

	let settings = null;
	let presetToken = null;

	it('should request imaging settings with options object', (done) => {
		cam.getImagingSettings({}, (err, res) => {
			assert.strictEqual(err, null);
			assert.ok(['brightness', 'colorSaturation', 'contrast', 'focus', 'sharpness'].every((prop) => res[prop]));
			settings = res;
			done();
		});
	});
	it('should do the same without options object', (done) => {
		cam.getImagingSettings((err, res) => {
			assert.strictEqual(err, null);
			assert.ok(['brightness', 'colorSaturation', 'contrast', 'focus', 'sharpness'].every((prop) => res[prop]));
			done();
		});
	});
	it('should set imaging configuration', (done) => {
		if (settings === null) {
			throw 'getImagingSettings failed';
		}
		cam.setImagingSettings(settings, (err, res) => {
			assert.strictEqual(err, null);
			assert.strictEqual(res, '');
			done();
		});
	});
	it('should get imaging service capabilities', (done) => {
		cam.getImagingServiceCapabilities((err, res) => {
			assert.strictEqual(err, null);
			assert.strictEqual(typeof res.ImageStabilization, 'boolean');
			done();
		});
	});
	it('should get current preset when no video source token present', (done) => {
		cam.getCurrentImagingPreset((err, res) => {
			assert.strictEqual(err, null);
			assert.ok(['token', 'type', 'name'].every((prop) => res[prop]));
			done();
		});
	});
	it('should get current preset with video source token', (done) => {
		cam.getCurrentImagingPreset(cam.activeSource.sourceToken, (err, res) => {
			assert.strictEqual(err, null);
			assert.ok(['token', 'type', 'name'].every((prop) => res[prop]));
			presetToken = res.token;
			done();
		});
	});
	it('should set current preset with video source and imaging preset tokens', (done) => {
		cam.setCurrentImagingPreset({presetToken}, (err, res) => {
			assert.strictEqual(err, null);
			['token', 'type', 'name'].every((prop) => res[prop]);
			done();
		});
	});
	it('should get Options from the imaging API with video source tokens', (done) => {
		cam.getVideoSourceOptions({token: cam.activeSource.sourceToken}, (err, res) => {
			assert.strictEqual(err, null);
			assert.ok(['brightness', 'colorSaturation', 'contrast'].every((prop) => res[prop]));
			done();
		});
	});

	describe('setImagingSettings serialization', () => {
		/**
		 * Calls setImagingSettings and hands the ImagingSettings XML that was sent to `check`,
		 * which ends the test by calling `done`.
		 * @param {object} options
		 * @param {function} check
		 */
		const sent = (options, check) => {
			let body = null;
			cam.once('rawRequest', (xml) => { body = xml; });
			cam.setImagingSettings(options, (err) => {
				assert.strictEqual(err, null);
				check(body.slice(body.indexOf('<ImagingSettings'), body.indexOf('</ImagingSettings>')));
			});
		};
		const tt = (name, value) => `<${name} xmlns="http://www.onvif.org/ver10/schema">${value}</${name}>`;

		it('should send zero values instead of dropping them', (done) => {
			sent({
				brightness: 0,
				colorSaturation: 0,
				contrast: 0,
				sharpness: 0,
				exposure: {mode: 'MANUAL', minGain: 0, gain: 0, exposureTime: 0},
			}, (settings) => {
				['Brightness', 'ColorSaturation', 'Contrast', 'Sharpness', 'MinGain', 'Gain', 'ExposureTime'].forEach((name) => {
					assert.ok(settings.includes(tt(name, 0)), name + ' 0 should be sent');
				});
				done();
			});
		});

		it('should omit settings that are not given', (done) => {
			sent({brightness: 50}, (settings) => {
				assert.ok(settings.includes(tt('Brightness', 50)));
				['ColorSaturation', 'Contrast', 'Sharpness', 'Exposure', 'Focus', 'IrCutFilter',
					'WideDynamicRange', 'BacklightCompensation', 'WhiteBalance', 'Extension'].forEach((name) => {
					assert.ok(!settings.includes('<' + name + ' '), name + ' should not be sent');
				});
				done();
			});
		});

		it('should omit null and empty values instead of sending them as text', (done) => {
			sent({
				brightness: null,
				contrast: '',
				exposure: {mode: 'MANUAL', minGain: null, gain: ''},
				whiteBalance: {mode: 'AUTO', crGain: null, cbGain: ''},
			}, (settings) => {
				['Brightness', 'Contrast', 'MinGain', 'Gain', 'CrGain', 'CbGain'].forEach((name) => {
					assert.ok(!settings.includes('<' + name + ' '), name + ' should not be sent');
				});
				assert.ok(!settings.includes('null'));
				assert.ok(settings.includes(tt('Mode', 'MANUAL')));
				done();
			});
		});

		it('should send wide dynamic range, backlight compensation and white balance', (done) => {
			sent({
				backlightCompensation: {mode: 'ON', level: 0},
				wideDynamicRange: {mode: 'ON', level: 50},
				whiteBalance: {mode: 'MANUAL', crGain: 0, cbGain: 64},
			}, (settings) => {
				assert.ok(settings.includes(tt('BacklightCompensation', tt('Mode', 'ON') + tt('Level', 0))));
				assert.ok(settings.includes(tt('WideDynamicRange', tt('Mode', 'ON') + tt('Level', 50))));
				assert.ok(settings.includes(tt('WhiteBalance', tt('Mode', 'MANUAL') + tt('CrGain', 0) + tt('CbGain', 64))));
				done();
			});
		});

		it('should write back noise reduction in the shape getImagingSettings returns', (done) => {
			sent({extension: {extension: {extension: {noiseReduction: {level: 0.5}}}}}, (settings) => {
				assert.ok(settings.includes(
					tt('Extension', tt('Extension', tt('Extension', tt('NoiseReduction', tt('Level', 0.5)))))
				));
				done();
			});
		});

		it('should follow the ImagingSettings20 element order', (done) => {
			sent({
				sharpness: 1,
				irCutFilter: 'AUTO',
				whiteBalance: {mode: 'AUTO'},
				wideDynamicRange: {mode: 'OFF'},
				focus: {autoFocusMode: 'AUTO'},
				exposure: {mode: 'AUTO'},
				contrast: 1,
				colorSaturation: 1,
				brightness: 1,
				backlightCompensation: {mode: 'OFF'},
				extension: {extension: {extension: {noiseReduction: {level: 1}}}},
			}, (settings) => {
				const order = ['BacklightCompensation', 'Brightness', 'ColorSaturation', 'Contrast', 'Exposure', 'Focus',
					'IrCutFilter', 'Sharpness', 'WideDynamicRange', 'WhiteBalance', 'Extension'];
				const positions = order.map((name) => settings.indexOf('<' + name + ' '));
				assert.ok(positions.every((p) => p >= 0), 'every element is sent');
				assert.deepStrictEqual([...positions].sort((a, b) => a - b), positions);
				done();
			});
		});

		it('should round-trip settings read from the camera', (done) => {
			cam.getImagingSettings((err, read) => {
				assert.strictEqual(err, null);
				sent(read, (settings) => {
					assert.ok(settings.includes(tt('Brightness', read.brightness)));
					assert.ok(settings.includes(tt('Sharpness', read.sharpness)));
					done();
				});
			});
		});
	});
});
