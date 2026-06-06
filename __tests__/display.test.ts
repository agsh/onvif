/**
 * Mocked unit tests for the Display service.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { OnvifError } from '../src/utils';
import { Layout, PaneConfiguration } from '../src/interfaces/onvif';

const VIDEO_OUTPUT_TOKEN = 'VideoOutputToken_1';
const PANE_TOKEN = 'PaneToken_1';
const DISPLAY_XMLNS = 'http://www.onvif.org/ver10/display/wsdl';

const mockLayout: Layout = {
  paneLayout: [
    {
      pane: PANE_TOKEN,
      area: { bottom: -1, top: 1, right: 1, left: -1 },
    },
  ],
};

const mockPane: PaneConfiguration = {
  token: PANE_TOKEN,
  paneName: 'MainPane',
  receiverToken: 'ReceiverToken_1',
};

let cam: Onvif;

function mockDisplayResponse(body: Record<string, unknown>) {
  return jest.spyOn(cam as any, 'request').mockResolvedValueOnce([body, '<mock/>']);
}

beforeEach(() => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  cam.uri.display = new URL('http://127.0.0.1:8000/onvif/display_service');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Display (mocked)', () => {
  describe('getServiceCapabilities', () => {
    it('should return display service capabilities', async () => {
      mockDisplayResponse({
        getServiceCapabilitiesResponse: {
          capabilities: { fixedLayout: true },
        },
      });

      const caps = await cam.display.getServiceCapabilities();
      expect(caps.fixedLayout).toBe(true);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'display',
          body: expect.stringContaining('GetServiceCapabilities'),
        }),
      );
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(DISPLAY_XMLNS),
        }),
      );
    });

    it('should return an empty object when capabilities are absent', async () => {
      mockDisplayResponse({
        getServiceCapabilitiesResponse: {},
      });

      const caps = await cam.display.getServiceCapabilities();
      expect(caps).toEqual({});
    });
  });

  describe('getLayout / setLayout', () => {
    it('should return the current layout for a video output', async () => {
      mockDisplayResponse({
        getLayoutResponse: { layout: mockLayout },
      });

      const layout = await cam.display.getLayout({ videoOutput: VIDEO_OUTPUT_TOKEN });
      expect(layout.paneLayout).toHaveLength(1);
      expect(layout.paneLayout![0].pane).toBe(PANE_TOKEN);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(`<VideoOutput>${VIDEO_OUTPUT_TOKEN}</VideoOutput>`),
        }),
      );
    });

    it('should send SetLayout with pane layout coordinates', async () => {
      mockDisplayResponse({ setLayoutResponse: {} });

      await cam.display.setLayout({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        layout: mockLayout,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toContain('SetLayout');
      expect(body).toContain(`<VideoOutput>${VIDEO_OUTPUT_TOKEN}</VideoOutput>`);
      expect(body).toContain(`<Pane>${PANE_TOKEN}</Pane>`);
      expect(body).toContain('bottom="-1"');
      expect(body).toContain('top="1"');
    });
  });

  describe('getDisplayOptions', () => {
    it('should return layout options and coding capabilities', async () => {
      mockDisplayResponse({
        getDisplayOptionsResponse: {
          layoutOptions: {
            paneLayoutOptions: [
              {
                area: [{ bottom: -1, top: 1, right: 1, left: -1 }],
              },
            ],
          },
          codingCapabilities: {
            videoDecodingCapabilities: {},
          },
        },
      });

      const options = await cam.display.getDisplayOptions({ videoOutput: VIDEO_OUTPUT_TOKEN });
      expect(options.layoutOptions?.paneLayoutOptions).toHaveLength(1);
      expect(options.codingCapabilities).toBeDefined();
    });
  });

  describe('pane configurations', () => {
    it('should return pane configurations for a video output', async () => {
      mockDisplayResponse({
        getPaneConfigurationsResponse: {
          paneConfiguration: [mockPane],
        },
      });

      const panes = await cam.display.getPaneConfigurations({ videoOutput: VIDEO_OUTPUT_TOKEN });
      expect(panes).toHaveLength(1);
      expect(panes[0].token).toBe(PANE_TOKEN);
      expect(panes[0].paneName).toBe('MainPane');
    });

    it('should return an empty array when no pane configurations exist', async () => {
      mockDisplayResponse({
        getPaneConfigurationsResponse: {},
      });

      const panes = await cam.display.getPaneConfigurations({ videoOutput: VIDEO_OUTPUT_TOKEN });
      expect(panes).toEqual([]);
    });

    it('should return a single pane configuration by token', async () => {
      mockDisplayResponse({
        getPaneConfigurationResponse: {
          paneConfiguration: mockPane,
        },
      });

      const configuration = await cam.display.getPaneConfiguration({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        pane: PANE_TOKEN,
      });
      expect(configuration.token).toBe(PANE_TOKEN);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(`<Pane>${PANE_TOKEN}</Pane>`),
        }),
      );
    });

    it('should send SetPaneConfiguration with pane attributes', async () => {
      mockDisplayResponse({ setPaneConfigurationResponse: {} });

      await cam.display.setPaneConfiguration({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        paneConfiguration: mockPane,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toContain('SetPaneConfiguration');
      expect(body).toContain(`token="${PANE_TOKEN}"`);
      expect(body).toContain('<PaneName>MainPane</PaneName>');
      expect(body).toContain(`<ReceiverToken>${mockPane.receiverToken}</ReceiverToken>`);
    });

    it('should send SetPaneConfigurations for multiple panes', async () => {
      mockDisplayResponse({ setPaneConfigurationsResponse: {} });

      const secondPane: PaneConfiguration = {
        token: 'PaneToken_2',
        paneName: 'SecondPane',
      };

      await cam.display.setPaneConfigurations({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        paneConfiguration: [mockPane, secondPane],
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toContain('SetPaneConfigurations');
      expect(body).toContain(`token="${PANE_TOKEN}"`);
      expect(body).toContain(`token="PaneToken_2"`);
    });

    it('should return a pane token from createPaneConfiguration', async () => {
      mockDisplayResponse({
        createPaneConfigurationResponse: {
          paneToken: 'PaneToken_New',
        },
      });

      const paneToken = await cam.display.createPaneConfiguration({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        paneConfiguration: mockPane,
      });
      expect(paneToken).toBe('PaneToken_New');
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('CreatePaneConfiguration'),
        }),
      );
    });

    it('should send DeletePaneConfiguration with pane token', async () => {
      mockDisplayResponse({ deletePaneConfigurationResponse: {} });

      await cam.display.deletePaneConfiguration({
        videoOutput: VIDEO_OUTPUT_TOKEN,
        paneToken: PANE_TOKEN,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toContain('DeletePaneConfiguration');
      expect(body).toContain(`<PaneToken>${PANE_TOKEN}</PaneToken>`);
    });
  });

  describe('errors', () => {
    it('should propagate request errors', async () => {
      jest.spyOn(cam as any, 'request').mockRejectedValueOnce(new OnvifError('Invalid VideoOutput token'));

      await expect(cam.display.getLayout({ videoOutput: 'InvalidToken' })).rejects.toThrow(
        'Invalid VideoOutput token',
      );
    });
  });
});
