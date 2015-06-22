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

  it 'should request imaging settings with options object', (done) ->
    cam.getImagingSettings {}, (err, res) ->
      assert.equal err, null
      ['brightness', 'colorSaturation', 'contrast', 'focus', 'sharpness'].every (prop) ->
        res[prop]
      done()