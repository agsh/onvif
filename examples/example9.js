/**
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Get a Replay URI to reply recordings from a time/date
 *
 */

const IP_ADDRESS = '192.168.26.204',
	PORT = 80,
	USERNAME = 'onvifuser',
	PASSWORD = 'PASS99pass';

let START = "2023-02-12T14:50:00Z";
let END = "2023-02-12T14:51:00Z";

const Cam = require('../lib/onvif').Cam;
const flow = require('nimble');

// hide error messages
console.error = function() {};

// try each IP address and each Port
new Cam({
	hostname: IP_ADDRESS,
	username: USERNAME,
	password: PASSWORD,
	port: PORT,
	timeout: 5000
}, function CamFunc(err) {
	if (err)  {
		if (err.message) {
			console.log(err.message);
		} else {
			console.log(err);
		}
		return;
	}

	const camObj = this;

	let gotRecordings = null;
	let gotReplayStream = null;

	// Use Nimble to execute each ONVIF function in turn
	// A more modern approach would be to Promisify the library API and then await on each async function
	flow.series([
		function(callback) {
			camObj.getRecordings(function(err, recordings, xml) {
				if (!err) {
					gotRecordings = recordings;
				}
				callback();
			});
		},
		function(callback) {
			// Get Recording URI for the first recording on the NVR
			if (gotRecordings != null) {
				camObj.getReplayUri({
					protocol: 'RTSP',
					recordingToken: gotRecordings[0].recordingToken
				}, function(err, replayStream, xml) {
					if (!err) {
						gotReplayStream = replayStream;
					}
					callback();
				});
			} else {
				callback();
			}
		},
		function(callback) {
			console.log('------------------------------');
			console.log('Host: ' + IP_ADDRESS + ' Port: ' + PORT);
			console.log('Replay URL: = ' + gotReplayStream.uri);
			console.log('------------------------------');
			callback();
		},

	]); // end flow

});
