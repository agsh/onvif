/**
 * NodeJS ONVIF PTZ and Presets Test
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 * Updated in 2026 to use the new V1 Library
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
 * The GetPresets command is left as an asynchronous command
 * and the presets list may come in some time after the StreamURI is displayed
 *
 */

const OnvifLibrary = require('../build/onvif.js');
const keypress = require('keypress');

main();

async function main() {
	
	const HOSTNAME = '192.168.0.116',
		PORT = 80,
		USERNAME = 'username',
		PASSWORD = 'password',
		STOP_DELAY_MS = 50;

	const cam_obj = new OnvifLibrary.Onvif({
		hostname: HOSTNAME,
		username: USERNAME,
		password: PASSWORD,
		port: PORT,
		timeout: 10000
	});

	// Connect and populate the default Profile Token
	try {
		await cam_obj.connect();
	} catch (err) {
		console.low(err);
		return;
	}

	let stop_timer;
	let ignore_keypress = false;
	let preset_names = [];
	let preset_tokens = [];

	const getStreamUriResult = await cam_obj.media.getStreamUri();	

	console.log('------------------------------');
	console.log('Host: ' + HOSTNAME + ' Port: ' + PORT);
	console.log('Stream: = ' + getStreamUriResult.uri);
	console.log('------------------------------');

	try {
		const presets = await cam_obj.ptz.getPresets(); // use 'default' profileToken

		// loop over the presets and populate the arrays
		// Do this for the first 9 presets
		console.log("GetPreset Reply");
		let count = 1;
		for (const item of presets) {
			let name = item.name;
			let token = item.token
			// It is possible to have a preset with a blank name so generate a name
			if (name.length == 0) {name = 'no name (' + token + ')';}
			preset_names.push(name);
			preset_tokens.push(token);

			// Show first 9 preset names to user
			if (count < 9) {
				console.log('Press key ' + count + ' for preset "' + name + '"');
				count++;
			}
		}
	} catch (err) {
		console.log("Error reading presets");
		// continue on. Maybe this device does not support presets
	}

	// start processing the keyboard
	// listen for the "keypress" events
	keypress(process.stdin);
	process.stdin.setRawMode(true);
	process.stdin.resume();

	console.log('');
	console.log('Use Cursor Keys to move camera. + and - to zoom. q to quit');

	// keypress handler
	process.stdin.on('keypress', function(ch, key) {

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
			if (ch){console.log('got "keypress character"',ch);}
		}


		// On English keyboards '+' is "Shift and = key"
		// Accept the "=" key as zoom in
		if (key && key.name == 'up') {
			move(0,1,0,'up');
		} else if (key && key.name == 'down') {
			move(0,-1,0,'down');
		} else if (key && key.name == 'left') {
			move(-1,0,0,'left');
		} else if (key && key.name == 'right') {
			move(1,0,0,'right');
		} else if (ch  && ch       == '-') {
			move(0,0,-1,'zoom out');
		} else if (ch  && ch       == '+') {
			move(0,0,1,'zoom in');
		} else if (ch  && ch       == '=') {
			move(0,0,1,'zoom in');
		} else if (ch  && ch >= '1' && ch <= '9') {
			goto_preset(ch);
		}
	});


	async function move(x_speed, y_speed, zoom_speed, msg) {
		// Step 1 - Turn off the keyboard processing (so keypresses do not buffer up)
		// Step 2 - Clear any existing 'stop' timeouts. We will re-schedule a new 'stop' command in this function
		// Step 3 - Send the Pan/Tilt/Zoom 'move' command.
		// Step 4 - In the callback from the PTZ 'move' command we schedule the ONVIF Stop command to be executed after a short delay and re-enable the keyboard

		// Pause keyboard processing
		ignore_keypress = true;

		// Clear any pending 'stop' commands
		if (stop_timer) {clearTimeout(stop_timer);}

		// Move the camera
		console.log('sending move command ' + msg);
		try {
			await cam_obj.ptz.continuousMove({
				velocity: {
					panTilt: {
						x: x_speed,
						y: y_speed,
					},
					zoom: {
						x: zoom_speed,
					},
				},
				timeout: 'PT5S',
	    	  }
			);
			console.log('move command sent');
			// schedule a Stop command to run in the future
			stop_timer = setTimeout(stop,STOP_DELAY_MS);
		} catch (err) {
			console.log(err);
		}
		// Resume keyboard processing
		ignore_keypress = false;
	}


	async function stop() {
		// send a stop command, stopping Pan/Tilt and stopping zoom
		console.log('sending stop command');
		try {
			await cam_obj.ptz.stop(); // .stop({panTilt: true, zoom: true},
			console.log('stop command sent');
		} catch (err) {
			console.log(err);
		}
	}


	async function goto_preset(number) {
		if (number > preset_names.length) {
			console.log("No preset " + number);
			return;
		}

		console.log('sending goto preset command ' + preset_names[number - 1]);
		try {
			await cam_obj.ptz.gotoPreset({ presetToken: preset_tokens[number - 1] });
			console.log('goto preset command sent');
		} catch (err) {
			console.log(err);
		}
	}
}
