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

// ServerMockup keeps running until you call .close()

// serverMockup.close()

