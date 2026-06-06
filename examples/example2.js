/**
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 * Updated in 2026 to use the new V1 Library
 *
 * Brute force scan of the network looking for ONVIF devices
 * Displays the time and date of each device
 *          the make and model
 *          the default RTSP address
 * This DOES NOT use ONVIF Discovery. This softweare tries each IP address in
 * turn which allows it to work on networks where ONVIF Discovery does not work
 * (eg on Layer 3 routed networks)
 *
 */

var IP_RANGE_START = '192.168.1.1',
	IP_RANGE_END = '192.168.1.100',
	PORT_LIST = [80],
	USERNAME = 'username',
	PASSWORD = 'password';

var OnvifLib = require('../build/onvif');

let ip_list = generate_range(IP_RANGE_START, IP_RANGE_END);
let port_list = PORT_LIST;

// hide error messages
console.error = function() {};

// try each IP address and each Port
ip_list.forEach(function(ip_entry) {
	port_list.forEach(async function(port_entry) {

		console.log(ip_entry + ' ' + port_entry);

		let cam_obj = new OnvifLib.Onvif({
			hostname: ip_entry,
			username: USERNAME,
			password: PASSWORD,
			port: port_entry,
			timeout: 10000
		});
		
		try {
			await cam_obj.connect();
			console.log("ONVIF Device has connected");
		} catch (err) {
			console.log(err);
			return;
		}

		let got_date;
		let got_info;
		let got_live_stream_tcp;
		let got_live_stream_udp;
		let got_live_stream_multicast;
		let got_recordings;
		let got_replay_stream;

		// Use await to execute each ONVIF function in turn
		// This is used so we can wait on all ONVIF replies before
		// writing to the console
		try {
			got_date = await cam_obj.device.getSystemDateAndTime();
		} catch {}

		try {
			got_info = await cam_obj.device.getDeviceInformation();
		} catch {}

		try {
			got_live_stream_tcp = await cam_obj.media.getStreamUri({
				protocol: 'RTSP',
				stream: 'RTP-Unicast'
			});
		} catch {}

		try {
			got_live_stream_udp = await cam_obj.media.getStreamUri({
				protocol: 'UDP',
				stream: 'RTP-Unicast'
			});
		} catch {}

		try {
			got_live_stream_multicast = await cam_obj.media.getStreamUri({
				protocol: 'UDP',
				stream: 'RTP-Multicast'
			});
		} catch {}

		try {
			got_recordings = await cam_obj.media.getRecordings();
		} catch {}

		if (got_recordings) {
			try {
				got_replay_stream = await cam_obj.media.getReplayUri({
					protocol: 'RTSP',
					recordingToken: got_recordings[0].recordingToken
				});
			} catch {};
		}

		console.log('------------------------------');
		console.log('Host: ' + ip_entry + ' Port: ' + port_entry);
		console.log('Date: = ' + JSON.stringify(got_date));
		console.log('Info: = ' + JSON.stringify(got_info));
		if (got_live_stream_tcp) {
			// Media(original) and Media2 return different Objects
			let uri = '';
			if ('mediaUri' in got_live_stream_tcp) uri = got_live_stream_tcp.mediaUri.uri;
			else uri = got_live_stream_tcp.uri; 
			console.log('First Live TCP Stream: =       ' + uri);
		}
		if (got_live_stream_udp) {
			// Media(original) and Media2 return different Objects
			let uri = '';
			if ('mediaUri' in got_live_stream_udp) uri = got_live_stream_udp.mediaUri.uri;
			else uri = got_live_stream_udp.uri; 
			console.log('First Live UDP Stream: =       ' + uri);
		}
		if (got_live_stream_multicast) {
			// Media(original) and Media2 return different Objects
			let uri = '';
			if ('mediaUri' in got_live_stream_multicast) uri = got_live_stream_multicast.mediaUri.uri;
			else uri = got_live_stream_multicast.uri; 
			console.log('First Live Multicast Stream: = ' + uri);
		}

		if (got_recordings) {
			console.log('Recordings: = Yes');
			if (got_replay_stream) {
				console.log('First Replay Stream: = ' + got_replay_stream.uri);
			}
		} else {
			console.log('Recordings: = No');
		}

		console.log('------------------------------');
	}); // foreach
}); // foreach


function generate_range(start_ip, end_ip) {
	var start_long = toLong(start_ip);
	var end_long = toLong(end_ip);
	if (start_long > end_long) {
		var tmp = start_long;
		start_long = end_long
		end_long = tmp;
	}
	var range_array = [];
	var i;
	for (i = start_long; i <= end_long;i++) {
		range_array.push(fromLong(i));
	}
	return range_array;
}

//toLong taken from NPM package 'ip' 
function toLong(ip) {
	var ipl = 0;
	ip.split('.').forEach(function(octet) {
		ipl <<= 8;
		ipl += parseInt(octet);
	});
	return (ipl >>> 0);
}

//fromLong taken from NPM package 'ip' 
function fromLong(ipl) {
	return ((ipl >>> 24) + '.' +
      (ipl >> 16 & 255) + '.' +
      (ipl >> 8 & 255) + '.' +
      (ipl & 255) );
}
 
