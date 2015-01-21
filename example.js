/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/21/15.
 */

var http = require('http')
	, Cam = require('./lib/onvif').Cam
	;

new Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'}, function(err) {
	this.ptzAbsoluteMove({
		positionPanTiltX: 1
		, positionPanTiltY: 1
		, zoom: 1
	});
	this.getStreamUri({protocol:'RTSP'}, function(err, stream) {
		http.createServer(function (req, res) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end(
				'<html><body>' +
					'<embed type="application/x-vlc-plugin" name="video1" id="video1" controls="false" autoplay="yes" loop="yes" height="264" width="352" target="' + stream.uri + '"></embed>' +
				'</boby></html>');
		}).listen(3030);
	});
});