synthTest = not process.env.HOSTNAME

assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup') if synthTest
fs = require('fs')

describe 'Common functions', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  describe 'default params', () ->
    it 'should set default port and path when no one is specified', (done) ->
      defaultCam = new onvif.Cam {}
      assert.equal defaultCam.port, 80
      assert.equal defaultCam.path, '/onvif/device_service'
      done()

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
    it 'should return an error message when the server request times out', (done) ->
      host = cam.hostname
      oldTimeout = cam.timeout
      cam.hostname = '10.255.255.1'
      cam.timeout = 500
      cam._request {body: 'test'}, (err) ->
        assert.notEqual err, null
        cam.timeout = oldTimeout
        cam.hostname = host
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
    it 'should handle SOAP Fault as an error (http://www.onvif.org/onvif/ver10/tc/onvif_core_ver10.pdf, pp.45-46)', (done) ->
      cam._request {body: '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
          '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<UnknownCommand xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
          '</s:Body>' +
          '</s:Envelope>'}
      , (err) ->
        assert.notEqual err, null
        assert.ok err instanceof Error
        done()

  describe 'connect', () ->
    it 'should connect to the cam, fill startup properties', (done) ->
      cam.connect (err) ->
        assert.equal err, null
        assert.ok cam.capabilities
        assert.ok cam.uri.ptz
        assert.ok cam.uri.media
        assert.ok cam.videoSources
        assert.ok cam.profiles
        assert.ok cam.defaultProfile
        assert.ok cam.activeSource
        done()
    it 'should return an error when upstart is unfinished', (done) ->
      cam.getCapabilities = (cb) ->
        cb new Error('error')
      cam.connect (err) ->
        assert.notEqual err, null
        delete cam.getCapabilities
        done()

  describe 'getSystemDateAndTime', () ->
    it 'should return valid date', (done) ->
      cam.getSystemDateAndTime (err, data) ->
        assert.equal err, null
        assert.ok (data instanceof Date)
        done()

  describe 'setSystemDateAndTime', () ->
    it 'should throws an error when `dateTimeType` is wrong', (done) ->
      cam.setSystemDateAndTime {
        dateTimeType: 'blah'
      }, (err) ->
        assert.notEqual err, null
        done()
    it 'should set system date and time', (done) ->
      cam.setSystemDateAndTime {
        dateTimeType: 'Manual'
        dateTime: new Date()
        daylightSavings: true
        timezone: 'MSK'
      }, (err, data) ->
        assert.equal err, null
        assert.ok (data instanceof Date)
        done()
    if synthTest
      it 'should return an error when SetSystemDateAndTime message returns error', (done) ->
        serverMockup.conf.bad = true
        cam.setSystemDateAndTime {
          dateTimeType: 'Manual'
          dateTime: new Date()
          daylightSavings: true
          timezone: 'MSK'
        }, (err) ->
          assert.notEqual err, null
          delete serverMockup.conf.bad
          done()

  describe 'getHostname', () ->
    it 'should return device name', (done) ->
      cam.getHostname (err, data) ->
        assert.equal err, null
        assert.ok (typeof data.fromDHCP == 'boolean')
        done()

  describe 'getScopes', () ->
    it 'should return device scopes as array when different scopes', (done) ->
      cam.getScopes (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray data
        data.forEach (scope) ->
          assert.ok scope.scopeDef
          assert.ok scope.scopeItem
        done()
    if synthTest
      it 'should return device scopes as array when one scope', (done) ->
        serverMockup.conf.count = 1
        cam.getScopes (err, data, xml) ->
          assert.equal err, null
          assert.ok Array.isArray data
          data.forEach (scope) ->
            assert.ok scope.scopeDef
            assert.ok scope.scopeItem
          delete serverMockup.conf.count
          done()
    if synthTest
      it 'should return device scopes as array when no scopes', (done) ->
        serverMockup.conf.count = 0
        cam.getScopes (err, data, xml) ->
          assert.equal err, null
          assert.ok Array.isArray data
          data.forEach (scope) ->
            assert.ok scope.scopeDef
            assert.ok scope.scopeItem
          delete serverMockup.conf.count
          done()

  describe 'setScopes', () ->
    it 'should set and return device scopes as array', (done) ->
      cam.setScopes ['onvif://www.onvif.org/none'], (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray data
        data.forEach (scope) ->
          assert.ok scope.scopeDef
          assert.ok scope.scopeItem
        done()
    if synthTest
      it 'should return an error when SetScopes message returns error', (done) ->
        serverMockup.conf.bad = true
        cam.setScopes ['onvif://www.onvif.org/none'], (err, data, xml) ->
          assert.notEqual err, null
          delete serverMockup.conf.bad
          done()

  describe 'getCapabilities', () ->
    it 'should return a capabilities object with correspondent properties and also set them into #capability property', (done) ->
      cam.getCapabilities (err, data) ->
        assert.equal err, null
        assert.ok cam.profiles.every (profile) ->
          ['name', 'videoSourceConfiguration', 'videoEncoderConfiguration', 'PTZConfiguration'].every (prop) ->
            profile[prop]
        assert.equal cam.capabilities, data
        done()
    it 'should store PTZ link in ptzUri property', (done) ->
      assert.equal cam.uri.ptz.href, cam.capabilities.PTZ.XAddr
      done()
    it 'should store uri links for extensions', (done) ->
      assert.ok Object.keys(cam.capabilities.extension).every (ext) -> cam.uri[ext]
      done()

  describe 'getServiceCapabilities', () ->
    it 'should return a service capabilities object and also set them into #serviceCapabilities property', (done) ->
      cam.getServiceCapabilities (err, data) ->
        assert.equal err, null
        assert.ok ['network', 'security', 'system', 'auxiliaryCommands'].every (prop) ->
          data[prop]
        assert.equal cam.serviceCapabilities, data
        done()

  describe 'getActiveSources', () ->
    it 'should find at least one appropriate source', () ->
      cam.getActiveSources()
      assert.ok cam.defaultProfile
      assert.ok cam.activeSource
    it 'should throws an error when no one profile has actual videosource token', () ->
      realProfiles = cam.profiles
      cam.profiles.forEach((profile) -> profile.videoSourceConfiguration.sourceToken = 'crap')
      assert.throws(cam.getActiveSources, Error)
      cam.profiles = realProfiles
    ###it 'should populate activeSources and defaultProfiles when more than one video source exists', () ->
      fs.rename './serverMockup/GetVideoSources.xml', './serverMockup/GetVideoSources.single', (err) ->
        assert.equal err, null
        fs.rename './serverMockup/GetVideoSourcesEncoder.xml', './serverMockup/GetVideoSources.xml', (err) ->
          assert.equal err, null
          cam.getActiveSources()
          assert.isArray(cam.activeSources)
          assert.isArray(cam.defaultProfiles)

          fs.rename './serverMockup/GetVideoSources.xml', './serverMockup/GetVideoSourcesEncoder.xml', (err) ->
      	    assert.equal err, null
      	    fs.rename './serverMockup/GetVideoSources.single', './serverMockup/GetVideoSources.xml', (err) ->
              assert.equal err, null###

  describe 'getVideoSources', () ->
    it 'should return a videosources object with correspondent properties and also set them into videoSources property', (done) ->
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
        console.log 'Device Information:'
        console.log data
        assert.equal cam.deviceInformation, data
        done()

  describe 'getStreamUri', () ->
    it 'should return a media stream uri', (done) ->
      cam.getStreamUri {protocol: 'HTTP'}, (err, data) ->
        assert.equal err, null
        assert.ok ['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every (prop) ->
          data[prop] != undefined
        done()
    it 'should return a default media stream uri with no options passed', (done) ->
      cam.getStreamUri (err, data) ->
        assert.equal err, null
        assert.ok ['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every (prop) ->
          data[prop] != undefined
        done()


  describe 'getSnapshotUri', () ->
    it 'should return a default media uri with no options passed', (done) ->
      cam.getSnapshotUri (err, data) ->
        assert.equal err, null
        assert.ok ['uri', 'invalidAfterConnect', 'invalidAfterReboot', 'timeout'].every (prop) ->
          data[prop] != undefined
        done()

  describe 'getNodes', () ->
    it 'should return object of nodes and sets them to #nodes', (done) ->
      cam.getNodes (err, data) ->
        assert.equal err, null
        assert.ok typeof data == 'object'
        assert.deepEqual cam.nodes, data
        done()

  describe 'getConfigurations', () ->
    it 'should return object of configurations and sets them to #configurations', (done) ->
      cam.getConfigurations (err, data) ->
        assert.equal err, null
        assert.ok typeof data == 'object'
        assert.deepEqual cam.configurations, data
        done()

  describe 'getConfigurationOptions', () ->
    it 'should return an options object for every configuation token', (done) ->
      tokens = Object.keys cam.configurations
      cou = tokens.length
      tokens.forEach (token) ->
        cam.getConfigurationOptions token, (err, data) ->
          assert.equal err, null
          assert.ok typeof data == 'object'
          done() if not (--cou)

  describe 'absolute move', () ->
    it 'should returns empty RelativeResponseObject', (done) ->
      cam.absoluteMove {
        x: 1
        y: 1
        zoom: 1
      }, done
    it 'should works without callback', () ->
      cam.absoluteMove {
        x: 0
        y: 0
        zoom: 1
      }

  describe 'relative move', () ->
    it 'should returns empty RelativeResponseObject', (done) ->
      cam.relativeMove {
        speed: {
          x: 0.1
          y: 0.1
        }
        x: 1
        y: 1
        zoom: 1
      }, done
    it 'should works without callback', () ->
      cam.relativeMove {
        speed: {
          x: 0.1
          y: 0.1
        }
        x: 1
        y: 1
        zoom: 1
      }

  describe 'continuous move', () ->
    it 'should returns empty ContinuousResponseObject', (done) ->
      cam.continuousMove {
        x: 0.1
        y: 0.1
        zoom: 0
      }, done
    it 'should set ommited pan-tilt parameters to zero', (done) ->
      cam.continuousMove {
        x: 0.1
        zoom: 0
      }, done

  describe 'stop', () ->
    it 'should stop all movements when options are ommited', (done) ->
      cam.stop done
    it 'should stop only zoom movement', (done) ->
      cam.stop {zoom: true}, done
    it 'should stop only pan-tilt movement', (done) ->
      cam.stop {panTilt: true}, done
    it 'should stop all movements', (done) ->
      cam.stop {zoom: true, panTilt: true}, done
    it 'should work without callback', (done) ->
      cam.stop {}
      cam.stop()
      done()

  describe 'getStatus', () ->
    it 'should returns position status', (done) ->
      cam.getStatus {}, (err, data) ->
        assert.equal err, null
        done()

  describe 'systemReboot', () ->
    it 'should return a server message', (done) ->
      cam.systemReboot (err, data) ->
        assert.equal err, null
        assert.equal typeof data, 'string'
        done()
