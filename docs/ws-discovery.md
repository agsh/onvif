# WS-Discovery 흐름

이 문서는 `onvif` 프로젝트에서 WS-Discovery가 어떻게 수행되는지 설명합니다. 구현의 중심은 `lib/discovery.js`의 `Discovery.probe` 함수이며, 아래 내용은 해당 파일을 기준으로 정리되었습니다.

## 전체 시나리오

1. **요청 메시지 생성**  
   - `Discovery.probe`는 GUID 기반 `MessageID`를 포함한 SOAP `Probe` 메시지를 문자열로 생성한 뒤 `Buffer`로 변환합니다 (`lib/discovery.js:62`, `lib/discovery.js:75`).

2. **UDP 멀티캐스트 송신**  
   - `dgram`을 이용해 UDP 소켓을 만들고, 멀티캐스트 주소 `239.255.255.250:3702`로 `Probe` 메시지를 전송합니다 (`lib/discovery.js:91`, `lib/discovery.js:166`).

3. **소켓 이벤트 처리**  
   - `socket.on('error')`에서 발생한 오류를 `Discovery#error` 이벤트와 콜백으로 전달합니다 (`lib/discovery.js:93`).
   - `socket.on('message')` 리스너에서 수신 메시지를 처리합니다 (`lib/discovery.js:165`).

4. **응답 파싱 및 검증**  
   - 수신한 SOAP 메시지를 `parseSOAPString`으로 파싱하고, `linerase`로 평탄화합니다 (`lib/discovery.js:98`, `lib/discovery.js:111`).
   - 올바른 `probeMatches`가 없으면 오류로 간주하고 `Discovery#error`를 발행합니다 (`lib/discovery.js:102`, `lib/discovery.js:109`).

5. **디바이스 식별 및 객체화**  
   - `endpointReference.address`를 키로 사용하여 같은 장치가 중복 처리되지 않도록 합니다 (`lib/discovery.js:115`).
   - 기본적으로 응답에 포함된 모든 `XAddrs`를 파싱하고, `matchXAddr`로 네트워크 주소와 가장 잘 맞는 항목을 선택합니다 (`lib/discovery.js:118`, `lib/discovery.js:120`, `lib/discovery.js:181`).
   - `resolve` 옵션이 `true`일 때는 선택한 XAddr 정보를 바탕으로 `Cam` 인스턴스를 생성하고, `cam.xaddrs` 속성으로 전체 XAddr 목록을 보존합니다 (`lib/discovery.js:118`, `lib/discovery.js:123`, `lib/discovery.js:134`).
   - `resolve`가 `false`면 파싱된 원본 데이터를 그대로 유지합니다 (`lib/discovery.js:135`).

6. **이벤트 및 콜백 알림**  
   - 새로운 디바이스가 발견될 때마다 `Discovery#device` 이벤트를 발생시키고, 콜백은 타임아웃 종료 후 한 번만 호출됩니다 (`lib/discovery.js:139`, `lib/discovery.js:168`).
   - 타임아웃이 지나면 소켓 리스너와 소켓을 정리하며, 콜백에는 수집된 오류 배열 또는 발견된 카메라 목록을 전달합니다 (`lib/discovery.js:169`, `lib/discovery.js:171`).

## 주요 옵션

- `timeout` (기본 5000ms): 응답 대기 시간. 타임아웃 종료 후 콜백이 실행됩니다.
- `resolve` (기본 `true`): `Cam` 객체 생성 여부를 제어합니다.
- `messageId`: WS-Discovery `MessageID`. 기본은 GUID(`urn:uuid:...`)입니다.
- `device`: 특정 네트워크 인터페이스(예: `eth0`)로 소켓을 바인딩합니다. 지정한 인터페이스가 없으면 기본 라우트가 사용됩니다 (`lib/discovery.js:150`).
- `listeningPort`: 수신 포트를 명시적으로 지정할 수 있습니다 (`lib/discovery.js:158`).

## 이벤트

- `Discovery#device`: 새로운 디바이스가 탐지될 때 발생합니다 (`lib/discovery.js:139`).
- `Discovery#error`: 잘못된 SOAP 응답 또는 소켓 오류가 있을 때 발생합니다 (`lib/discovery.js:102`, `lib/discovery.js:109`).

## 의존성

- `Cam`: 발견한 디바이스를 객체화할 때 사용합니다 (`lib/cam.js`).
- `guid`, `parseSOAPString`, `linerase`: `lib/utils.js`에서 가져오는 유틸리티 함수입니다.
- `matchXAddr`: XAddr 후보 중 실제 응답 주소와 가장 잘 맞는 항목을 고르는 도우미 함수입니다 (`lib/discovery.js:181`).

## 테스트 참고

`test/discovery.js`는 모의 서버를 이용해 다음 시나리오를 검증합니다.

- 기본 설정 또는 커스텀 타임아웃으로 장치가 발견되는지 (`test/discovery.js:11`, `test/discovery.js:19`).
- `resolve: false`일 때 `Cam` 대신 원본 정보가 반환되는지 (`test/discovery.js:35`).
- 잘못된 응답 시 `Discovery#error`가 발생하는지 (`test/discovery.js:43`).
- 특정 인터페이스를 지정하거나 존재하지 않는 인터페이스를 지정했을 때 동작이 정상인지 (`test/discovery.js:73`, `test/discovery.js:90`).

## 프로미스 버전

`promises/discovery.js`는 동일한 로직을 프로미스 스타일 API로 제공하며, 함수 구조와 동작이 거의 동일합니다.
