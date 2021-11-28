const synthTest = !process.env.HOSTNAME;

let serverMockup;
if (synthTest) {
	serverMockup = require('../test/serverMockup');
}

describe('Terminating', () => {
	if (synthTest) {
		it('should terminate serverMockup', (done) => {
			serverMockup.close();
			done();
		});
	}
});
