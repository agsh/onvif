assert = require 'assert'
Cam = require('../lib/onvif').Cam

describe 'getCapabilities', () ->

  cam = new Cam {
    hostname: '192.168.68.111'
    , username: 'admin'
    , password: '9999'
  }

  it 'should get video sources', (done) ->
    cam.getVideoSources (err, data) ->
      console.log JSON.stringify(data)
      assert.equal err, null
      done()