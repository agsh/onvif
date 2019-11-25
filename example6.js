/**
 * NodeJS ONVIF Events
 * Reveive Events using a PullPoint Subscription and display the events on screen
 * Tested with Axis (which uses a fixed PullPoint URL with a SubscriberId in the XML)
 * and with HikVision (which uses a dynamically generated PullPoint URL)
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 * 
 * (c) Roger Hardiman, RJH Technical Consultancy Ltd, November 2019
 * Licenced under the MIT Open Source Licence
 *
 */

let HOSTNAME = '127.0.0.1',
    PORT = 10101,
    USERNAME = 'user',
    PASSWORD = 'pass';

let Cam = require('./lib/onvif').Cam;
let flow = require('nimble');

new Cam({
	hostname : HOSTNAME,
	username : USERNAME,
	password : PASSWORD,
	port : PORT,
    timeout : 10000,
    preserveAddress : true   // Enables NAT support and re-writes for PullPointSubscription URL
}, function CamFunc(err) {
	if (err) {
		console.log(err);
		return;
    }
    
    console.log('Connected to ONVIF Device');

    let cam_obj = this;

    let hasEvents = false;
    let hasTopics = false;

    // Use Nimble's flow to execute ONVIF commands in sequence
    flow.series([
        function(callback) {
            cam_obj.getDeviceInformation(function(err, info, xml) {
                if (!err) console.log('Manufacturer  ' + info.manufacturer);
                if (!err) console.log('Model         ' + info.model);
                if (!err) console.log('Firmware      ' + info.firmwareVersion);
                if (!err) console.log('Serial Number ' + info.serialNumber);
                callback();
            });
        },
        function(callback) {
            cam_obj.getSystemDateAndTime(function(err, date, xml) {
                if (!err) console.log('Device Time   ' + date);
                callback();
            });
        },
        function(callback) {
                cam_obj.getCapabilities(function(err, data, xml) {
                if (err) {
                    console.log(err);
                }
                if (!err && data.events && data.events.WSPullPointSupport && data.events.WSPullPointSupport == true) {
                    console.log('Camera supports WSPullPoint');
                    hasEvents = true;
                } else {
                    console.log('Camera does not show WSPullPoint support, but trying anyway');
                    // Have an Axis cameras that says False to WSPullPointSuppor but supports it anyway
                    hasEvents = true; // Hack for Axis cameras
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
                        let parseNode = function(node, topicPath) {
                            // loop over all the child nodes in this node
                            for (const child in node) {
                                if (child == "$") continue;
                                else if (child == "messageDescription") {
                                    // we have found the details that go with an event
                                    // examine the messageDescription
                                    let IsProperty = false;
                                    let source = '';
                                    let data = '';
                                    if (node[child].$ && node[child].$.IsProperty) IsProperty = node[child].$.IsProperty;
                                    if (node[child].source) source = JSON.stringify(node[child].source)
                                    if (node[child].data) data = JSON.stringify(node[child].data)
                                    console.log('Found Event - ' + topicPath.toUpperCase())
                                    //console.log('  IsProperty=' + IsProperty);
                                    //if (source.length > 0) console.log('  Source=' + source);
                                    //if (data.length > 0) console.log('  Data=' + data);
                                    hasTopics = true;
                                    return;
                                }
                                else {
                                    // decend into the child node, looking for the messageDescription
                                    parseNode(node[child], topicPath + '/' + child)
                                }
                            }
                        }
                        parseNode(data.topicSet, '');
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
    // To stop we must remove the event listener
    //setTimeout(()=>{cam_obj.removeAllListeners('event');},5000);

});
