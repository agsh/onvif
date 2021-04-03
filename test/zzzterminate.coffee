synthTest = not process.env.HOSTNAME

serverMockup = require('./serverMockup') if synthTest

describe 'Terminating', () ->
  if synthTest
    it 'should terminate serverMockup', (done) ->
      serverMockup.close()
      done()
