Cam = require('../lib/onvif').Cam

exports.cam = new Cam {
  hostname: '192.168.68.111'
  , username: 'admin'
  , password: '9999'
}