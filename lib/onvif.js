/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

var http = require('http')
	, parseString = require('xml2js').parseString
	, crytpo = require('crypto')
	;

var Cam = function(options, callback) {
	this.hostname = options.hostname;
	this.username = options.username;
	this.password = options.password;
	this.port = options.port ? options.port : 80;
	this.path = '/onvif/device_service';
};

Cam.prototype._request = function(options, callback) {
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
			//console.log('CHUNK: ' + chunck);
			bufs.push(chunck);
			length += chunck.length;
		});
		res.on('end', function() {
			// console.log('END');
			var xml = Buffer.concat(bufs, length).toString();

			parseString(xml, function(err, result) {
				callback(err, result['SOAP-ENV:Envelope']['SOAP-ENV:Body']);
			});
		})
	});
	req.on('error', function(err) {
		callback(err);
	});
	req.write(options.body);
	req.end();
};

Cam.prototype.getSystemDateAndTime = function(callback) {
	this._request({
		body:
		'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
			'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data) {
		if (err) { return callback(err); }
		var dt = data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0];
		callback(null, {
			year: +dt['tt:Date'][0]['tt:Year'][0]
			, month: +dt['tt:Date'][0]['tt:Month'][0]
			, day: +dt['tt:Date'][0]['tt:Day'][0]
			, hour: +dt['tt:Time'][0]['tt:Hour'] [0]
			, minute: +dt['tt:Time'][0]['tt:Minute'][0]
			, second: +dt['tt:Time'][0]['tt:Second'][0]
		});
	});
};

Cam.prototype.getCapabilities = function() {
	this._request({
		body:
		'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Header>' +
				'<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
					'<UsernameToken>' +
						'<Username>%%USERNAME%%</Username>' +
						'<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">%%PASSWORD%%</Password>' +
						'<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">%%NONCE%%</Nonce>' +
						'<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">%%CREATED%%</Created>' +
					'</UsernameToken>' +
				'</Security>' +
			'</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">' +
					'<Category>All</Category>' +
				'</GetCapabilities>' +
			'</s:Body>' +
		'</s:Envelope>'
	})
};

Cam.prototype._passwordDigest = function(username, password, timestamp, nonce) {
	if (!timestamp) {
		timestamp = new Date().toISOString();
	}
	if (!nonce) {
		nonce = Math.ceil(Math.random()*10000000000)
	}
};

Cam.prototype.test = function() {
	var ha1 = crypto.createHash('md5');
};

var cam = new Cam({
	hostname: '192.168.68.111'
});

cam.getSystemDateAndTime(function(err, data){ console.log(err, data); });