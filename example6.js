/**
 * NodeJS ONVIF Events
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Register for Events and write them to stdout
 * 
 */

let HOSTNAME = '192.168.1.15',
    PORT = 80,
    USERNAME = 'onvifusername',
    PASSWORD = 'xxxxxx';

let Cam = require('./lib/onvif').Cam;
let flow = require('nimble');

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
    
    console.log('Connected to ONVIF Device');

    let cam_obj = this;

    let hasEvents = false;
    let hasTopics = false;

    // Use Nimbe's flow to execute ONVIF commands in sequence
    flow.series([
        function(callback) {
                cam_obj.getCapabilities(function(err, data, xml) {
                if (err) {
                    console.log(err);
                }
                if (!err && data.events) {
                    console.log('Camera Events service found');
                    hasEvents = true;
                }
                callback();
        })},
        function(callback) {
            if (hasEvents) {
                cam_obj.getEventProperties(function(err, data, xml) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        // Display the available Topics
                        for (const topicName in data.topicSet) {
                            for (const topicDetails in data.topicSet[topicName]) {
                                if (topicDetails != '$') { // XML to JSON parser returns an object called '$'. Skip over it
                                    console.log('Found Event: ' + topicName + ' - ' + topicDetails)
                                    hasTopics = true;
                                }
                            }
                        }
                    }
                    callback();
                });
            } else {
                callback();
            }
        },
        function(callback) {
            if (hasEvents && hasTopics) {
                cam_obj.on('event', camMessage => {
                    const topic = camMessage.topic._;
                    console.log('EVENT TRIGGERED: ' + topic);
                })
            }
            callback();
        }
    ]);


    // Code completes here but the applictions remains running as there is a OnEvent listener that is active

});
