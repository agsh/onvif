import { Onvif } from './index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serverMockup = require('../test/serverMockup');

(async () => {
  const cam = new Onvif({
    hostname : 'localhost',
    username : 'admin',
    password : '9999',
    port     : 10101,
  });

  // cam.on('rawResponse', console.log);
  // cam.on('rawRequest', console.log);
  await cam.connect();
  const profiles = await cam.media.getProfiles();
  console.log(profiles);
  serverMockup.close();
})().catch(console.error);
