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
        assert.ok (data instanceof Date)
        done()
