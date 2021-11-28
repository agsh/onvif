const assert = require('assert');
const onvif = require('../lib/onvif');

describe('Discovery', function() {
	this.timeout(10000);
	before(() => {
		if (process.platform === 'win32') {
			this.skip('Skipping test on Windows');
		}
	});
	it('should discover at least one device (mockup server)', (done) => {
		onvif.Discovery.probe({timeout: 1000}, (err, cams) => {
			assert.strictEqual(err, null);
			assert.ok(cams.length > 0);
			assert.ok(cams[0] instanceof onvif.Cam);
			done();
		});
	});
	it('should discover at least one device with defaults and callback', (done) => {
		onvif.Discovery.probe((err, cams) => {
			assert.strictEqual(err, null);
			assert.ok(cams.length > 0);
			assert.ok(cams[0] instanceof onvif.Cam);
			done();
		});
	});
	it('should work as event emitter (also test `probe` without params)', (done) => {
		onvif.Discovery.once('device', (cam) => {
			assert.ok(cam);
			assert.ok(cam instanceof onvif.Cam);
			done();
		});
		onvif.Discovery.probe();
	});
	it('should return info object instead of Cam object when `resolve` is false', (done) => {
		onvif.Discovery.once('device', (cam) => {
			assert.ok(cam);
			assert.strictEqual(cam instanceof onvif.Cam, false);
			done();
		});
		onvif.Discovery.probe({resolve: false});
	});
	it('should emit and error and return error in callback when response is wrong', (done) => {
		let emit = false;
		onvif.Discovery.once('error', (err, xml) => {
			assert.strictEqual(xml, 'lollipop');
			assert.strictEqual(err.indexOf('Wrong SOAP message'), 0);
			emit = true;
		});
		onvif.Discovery.probe({timeout: 1000, messageId: 'e7707'}, (err) => {
			assert.notStrictEqual(err, null);
			assert.ok(emit);
			done();
		});
	});
	it('should get single device for one probe', (done) => {
		const cams = {};
		const onCam = (data) => {
			if (cams[data.probeMatches.probeMatch.XAddrs]) {
				assert.fail();
			} else {
				cams[data.probeMatches.probeMatch.XAddrs] = true;
			}
		};
		onvif.Discovery.on('device', onCam);
		onvif.Discovery.probe({timeout: 1000, resolve: false, messageId: 'd0-61e'}, (err, cCams) => {
			assert.strictEqual(err, null);
			assert.strictEqual(Object.keys(cams).length, cCams.length);
			onvif.Discovery.removeListener('device', onCam);
			done();
		});
	});
	it('should get single device for one probe when `lo` is specified', (done) => {
		const cams = {};
		const onCam = (data) => {
			if (cams[data.probeMatches.probeMatch.XAddrs]) {
				assert.fail();
			} else {
				cams[data.probeMatches.probeMatch.XAddrs] = true;
			}
		};
		onvif.Discovery.on('device', onCam);
		onvif.Discovery.probe({timeout: 1000, resolve: false, device: 'lo'}, (err, cCams) => {
			assert.strictEqual(err, null);
			assert.strictEqual(Object.keys(cams).length, cCams.length);
			onvif.Discovery.removeListener('device', onCam);
			done();
		});
	});
	it('should got single device for one probe even when bogus device is specified (fallback to defaultroute)', (done) => {
		const cams = {};
		const onCam = (data) => {
			if (cams[data.probeMatches.probeMatch.XAddrs]) {
				assert.fail();
			} else {
				cams[data.probeMatches.probeMatch.XAddrs] = true;
			}
		};
		onvif.Discovery.on('device', onCam);
		onvif.Discovery.probe({timeout: 1000, resolve: false, device: 'loopydevice'}, (err, cCams) => {
			assert.strictEqual(err, null);
			assert.strictEqual(Object.keys(cams).length, cCams.length);
			onvif.Discovery.removeListener('device', onCam);
			done();
		});
	});
});
