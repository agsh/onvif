synthTest = not process.env.HOSTNAME
assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup') if synthTest
util = require('util')

describe 'User', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

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
