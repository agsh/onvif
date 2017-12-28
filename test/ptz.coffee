synthTest = not process.env.HOSTNAME

assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup') if synthTest
util = require('util')

describe 'PTZ', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  describe 'getPresets', () ->
    it 'should return array of preset objects and sets them to #presets', (done) ->
      cam.getPresets {}, (err, data) ->
        assert.equal err, null
        assert.ok Object.keys(data).every (presetName) ->
          typeof data[presetName] == 'string'
        assert.equal cam.presets, data
        done()
    it 'should return array of preset objects and sets them to #presets without options', (done) ->
      cam.getPresets (err, data) ->
        assert.equal err, null
        assert.ok Object.keys(data).every (presetName) ->
          typeof data[presetName] == 'string'
        assert.equal cam.presets, data
        done()
    if synthTest
      it 'should work with one preset', (done) ->
        serverMockup.conf.one = true
        cam.getPresets (err, data) ->
          assert.equal err, null
          assert.ok Object.keys(data).every (presetName) ->
            typeof data[presetName] == 'string'
          assert.equal cam.presets, data
          delete serverMockup.conf.one
          done()


  describe 'gotoPreset', () ->
    it 'should just run', (done) ->
      cam.gotoPreset {preset: Object.keys(cam.profiles)[0]}, (err, data) ->
        assert.equal err, null
        done()
    it 'should run with speed definition', (done) ->
      cam.gotoPreset {preset: Object.keys(cam.profiles)[0], speed: 0.1}, (err, data) ->
        assert.equal err, null
        done()


  describe 'setPreset', () ->
    it 'should run with preset name (new)', (done) ->
      cam.setPreset {presetName: 'testPreset'}, (err, data) ->
        assert.equal err, null
        done()
    it 'should run with preset token (update)', (done) ->
      cam.setPreset {presetToken: 1}, (err, data) ->
        assert.equal err, null
        done()

  describe 'removePreset', () ->
    it 'should just run', (done) ->
      cam.removePreset {presetToken: Object.keys(cam.profiles)[0]}, (err, data) ->
        assert.equal err, null
        done()

  describe 'gotoHomePosition', () ->
    it 'should just run', (done) ->
      cam.gotoHomePosition {speed: {x: 1.0, y: 1.0, zoom: 1.0}}, (err, data) ->
        assert.equal err, null
        done()

  describe 'setHomePosition', () ->
    it 'should just run', (done) ->
      cam.setHomePosition {}, (err, data) ->
        assert.equal err, null
        done()

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

