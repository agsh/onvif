/**
 * NodeJS ONVIF PTZ and Presets Test
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Discover ONVIF devices on the network
 */

var onvif = require('./lib/onvif');

onvif.Discovery.on('device', function(cam,rinfo,xml){
    // function will be called as soon as NVT responses
    console.log('Reply from ' + rinfo.address);
    console.log(cam.hostname + ':' + cam.port + cam.path);
})
onvif.Discovery.probe();
