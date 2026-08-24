import type { OnvifOptions } from '../src/onvif';

/**
 * Connection options for HappyTime ONVIF server used by integration tests.
 *
 * `agent: false` disables HTTP keep-alive. HappyTime (gSOAP) often closes idle
 * keep-alive sockets; Node then fails subsequent requests with "socket hang up".
 * Production clients should keep the default keep-alive Agent.
 */
export const happytimeOnvifOptions = {
  hostname: '127.0.0.1',
  username: 'admin',
  password: 'admin',
  port: 8000,
  agent: false,
} as const satisfies OnvifOptions;
