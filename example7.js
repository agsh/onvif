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
 */

var IP_RANGE_START = '192.168.1.1',
    IP_RANGE_END = '192.168.1.19',
    PORT_LIST = [80],
    USERNAME = 'onvifuser',
    PASSWORD = 'PASS99pass';

var Cam = require('./lib/onvif').Cam;
var flow = require('nimble');
const { promisify } = require("util");

var ip_list = generate_range(IP_RANGE_START, IP_RANGE_END);
var port_list = PORT_LIST;

// hide error messages
console.error = function (err) {
    err = err;
};

// try each IP address and each Port
ip_list.forEach(function (ip_entry) {
    port_list.forEach(function (port_entry) {
        console.log(ip_entry + ' ' + port_entry);

        new Cam(
            {
                hostname: ip_entry,
                username: USERNAME,
                password: PASSWORD,
                port: port_entry,
                timeout: 5000,
            },
            async function CamFunc(err) {
                if (err) {
                    if (err.message) console.log(err.message);
                    else console.log(err);
                    return;
                }

                var cam_obj = this;

                const promiseGetSystemDateAndTime = promisify(cam_obj.getSystemDateAndTime).bind(cam_obj);
                const promiseGetDeviceInformation = promisify(cam_obj.getDeviceInformation).bind(cam_obj);
                const promiseGetProfiles = promisify(cam_obj.getProfiles).bind(cam_obj);
                const promiseGetStreamUri = promisify(cam_obj.getStreamUri).bind(cam_obj);

                // Use Promisify to convert ONVIF Library calls into Promises.
                let got_date = await promiseGetSystemDateAndTime();
                let got_info = await promiseGetDeviceInformation();

                let rtsp_results = "";
                let profiles = await promiseGetProfiles();
                for (const profile of profiles) {
                    // wrap each URI Stream request in a Try/Catch as some requests (eg for multicast) may return an error
                    // the alternative would be a Promise.Then.Catch and wait for each Promise to complete(resolve)
                    rtsp_results += "Profile: Name=" + profile.name + " Token=" + profile.$.token + "\r\n"

                    let stream;
                    try {
                        rtsp_results += "RTSP TCP       ";
                        stream = await promiseGetStreamUri(
                            {
                                profileToken: profile.$.token,
                                protocol: 'RTSP',
                                stream: 'RTP-Unicast',
                            });
                        rtsp_results += profile.name + " " + profile.videoEncoderConfiguration.encoding + " "
                            + profile.videoEncoderConfiguration.resolution.width + "x" + profile.videoEncoderConfiguration.resolution.height + " " + stream.uri + "\r\n";

                    } catch (err) {
                        rtsp_results += profile.name + " not supported\r\n";
                    }


                    try {
                        rtsp_results += "RTSP UDP       ";
                        stream = await promiseGetStreamUri(
                            {
                                profileToken: profile.$.token,
                                protocol: 'UDP',
                                stream: 'RTP-Unicast',
                            });
                        rtsp_results += profile.name + " " + profile.videoEncoderConfiguration.encoding + " "
                            + profile.videoEncoderConfiguration.resolution.width + "x" + profile.videoEncoderConfiguration.resolution.height + " " + stream.uri + "\r\n";
                    } catch (err) {
                        rtsp_results += profile.name + " not supported\r\n";
                    }

                    try {
                        rtsp_results += "RTSP Multicast ";
                        stream = await promiseGetStreamUri(
                            {
                                profileToken: profile.$.token,
                                protocol: 'UDP',
                                stream: 'RTP-Multicast',
                            });
                        rtsp_results += profile.name + " " + profile.videoEncoderConfiguration.encoding + " "
                            + profile.videoEncoderConfiguration.resolution.width + "x" + profile.videoEncoderConfiguration.resolution.height + " " + stream.uri + "\r\n";
                    } catch (err) {
                        rtsp_results += profile.name + " not supported\r\n";
                    }

                    try {
                        rtsp_results += "HTTP           ";
                        stream = await promiseGetStreamUri(
                            {
                                profileToken: profile.$.token,
                                protocol: 'HTTP',
                                stream: 'RTP-Unicast',
                            });
                        rtsp_results += profile.name + " " + profile.videoEncoderConfiguration.encoding + " "
                            + profile.videoEncoderConfiguration.resolution.width + "x" + profile.videoEncoderConfiguration.resolution.height + " " + stream.uri + "\r\n";
                    } catch (err) {
                        rtsp_results += profile.name + " not supported\r\n";
                    }

                }

                console.log('------------------------------');
                console.log('Host: ' + ip_entry + ' Port: ' + port_entry);
                console.log('Date: = ' + got_date);
                console.log('Info: = ' + JSON.stringify(got_info));
                console.log(rtsp_results);
                console.log('------------------------------');
            });  // end CamFunc
    }); // foreach
}); // foreach

function generate_range(start_ip, end_ip) {
    var start_long = toLong(start_ip);
    var end_long = toLong(end_ip);
    if (start_long > end_long) {
        var tmp = start_long;
        start_long = end_long;
        end_long = tmp;
    }
    var range_array = [];
    var i;
    for (i = start_long; i <= end_long; i++) {
        range_array.push(fromLong(i));
    }
    return range_array;
}

//toLong taken from NPM package 'ip'
function toLong(ip) {
    var ipl = 0;
    ip.split('.').forEach(function (octet) {
        ipl <<= 8;
        ipl += parseInt(octet);
    });
    return ipl >>> 0;
}

//fromLong taken from NPM package 'ip'
function fromLong(ipl) {
    return (ipl >>> 24) + '.' + ((ipl >> 16) & 255) + '.' + ((ipl >> 8) & 255) + '.' + (ipl & 255);
}
