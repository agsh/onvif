/**
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Brute force scan of the network looking for ONVIF devices
 * Displays the time and date of each device
 *          the make and model
 *          the default RTSP address
 * This DOES NOT use ONVIF Discovery. This softweare tries each IP address in
 * turn which allows it to work on networks where ONVIF Discovery does not work
 * (eg on Layer 3 routed networks)
 * 
 * EXAMPLE USING PROMISES by convering callbacks into Promises
 * You can do this in NodeJS or using the Bluebird NPM
 */

var IP_RANGE_START = '192.168.26.200',
	IP_RANGE_END = '192.168.26.220',
	PORT_LIST = [80,8081],
	USERNAME = 'admin',
	PASSWORD = 'PASS99pass';

var Cam = require('../lib/onvif').Cam;
const { promisify } = require("util");

//var ipList = [];
var ipList = generateRange(IP_RANGE_START, IP_RANGE_END);

ipList.push("192.168.26.108");
var portList = PORT_LIST;

// hide error messages
console.error = function(_err) {
};

// try each IP address and each Port
ipList.forEach(function(ipEntry) {
	portList.forEach(function(portEntry) {
		console.log(ipEntry + ' ' + portEntry);

		new Cam(
			{
				hostname: ipEntry,
				username: USERNAME,
				password: PASSWORD,
				port: portEntry,
				timeout: 5000,
			},
			async function CamFunc(err) {
				if (err) {
					if (err.message) {console.log(err.message);} else {console.log(err);}
					return;
				}

				var camObj = this;

				// Use Promisify that was added to Nodev8

				const promiseGetSystemDateAndTime = promisify(camObj.getSystemDateAndTime).bind(camObj);
				const promiseGetDeviceInformation = promisify(camObj.getDeviceInformation).bind(camObj);
				const promiseGetProfiles = promisify(camObj.getProfiles).bind(camObj);
				const promiseGetSnapshotUri = promisify(camObj.getSnapshotUri).bind(camObj);
				const promiseGetStreamUri = promisify(camObj.getStreamUri).bind(camObj);

				// Use Promisify to convert ONVIF Library calls into Promises.
				let gotDate = await promiseGetSystemDateAndTime();
				let gotInfo = await promiseGetDeviceInformation();

				let videoResults = "";
				let profiles = await promiseGetProfiles();

				// GetMoveOptions
				const promiseimagingGetMoveOptions = promisify(camObj.imagingGetMoveOptions).bind(camObj);
				
				let moveOptions = null;
				try {
					moveOptions = await promiseimagingGetMoveOptions();
				} catch {}


				console.log('------------------------------');
				console.log('Host: ' + ipEntry + ' Port: ' + portEntry);
				console.log('Date: = ' + gotDate);
				console.log('Info: = ' + JSON.stringify(gotInfo));
				console.log(videoResults);
				if (moveOptions != null) console.log(moveOptions);
				else console.log("No Move Options");
				console.log('------------------------------');
			});  // end CamFunc
	}); // foreach
}); // foreach

function generateRange(startIp, endIp) {
	var startLong = toLong(startIp);
	var endLong = toLong(endIp);
	if (startLong > endLong) {
		var tmp = startLong;
		startLong = endLong;
		endLong = tmp;
	}
	var rangeArray = [];
	var i;
	for (i = startLong; i <= endLong; i++) {
		rangeArray.push(fromLong(i));
	}
	return rangeArray;
}

//toLong taken from NPM package 'ip'
function toLong(ip) {
	var ipl = 0;
	ip.split('.').forEach(function(octet) {
		ipl <<= 8;
		ipl += parseInt(octet);
	});
	return ipl >>> 0;
}

//fromLong taken from NPM package 'ip'
function fromLong(ipl) {
	return (ipl >>> 24) + '.' + ((ipl >> 16) & 255) + '.' + ((ipl >> 8) & 255) + '.' + (ipl & 255);
}
