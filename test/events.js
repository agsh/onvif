const assert = require('assert');
const onvif = require('../lib/onvif');
const	serverMockup = require('../test/serverMockup');

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
			cam.pullMessages({});
		});
		cam.pullMessages({}, (err) => {
			assert.notEqual(err, null);
			done();
		});
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
	it('should resume long-pulling when connection with server fails', (done) => {
		// wait 1 second for any Pull requests still running when we removed the listener to complete
		let gotMessage = 0;
		let pullMessagesCallCount = 0;
		const onEvent = () => {
			if (gotMessage === 10) {
				// after the tenth message, the next requests will reset the connection
				serverMockup.connectionBreaker.break = true;
			}
			gotMessage += 1;
		};
		const pullMessages = cam.pullMessages;
		cam.pullMessages = function(options, callback) {
			pullMessagesCallCount += 1;
			pullMessages.call(cam, options, callback);
		};
		cam.on('event', onEvent);
		setTimeout(() => {
			serverMockup.connectionBreaker.break = false;
			cam.pullMessages = pullMessages;
			assert.ok(gotMessage === 11 || gotMessage === 12);
			assert.ok(pullMessagesCallCount > gotMessage && pullMessagesCallCount > 20);
			cam.removeListener('event', onEvent);
			cam.unsubscribe(done);
		}, 1.5 * 1000);
	});
	it('should return an error when calling renew without subscription', (done) => {
		cam.renew({}, (err) => {
			assert.ok(err instanceof Error);
			done();
		});
	});
});
