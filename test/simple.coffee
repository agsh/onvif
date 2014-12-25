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

  describe 'getCapabilities', () ->
    it 'should return an capabilities object with correspondent properties and also set them into capability property', (done) ->
      cam.getCapabilities (err, data) ->
        assert.equal err, null
        assert.ok ['device', 'events', 'imaging', 'media', 'PTZ', 'extension'].every (prop) -> data[prop]
        assert.equal cam.capabilities, data
        done()
    it 'should store PTZ link in ptzUri property', (done) ->
      assert.equal cam.ptzUri.href, cam.capabilities.PTZ.XAddr
      done()

  describe 'getVideoSources', () ->
    it 'should return a videosources object with correspondent properties and also set them into videoSources property', (done) ->
      cam.getVideoSources (err, data) ->
        assert.equal err, null
        assert.ok ['$', 'framerate', 'resolution'].every (prop) -> data[prop]
        assert.equal cam.videoSources, data
        done()

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
