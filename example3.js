/**

 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Read the cursor keys and send ONVIF PTZ commands to the camera
 *
 * There are a few challenges to reading the keyboard
 * Firstly there is no 'keyup' event. So we usea Timer schule an ONVIF Stop
 * Command 200ms after a move command
 * If we send a new 'move' command (eg change direction or keyboard auto-repeat) any pending Stop commands are no longer required and are cleared
 * and a new Stop command scheduled for 200 later
 *
 * Secondly we need to handle auto-repeat if a key is held down so pause
 * and resume stdin
 *
 * Finally we need to use the completion callbacks for ONVIF functions
 * so that we only send a new ONVIF 'move' command after the previous one has
 * finished to prevent overlapping commands.
 * 
 */

var HOSTNAME = '192.168.1.128',
PORT = 80,
USERNAME = '',
PASSWORD = '';

var Cam = require('./lib/onvif').Cam;
var keypress = require('keypress');

new Cam({
	hostname : HOSTNAME,
	username : USERNAME,
	password : PASSWORD,
	port : PORT,
	timeout : 5000
}, function CamFunc(err) {
	if (err) {
		console.log(err);
		return;
	}

	var cam_obj = this;
	var onvif = this;
	var got_stream;
	var stop_timer;

	cam_obj.getStreamUri({
		protocol : 'RTSP'
	},	// Ccompletion callback function
		// This callback is executed once we have a StreamUri
		function (err, stream, xml) {
			if (err) {
				console.log(err);
				return;
			} else {
				console.log('------------------------------');
				console.log('Host: ' + HOSTNAME + ' Port: ' + PORT);
				console.log('Stream: = ' + stream.uri);
				console.log('------------------------------');

				// start processing the keyboard
				read_and_process_keyboard();
			}
		}
	);


	function read_and_process_keyboard() {
		// listen for the "keypress" events
		keypress(process.stdin);
		process.stdin.setRawMode(true);
		process.stdin.resume();

		console.log('');
		console.log('Use Cursor Keys to move camera');

		// keypress handler
		process.stdin.on('keypress', function (ch, key) {
			console.log('got "keypress"', key.name);

			/* Exit on 'q' or 'Q' or 'CTRL C' */
			if ((key && key.ctrl && key.name == 'c')
				 || (key && key.name == 'q')) {
				process.exit();
			}

			if (key && key.name == 'up')    move(0,1,0,'up');
			if (key && key.name == 'down')  move(0,-1,0,'down');
			if (key && key.name == 'left')  move(-1,0,0,'left');
			if (key && key.name == 'right') move(1,0,0,'right');
		});
	}


	function move(x_speed, y_speed, zoom_speed, msg) {
		// Step 1 - Turn off the keyboard processing (so keypresses do not buffer up)
		// Step 2 - Clear any existing 'stop' timeouts. We will re-schedule a new 'stop' command 200ms in the future
		// Step 3 - Send the Pan/Tilt/Zoom 'move' command.
		// Step 4 - In the callback from the PTZ 'move' command we schedule the Stop command (200ms in the future) and re-enable the keyboard

		// Pause keyboard processing
		process.stdin.pause();

		// Clear any pending 'stop' commands
		if (stop_timer) clearTimeout(stop_timer);

		// Move the camera
		console.log('sending move command ' + msg);
		onvif.continuousMove({	x : x_speed,
					y : y_speed,
					zoom : zoom_speed } ,
				// completion callback function
				function (err, stream, xml) {
					if (err) {
						console.log(err);
					} else {
						console.log('move command sent '+ msg);
						// schedule a Stop in 200ms
						stop_timer = setTimeout(stop,200);
					}
					// Resume keyboard processing
					process.stdin.resume();
				});
		}


	function stop() {
		// send a stop command.
		console.log('sending stop command');
		onvif.stop(
			function (err,stream, xml){
				if (err) {
					console.log(err);
				} else {
					console.log('stop command sent');
				}
			});
	}

});
