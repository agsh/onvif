const http = require('http');
const dgram = require('dgram');
const xml2js = require('xml2js');
const fs = require('fs');
const Buffer = require('buffer').Buffer;
// eslint-disable-next-line node/no-unpublished-require
const template = require('dot').template;
const reBody = /<s:Body xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance" xmlns:xsd="http:\/\/www.w3.org\/2001\/XMLSchema">(.*)<\/s:Body>/;
const reCommand = /<(\S*) /;
const reNS = /xmlns="http:\/\/www.onvif.org\/\S*\/(\S*)\/wsdl"/;
const __xmldir = __dirname + '/serverMockup/';
const conf = {
	port: parseInt(process.env.PORT) || 10101, // server port
	hostname: process.env.HOSTNAME || 'localhost',
	pullPointUrl: '/onvif/subscription?Idx=6',
};

const verbose = process.env.VERBOSE || false;
const log = (...msgs) => {
	if (verbose) {
		console.log(...msgs);
	}
};
let connectionBreaker = {
	break: false
};

const listener = (req, res) => {
	req.setEncoding('utf8');
	const buf = [];
	req.on('data', (chunk) => buf.push(chunk));
	req.on('end', () => {
		let request;
		if (Buffer.isBuffer(buf)) {
			request = Buffer.concat(buf);
		} else {
			request = buf.join('');
		}
		// Find body and command name
		const body = reBody.exec(request);
		if (!body) {
			return res.end();
		}
		const header = body[1];
		let command = reCommand.exec(header)[1];
		if (!command) {
			return res.end();
		}
		// Look for ONVIF namespaces
		const onvifNamespaces = reNS.exec(header);
		let ns = '';
		if (onvifNamespaces) {
			ns = onvifNamespaces[1];
		}
		log('received', ns, command);
		if (fs.existsSync(__xmldir + ns + '.' + command + '.xml')) {
			command = ns + '.' + command;
		}
		if (!fs.existsSync(__xmldir + command + '.xml')) {
			command = 'Error';
		}
		const fileName = __xmldir + command + '.xml';
		log('serving', fileName);
		res.setHeader('Content-Type', 'application/soap+xml;charset=UTF-8');
		if (connectionBreaker.break) {
			log('break connection');
			res.destroy();
			return;
		}
		res.end(template(fs.readFileSync(fileName))(conf));
	});
};

// Discovery service
const discoverReply = dgram.createSocket('udp4');
const discover = dgram.createSocket({ type: 'udp4', reuseAddr: true });
discover.on('error', (err) => { throw err; });
discover.on('message', (msg, rinfo) => {
	log('Discovery received');
	// Extract MessageTo from the XML. xml2ns options remove the namespace tags and ensure element character content is accessed with '_'
	xml2js.parseString(msg.toString(), { explicitCharkey: true, tagNameProcessors: [xml2js.processors.stripPrefix]}, (err, result) => {
		const msgId = result.Envelope.Header[0].MessageID[0]._;
		const discoverMsg = Buffer.from(fs
			.readFileSync(__xmldir + 'Probe.xml')
			.toString()
			.replace('RELATES_TO', msgId)
			.replace('SERVICE_URI', 'http://' + conf.hostname + ':' + conf.port + '/onvif/device_service')
		);
		switch (msgId) {
			// Wrong message test
			case 'urn:uuid:e7707': discoverReply.send(Buffer.from('lollipop'), 0, 8, rinfo.port, rinfo.address);
				break;
			// Double sending test
			case 'urn:uuid:d0-61e':
				discoverReply.send(discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address);
				discoverReply.send(discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address);
				break;
			default: discoverReply.send(discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address);
		}
	});
});

log('Listening for Discovery Messages on Port 3702');
discover.bind(3702, () => discover.addMembership('239.255.255.250'));

const server = http.createServer(listener).listen(conf.port, (err) => {
	if (err) {
		throw err;
	}
	log('Listening on port', conf.port);
});

const close = () => {
	discover.close();
	discoverReply.close();
	server.close();
	log('Closing ServerMockup');
};

module.exports = {
	server,
	conf,
	discover,
	close,
	connectionBreaker
};
