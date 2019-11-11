serverMockup = require('./serverMockup')

describe 'Terminating', () ->
  it 'should terminate serverMockup', (done) ->
    serverMockup.close()
    done()
