// Run the Server Mockup
// Default port is 10101


console.log('Loading Server Mockup');

process.env['VERBOSE'] = 'true';
process.env['HOSTNAME'] = '192.168.1.151';
let serverMockup = require('./test/serverMockup.js')

console.log('Server Ready');

// The server Mockup unrefs the HTTP Server and Discovery UDP Listener so NodeJS will and not wait for the http server to terminate
// So we keep the server alive with a hack - a timer that runs every 24 hours

setInterval(function () {
    console.log('keepalive executed'); 
}, 1000*60*60*24); 

