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