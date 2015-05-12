assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup')

describe 'Events', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: 'admin'
      password: '9999'
      port: if process.env.PORT then parseInt(process.env.PORT) else 10101
    }
    cam = new onvif.Cam options, done

  it 'should request device events', (done) ->
    cam.getEventProperties (err, res, xml) ->
      assert.equal err, null
      assert.deepEqual this.events.properties, res
      done()