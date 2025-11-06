# ONVIF 서비스별 대표 호출 예시

아래 예시는 SOAP 1.2 + WS-Addressing을 사용하는 대표적인 ONVIF 서비스 호출 형태입니다. 네임스페이스와 헤더는 장치에 따라 다를 수 있으며, 예시에서는 필수 필드만 간단히 보여줍니다.

공통 전제
- Envelope: `http://www.w3.org/2003/05/soap-envelope`
- WS-Addressing: `http://schemas.xmlsoap.org/ws/2004/08/addressing`
- 서비스 WSDL 네임스페이스: Device(Ver10), Media(Ver10), PTZ(Ver20), Events(Ver10), Replay(Ver10)

## Device: GetCapabilities

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/device/wsdl/GetCapabilities
    </wsa:Action>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://camera/onvif/device_service</wsa:To>
  </Header>
  <Body>
    <GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">
      <Category>All</Category>
    </GetCapabilities>
  </Body>
</Envelope>
```

## Media: GetProfiles → GetStreamUri

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/media/wsdl/GetProfiles
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/media_service</wsa:To>
  </Header>
  <Body>
    <GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl" />
  </Body>
</Envelope>
```

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/media/wsdl/GetStreamUri
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/media_service</wsa:To>
  </Header>
  <Body>
    <GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">
      <StreamSetup xmlns="http://www.onvif.org/ver10/schema">
        <Stream>RTP-Unicast</Stream>
        <Transport>
          <Protocol>RTSP</Protocol>
        </Transport>
      </StreamSetup>
      <ProfileToken>Profile_1</ProfileToken>
    </GetStreamUri>
  </Body>
</Envelope>
```

## PTZ: AbsoluteMove

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver20/ptz/wsdl/AbsoluteMove
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/ptz_service</wsa:To>
  </Header>
  <Body>
    <AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>Profile_1</ProfileToken>
      <Position xmlns="http://www.onvif.org/ver10/schema">
        <PanTilt x="0.1" y="0.2" />
        <Zoom x="0.5" />
      </Position>
      <Speed xmlns="http://www.onvif.org/ver10/schema">
        <PanTilt x="0.5" y="0.5" />
        <Zoom x="0.5" />
      </Speed>
    </AbsoluteMove>
  </Body>
</Envelope>
```

## Events: CreatePullPointSubscription → PullMessages

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/events/wsdl/CreatePullPointSubscription
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/events_service</wsa:To>
  </Header>
  <Body>
    <CreatePullPointSubscription xmlns="http://www.onvif.org/ver10/events/wsdl">
      <InitialTerminationTime>PT10M</InitialTerminationTime>
    </CreatePullPointSubscription>
  </Body>
</Envelope>
```

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/events/wsdl/PullMessages
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/events_service</wsa:To>
  </Header>
  <Body>
    <PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl">
      <Timeout>PT10S</Timeout>
      <MessageLimit>10</MessageLimit>
    </PullMessages>
  </Body>
</Envelope>
```

## Replay: GetReplayUri

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/replay/wsdl/GetReplayUri
    </wsa:Action>
    <wsa:MessageID xmlns:wsa>urn:uuid:...</wsa:MessageID>
    <wsa:To xmlns:wsa>http://camera/onvif/replay_service</wsa:To>
  </Header>
  <Body>
    <GetReplayUri xmlns="http://www.onvif.org/ver10/replay/wsdl">
      <StreamSetup xmlns="http://www.onvif.org/ver10/schema">
        <Stream>RTP-Unicast</Stream>
        <Transport><Protocol>RTSP</Protocol></Transport>
      </StreamSetup>
      <RecordingToken>Recording_1</RecordingToken>
    </GetReplayUri>
  </Body>
</Envelope>
```

참고
- 실제 호출 시 장치 별 서비스 엔드포인트 URL, 인증(HTTP Digest/Basic), HTTPS 여부 등을 맞춰야 합니다.
- WS-Addressing의 `RelatesTo`는 응답에서 원 요청 `MessageID`와의 상관관계 표시로 사용됩니다.
- 자세한 개념 설명: `docs/soap.md`, 통신 흐름 개요: `docs/onvif-communication.md`.
