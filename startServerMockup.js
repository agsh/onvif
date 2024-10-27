// Run the Server Mockup

const serverHostname = 'localhost';
const serverPort = '10101';

process.env['HOSTNAME'] = serverHostname;
process.env['PORT'] = serverPort;
process.env['VERBOSE'] = 'true';

console.log(`Starting Server Mockup at http://${serverHostname}:${serverPort}/onvif/device_service`);
console.log('BTW you can find full-functional server here: https://www.happytimesoft.com/products/onvif-server/index.html');

let serverMockup = require('./test/serverMockup.js')

// ServerMockup keeps running until you call .close()

// serverMockup.close()

