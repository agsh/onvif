/**
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Read the cursor keys and send ONVIF PTZ commands to the camera
 *
 * This example uses Nimble to ensure that an ONVIF command is
 * completed before moving onto the next ONVIF command without having
 * multiple levels of nested callback functions
 *
 * The PTZ and Stop code is not a good example of best programming practice
 * It would be better to send the PTZ command on KeyDown and send the
 * Stop command on Keyup or a timeout, but this code is good enough for an
 * example
 *
 */

var HOSTNAME = '192.168.1.128',
PORT = 80,
USERNAME = 'admin',
PASSWORD = 'admin';

var Cam = require('./lib/onvif').Cam;
var flow = require('nimble');
var keypress = require('keypress');

new Cam({
	hostname : HOSTNAME,
	username : USERNAME,
	password : PASSWORD,
	port : PORT,
	timeout : 5000
}, function CamFunc(err) {
	if (err)
		return;

	var cam_obj = this;
	var onvif = this;

	var got_stream;

	// Use Nimble to ensure we have finished getting the StreamUri
	// before moving on to the keyboard reading code
	flow.series([
			function (callback) {
				cam_obj.getStreamUri({
					protocol : 'RTSP'
				}, function (err, stream, xml) {
					if (!err)
						got_stream = stream;
					callback();
				});
			},
			function (callback) {
				console.log('------------------------------');
				console.log('Host: ' + HOSTNAME + ' Port: ' + PORT);
				console.log('Stream: = ' + got_stream.uri);
				console.log('------------------------------');
				callback();
			},
		]); // end flow


	// listen for the "keypress" event
	keypress(process.stdin);

	process.stdin.on('keypress', function (ch, key) {
		console.log('got "keypress"', key.name);

		/* Exit on 'q' or 'CTRL C' */
		if ((key && key.ctrl && key.name == 'c')
			 || (key && key.name == 'q')) {
			process.exit();
		}
		if (key && key.name == 'up') {
			/* Use Nimbele to send PTZ and then Stop sequentially */
			flow.series([
					function (callback) {
						onvif.continuousMove({
							x : 0,
							y : 1,
							zoom : 0
						});
						callback();
					},
					function (callback) {
						onvif.stop();
						callback();
					}
				]); // end flow
		}

		if (key && key.name == 'down') {
			/* Use Nimbele to send PTZ and then Stop sequentially */
			flow.series([
					function (callback) {
						onvif.continuousMove({
							x : 0,
							y : -1,
							zoom : 0
						});
						callback();
					},
					function (callback) {
						onvif.stop();
						callback();
					}
				]); // end flow
		}
		if (key && key.name == 'left') {
			/* Use Nimbele to send PTZ and then Stop sequentially */
			flow.series([
					function (callback) {
						onvif.continuousMove({
							x : -1,
							y : 0,
							zoom : 0
						});
						callback();
					},
					function (callback) {
						onvif.stop();
						callback();
					}
				]); // end flow
		}
		if (key && key.name == 'right') {
			/* Use Nimbele to send PTZ and then Stop sequentially */
			flow.series([
					function (callback) {
						onvif.continuousMove({
							x : 1,
							y : 0,
							zoom : 0
						});
						callback();
					},
					function (callback) {
						onvif.stop();
						callback();
					}
				]); // end flow
		}

	});
	process.stdin.setRawMode(true);
	process.stdin.resume();

});

