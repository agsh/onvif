assert = require 'assert'
cam = require('./cam').cam

describe 'getProfiles', () ->

  it 'should get profiles', (done) ->
    cam.getProfiles (err, data) ->
      assert.equal err, null
      done()