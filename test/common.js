const synthTest = !process.env.HOSTNAME;

const assert = require('assert');
const onvif = require('../lib/onvif');
let serverMockup;
if (synthTest) {
	serverMockup = require('../test/serverMockup');
}

describe('Common functions', () => {
	let cam = null;
	before(done => {
		const options = {
			hostname: process.env.HOSTNAME || 'localhost',
			username: process.env.USERNAME || 'admin',
			password: process.env.PASSWORD || '9999',
			port: process.env.PORT ? parseInt(process.env.PORT) : 10101,
		};
		cam = new onvif.Cam(options, done);
	});

	describe('default params', () => {
		it('should set default port and path when no one is specified', (done) => {
			const defaultCam = new onvif.Cam({});
			assert.strictEqual(defaultCam.port, 80);
			assert.strictEqual(defaultCam.path, '/onvif/device_service');
			done();
		});
	});

	describe('default autoconnect', () => {
		it('should connect automatically', (done) => {
			const callbackFunction = () => done();
			new onvif.Cam({}, callbackFunction);
		});
	});

	describe('autoconnect disabled', () => {
		it('should not connect automatically', (done) => {
			const options = {
				autoconnect: false,
				timeout: 0
			};
			new onvif.Cam(options, assert.fail);
			setTimeout(done, 100);
		});
	});

	describe('_request', () => {
		it('brokes when no arguments are passed', (done) => {
			assert.throws(() => cam._request());
			done();
		});
		it('brokes when no callback is passed', (done) => {
			assert.throws(() => cam._request({}));
			done();
		});
		it('brokes when no options.body is passed', (done) => {
			assert.throws(() => cam._request({}, () => {}));
			done();
		});
		it('should return an error message when request is bad', (done) => {
			cam._request({body: 'test'}, (err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
		it('should return an error message when the network is unreachible', (done) => {
			const host = cam.hostname;
			cam.hostname = 'wrong hostname';
			cam._request({body: 'test'}, (err) => {
				assert.notStrictEqual(err, null);
				cam.hostname = host;
				done();
			});
		});
		it('should return an error message when the server request times out', (done) => {
			const host = cam.hostname;
			const oldTimeout = cam.timeout;
			cam.hostname = '10.255.255.1';
			cam.timeout = 500;
			cam._request({body: 'test'}, (err) => {
				assert.notStrictEqual(err, null);
				cam.timeout = oldTimeout;
				cam.hostname = host;
				done();
			});
		});
		it('should work nice with the proper request body', (done) => {
			cam._request({
				body: '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
					'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
					'<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
					'</s:Body>' +
					'</s:Envelope>'
			}
			, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		it('should handle SOAP Fault as an error (http://www.onvif.org/onvif/ver10/tc/onvif_core_ver10.pdf, pp.45-46)', (done) => {
			cam._request({body: '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
						'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
						'<UnknownCommand xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
						'</s:Body>' +
						'</s:Envelope>'}
			, (err) => {
				assert.notStrictEqual(err, null);
				assert.ok(err instanceof Error);
				done();
			});
		});
	});

	describe('connect', () => {
		it('should connect to the cam, fill startup properties', (done) => {
			cam.connect((err) => {
				assert.strictEqual(err, null);
				assert.ok(cam.capabilities || cam.services);
				if (synthTest) {
					assert.ok(cam.uri.ptz);
				}
				assert.ok(cam.uri.media);
				assert.ok(cam.videoSources);
				assert.ok(cam.profiles);
				assert.ok(cam.defaultProfile);
				assert.ok(cam.activeSource);
				done();
			});
		});
		it('should return an error when upstart is unfinished', (done) => {
			cam.getCapabilities = (cb) => cb(new Error('error'));
			cam.connect((err) => {
				assert.notStrictEqual(err, null);
				delete cam.getCapabilities;
				done();
			});
		});
	});

	describe('getSystemDateAndTime', () => {
		it('should return valid date', (done) => {
			cam.getSystemDateAndTime((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(data instanceof Date);
				done();
			});
		});
	});

	describe('setSystemDateAndTime', () => {
		it('should throws an error when `dateTimeType` is wrong', (done) => {
			cam.setSystemDateAndTime({
				dateTimeType: 'blah'
			}, (err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
		if (synthTest) {
			it('should set system date and time', (done) => {
				cam.setSystemDateAndTime({
					dateTimeType: 'Manual',
					dateTime: new Date(),
					daylightSavings: true,
					timezone: 'MSK',
				}, (err, data) => {
					assert.strictEqual(err, null);
					assert.ok(data instanceof Date);
					done();
				});
			});
			it('should return an error when SetSystemDateAndTime message returns error', (done) => {
				serverMockup.conf.bad = true;
				cam.setSystemDateAndTime({
					dateTimeType: 'Manual',
					dateTime: new Date(),
					daylightSavings: true,
					timezone: 'MSK',
				}, (err) => {
					assert.notStrictEqual(err, null);
					delete serverMockup.conf.bad;
					done();
				});
			});
		}
	});

	describe('getHostname', () => {
		it('should return device name', (done) => {
			cam.getHostname((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(typeof data.fromDHCP == 'boolean');
				done();
			});
		});
	});

	describe('getScopes', () => {
		it('should return device scopes as array when different scopes', (done) => {
			cam.getScopes((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				data.forEach((scope) => {
					assert.ok(scope.scopeDef);
					assert.ok(scope.scopeItem);
				});
				done();
			});
		});
		if (synthTest) {
			it('should return device scopes as array when one scope', (done) => {
				serverMockup.conf.count = 1;
				cam.getScopes((err, data) => {
					assert.strictEqual(err, null);
					assert.ok(Array.isArray(data));
					data.forEach((scope) => {
						assert.ok(scope.scopeDef);
						assert.ok(scope.scopeItem);
						delete serverMockup.conf.count;
						done();
					});
				});
			});
			it('should return device scopes as array when no scopes', (done) => {
				serverMockup.conf.count = 0;
				cam.getScopes((err, data) => {
					assert.strictEqual(err, null);
					assert.ok(Array.isArray(data));
					data.forEach((scope) => {
						assert.ok(scope.scopeDef);
						assert.ok(scope.scopeItem);
						delete serverMockup.conf.count;

					});
					done();
				});
			});
		}
	});

	describe('setScopes', () => {
		it('should set and return device scopes as array', (done) => {
			cam.setScopes(['onvif://www.onvif.org/none'], (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				data.forEach((scope) => {
					assert.ok(scope.scopeDef);
					assert.ok(scope.scopeItem);
				});
				done();
			});
		});
		if (synthTest) {
			it('should return an error when SetScopes message returns error', (done) => {
				serverMockup.conf.bad = true;
				cam.setScopes(['onvif://www.onvif.org/none'], (err) => {
					assert.notStrictEqual(err, null);
					delete serverMockup.conf.bad;
					done();
				});
			});
		}
	});

	describe('getCapabilities', () => {
		it('should return a capabilities object with correspondent properties and also set them into #capability property', (done) => {
			cam.getCapabilities((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(cam.profiles.every((profile) =>
					['name', 'videoSourceConfiguration', 'videoEncoderConfiguration', 'PTZConfiguration']
						.every((prop) => profile[prop])));
				assert.strictEqual(cam.capabilities, data);
				done();
			});
		});
		it('should store PTZ link in ptzUri property', (done) => {
			assert.strictEqual(cam.uri.ptz.href, cam.capabilities.PTZ.XAddr);
			done();
		});
		it('should store uri links for extensions', (done) => {
			assert.ok(Object.keys(cam.capabilities.extension).every((ext) => cam.uri[ext]));
			done();
		});
	});

	describe('getServiceCapabilities', () => {
		it('should return a service capabilities object and also set them into #serviceCapabilities property', (done) => {
			cam.getServiceCapabilities((err, data) => {
				assert.strictEqual(err, null);
				if (synthTest) {
					assert.ok(['network', 'security', 'system', 'auxiliaryCommands'].every((prop) => data[prop]));
				} else {
					assert.ok(['network', 'security', 'system'].every((prop) => data[prop]));
				}
				assert.strictEqual(cam.serviceCapabilities, data);
				done();
			});
		});
	});

	describe('getActiveSources', () => {
		it('should find at least one appropriate source', () => {
			cam.getActiveSources();
			assert.ok(cam.defaultProfile);
			assert.ok(cam.activeSource);
		});
		it('should throws an error when no one profile has actual videosource token', () => {
			const realProfiles = cam.profiles;
			cam.profiles.forEach((profile) => profile.videoSourceConfiguration.sourceToken = 'crap');
			assert.throws(cam.getActiveSources, Error);
			cam.profiles = realProfiles;
		});
		// I can't remember and understand why it is here :)
		// ###it 'should populate activeSources and defaultProfiles when more than one video source exists', () ->
		// 	fs.rename './serverMockup/GetVideoSources.xml', './serverMockup/GetVideoSources.single', (err) ->
		// 	assert.equal err, null
		// fs.rename './serverMockup/GetVideoSourcesEncoder.xml', './serverMockup/GetVideoSources.xml', (err) ->
		// 	assert.equal err, null
		// cam.getActiveSources()
		// assert.isArray(cam.activeSources)
		// assert.isArray(cam.defaultProfiles)
		//
		// fs.rename './serverMockup/GetVideoSources.xml', './serverMockup/GetVideoSourcesEncoder.xml', (err) ->
		// 	assert.equal err, null
		// fs.rename './serverMockup/GetVideoSources.single', './serverMockup/GetVideoSources.xml', (err) ->
		// 	assert.equal err, null###
	});

	describe('getVideoSources', () => {
		it('should return a videosources object with correspondent properties and also set them into videoSources property', (done) => {
			cam.getVideoSources((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				data.every((d) => {
					assert.ok(['$', 'framerate', 'resolution'].every((prop) => d[prop] !== undefined));
					assert.strictEqual(cam.videoSources, data);
				});
				done();
			});
		});
	});

	describe('getServices', () => {
		it('should return an array of services objects', (done) => {
			cam.getServices(true, (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				assert.ok(data.every((service) => service.namespace && service.XAddr && service.version));
				done();
			});
		});
	});

	describe('getDeviceInformation', () => {
		it('should return an information about device', (done) => {
			cam.getDeviceInformation((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(['manufacturer', 'model', 'firmwareVersion', 'serialNumber', 'hardwareId']
					.every((prop) =>	data[prop] !== undefined));
				console.log('Device Information:', data);
				assert.strictEqual(cam.deviceInformation, data);
				done();
			});
		});
	});

	describe('getStreamUri', () => {
		it('should return a media stream uri', (done) => {
			cam.getStreamUri({protocol: 'HTTP'}, (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every((prop) => data[prop] !== undefined));
				done();
			});
		});
		it('should return a default media stream uri with no options passed', (done) => {
			cam.getStreamUri((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every((prop) => data[prop] !== undefined));
				done();
			});
		});
	});

	describe('getSnapshotUri', () => {
		it('should return a default media uri with no options passed', (done) => {
			cam.getSnapshotUri((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every((prop) => data[prop] !== undefined));
				done();
			});
		});
	});

	describe('getNodes', () => {
		it('should return object of nodes and sets them to #nodes', (done) => {
			cam.getNodes((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(typeof data == 'object');
				assert.deepStrictEqual(cam.nodes, data);
				done();
			});
		});
	});

	describe('getConfigurations', () => {
		it('should return object of configurations and sets them to #configurations', (done) => {
			cam.getConfigurations((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(typeof data == 'object');
				assert.deepStrictEqual(cam.configurations, data);
				done();
			});
		});
	});

	describe('getConfigurationOptions', () => {
		it('should return an options object for every configuration token', (done) => {
			const tokens = Object.keys(cam.configurations);
			let cou = tokens.length;
			tokens.forEach((token) => {
				cam.getConfigurationOptions(token, (err, data) => {
					assert.strictEqual(err, null);
					assert.ok(typeof data == 'object');
					if (!--cou) {
						done();
					}
				});
			});
		});
	});

	describe('systemReboot', () => {
		if (synthTest) {
			it('should return a server message', (done) => {
				cam.systemReboot((err, data) => {
					assert.strictEqual(err, null);
					assert.strictEqual(typeof data, 'string');
					done();
				});
			});
		}
	});

	describe('EventEmitter', () => {
		let onEvent = null;
		let eventNbr = 0;

		it('should listen with `addListener`', (done) => {
			cam.removeAllListeners(); // Remove all listeners in case some remains
			eventNbr = 0;
			onEvent = () => eventNbr += 1;
			cam.addListener('myEvent', onEvent);
			const listeners = cam.listeners('myEvent');
			assert.strictEqual(listeners.length, 1);
			const listenerCount = cam.listenerCount('myEvent');
			assert.strictEqual(listenerCount, 1);
			setTimeout(() => cam.emit('myEvent', ''), 250);
			setTimeout(() => {
				assert.ok(eventNbr > 0);
				done();
			}, 1000);
		});
		it('should stop listening with `removeListener`', (done) => {
			eventNbr = 0;
			cam.removeListener('myEvent', onEvent);
			const listeners = cam.listeners('myEvent');
			assert.strictEqual(listeners.length, 0);
			const listenerCount = cam.listenerCount('myEvent');
			assert.strictEqual(listenerCount, 0);
			setTimeout(() => cam.emit('myEvent', ''), 250);
			setTimeout(() => {
				assert.ok(eventNbr === 0);
				done();
			}, 500);
		});
		it('should listen with `on`', (done) => {
			cam.removeAllListeners(); // Remove all listeners in case some remains
			eventNbr = 0;
			onEvent = () => eventNbr += 1;
			cam.on('myEvent', onEvent);
			const listeners = cam.listeners('myEvent');
			assert.strictEqual(listeners.length, 1);
			const listenerCount = cam.listenerCount('myEvent');
			assert.equal(listenerCount, 1);
			setTimeout(() => cam.emit('myEvent', ''), 250);
			setTimeout(() => {
				assert.ok(eventNbr > 0);
				done();
			}, 500);
		});
		// Another strange part
		// # it 'should stop listening with `off`', (done) ->
		// 	#   eventNbr = 0
		// #   cam.off 'myEvent', onEvent
		// #   # cam.removeListener 'myEvent', onEvent
		// #   listeners = cam.listeners 'myEvent'
		// #   assert.equal listeners.length, 0
		// #   listenerCount = cam.listenerCount 'myEvent'
		// #   assert.equal listenerCount, 0
		// #   setTimeout () ->
		// #     cam.emit 'myEvent', ''
		// #   , 250
		// #   setTimeout () ->
		// #     assert.ok eventNbr == 0
		// #     done()
		// #   , 500
		it('should listen only once with `once`', (done) => {
			cam.removeAllListeners('myEvent'); // Remove all listeners in case some remains
			setTimeout(() => {
				eventNbr = 0;
				onEvent = () => eventNbr += 1;
				cam.once('myEvent', onEvent);
				let listeners = cam.listeners('myEvent');
				assert.strictEqual(listeners.length, 1);
				let listenerCount = cam.listenerCount('myEvent');
				assert.strictEqual(listenerCount, 1);
				const emit = () => cam.emit('myEvent', '');
				setTimeout(() => {
					setImmediate(emit); // Send twice
					setImmediate(emit);
				}, 100);
				setTimeout(() => {
					assert.ok(eventNbr === 1);
					listeners = cam.listeners('myEvent');
					assert.strictEqual(listeners.length, 0);
					listenerCount = cam.listenerCount('myEvent');
					assert.strictEqual(listenerCount, 0);
					done();
				}, 500);
			}
			, 100);
		});
	});
});

