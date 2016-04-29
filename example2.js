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
    IP_RANGE_SIZE = 253,
    PORT_LIST = [80, 8000, 8080],
    USERNAME = 'admin',
    PASSWORD = 'password';

var Cam = require('./lib/onvif').Cam;
var Range = require('ipv4-range');
var flow = require('nimble');

var ip_list = Range(IP_RANGE_START, IP_RANGE_SIZE);
var port_list = PORT_LIST;

// hide error messages
console.error = function() {};

// try each IP address and each Port
ip_list.forEach(function(ip_entry) {
    port_list.forEach(function(port_entry) {

        console.log(ip_entry + ' ' + port_entry);

        new Cam({
            hostname: ip_entry,
            username: USERNAME,
            password: PASSWORD,
            port: port_entry
        }, function CamFunc(err) {
            if (err) return;

            var cam_obj = this;

            var got_date;
            var got_info;
            var got_stream;

            // Use Nimble to execute each ONVIF function in turn
            // This is used so we can wait on all ONVIF replies before
            // writing to the console
            flow.series([
                function(callback) {

                    cam_obj.getSystemDateAndTime(function(err, date, xml) {
                        if (!err) got_date = date;
                        callback();
                    });
                },
                function(callback) {
                    cam_obj.getDeviceInformation(function(err, info, xml) {
                        if (!err) got_info = info;
                        callback();
                    });
                },
                function(callback) {
                    cam_obj.getStreamUri({
                        protocol: 'RTSP'
                    }, function(err, stream, xml) {
                        if (!err) got_stream = stream;
                        callback();
                    });
                },
                function(callback) {
                    console.log('------------------------------');
                    console.log('Host: ' + ip_entry + ' Port: ' + port_entry);
                    console.log('Date: = ' + got_date);
                    console.log('Info: = ' + JSON.stringify(got_info));
                    console.log('Stream: = ' + JSON.stringify(got_stream));
                    console.log('------------------------------');
                    callback();
                },

            ]); // end flow

        });
    }); // foreach
}); // foreach
