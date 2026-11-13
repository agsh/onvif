/**
 * Inspect PTZ nodes and SupportedPTZSpaces before choosing a move command.
 *
 * AbsoluteMove / RelativeMove / ContinuousMove are optional per node - use the
 * spaces listed under supportedPTZSpaces (and defaults on the PTZ configuration).
 *
 * Run after build:
 *   node examples/ptz.nodes.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';

function spaceUris(spaces) {
  if (!spaces) return [];
  return (Array.isArray(spaces) ? spaces : [spaces]).map((s) => s.URI).filter(Boolean);
}

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  try {
    await onvif.connect();

    if (!onvif.uri.ptz) {
      console.log('No PTZ service XAddr on this device');
      return;
    }

    const nodes = await onvif.ptz.getNodes();
    for (const node of nodes) {
      const spaces = node.supportedPTZSpaces || {};
      const absolutePanTilt = spaceUris(spaces.absolutePanTiltPositionSpace);
      const absoluteZoom = spaceUris(spaces.absoluteZoomPositionSpace);
      const relativePanTilt = spaceUris(spaces.relativePanTiltTranslationSpace);
      const relativeZoom = spaceUris(spaces.relativeZoomTranslationSpace);
      const continuousPanTilt = spaceUris(spaces.continuousPanTiltVelocitySpace);
      const continuousZoom = spaceUris(spaces.continuousZoomVelocitySpace);

      console.log('Node:', node.name || node.token);
      console.log('  AbsoluteMove (pan/tilt):', absolutePanTilt.length ? 'yes' : 'no', absolutePanTilt);
      console.log('  AbsoluteMove (zoom):', absoluteZoom.length ? 'yes' : 'no', absoluteZoom);
      console.log('  RelativeMove (pan/tilt):', relativePanTilt.length ? 'yes' : 'no', relativePanTilt);
      console.log('  RelativeMove (zoom):', relativeZoom.length ? 'yes' : 'no', relativeZoom);
      console.log('  ContinuousMove (pan/tilt):', continuousPanTilt.length ? 'yes' : 'no', continuousPanTilt);
      console.log('  ContinuousMove (zoom):', continuousZoom.length ? 'yes' : 'no', continuousZoom);
      console.log('  homeSupported:', node.homeSupported, 'maxPresets:', node.maximumNumberOfPresets);
    }

    // Prefer ContinuousMove when AbsoluteMove spaces are absent - see examples/ptz.keyboard.js
  } finally {
    await onvif.close();
  }
})().catch(console.error);
