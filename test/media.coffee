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
        assert.equal err, null
        assert.ok Array.isArray(res)
        assert.ok res.every (conf) ->
          conf.name and conf.token and conf.sourceToken and conf.bounds
        done()

  describe 'getVideoEncoderConfiguration', () ->
    it 'should return an error when no token present as a parameter or in #videoEncoderConfigurations array', (done) ->
      cam.getVideoEncoderConfiguration (err) ->
        assert.notEqual err, null
        done()

  describe 'getVideoEncoderConfigurations', () ->
    it 'should return video encoder configurations', (done) ->
      cam.getVideoEncoderConfigurations (err, res) ->
        assert.equal err, null
        assert.ok ['name', '$', 'quality', 'resolution', 'multicast'].every (prop) ->
          res.every (vec) ->
            !!vec[prop]
        done()

  describe 'getVideoEncoderConfiguration', () ->
    it 'should return a configuration for the first token in #videoEncoderConfigurations array', (done) ->
      cam.getVideoEncoderConfiguration (err, res) ->
        assert.equal err, null
        assert.ok ['name', '$', 'quality', 'resolution', 'multicast'].every (prop) ->
          !!res[prop]
        done()
    it 'should return a configuration for the named token as a first argument', (done) ->
      cam.getVideoEncoderConfiguration cam.videoEncoderConfigurations[0].$.token, (err, res) ->
        assert.equal err, null
        assert.ok ['name', '$', 'quality', 'resolution', 'multicast'].every (prop) ->
          !!res[prop]
        done()

  describe 'setVideoEncoderConfiguration', () ->
    it 'should generate an error when no token in the options is present', (done) ->
      cam.setVideoEncoderConfiguration {}, (err) ->
        assert.notEqual err, null
        done()
    it 'should accept setting existing configuration and return the same configuration by the getVideoEncoderConfiguration method', (done) ->
      cam.setVideoEncoderConfiguration cam.videoEncoderConfigurations[0], (err, res, xml) ->
        assert.equal err, null
        assert.deepEqual cam.videoEncoderConfigurations[0], res
        done()
    it 'should accept setting some new video configuration based on the existing', (done) ->
      conf = {
        token: cam.videoEncoderConfigurations[0].$.token
        resolution: cam.videoEncoderConfigurations[0].resolution
      }
      cam.setVideoEncoderConfiguration conf, (err, res) ->
        assert.equal err, null
        done()
    if synthTest
      it 'should emits error with wrong response', (done) ->
        serverMockup.conf.bad = true
        cam.setVideoEncoderConfiguration cam.videoEncoderConfigurations[0], (err, res) ->
          assert.notEqual err, null
          delete serverMockup.conf.bad
          done()

  describe 'getAudioSources', () ->
    it 'should return audio sources', (done) ->
      cam.getAudioSources (err, res) ->
        assert.equal err, null
        done()

  describe 'getAudioEncoderConfigurations', () ->
    it 'should return audio encoder configurations', (done) ->
      cam.getAudioEncoderConfigurations (err, res) ->
        assert.equal err, null
        done()
