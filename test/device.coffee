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

  describe 'getUsers', () ->
    it 'should return a list of user', (done) ->
      cam.getUsers (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray(data)
        assert.equal data[0].username, 'admin'
        assert.equal data[0].password, 'admin'
        assert.equal data[0].userLevel, 'Administrator'
        done()

  describe 'createUsers', () ->
    it 'should create users', (done) ->
      cam.createUsers [
        {
          username: 'username1',
          password: 'password1',
          userLevel: 'User'
        },
        {
          username: 'username2',
          password: 'password2',
          userLevel: 'User'
        },
      ], (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray(data)
        done()

  describe 'setUsers', () ->
    it 'should set users', (done) ->
      cam.setUsers [
        {
          username: 'username1',
          password: 'password1',
          userLevel: 'User'
        },
        {
          username: 'username2',
          password: 'password2',
          userLevel: 'User'
        },
      ], (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray(data)
        done()

  describe 'deleteUsers', () ->
    it 'should delete users', (done) ->
      cam.deleteUsers [
        {
          username: 'username1',
          password: 'password1',
          userLevel: 'User'
        },
        'username2',
      ], (err, data) ->
        assert.equal err, null
        assert.ok Array.isArray(data)
        done()
