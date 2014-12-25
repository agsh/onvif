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

  #describe 'object '

  describe 'getSystemDateAndTime', () ->
    it 'should return valid date', (done) ->
      cam.getSystemDateAndTime (err, data) ->
        assert.equal err, null
        assert.ok (data instanceof Date)
        done()

  describe 'getServices', () ->
    it 'should return an array of services objects', (done) ->
      cam.getServices (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray data
        assert.ok data.every (service) ->
          service.namespace and service.XAddr and service.version
        done()
