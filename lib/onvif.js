/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

var http = require('http')
	;

var Cam = function(options, callback) {
	this.hostname = options.hostname;
	this.port = options.port ? options.port : 80;
	this.path = '/onvif/device_service';
};

Cam.prototype.request = function(options, callback) {
	var req = http.request({
		hostname: this.hostname
		, headers: {
			'Content-Type': 'application/soap+xml'
			, charset: 'utf-8'
		}
		, port: this.port
		, path: this.path
		, method: 'POST'
	}, function(res) {
		var bufs = [], length = 0;
		console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function(chunck) {
			// console.log('CHUNK: ' + chunck);
			bufs.push(chunck);
			length += chunck.length;
		});
		res.on('end', function() {
			// console.log('END');
			callback(null, Buffer.concat(bufs, length).toString());
		})
	});
	req.on('error', function(err) {
		callback(err);
	});
	req.write(options.body);
	req.end();
};

Cam.prototype.getSystemDateAndTime = function() {
	this.request({
		body: '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/></s:Body></s:Envelope>'
	}, function(err, data) {
		console.log(err, data);
	});
};

var cam = new Cam({
	hostname: '192.168.68.111'
});

cam.getSystemDateAndTime();