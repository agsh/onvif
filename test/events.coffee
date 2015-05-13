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
    cam.getEventProperties (err, res) ->
      assert.equal err, null
      assert.deepEqual this.events.properties, res
      done()

  it 'should request event service capabilities', (done) ->
    cam.getEventServiceCapabilities (err, res) ->
      assert.equal err, null
      assert.ok [
        'PersistentNotificationStorage'
        , 'MaxPullPoints'
        , 'MaxNotificationProducers'
        , 'WSPausableSubscriptionManagerInterfaceSupport'
        , 'WSPullPointSupport'
        , 'WSSubscriptionPolicySupport'
      ].every (name) -> res[name] isnt undefined
      done()