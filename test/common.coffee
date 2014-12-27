assert = require 'assert'
Cam = require('../lib/onvif').Cam
serverMockup = require('./serverMockup')

describe 'Simple and common get functions', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: 'admin'
      password: '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new Cam options, done

  describe 'getCapabilities', () ->
    it 'should return an capabilities object with correspondent properties and also set them into capability property', (done) ->
      cam.getCapabilities (err, data) ->
        assert.equal err, null
        assert.ok cam.profiles.every (profile) ->
          ['name', 'videoSourceConfiguration', 'videoEncoderConfiguration', 'PTZConfiguration'].every (prop) ->
            profile[prop]
        assert.equal cam.capabilities, data
        done()
    it 'should store PTZ link in ptzUri property', (done) ->
      assert.equal cam.ptzUri.href, cam.capabilities.PTZ.XAddr
      done()

  describe 'getVideoSources', () ->
    it 'should return a videosources object with correspondent properties and also set them into videoSources property', (done) ->
      cam.getVideoSources (err, data) ->
        assert.equal err, null
        assert.ok ['$', 'framerate', 'resolution'].every (prop) ->
          data[prop] != undefined
        assert.equal cam.videoSources, data
        done()

  describe 'getProfiles', () ->
    it 'should create an array of profile objects with correspondent properties', (done) ->
      cam.getVideoSources (err, data) ->
        assert.equal err, null
        assert.ok ['$', 'framerate', 'resolution'].every (prop) ->
          data[prop] != undefined
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

  describe 'getDeviceInformation', () ->
    it 'should return an information about device', (done) ->
      cam.getDeviceInformation (err, data) ->
        assert.equal err, null
        assert.ok ['manufacturer', 'model', 'firmwareVersion', 'serialNumber', 'hardwareId'].every (prop) ->
          data[prop] != undefined
        assert.equal cam.deviceInformation, data
        done()

  describe 'getStreamUri', () ->
    it 'should return a media stream uri', (done) ->
      cam.getStreamUri {protocol: 'HTTP'}, (err, data) ->
        assert.equal err, null
        assert.ok ['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every (prop) ->
          data[prop] != undefined
        done()

  describe 'getPresets', () ->
    it 'should return array of preset objects', (done) ->
      cam.getPresets {}, (err, data) ->
        assert.equal err, null
        assert.ok Object.keys(data).every (presetName) ->
          typeof data[presetName] == 'string'
        assert.equal cam.presets, data
        done()
