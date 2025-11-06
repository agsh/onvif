# Node.js http/https 사용 정리(본 저장소 예제 기준)

이 문서는 study/get-services-direct.js 등에서 사용한 Node.js 기본 http/https 모듈 활용 패턴을 요약합니다.

## 핵심 API

- http.request(options, callback), https.request(options, callback)
  - 반환: ClientRequest 객체
  - callback 인자: IncomingMessage(res)
- new URL(input)
  - 요청 대상 XAddr를 파싱해 hostname/port/path를 분리할 때 사용

## 요청 옵션(options)

- method: 'POST' (SOAP 요청)
- hostname: 대상 호스트명 또는 IP (예: 192.168.15.143)
- port: 대상 포트 (예: 80/443)
- path: 경로 + 쿼리 (예: /onvif/device_service)
- headers: 객체 형태
  - Content-Type: `application/soap+xml; charset=utf-8; action="<SOAPAction>"`
  - Content-Length: UTF-8 기준 바이트 길이 (예: `Buffer.byteLength(body, 'utf8')`)
  - Host: `<host>:<port>` (프록시/가상호스트 호환성 확보용)
  - Authorization: 필요 시 Basic 또는 Digest
- timeout: 밀리초 단위 소켓 타임아웃 (예: 15000)
- rejectUnauthorized (https 전용): 개발/랩 환경에서 자체서명 인증서 허용 시 false로 설정(운영 환경에서는 true 권장)

## 요청 전송 순서

1) request(options, res => { ... })로 요청 객체 생성
2) 'error' 이벤트 핸들러 등록 (네트워크 실패 대응)
3) SOAP 바디를 req.write(body)로 전송 후 req.end()

## 응답 처리(res)

- 'data'에서 청크 수집 → 'end'에서 Buffer.concat 후 문자열로 변환
- 상태코드 확인(res.statusCode)
  - 2xx: 성공. SOAP XML 파싱/로그 처리
  - 401: 인증 필요. `WWW-Authenticate` 헤더 확인 후 재시도

## 인증 처리

- Basic
  - 헤더: `Authorization: Basic <base64(username:password)>`
  - 간단하지만 평문 자격증명(Base64) 전송이므로 TLS(HTTPS) 사용 권장
- Digest(서버 챌린지 기반)
  - 흐름: 401 응답의 `WWW-Authenticate: Digest ...`를 파싱 → realm/nonce/qop 등으로 응답 해시 계산 → Authorization 헤더 구성 후 재요청
  - 해시 계산: MD5 기반(H(A1), H(A2), nonce, nc, cnonce, qop 조합)
  - 본 예제: `buildDigestAuth()`에서 계산 후 `postSoapWithHeaders()`로 재시도

## SOAP 관련 헤더/바디

- Content-Type: application/soap+xml; action 파라미터 포함
- 바디: SOAP 1.2 Envelope + WS-Addressing 헤더 포함
  - Action: 오퍼레이션 URI (예: GetServices)
  - To: 논리적 대상 주소(요청 XAddr)
  - MessageID: `urn:uuid:<GUID>` 고유 식별자

## HTTPS 주의사항

- `rejectUnauthorized: false`는 개발/테스트용 편의 설정입니다. 운영 환경에서는 신뢰할 수 있는 CA 체인과 함께 true 유지 권장
- 프록시/커스텀 에이전트가 필요하면 options.agent로 Agent 인스턴스를 전달

## 에러/타임아웃

- req.on('error', handler): DNS 실패, 연결 거부 등 네트워크 오류
- req.setTimeout(...) 또는 options.timeout: 응답 대기 시간 초과 시 요청 중단 및 오류 처리

## WS-Security UsernameToken 추가(옵션)

일부 장치는 HTTP Basic/Digest 대신 WS-Security UsernameToken을 요구합니다. 이 경우 SOAP Envelope의 Header에 UsernameToken을 포함해야 합니다.

필드 구성(PasswordDigest)
- Username: 계정 ID
- Created: ISO8601 시각(예: 2025-01-01T12:34:56.000Z). 일부 장치는 장치 시간과 근접해야 하므로, 먼저 GetSystemDateAndTime으로 시차를 보정한 뒤 사용 권장
- Nonce: 랜덤 바이트(Base64 인코딩)
- PasswordDigest: Base64(SHA1(Nonce(Binary) + Created(UTF-8) + Password(UTF-8)))

예시 코드(헤더 생성)
```js
const crypto = require('crypto');

function buildWSSUsernameToken(username, password) {
  const created = new Date().toISOString();
  const nonce = crypto.randomBytes(16);
  const sha1 = crypto.createHash('sha1')
    .update(Buffer.concat([nonce, Buffer.from(created, 'utf8'), Buffer.from(password, 'utf8')]))
    .digest('base64');
  const nonceB64 = nonce.toString('base64');
  return (
    '<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
      '<UsernameToken>' +
        `<Username>${username}</Username>` +
        '<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">' + sha1 + '</Password>' +
        '<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">' + nonceB64 + '</Nonce>' +
        '<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' + created + '</Created>' +
      '</UsernameToken>' +
    '</Security>'
  );
}
```

Envelope에 삽입 예시
```js
const sec = buildWSSUsernameToken(USERNAME, PASSWORD);
const body = [
  '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">',
  '  <s:Header>',
  `    ${sec}`,
  `    <wsa:Action>http://www.onvif.org/ver10/device/wsdl/GetServices</wsa:Action>`,
  `    <wsa:MessageID>urn:uuid:...</wsa:MessageID>`,
  `    <wsa:To>${XADDR}</wsa:To>`,
  '  </s:Header>',
  '  <s:Body>',
  '    <GetServices xmlns="http://www.onvif.org/ver10/device/wsdl"><IncludeCapability>true</IncludeCapability></GetServices>',
  '  </s:Body>',
  '</s:Envelope>'
].join('');
```

참고
- 일부 장치는 PasswordText(비권장)를 허용합니다. 이 경우 Password Type을 `...#PasswordText`로 바꾸고 Digest 계산을 생략합니다.
- 재생 공격 방지 장치에서는 Created가 장치 시각과 충분히 가까워야 합니다. 먼저 GetSystemDateAndTime으로 시차를 확인하세요.

## 참고 구현 위치

- 직접 SOAP 요청 예제: `study/get-services-direct.js:1`
- Digest 인증 처리: `study/get-services-direct.js:53`, `study/get-services-direct.js:78`
- SOAP 바디/헤더 구성: `study/get-services-direct.js:24`
