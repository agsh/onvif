/**
 * NodeJS ONVIF Events
 * Receive Events using a PullPoint Subscription and display the events on screen
 * Tested with Axis (which uses a fixed PullPoint URL with a SubscriberId in the XML)
 * and with HikVision (which uses a dynamically generated PullPoint URL)
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 * 
 * (c) Roger Hardiman, RJH Technical Consultancy Ltd, November 2019
 * Licenced under the MIT Open Source Licence
 *
 */

let HOSTNAME = '192.168.1.16',
	PORT = 80,
	USERNAME = 'user',
	PASSWORD = 'pass';

let Cam = require('./lib/onvif').Cam;
let flow = require('nimble');

new Cam({
	hostname: HOSTNAME,
	username: USERNAME,
	password: PASSWORD,
	port: PORT,
	timeout: 10000,
	preserveAddress: true   // Enables NAT support and re-writes for PullPointSubscription URL
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
				if (!err) {console.log('Manufacturer  ' + info.manufacturer);}
				if (!err) {console.log('Model         ' + info.model);}
				if (!err) {console.log('Firmware      ' + info.firmwareVersion);}
				if (!err) {console.log('Serial Number ' + info.serialNumber);}
				callback();
			});
		},
		function(callback) {
			cam_obj.getSystemDateAndTime(function(err, date, xml) {
				if (!err) {console.log('Device Time   ' + date);}
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
					console.log('This camera/NVT does not support PullPoint Events');
				}
				callback();
			})
		},
		function(callback) {
			if (hasEvents) {
				cam_obj.getEventProperties(function(err, data, xml) {
					if (err) {
						console.log(err);
					} else {
						// Display the available Topics
						let parseNode = function(node, topicPath) {
							// loop over all the child nodes in this node
							for (const child in node) {
								if (child == "$") {continue;} else if (child == "messageDescription") {
									// we have found the details that go with an event
									// examine the messageDescription
									let IsProperty = false;
									let source = '';
									let data = '';
									if (node[child].$ && node[child].$.IsProperty) {IsProperty = node[child].$.IsProperty}
									if (node[child].source) {source = JSON.stringify(node[child].source)}
									if (node[child].data) {data = JSON.stringify(node[child].data)}
									console.log('Found Event - ' + topicPath.toUpperCase())
									//console.log('  IsProperty=' + IsProperty);
									if (source.length > 0) {console.log('  Source=' + source);}
									if (data.length > 0) {console.log('  Data=' + data);}
									hasTopics = true
									return
								} else {
									// decend into the child node, looking for the messageDescription
									parseNode(node[child], topicPath + '/' + child)
								}
							}
						}
						parseNode(data.topicSet, '')
					}
					console.log('');
					console.log('');
					callback()
				});
			} else {
				callback()
			}
		},
		function(callback) {
			if (hasEvents && hasTopics) {
				cam_obj.on('event', (camMessage, xml) => {

					// Extract Event Details
					// Events have a Topic
					// Events have (optionally) a Source, a Key and Data fields
					// The Source,Key and Data fields can be single items or an array of items
					// The Source,Key and Data fields can be of type SimpleItem or a Complex Item

					//    - Topic
					//    - Message/Message/$
					//    - Message/Message/Source...
					//    - Message/Message/Key...
					//    - Message/Message/Data/SimpleItem/[index]/$/name   (array of items)
					// OR - Message/Message/Data/SimpleItem/$/name   (single item)
					//    - Message/Message/Data/SimpleItem/[index]/$/value   (array of items)
					// OR - Message/Message/Data/SimpleItem/$/value   (single item)

                    let eventTopic = camMessage.topic._
                    eventTopic = stripNamespaces(eventTopic)

					let eventTime = camMessage.message.message.$.UtcTime;

					let eventProperty = camMessage.message.message.$.PropertyOperation
					// Supposed to be Initialized, Deleted or Changed but missing/undefined on the Avigilon 4 channel encoder

					// Only handle simpleItem
					// Only handle one 'source' item
					// Ignore the 'key' item  (nothing I own produces it)
					// Handle all the 'Data' items

					// SOURCE (Name:Value)
					let sourceName = null
					let sourceValue = null
					if (camMessage.message.message.source && camMessage.message.message.source.simpleItem) {
						if (Array.isArray(camMessage.message.message.source.simpleItem)) {
							sourceName = camMessage.message.message.source.simpleItem[0].$.Name
                            sourceValue = camMessage.message.message.source.simpleItem[0].$.Value
                            console.log("WARNING: Only processing first Event Source item")
						} else {
							sourceName = camMessage.message.message.source.simpleItem.$.Name
							sourceValue = camMessage.message.message.source.simpleItem.$.Value
						}
					} else {
                        sourceName = null
                        sourceValue = null
                        console.log("WARNING: Source does not contain a simpleItem")
                    }
                    
                    //KEY
                    if (camMessage.message.message.key) {
                        console.log('NOTE: Event has a Key')
                    }

					// DATA (Name:Value)
					if (camMessage.message.message.data && camMessage.message.message.data.simpleItem) {
						if (Array.isArray(camMessage.message.message.data.simpleItem)) {
							for (let x  = 0; x < camMessage.message.message.data.simpleItem.length; x++) {
								let dataName = camMessage.message.message.data.simpleItem[x].$.Name
								let dataValue = camMessage.message.message.data.simpleItem[x].$.Value
								processEvent(eventTime,eventTopic,eventProperty,sourceName,sourceValue,dataName,dataValue)
							}
						} else {
							let dataName = camMessage.message.message.data.simpleItem.$.Name
							let dataValue = camMessage.message.message.data.simpleItem.$.Value
							processEvent(eventTime,eventTopic,eventProperty,sourceName,sourceValue,dataName,dataValue)
						}
					} else if (camMessage.message.message.data && camMessage.message.message.data.elementItem) {
						console.log("WARNING: Data contain an elementItem")
						let dataName = 'elementItem'
						let dataValue = JSON.stringify(camMessage.message.message.data.elementItem)
						processEvent(eventTime,eventTopic,eventProperty,sourceName,sourceValue,dataName,dataValue)
					} else {
						console.log("WARNING: Data does not contain a simpleItem or elementItem")
						let dataName = null
						let dataValue = null
						processEvent(eventTime,eventTopic,eventProperty,sourceName,sourceValue,dataName,dataValue)
					}
				})
			}
			callback()
		}
	]); // end 'flow'
}) // end newCam callback


// Code completes here but the applications remains running as there is a OnEvent listener that is active

// UNCOMMENT THIS LINE TO STOP AFTER 5 SECONDS   setTimeout(()=>{cam_obj.removeAllListeners('event');},5000);



function stripNamespaces(topic) {
    // example input :-   tns1:MediaControl/tnsavg:ConfigurationUpdateAudioEncCfg 
    // Split on '/'
    // For each part, remove any namespace
    // Recombine parts that were split with '/'
    let output = '';
    let parts = topic.split('/')
    for (let index = 0; index < parts.length; index++) {
        let stringNoNamespace = parts[index].split(':').pop() // split on :, then return the last item in the array
        if (output.length == 0) {
            output += stringNoNamespace
        } else {
            output += '/' + stringNoNamespace
        }
    }
    return output
}

function processEvent(eventTime,eventTopic,eventProperty,sourceName,sourceValue,dataName,dataValue) {
	let output = '';
	output += `EVENT: ${eventTime.toJSON()} ${eventTopic}`
	if (typeof(eventProperty) !== "undefined") {
		output += ` PROP:${eventProperty}`
	}
	if (typeof(sourceName) !== "undefined" && typeof(sourceValue) !== "undefined") {
		output += ` SRC:${sourceName}=${sourceValue}`
	}
	if (typeof(dataName) !== "undefined" && typeof(dataValue) !== "undefined") {
		output += ` DATA:${dataName}=${dataValue}`
	}
	console.log(output)
}

