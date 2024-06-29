import { Discovery, Onvif } from './index';
import { Cam as CamJs } from '../promises';

// eslint-disable-next-line @typescript-eslint/no-var-requires
(async () => {
  // Discovery.on('device', console.log);
  // Discovery.on('error', console.error);
  // await Discovery.probe();

  const cam = new Onvif({
    hostname : '192.168.0.116',
    username : 'username',
    password : 'password',
    port     : 2020,
  });
  const camJs = new CamJs({
    hostname : '192.168.0.116',
    username : 'username',
    password : 'password',
    port     : 2020,
  });

  // cam.on('rawResponse', console.log);
  // cam.on('rawRequest', console.log);
  await cam.connect();
  await camJs.connect();

  const profiles = await cam.media.getProfiles();
  console.log((await cam.device.getDeviceInformation()).firmwareVersion);
  console.log((await cam.device.getHostname()));
  // console.log(((await cam.media.getProfiles())[0] as Profile).PTZConfiguration);
  console.log(await cam.ptz.getConfigurations());
  console.log('-------------------------------------------');
  console.log(await cam.ptz.getStatus());
  console.log('-------------------------------------------');
  // console.log(await cam.device.setNTP({
  //   NTPManual : [{
  //     type : NetworkType.DNS,
  //   }],
  // }));
  console.log(4);
  // console.log(profiles);
  // Discovery.on('device', console.log);
  // const cams = await Discovery.probe({ timeout : 1000 });
  // console.log(cams);

  // console.log(await camJs.getOSDs());
  console.log(await cam.media.getOSDs({
    configurationToken : 'vsconf',
    // OSDToken : 'textOSD',
  }));
})().catch(console.error);
