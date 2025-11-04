# SOAP Probe 메시지 개요

WS-Discovery에서 장치를 탐색할 때 클라이언트는 멀티캐스트 주소 `239.255.255.250:3702`로 SOAP `Probe` 메시지를 전송합니다. 이 프로젝트에서는 `lib/discovery.js`의 `Discovery.probe` 함수가 해당 메시지를 구성하고 있습니다 (`lib/discovery.js:77`).

## 기본 구조

아래는 기본적으로 전송되는 요청 본문의 예시입니다 (`lib/discovery.js:77`–`lib/discovery.js:89`).

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope"
          xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    </wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      urn:schemas-xmlsoap-org:ws:2005:04:discovery
    </wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe
    </wsa:Action>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery"
           xmlns:xsd="http://www.w3.org/2001/XMLSchema"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <Types>dn:NetworkVideoTransmitter</Types>
      <Scopes />
    </Probe>
  </Body>
</Envelope>
```

## 가변 값

- **`MessageID`**  
  `urn:uuid:` 접두사 뒤에 GUID가 붙습니다. 이 값은 매 호출마다 `guid()` 함수로 생성되며, 옵션 `messageId`로 직접 지정할 수도 있습니다 (`lib/discovery.js:75`).

- **`Types` / `Scopes`**  
  현재 구현에서는 `Types`에 `dn:NetworkVideoTransmitter`를 고정 값으로 넣고, `Scopes`는 비워둔 상태입니다. 오버라이드 옵션은 없지만, 필요하다면 코드를 수정해 다른 타입/스코프를 지정할 수 있습니다.

- **SOAP 네임스페이스**  
  WS-Discovery 및 ONVIF에서 요구하는 기본 네임스페이스를 사용하며, 일반적으로 변경하지 않습니다.

## 헤더 의미

- `MessageID`는 요청을 식별하고, 응답의 `RelatesTo`와 매칭할 때 사용됩니다. 현재 구현은 TODO로 남겨져 있으나, 스펙 상 장치가 회신할 때 동일한 메시지 ID를 참고합니다 (`lib/discovery.js:101`의 TODO 주석).
- `To`는 WS-Discovery 멀티캐스트 식별자 `urn:schemas-xmlsoap-org:ws:2005:04:discovery`로 고정됩니다.
- `Action`은 수행할 WS-Discovery 동작을 나타내며, 프로브 요청은 `.../Probe`를 사용합니다.

## 바디 의미

- `Probe` 요소는 장치에게 특정 타입과 스코프를 가진 노드를 검색해달라는 요청입니다.
- `Types`에 `dn:NetworkVideoTransmitter`를 지정함으로써 ONVIF 네트워크 비디오 전송 장치만 대상이 됩니다.
- `Scopes`는 탐색 범위를 좁히기 위해 URI를 나열할 수 있으나, 현재는 비워두어 네트워크상의 모든 ONVIF 디바이스가 응답할 수 있도록 되어 있습니다.

## 정리

- 메시지의 기본 구조와 네임스페이스는 고정되어 있습니다.
- `MessageID`는 매 요청마다 달라지며, 옵션으로 사용자 지정이 가능합니다.
- `Types`와 `Scopes`는 구현 상 고정값이지만, 필요한 경우 코드 수정으로 변경할 수 있습니다.
