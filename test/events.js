const assert = require('assert');
const onvif = require('../lib/onvif');

describe('Events', () => {
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
	it('should request device events', (done) => {
		cam.getEventProperties((err, res) => {
			assert.strictEqual(err, null);
			assert.deepStrictEqual(cam.events.properties, res);
			done();
		});
	});
	it('should request event service capabilities', (done) => {
		cam.getEventServiceCapabilities((err, res) => {
			assert.strictEqual(err, null);
			assert.ok([
				'PersistentNotificationStorage'
				, 'MaxPullPoints'
				, 'MaxNotificationProducers'
				, 'WSPausableSubscriptionManagerInterfaceSupport'
				, 'WSPullPointSupport'
				, 'WSSubscriptionPolicySupport'
			].every((name) => res[name] !== undefined));
			done();
		});
	});
	it('should throws an error in PullMessages method when no pull-point subscription exists', (done) => {
		assert.throws(() => {
			cam.pullMessages({}, () => {});
		});
		done();
	});
	it('should create PullPointSubscription', (done) => {
		cam.createPullPointSubscription((err, data) => {
			assert.strictEqual(err, null);
			assert.deepStrictEqual(data, cam.events.subscription);
			done();
		});
	});
	it('should get messages with PullMessage method', (done) => {
		cam.pullMessages({}, (err, data) => {
			assert.strictEqual(err, null);
			assert.ok(['currentTime', 'terminationTime'].every((name) => data[name] !== undefined));
			done();
		});
	});
	it('should create PullPoint subscription via `event` event and receive events from mockup server', (done) => {
		delete cam.events.terminationTime; // remove subscribtion if any
		let gotMessage = 0;
		const onEvent = () => gotMessage += 1;
		cam.on('event', onEvent);
		setTimeout(() => {
			assert.ok(cam.events.terminationTime !== undefined);
			assert.ok(gotMessage > 0);
			cam.removeListener('event', onEvent);
			done();
		}, 1000);
	});
	it('should stop pulling when nobody is listen to `event` event', (done) => {
		// wait 1 second for any Pull requests still running when we removed the listener to complete
		setTimeout(() => {
			assert.ok(cam.events.terminationTime === undefined);
			done();
		}, 1000);
	});
});
