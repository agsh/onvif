/**
 * Created by und on 12.05.15.
 */

var onvif = require('../lib/onvif')
	, inspect = require('util').inspect
	;

var cam = new onvif.Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'}, function(err) {
	if (!err) {
		cam.createPullPointSubscription(function(err, data, xml) {
			console.log(err);
			console.log(inspect(data, {depth: 10}));
			console.log(xml);
			/*cam.relativeMove({x: -0.1}, function() {
				console.log(arguments);
			});*/
			cam.pullMessages({}, function(err, data, xml) {
				if (!err) {
					console.log(inspect(data, {depth: 10}));
				} else {
					console.log(err);
				}
				console.log(xml);
			});
		});
	} else {
		console.log(err);
	}
});