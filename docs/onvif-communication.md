# ONVIF 통신 방식 개요

ONVIF는 IP 기반 영상장치(CCTV, NVR 등) 간 상호운용성을 위해 정의된 공개 표준입니다. 장치 검색과 제어는 주로 SOAP(Web Services) 기반으로, 영상 전송은 RTSP/RTP 기반으로 이뤄집니다.

## 1) 장치 검색(Discovery)

- 프로토콜: WS-Discovery(UDP 멀티캐스트 239.255.255.250:3702)
- 메시지: SOAP `Probe`/`ProbeMatches`
- 목적: 같은 서브넷의 ONVIF 장치를 자동으로 찾고, XAddrs(서비스 엔드포인트) 목록을 획득
- 이 저장소: `lib/discovery.js`가 Probe 메시지를 구성하고 수신 응답을 파싱합니다(`lib/discovery.js:41`). 요청/응답 파싱 유틸은 `lib/utils.js`를 사용합니다.

## 2) 제어 평면(Control Plane)

- 프로토콜: SOAP 1.2 over HTTP(S)
- 주소지정: WS-Addressing 헤더(`Action`, `To`, `MessageID`, `RelatesTo`) 사용
- 서비스: Device/Media/PTZ/Imaging/Events/Recording/Replay 등 각 서비스의 WSDL에 정의된 오퍼레이션 호출
- 인증: 보통 HTTP Digest 또는 Basic(테스트/구형) 사용, 환경에 따라 TLS(HTTPS) 적용. 일부 장치는 WS-Security 지원
- 이 저장소: 공통 SOAP 파싱은 `lib/utils.js`, 각 서비스 클라이언트는 `lib/device.js`, `lib/media.js`, `lib/ptz.js`, `lib/imaging.js`, `lib/events.js`, `lib/recording.js`, `lib/replay.js` 등에서 구현됩니다.

### 요청 대상(XAddr)

- Discovery 경로: WS-Discovery `ProbeMatches` 응답의 `XAddrs`(공백 구분 URL) 중 하나를 사용해 초기 Device 서비스에 연결합니다. 코드: `lib/discovery.js:120`, `lib/discovery.js:134`.
- 공식 경로 수립: 연결 후 Device 서비스의 `GetServices`(권장) 또는 `GetCapabilities`(대체)를 호출해 각 서비스별 `XAddr`를 확보합니다. 코드: `lib/cam.js:886`, `lib/cam.js:936`, `lib/cam.js:700`.
- 요청 라우팅: 각 SOAP 호출은 해당 서비스의 `XAddr`가 존재하면 그 경로를, 없으면 기본 경로(`/onvif/device_service`)를 사용합니다. 코드: `lib/cam.js:288`.
- 주소 보정: 장치가 NAT/이중 NIC 환경에서 외부에 맞지 않는 `XAddr`를 돌려주는 경우가 있어, 생성 시 `preserveAddress: true`로 생성자 `hostname`/`port` 사용을 강제하거나, 개별 호출에서 `options.url`로 명시적 엔드포인트를 지정할 수 있습니다.

#### XAddr로 요청하는 방법

- 자동(권장): `Cam`을 생성해 `connect`가 완료되면 라이브러리가 `GetServices/Capabilities`로 각 서비스의 `XAddr`를 적재하고, 이후 메서드 호출 시 해당 서비스의 `XAddr`로 SOAP POST를 보냅니다.

```js
const { Cam } = require('onvif');
const cam = new Cam({ hostname: '192.168.0.10', username: 'user', password: 'pass' });
cam.on('connect', () => {
  cam.getDeviceInformation(console.log);    // Device XAddr로 요청
  cam.getProfiles(console.log);             // Media XAddr로 요청
  cam.absoluteMove({ x: 0, y: 0, zoom: 0.5 }, console.log); // PTZ XAddr로 요청
});
```

- 고급(오버라이드 필요 시):
  - `preserveAddress: true`로 생성하면, 장치가 반환한 `XAddr`의 호스트/포트를 생성자 값으로 치환해 사용합니다. 코드: `lib/cam.js:1189`.
  - 특정 호출만 다른 엔드포인트로 보내려면 내부 `_request`의 `options.url`을 사용할 수 있습니다(고급자용, 내부 API).

```js
// 예: Media 서비스 호출을 특정 URL로 강제 (고급)
cam._request({
  service: 'media',
  url: { protocol: 'http:', hostname: '192.168.0.20', port: 80, path: '/onvif/media_service' },
  body: cam._envelopeHeader() + '<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>' + cam._envelopeFooter()
}, console.log);
```

## 3) 영상 스트리밍(Media Plane)

- 프로토콜: RTSP → RTP/RTCP (UDP/TCP 인터리브)
- 절차: 
  1) ONVIF Media 서비스(SOAP)에서 프로파일/스트림 파라미터와 RTSP URL 획득
  2) RTSP 클라이언트(예: 플레이어, FFmpeg)가 RTSP URL에 접속해 RTP로 스트림 수신
- 보안: 장치 설정에 따라 RTSP 인증(다이제스트/베이식) 또는 SRTP/TLS(장치 지원 시)

## 4) 이벤트(Eventing)

- 모델: Pull-Point(폴링) 중심, 일부 환경은 푸시 기반(서버 콜백/웹훅 유사)도 지원
- Pull-Point 흐름(일반적):
  1) SOAP `CreatePullPointSubscription`으로 구독 생성
  2) 주기적으로 SOAP `PullMessages` 호출해 이벤트 배치 수신
- 필터/토픽: WS-BaseNotification/WS-Eventing 계열 스펙을 참조(장치별 구현 차이 있음)

## 5) 재생/녹화(Recording/Replay)

- 메타/제어: SOAP 오퍼레이션으로 녹화 목록/타임라인 조회, 플레이백 세션 준비
- 데이터: 재생 스트림도 RTSP/RTP로 전달되는 경우가 일반적(장치별 상이)

## 6) 시간 동기화/네트워크

- 시간: NTP를 통한 시간 동기화를 권장(이벤트 타임스탬프, 서명 검증 정확성)
- 포트 예시(일반적):
  - WS-Discovery: UDP 3702
  - SOAP/Device 서비스: TCP 80(HTTP) 또는 443(HTTPS)
  - RTSP: TCP 554(기본), 데이터는 RTP/RTCP(UDP) 또는 RTSP 인터리브(TCP)

## 7) 보안/인증 개요

- 전송 보안: HTTPS(서버 인증서), 필요 시 SRTP/RTSP over TLS(장치 지원 시)
- 인증: HTTP Digest(일반적), Basic(테스트/구형), 일부 WS-Security 토큰/서명
- 접근 제어: 장치 계정/권한, 일부는 프로파일 별 접근 제어

## 8) 통신 요약 플로우

1) WS-Discovery로 장치 검색 → XAddrs 확보
2) SOAP(Device/Media 등)으로 기능 질의/설정, RTSP URL 요청
3) RTSP/RTP로 미디어 스트림 재생
4) 필요 시 이벤트는 Pull-Point로 폴링

---

추가 자료
- `docs/soap.md`: SOAP, WS-Addressing, WSDL 개요와 ONVIF 맥락
- `docs/soap-probe.md`: WS-Discovery Probe 메시지 구성 설명
