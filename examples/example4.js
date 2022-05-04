/**
 * Discover ONVIF devices on the network
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 */

var onvif = require('../lib/onvif');
var xml2js = require('xml2js')
var stripPrefix = require('xml2js').processors.stripPrefix;

/*
onvif.Discovery.on('device', function(cam,rinfo,xml){
	// function will be called as soon as NVT responds
	console.log('Reply from ' + rinfo.address);
	console.log(JSON.stringify(rinfo));
	console.log(cam.hostname + ':' + cam.port + cam.path);
})
*/
onvif.Discovery.on('device', function(cam, rinfo, xml) {
	// Function will be called as soon as the NVT responses


	// Parsing of Discovery responses taken from my ONVIF-Audit project, part of the 2018 ONVIF Open Source Challenge
	// Filter out xml name spaces
	xml = xml.replace(/xmlns([^=]*?)=(".*?")/g, '');

	let parser = new xml2js.Parser({
		attrkey: 'attr',
		charkey: 'payload',                // this ensures the payload is called .payload regardless of whether the XML Tags have Attributes or not
		explicitCharkey: true,
		tagNameProcessors: [stripPrefix]   // strip namespace eg tt:Data -> Data
	});
	parser.parseString(xml,
		function(err, result) {
			if (err) {return;}
			let urn = result['Envelope']['Body'][0]['ProbeMatches'][0]['ProbeMatch'][0]['EndpointReference'][0]['Address'][0].payload;
			let xaddrs = result['Envelope']['Body'][0]['ProbeMatches'][0]['ProbeMatch'][0]['XAddrs'][0].payload;
			let scopes = result['Envelope']['Body'][0]['ProbeMatches'][0]['ProbeMatch'][0]['Scopes'][0].payload;
			scopes = scopes.split(" ");

			let hardware = "";
			let name = "";
			for (let i = 0; i < scopes.length; i++) {
				if (scopes[i].includes('onvif://www.onvif.org/name')) {name = decodeURI(scopes[i].substring(27));}
				if (scopes[i].includes('onvif://www.onvif.org/hardware')) {hardware = decodeURI(scopes[i].substring(31));}
			}
			let msg = 'Discovery Reply from ' + rinfo.address + ' (' + name + ') (' + hardware + ') (' + xaddrs + ') (' + urn + ')';
			console.log(msg);
		}
	);
})
onvif.Discovery.on('error', function(err,xml) {
	// The ONVIF library had problems parsing some XML
	console.log('Discovery error ' + err);
});
onvif.Discovery.probe();
