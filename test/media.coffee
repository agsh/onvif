synthTest = not process.env.HOSTNAME
assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup') if synthTest
util = require('util')

describe 'Media', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  describe 'getProfiles', () ->
    it 'should create an array of profile objects with correspondent properties', (done) ->
      cam.getProfiles (err, data) ->
        assert.equal err, null
        assert.ok Object.keys(cam.profiles).length > 0
        assert.equal cam.profiles, data
        done()

  describe 'createAndDeleteProfile', () ->
    name = 'test'
    token = 'testToken'
    it 'should create a new profile with name and token', (done) ->
      cam.createProfile {name: name, token: token}, (err, res) ->
        assert.equal err, null
        assert.equal res.$.fixed, false
        assert.equal res.name, name
        assert.equal res.$.token, token
        done()
    it 'should delete already created profile by its token', (done) ->
      cam.deleteProfile token, (err, res) ->
        assert.equal err, null
        assert.equal res, ''
        done()

  describe 'getVideoSourceConfigurations', () ->
    it 'should return videosource configurations', (done) ->
      cam.getVideoSourceConfigurations (err, res) ->
        assert.ok Array.isArray(res)
        assert.ok res.every (conf) ->
          conf.name and conf.token and conf.sourceToken and conf.bounds
        done()