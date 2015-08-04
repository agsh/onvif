synthTest = not process.env.HOSTNAME
assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup') if synthTest
util = require('util')

describe 'Device', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  describe 'getNTP', () ->
    it 'should return NTP settings', (done) ->
      cam.getNTP (err, data) ->
        assert.equal err, null
        done()

  describe 'setNTP', () ->
    if synthTest
      it 'should set NTP', (done) ->
        cam.setNTP {
          fromDHCP: false
          type: 'IPv4'
          ipv4Address: 'localhost'
        }, (err) ->
          assert.equal err, null
          done()