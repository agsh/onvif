assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup')

describe 'Events', () ->
  cam = null
  before (done) ->
    options = {
      hostname: process.env.HOSTNAME || 'localhost'
      username: process.env.USERNAME || 'admin'
      password: process.env.PASSWORD || '9999'
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

  it 'should throws an error in PullMessages method when no pull-point subscription exists', (done) ->
    assert.throws () ->
      cam.pullMessages {}, () -> {}
    done()

  it 'should create PullPointSubscription', (done) ->
    cam.createPullPointSubscription (err, data) ->
      assert.equal err, null
      assert.deepEqual data, cam.events.subscription
      done()

  it 'should get messages with PullMessage method', (done) ->
    cam.pullMessages {}, (err, data) ->
      assert.equal err, null
      assert.ok ['currentTime', 'terminationTime'].every (name) -> data[name] isnt undefined
      done()

  it 'should create PullPoint subscription via `event` event and receive events from mockup server', (done) ->
    delete cam.events.terminationTime  # remove subscribtion if any
    gotMessage = 0
    onEvent = (msg) ->
      gotMessage += 1
    cam.on 'event', onEvent
    setTimeout () ->
      assert.ok cam.events.terminationTime isnt undefined
      assert.ok gotMessage > 0
      cam.removeListener 'event', onEvent
      done()
    , 30

  it 'should stop pulling when nobody is listen to `event` event', (done) ->
    delete cam.events.terminationTime
    setTimeout () ->
      assert.ok cam.events.terminationTime is undefined
      done()
    , 30