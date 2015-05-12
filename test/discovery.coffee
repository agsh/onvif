assert = require 'assert'
onvif = require('../lib/onvif')
serverMockup = require('./serverMockup')

describe 'Discovery', () ->
  this.timeout 10000
  it 'should discover at least one device (mockup server)', (done) ->
    onvif.Discovery.probe {timeout: 1000}, (err, cams) ->
      assert.equal err, null
      assert.ok cams.length > 0
      assert.ok cams[0] instanceof onvif.Cam
      done()
  it 'should discover at least one device with defaults and callback', (done) ->
    onvif.Discovery.probe (err, cams) ->
      assert.equal err, null
      assert.ok cams.length > 0
      assert.ok cams[0] instanceof onvif.Cam
      done()
  it 'should work as event emitter (also test `probe` without params)', (done) ->
    onvif.Discovery.once 'device', (cam) ->
      assert.ok cam
      assert.ok cam instanceof onvif.Cam
      done()
    onvif.Discovery.probe()
  it 'should return info object instead of Cam object when `resolve` is false', (done) ->
    onvif.Discovery.once 'device', (cam) ->
      assert.ok cam
      assert.equal cam instanceof onvif.Cam, false
      done()
    onvif.Discovery.probe {resolve: false}
  it 'should emit and error and return error in callback when response is wrong', (done) ->
    emit = false
    onvif.Discovery.once 'error', (err, xml) ->
      assert.equal xml, 'lollipop'
      assert.equal (err.indexOf 'Wrong SOAP message'), 0
      emit = true
    onvif.Discovery.probe {timeout: 1000, messageId: 'e7707'}, (err, cams) ->
      assert.notEqual err, null
      assert.ok emit
      done()
  it 'should got single device for one probe', (done) ->
    cams = {}
    onCam = (data) ->
      if cams[data.probeMatches.probeMatch.XAddrs]
        assert.fail()
      else
        cams[data.probeMatches.probeMatch.XAddrs] = true
    onvif.Discovery.on 'device', onCam
    onvif.Discovery.probe {timeout: 1000, resolve: false, messageId: 'd0-61e'}, (err, cCams) ->
      assert.equal err, null
      assert.equal Object.keys(cams).length, cCams.length
      onvif.Discovery.removeListener('device', onCam)
      done()