/**
 * NodeJS ONVIF PTZ and Presets Test
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Read the cursor keys and send ONVIF PTZ commands to the camera
 *
 * There are a few challenges to reading the keyboard
 * Firstly there is no 'keyup' event. So we use a Timer to schedule an ONVIF
 * Stop Command to be sent after a short delay.
 * If we send a new 'move' command (eg change direction or keyboard
 * auto-repeat) any pending Stop commands are no longer required and are
 * cleared and a new Stop command is scheduled to be sent after a short delay.
 *
 * Secondly we need to handle auto-repeat if a key is held down so we pause
 * and resume stdin.
 *
 * Finally we need to use the completion callbacks for ONVIF functions
 * so that we only send a new ONVIF 'move' command after the previous one has
 * finished to prevent overlapping commands.
 *
 * The program also sends Goto Preset commands.
 * The program gets a list of ONVIF presets. Keys 1..9 are used to send
 * Goto Preset on the first 9 preset commands.
 *
 * The GetPresets command is left as an asyncronous command
 * and the presets list may come in some time after the StreamURI is displayed
 * 
 */

var HOSTNAME = '192.168.1.128',
PORT = 80,
USERNAME = '',
PASSWORD = '',
STOP_DELAY_MS = 50;

var Cam = require('./lib/onvif').Cam;
var keypress = require('keypress');

new Cam({
	hostname : HOSTNAME,
	username : USERNAME,
	password : PASSWORD,
	port : PORT,
	timeout : 10000
}, function CamFunc(err) {
	if (err) {
		console.log(err);
		return;
	}

	var cam_obj = this;
	var stop_timer;
	var ignore_keypress = false;
	var preset_names = [];
	var preset_tokens = [];

	cam_obj.getStreamUri({
		protocol : 'RTSP'
	},	// Completion callback function
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

	cam_obj.getPresets({}, // use 'default' profileToken
		// Completion callback function
		// This callback is executed once we have a list of presets
		function (err, stream, xml) {
			if (err) {
				console.log("GetPreset Error "+err);
				return;
			} else {
				// loop over the presets and populate the arrays
				// Do this for the first 9 presets
				console.log("GetPreset Reply");
				var count = 1;
				for(var item in stream) {
					var name = item;          //key
					var token = stream[item]; //value
					// It is possible to have a preset with a blank name so generate a name
					if (name.length == 0) name='no name ('+token+')';
					preset_names.push(name);
					preset_tokens.push(token);

					// Show first 9 preset names to user
					if (count < 9) {
						console.log('Press key '+count+ ' for preset "' + name + '"');
					count++;
					}
				}
			}
		}
	);


	function read_and_process_keyboard() {
		// listen for the "keypress" events
		keypress(process.stdin);
		process.stdin.setRawMode(true);
		process.stdin.resume();

		console.log('');
		console.log('Use Cursor Keys to move camera. + and - to zoom. q to quit');

		// keypress handler
		process.stdin.on('keypress', function (ch, key) {

			/* Exit on 'q' or 'Q' or 'CTRL C' */
			if ((key && key.ctrl && key.name == 'c')
				 || (key && key.name == 'q')) {
				process.exit();
			}

			if (ignore_keypress) {
				return;
			}

			if (key) {
				console.log('got "keypress"',key.name);
			} else {
				if (ch)console.log('got "keypress character"',ch);
			}


			if      (key && key.name == 'up')    move(0,1,0,'up');
			else if (key && key.name == 'down')  move(0,-1,0,'down');
			else if (key && key.name == 'left')  move(-1,0,0,'left');
			else if (key && key.name == 'right') move(1,0,0,'right');
			else if (ch  && ch       == '-')     move(0,0,-1,'zoom out');
			else if (ch  && ch       == '+')     move(0,0,1,'zoom in');
			// On English keyboards '+' is "Shift and = key"
			// Accept the "=" key as zoom in
			else if (ch  && ch       == '=')     move(0,0,1,'zoom in');
			else if (ch  && ch>='1' && ch <='9') goto_preset(ch);
		});
	}


	function move(x_speed, y_speed, zoom_speed, msg) {
		// Step 1 - Turn off the keyboard processing (so keypresses do not buffer up)
		// Step 2 - Clear any existing 'stop' timeouts. We will re-schedule a new 'stop' command in this function 
		// Step 3 - Send the Pan/Tilt/Zoom 'move' command.
		// Step 4 - In the callback from the PTZ 'move' command we schedule the ONVIF Stop command to be executed after a short delay and re-enable the keyboard

		// Pause keyboard processing
		ignore_keypress = true;

		// Clear any pending 'stop' commands
		if (stop_timer) clearTimeout(stop_timer);

		// Move the camera
		console.log('sending move command ' + msg);
		cam_obj.continuousMove({x : x_speed,
					y : y_speed,
					zoom : zoom_speed } ,
				// completion callback function
				function (err, stream, xml) {
					if (err) {
						console.log(err);
					} else {
						console.log('move command sent '+ msg);
						// schedule a Stop command to run in the future 
						stop_timer = setTimeout(stop,STOP_DELAY_MS);
					}
					// Resume keyboard processing
					ignore_keypress = false;
				});
		}


	function stop() {
		// send a stop command.
		console.log('sending stop command');
		cam_obj.stop(
			function (err,stream, xml){
				if (err) {
					console.log(err);
				} else {
					console.log('stop command sent');
				}
			});
	}


	function goto_preset(number) {
		if (number > preset_names.length) {
			console.log ("No preset " + number);
			return;
		}

		console.log('sending goto preset command '+preset_names[number-1]);
		cam_obj.gotoPreset({ preset : preset_tokens[number-1] } ,
			// completion callback function
			function (err, stream, xml) {
				if (err) {
					console.log(err);
				} else {
					console.log('goto preset command sent ');
				}
			});
	}
});
