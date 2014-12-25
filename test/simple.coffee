assert = require 'assert'
Cam = require('../lib/onvif').Cam
serverMockup = require('./serverMockup')

describe 'Simple and common get functions', () ->
  cam = null
  before (done) ->
    cam = new Cam {
      hostname: 'localhost'
      , username: 'admin'
      , password: '9999'
      , port: 10101
    }, done

  describe 'getSystemDateAndTime', () ->
    it 'should return valid date', (done) ->
      cam.getSystemDateAndTime (err, data) ->
        assert.equal err, null
        assert.deepEqual Object.keys(data), ['time', 'date']
        assert.deepEqual Object.keys(data.time), ['hour', 'minute', 'second']
        assert.deepEqual Object.keys(data.date), ['year', 'month', 'day']
        assert.ok Object.keys(data.time).every (key) -> typeof data.time[key] == 'number'
        assert.ok Object.keys(data.date).every (key) -> typeof data.date[key] == 'number'
        done()
