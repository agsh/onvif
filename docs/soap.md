# SOAP 개요(SOAP: Simple Object Access Protocol)

SOAP는 웹 서비스 간에 구조화된 메시지를 교환하기 위한 표준화된 프로토콜입니다. 메시지 포맷으로 XML을 사용하며, 주로 HTTP(S)를 전송 계층으로 사용하지만 SMTP, TCP 등 다른 프로토콜 위에서도 동작할 수 있습니다. W3C가 표준화했으며, 확장 가능한 헤더 구조와 WS-* 스펙(WS-Addressing, WS-Security 등)과의 조합으로 상호운용성과 보안·신뢰성을 중시하는 환경에서 널리 쓰입니다.

## 핵심 특징

- XML 기반 메시징: 모든 요청/응답이 XML로 표현됩니다.
- 표준 헤더/바디 구조: `Envelope` → `Header`(선택) → `Body` → `Fault`(오류 시)로 구성.
- 전송 독립성: HTTP에 국한되지 않으며 다양한 전송 계층을 사용할 수 있습니다.
- 풍부한 WS-* 확장: 주소지정(WS-Addressing), 보안(WS-Security), 신뢰전달(WS-ReliableMessaging) 등.
- 서비스 기술서(WSDL): 서비스 인터페이스(포트 타입, 메시지, 바인딩, 엔드포인트)를 기계가 읽을 수 있는 문서로 서술.

## WS 의미(WS-*)

WS는 Web Services의 약자이며, SOAP 기반 웹 서비스에서 공통 문제를 해결하기 위한 표준 명세군을 통칭합니다. 흔히 WS-*라고 부르며, 상호운용성·보안·주소지정·신뢰전달 등 비기능 요구사항을 다룹니다.

- WS-Addressing: 메시지 라우팅/식별용 주소 메타데이터(`Action`, `To`, `MessageID`, `RelatesTo`).
- WS-Security: 서명/암호화/토큰 첨부 등 메시지 보안.
- WS-Policy: 서비스 정책(보안 요구, 전송 요건 등) 기술.
- WS-MetadataExchange: 메타데이터(WSDL/정책) 교환.
- WS-Trust: 보안 토큰 발급/갱신/검증 프로토콜.
- WS-ReliableMessaging: 중복/순서 보장, 재전송을 통한 신뢰 메시징.
- WS-Discovery: 네트워크 상 장치/서비스 발견(멀티캐스트, UDP 기반) — ONVIF 검색에 사용.
- WS-Eventing/WS-Notification: 이벤트 구독/발행 모델.

ONVIF에서는 최소 WS-Addressing, WS-Discovery가 핵심적으로 사용되며, 환경에 따라 WS-Security도 사용됩니다.

## WS-Addressing 헤더

- Action: 메시지의 의도를 나타내는 URI로, 어떤 동작/오퍼레이션을 수행하는지 식별합니다. 라우팅 및 서버 측 디스패치에 사용됩니다.
  - 예: ONVIF `GetCapabilities` → `http://www.onvif.org/ver10/device/wsdl/GetCapabilities`
  - 예: WS-Discovery `Probe` → `http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe`
- To: 메시지의 논리적 대상 주소입니다. 단일 장치 호출 시 서비스 엔드포인트 URL, WS-Discovery 멀티캐스트 시에는 고정 URN을 사용합니다.
  - 예: `http://camera.example.com/onvif/device_service`
  - 예(WS-Discovery): `urn:schemas-xmlsoap-org:ws:2005:04:discovery`
- MessageID: 전역 고유 식별자(URI). 보통 `urn:uuid:<GUID>` 형태로 생성하며, 요청/응답 상관관계에 사용됩니다.
  - 예: `urn:uuid:12345678-1234-1234-1234-123456789abc`
- RelatesTo: 응답 메시지에서 원 요청의 `MessageID`를 가리켜 상관관계를 표현합니다. 클라이언트는 이를 통해 매칭을 수행합니다.

## WSDL(Web Services Description Language)

WSDL은 SOAP 기반 웹 서비스의 인터페이스를 XML로 기술하는 언어입니다. 도구가 읽어 클라이언트/서버 스텁을 생성하거나 유효성 검증에 활용합니다.

- types: XML Schema(XSD)로 데이터 타입을 정의.
- messages: 요청/응답 메시지의 논리적 구조 정의.
- portType(1.1)/interface(2.0): 오퍼레이션 집합(메서드 시그니처) 정의.
- binding: 특정 전송/인코딩(예: SOAP 1.2 over HTTP)으로의 바인딩 방법 정의.
- service + port/endpoint: 실제 접속 가능한 엔드포인트 URL 정의.

버전과 사용
- WSDL 1.1: 업계에서 널리 사용(ONVIF도 주로 1.1 기반).
- WSDL 2.0: W3C 권고, 모델이 정교하지만 도구/생태계는 1.1이 더 풍부.

ONVIF 맥락
- ONVIF 스펙은 Device/Media/PTZ 등 각 서비스의 WSDL을 제공하며, 구현 장치는 해당 오퍼레이션을 SOAP 엔드포인트에서 제공합니다.
- 일부 환경에서 WS-MetadataExchange(MEX)로 WSDL/정책을 동적으로 제공할 수 있으나, ONVIF는 보통 표준 배포본의 WSDL을 참조해 개발합니다.

## SOAP 1.1 vs 1.2 간단 비교

- 네임스페이스: 1.1은 `http://schemas.xmlsoap.org/soap/envelope/`, 1.2는 `http://www.w3.org/2003/05/soap-envelope`.
- 표준화 상태: 1.2는 W3C 권고안으로 HTTP 상태코드 사용, 오류 모델 등 명확화.
- 액션 지정: 1.1의 `SOAPAction` 헤더 관례가 1.2에서 정리되고, WS-Addressing과의 조합이 일반적.

## 메시지 구조

SOAP 메시지는 다음과 같은 XML Envelope를 가집니다.

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <!-- 선택적 메타데이터: WS-Addressing, 보안 토큰 등 -->
  </Header>
  <Body>
    <!-- 실제 호출 메시지 또는 응답 페이로드 -->
  </Body>
  <!-- 오류 시 Body 아래 Fault가 포함됩니다 -->
</Envelope>
```

오류가 발생하면 `Body` 안에 `Fault`가 포함됩니다(코드, 이유, 상세 등). 이 저장소의 파서도 SOAP Fault를 감지해 오류로 반환합니다(`lib/utils.js:67`).

## 장단점 요약

- 장점
  - 강한 상호운용성: XML, WSDL, WS-*로 이기종 시스템 간 계약 기반 통신에 유리.
  - 보안/신뢰성 기능: WS-Security, 서명/암호화, 토큰, 타임스탬프 등 표준화.
  - 전송 독립성: HTTP 외 전송 계층 사용 가능.
- 단점
  - 무겁고 복잡: XML 파싱 비용과 스펙 복잡도가 높음.
  - 개발 생산성: 단순 CRUD/리소스 중심 시나리오에는 REST/JSON 대비 번거로움.

## SOAP vs REST(요약)

- 데이터 포맷: SOAP는 XML 고정, REST는 주로 JSON(제약 없음).
- 계약/스키마: SOAP는 WSDL 중심, REST는 보통 스키마 없이 합의 또는 OpenAPI.
- 기능 초점: SOAP는 동작/메서드 호출 중심, REST는 리소스 표현과 상태 전이에 초점.
- 확장성/품질속성: SOAP는 WS-*로 보안/신뢰 전송 강화, REST는 전송 계층(예: TLS)과 경량 패턴 선호.

## ONVIF와 SOAP

ONVIF 프로토콜은 장치 제어/미디어/이벤트 등 대부분의 서비스 호출에 SOAP 1.2와 WS-Addressing을 사용합니다. 또한 장치 검색에는 WS-Discovery(UDP 멀티캐스트 기반, SOAP 메시지 사용)를 활용합니다.

- WS-Discovery Probe 예시: 이 저장소는 SOAP 1.2 네임스페이스와 WS-Addressing 헤더를 사용해 프로브 메시지를 구성합니다(`lib/discovery.js:41`). 관련 설명은 `docs/soap-probe.md:1`에도 정리되어 있습니다.
- SOAP 파싱/에러 처리: 네임스페이스 제거와 Fault 해석을 수행합니다(`lib/utils.js:29`, `lib/utils.js:67`).

## 예시: WS-Addressing을 포함한 SOAP 1.2 요청

```xml
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://www.onvif.org/ver10/device/wsdl/GetCapabilities
    </wsa:Action>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      urn:uuid:12345678-1234-1234-1234-123456789abc
    </wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://camera.example.com/onvif/device_service
    </wsa:To>
  </Header>
  <Body>
    <GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">
      <Category>All</Category>
    </GetCapabilities>
  </Body>
</Envelope>
```

응답에서 오류가 발생한 경우에는 `Body` 아래 `Fault` 요소에 코드/이유/상세가 포함됩니다. 이 저장소의 유틸리티는 해당 Fault를 파싱해 `Error`로 전달합니다(`lib/utils.js:67`).

## 더 알아보기(키워드)

- W3C SOAP 1.2, WS-Addressing, WS-Security, WS-Discovery, WSDL
- ONVIF Core Spec, Device/Media/PTZ 서비스 WSDL

---

이 문서는 SOAP의 기본 개념과 ONVIF 맥락에서의 사용 방법을 빠르게 파악하기 위한 요약입니다. 자세한 구현은 소스 코드를 참고하세요: `lib/discovery.js:41`, `lib/utils.js:1`.
