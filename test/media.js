const synthTest = !process.env.HOSTNAME;

const assert = require('assert');
const onvif = require('../lib/onvif');
let serverMockup;
if (synthTest) {
	serverMockup = require('../test/serverMockup');
}

describe('Media', () => {
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

	describe('getProfiles', () => {
		it('should create an array of profile objects with correspondent properties', (done) => {
			cam.getProfiles((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Object.keys(cam.profiles).length > 0);
				assert.strictEqual(cam.profiles, data);
				done();
			});
		});
	});

	describe('createAndDeleteProfile', () => {
		const name = 'test';
		const token = 'testToken';
		it('should create a new profile with name and token', (done) => {
			cam.createProfile({name, token}, (err, res) => {
				assert.strictEqual(err, null);
				assert.strictEqual(res.$.fixed, false);
				assert.strictEqual(res.name, name);
				assert.strictEqual(res.$.token, token);
				done();
			});
		});
		it('should delete already created profile by its token', (done) => {
			cam.deleteProfile(token, (err, res) => {
				assert.strictEqual(err, null);
				assert.strictEqual(res, '');
				done();
			});
		});
	});

	describe('getVideoSourceConfigurations', () => {
		it('should return videosource configurations', (done) => {
			cam.getVideoSourceConfigurations((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(res));
				assert.ok(res.every((conf) => conf.name && conf.token && conf.sourceToken && conf.bounds));
				done();
			});
		});
	});

	describe('getVideoEncoderConfiguration', () => {
		it('should return an error when no token present as a parameter or in #videoEncoderConfigurations array and there is no `videoEncoderConfigurations` property', (done) => {
			cam.getVideoEncoderConfiguration((err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
	});

	describe('getVideoEncoderConfigurationOptions', () => {
		it('should return an error when options is given but does not have `configurationToken` or `profileToken`', (done) => {
			cam.getVideoEncoderConfigurationOptions({}, (err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
	});

	describe('getVideoEncoderConfigurations', () => {
		it('should return video encoder configurations', (done) => {
			cam.getVideoEncoderConfigurations((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(['name', '$', 'quality', 'resolution', 'multicast'].every((prop) => res.every((vec) => !!vec[prop])));
				done();
			});
		});
	});

	describe('getVideoEncoderConfiguration', () => {
		it('should return a configuration for the first token in #videoEncoderConfigurations array', (done) => {
			cam.getVideoEncoderConfiguration((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(['name', '$', 'quality', 'resolution', 'multicast'].every((prop) => !!res[prop]));
				done();
			});
		});
		it('should return a configuration for the named token as a first argument', (done) => {
			cam.getVideoEncoderConfiguration(cam.videoEncoderConfigurations[0].$.token, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(['name', '$', 'quality', 'resolution', 'multicast'].every((prop) => !!res[prop]));
				done();
			});
		});
	});

	describe('getVideoEncoderConfigurationOptions', () => {
		const configurationToken = "configurationToken";
		const profileToken = "profileToken";
		it('should return generic configuration options', (done) => {
			cam.getVideoEncoderConfigurationOptions((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.qualityRange);
				done();
			});
		});
		it('should return a configuration options when `options` is given as a string', (done) => {
			cam.getVideoEncoderConfigurationOptions(configurationToken, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.qualityRange);
				done();
			});
		});
		it('should return a configuration options when `options` is given as an object with `configurationToken`', (done) => {
			cam.getVideoEncoderConfigurationOptions({configurationToken}, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.qualityRange);
				done();
			});
		});
		it('should return a configuration options when `options` is given as an object with `profileToken`', (done) => {
			cam.getVideoEncoderConfigurationOptions({profileToken: profileToken}, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.qualityRange);
				done();
			});
		});
		it('should return a configuration options when `options` is given as an object with both `configurationToken` and `profileToken`', (done) => {
			cam.getVideoEncoderConfigurationOptions({
				configurationToken: configurationToken,
				profileToken: profileToken
			}, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.qualityRange);
				done();
			});
		});
	});

	describe('setVideoEncoderConfiguration', () => {
		it('should generate an error when no token in the options is present', (done) => {
			cam.setVideoEncoderConfiguration({}, (err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
		it('should accept setting existing configuration and return the same configuration by the getVideoEncoderConfiguration method', (done) => {
			cam.setVideoEncoderConfiguration(cam.videoEncoderConfigurations[0], (err, res) => {
				assert.strictEqual(err, null);
				assert.deepStrictEqual(cam.videoEncoderConfigurations[0], res);
				done();
			});
		});
		it('should accept setting some new video configuration based on the existing', (done) => {
			const conf = {
				token: cam.videoEncoderConfigurations[0].$.token,
				resolution: cam.videoEncoderConfigurations[0].resolution,
			};
			cam.setVideoEncoderConfiguration(conf, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		describe('serialization', () => {
			const sent = (options, check) => {
				let body = null;
				cam.once('rawRequest', (xml) => { body = xml; });
				cam.setVideoEncoderConfiguration(options, (err) => {
					assert.strictEqual(err, null);
					check(body.slice(body.indexOf('<Configuration'), body.indexOf('</Configuration>')));
				});
			};
			const token = () => cam.videoEncoderConfigurations[0].$.token;

			it('should send the H.264 profile given in the shape getVideoEncoderConfiguration returns', (done) => {
				sent({token: token(), encoding: 'H264', H264: {govLength: 50, H264Profile: 'Main'}}, (conf) => {
					assert.ok(conf.includes('<GovLength>50</GovLength>'));
					assert.ok(conf.includes('<H264Profile>Main</H264Profile>'));
					done();
				});
			});

			it('should still accept H264.profile', (done) => {
				sent({token: token(), H264: {govLength: 30, profile: 'High'}}, (conf) => {
					assert.ok(conf.includes('<H264Profile>High</H264Profile>'));
					done();
				});
			});

			it('should send quality 0', (done) => {
				sent({token: token(), quality: 0}, (conf) => {
					assert.ok(conf.includes('<Quality xmlns="http://www.onvif.org/ver10/schema">0</Quality>'));
					done();
				});
			});

			it('should omit null and empty quality', (done) => {
				sent({token: token(), quality: null}, (conf) => {
					assert.ok(!conf.includes('<Quality'));
					sent({token: token(), quality: ''}, (conf) => {
						assert.ok(!conf.includes('<Quality'));
						done();
					});
				});
			});

			it('should use the schema element name Mpeg4Profile', (done) => {
				sent({token: token(), MPEG4: {govLength: 10, mpeg4Profile: 'SP'}}, (conf) => {
					assert.ok(conf.includes('<Mpeg4Profile>SP</Mpeg4Profile>'));
					assert.ok(!conf.includes('MPEG4Profile'));
					done();
				});
			});
		});

		if (synthTest) {
			it('should emits error with wrong response', (done) => {
				serverMockup.conf.bad = true;
				cam.setVideoEncoderConfiguration(cam.videoEncoderConfigurations[0], (err) => {
					assert.notStrictEqual(err, null);
					delete serverMockup.conf.bad;
					done();
				});
			});
		}
	});

	describe('getAudioSources', () => {
		it('should return audio sources', (done) => {
			cam.getAudioSources((err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('getAudioEncoderConfiguration', () => {
		it('should return an error when no token present as a parameter or in #videoEncoderConfigurations array and there is no `videoEncoderConfigurations` property', (done) => {
			cam.getAudioEncoderConfiguration((err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
	});

	describe('getAudioEncoderConfigurations', () => {
		it('should return audio encoder configurations', (done) => {
			cam.getAudioEncoderConfigurations((err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('getAudioEncoderConfigurationOptions', () => {
		it('should return a configuration options for the first token in #audioEncoderConfigurations array', (done) => {
			cam.getAudioEncoderConfigurationOptions((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.bitrateList);
				done();
			});
		});
		it('should return a configuration options for the named token as a first argument', (done) => {
			cam.getAudioEncoderConfigurationOptions(cam.audioEncoderConfigurations[0].$.token, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(res.bitrateList);
				done();
			});
		});
	});

	describe('setAudioEncoderConfiguration', () => {
		it('should generate an error when no token in the options is present', (done) => {
			cam.setAudioEncoderConfiguration({}, (err) => {
				assert.notStrictEqual(err, null);
				done();
			});
		});
		it('should accept setting existing configuration and return the same configuration by the getAudioEncoderConfiguration method', (done) => {
			cam.setAudioEncoderConfiguration(cam.audioEncoderConfigurations[0], (err, res) => {
				assert.strictEqual(err, null);
				assert.deepStrictEqual(cam.audioEncoderConfigurations[0], res);
				done();
			});
		});
		it('should accept setting some new audio configuration based on the existing', (done) => {
			const conf = {
				token: cam.audioEncoderConfigurations[0].$.token,
				bitrate: cam.audioEncoderConfigurations[0].bitrate,
			};
			cam.setAudioEncoderConfiguration(conf, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		if (synthTest) {
			it('should emits error with wrong response', (done) => {
				serverMockup.conf.bad = true;
				cam.setAudioEncoderConfiguration(cam.audioEncoderConfigurations[0], (err) => {
					assert.notStrictEqual(err, null);
					delete serverMockup.conf.bad;
					done();
				});
			});
		}
	});

	describe('getAudioEncoderConfiguration', () => {
		it('should return a configuration for the first token in #videoEncoderConfigurations array', (done) => {
			cam.getAudioEncoderConfiguration((err, res) => {
				assert.strictEqual(err, null);
				assert.ok(['name', '$', 'multicast'].every((prop) => !!res[prop]));
				done();
			});
		});
		it('should return a configuration for the named token as a first argument', (done) => {
			cam.getAudioEncoderConfiguration(cam.videoEncoderConfigurations[0].$.token, (err, res) => {
				assert.strictEqual(err, null);
				assert.ok(['name', '$', 'multicast'].every((prop) => !!res[prop]));
				done();
			});
		});
	});

	describe('addAudioEncoderConfiguration', () => {
		it('should add an AudioEncoderConfiguration to a Profile', (done) => {
			cam.addAudioEncoderConfiguration({
				profileToken: 'profileToken',
				configurationToken: 'configurationToken',
			}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('addAudioSourceConfiguration', () => {
		it('should add an AudioSourceConfiguration to a Profile', (done) => {
			cam.addAudioSourceConfiguration({
				profileToken: 'profileToken',
				configurationToken: 'configurationToken',
			}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('addVideoEncoderConfiguration', () => {
		it('should add a VideoEncoderConfiguration to a Profile', (done) => {
			cam.addVideoEncoderConfiguration({
				profileToken: 'profileToken',
				configurationToken: 'configurationToken',
			}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('addVideoSourceConfiguration', () => {
		it('should add a VideoSourceConfiguration to a Profile', (done) => {
			cam.addVideoSourceConfiguration({
				profileToken: 'profileToken',
				configurationToken: 'configurationToken',
			}, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('removeAudioEncoderConfiguration', () => {
		it('should remove an AudioEncoderConfiguration from a Profile', (done) => {
			cam.removeAudioEncoderConfiguration('profileToken', (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('removeAudioSourceConfiguration', () => {
		it('should remove an AudioSourceConfiguration from a Profile', (done) => {
			cam.removeAudioSourceConfiguration('profileToken', (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('getMediaServiceCapabilities', () => {
		it('should return a configuration for the first token in #videoEncoderConfigurations array', (done) => {
			cam.getMediaServiceCapabilities((err, res) => {
				assert.strictEqual(err, null);
				assert.deepStrictEqual(res, cam.mediaCapabilities);
				assert.ok(['SnapshotUri', 'Rotation', 'VideoSourceMode', 'OSD', 'TemporaryOSDText', 'EXICompression'].every((prop) => res.$[prop] !== undefined));
				assert.ok(res.profileCapabilities);
				assert.ok(['MaximumNumberOfProfiles'].every((prop) => res.profileCapabilities.$[prop] !== undefined));
				assert.ok(res.streamingCapabilities);
				assert.ok(['RTPMulticast', 'RTP_TCP', 'RTP_RTSP_TCP', 'NonAggregateControl'].every((prop) => res.streamingCapabilities.$[prop] !== undefined));
				done();
			});
		});
	});
});
