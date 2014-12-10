assert = require 'assert'
Cam = require('../lib/onvif').Cam

describe 'getSystemDateAndTime', () ->

  cam = new Cam {
    hostname: '192.168.68.111'
  }

  it 'should return current date', (done) ->
    cam.getSystemDateAndTime (err, data) ->
      assert.equal err, null
      assert.deepEqual Object.keys(data), ['year', 'month', 'day', 'hour', 'minute', 'second']
      assert.ok Object.keys(data).every (key) -> typeof data[key] == 'number'
      done()

