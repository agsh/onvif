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
});
