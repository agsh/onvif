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

  describe '_request', () ->
    it 'brokes when no arguments are passed', (done) ->
      assert.throws () -> cam._request()
      done()
    it 'brokes when no callback is passed', (done) ->
      assert.throws () -> cam._request({})
      done()
    it 'brokes when no options.body is passed', (done) ->
      assert.throws () -> cam._request({}, () -> {})
      done()
    it 'should return an error message when request is bad', (done) ->
      cam._request {body: 'test'}, (err) ->
        assert.notEqual err, null
        done()
    it 'should return an error message when the network is unreachible', (done) ->
      host = cam.hostname
      cam.hostname = 'wrong hostname'
      cam._request {body: 'test'}, (err) ->
        assert.notEqual err, null
        cam.hostname = host
        done()
    it 'should not work with the PTZ option but without ptzUri property', (done) ->
      ptzUri = cam.ptzUri
      delete cam.ptzUri
      cam._request {body: 'test', ptz: true}, (err) ->
        assert.notEqual err, null
        cam.ptzUri = ptzUri
        done()
    it 'should work nice with the proper request body', (done) ->
      cam._request {body: '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
        '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
        '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
        '</s:Body>' +
        '</s:Envelope>'}
      , (err) ->
        assert.equal err, null
        done()

  describe 'connect', () ->
    it 'should connect to the cam, fill startup properties', (done) ->
      cam.connect (err) ->
        assert.equal err, null
        assert.ok cam.capabilities
        assert.ok cam.ptzUri
        assert.ok cam.videoSources
        assert.ok cam.profiles
        assert.ok cam.defaultProfile
        assert.ok cam.activeSource
        done()

  describe 'getSystemDateAndTime', () ->
    it 'should return valid date', (done) ->
      cam.getSystemDateAndTime (err, data) ->
        assert.equal err, null
        assert.ok (data instanceof Date)
        done()

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

  describe 'absolute move', () ->
    it 'should returns empty RelativeResponseObject', (done) ->
      cam.ptzAbsoluteMove {
        positionPanTiltX: 1
        positionPanTiltY: 1
        zoom: 1
      }, done
    it 'should works without callback', () ->
      cam.ptzAbsoluteMove {
        positionPanTiltX: 1
        positionPanTiltY: 1
        zoom: 1
      }

  describe 'relative move', () ->
    it 'should returns empty RelativeResponseObject', (done) ->
      cam.ptzAbsoluteMove {
        speedPanTiltX: 1
        speedPanTiltY: 1
        translationPanTiltX: 1
        translationPanTiltY: 1
        zoom: 1
      }, done
    it 'should works without callback', () ->
      cam.ptzAbsoluteMove {
        speedPanTiltX: 1
        speedPanTiltY: 1
        translationPanTiltX: 1
        translationPanTiltY: 1
        zoom: 1
      }

  describe 'getStatus', () ->
    it 'should returns position status', (done) ->
      cam.getStatus {}, (err, data) ->
        assert.equal err, null
        done()