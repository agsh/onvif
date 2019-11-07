// Run the Server Mockup

let ip = require('ip');

let serverHostname = ip.address();
let serverPort = '10101';
let allowDiscovery = 'false';

process.env['HOSTNAME'] = serverHostname;
process.env['PORT'] = serverPort;
process.env['VERBOSE'] = 'true';

console.log('Starting Server Mockup at http://' + serverHostname + ':' + serverPort + '/onvif/device_service');

let serverMockup = require('./test/serverMockup.js')

// The server Mockup unrefs the HTTP Server and Discovery UDP Listener so NodeJS
// will exit immediatly
// We keep the server alive with an IntervalTimer that runs every 24 hours

setInterval(function () {
    console.log('keepalive executed'); 
}, 1000*60*60*24); 

