assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup')
util = require('util')

describe 'Imaging', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  settings = null
  presetToken = null

  it 'should request imaging settings with options object', (done) ->
    cam.getImagingSettings {}, (err, res) ->
      assert.equal err, null
      assert.ok ['brightness', 'colorSaturation', 'contrast', 'focus', 'sharpness'].every (prop) ->
        res[prop]
      settings = res
      done()

  it 'should do the same without options object', (done) ->
    cam.getImagingSettings (err, res) ->
      assert.equal err, null
      assert.ok ['brightness', 'colorSaturation', 'contrast', 'focus', 'sharpness'].every (prop) ->
        res[prop]
      done()

  it 'should set imaging configuration', (done) ->
    if settings == null then throw 'getImagingSettings failed'
    cam.setImagingSettings settings, (err, res) ->
      assert.equal err, null
      assert.equal res, ''
      done()

  it 'should get imaging service capabilities', (done) ->
    cam.getImagingServiceCapabilities (err, res) ->
      assert.equal err, null
      assert.equal (typeof res.ImageStabilization), 'boolean'
      done()

  it 'should get current preset when no video source token present', (done) ->
    cam.getCurrentImagingPreset (err, res) ->
      assert.equal err, null
      ['token', 'type', 'Name'].every (prop) ->
        res[prop]
      done()

  it 'should get current preset with video source token', (done) ->
    cam.getCurrentImagingPreset cam.activeSource.sourceToken, (err, res) ->
      assert.equal err, null
      ['token', 'type', 'Name'].every (prop) ->
        res[prop]
      presetToken = res.token
      done()

  it 'should set current preset with video source and imaging preset tokens', (done) ->
    cam.setCurrentImagingPreset {presetToken: presetToken}, (err, res) ->
      assert.equal err, null
      ['token', 'type', 'Name'].every (prop) ->
        res[prop]
      done()