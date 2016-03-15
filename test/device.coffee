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
      it 'should set NTP with ipv4', (done) ->
        cam.setNTP {
          fromDHCP: false
          type: 'IPv4'
          ipv4Address: 'localhost'
        }, (err) ->
          assert.equal err, null
          done()
      it 'should set NTP with ipv6', (done) ->
        cam.setNTP {
          fromDHCP: false
          type: 'IPv6'
          ipv6Address: '::1/128'
          dnsName: '8.8.8.8'
        }, (err) ->
          assert.equal err, null
          done()
      it 'should set NTP from DHCP', (done) ->
        cam.setNTP {
          fromDHCP: true
        }, (err) ->
          assert.equal err, null
          done()