/**
 * NodeJS ONVIF Events
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Register for Events and write them to stdout
 * 
 */

let HOSTNAME = '192.168.1.151',
    PORT = 10101,
    USERNAME = 'onvifuser',
    PASSWORD = 'xxxx';

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
                if (!err && data.events && data.events.WSPullPointSupport && data.events.WSPullPointSupport == true) {
                    console.log('Camera Events service found');
                    hasEvents = true;
                }
                if (hasEvents == false) {
                    console.log('This camera/NVT does not support PullPoint Events')
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

                    // Extract Event Details
                    let eventTime = camMessage.message.message.$.UtcTime
                    let eventTopic = camMessage.topic._;
                    let eventProperty = camMessage.message.message.$.PropertyOperation
                    // there can be more than one SimpleItem in the 'data' part of the XML
                    let eventType;
                    let eventValue;

                    if (Array.isArray(camMessage.message.message.data)) {
                        eventType = camMessage.message.message.data.simpleItem.$.Name
                        eventValue = camMessage.message.message.data.simpleItem.$.Value
                    } else {
                        eventType = camMessage.message.message.data.simpleItem.$.Name
                        eventValue = camMessage.message.message.data.simpleItem.$.Value
                    }


                    console.log(`EVENT TRIGGERED: ${eventTime.toJSON()} ${eventTopic} ${eventProperty} ${eventType} ${eventValue}`);
                })
            }
            callback();
        }
    ]);


    // Code completes here but the applictions remains running as there is a OnEvent listener that is active

});
