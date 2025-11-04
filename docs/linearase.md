# `linerase` 함수 개요

`linerase`는 SOAP/XML 응답을 `xml2js`로 파싱한 뒤 생성되는 중첩 구조를 다루기 편한 자바스크립트 객체로 평탄화(flatten)하는 유틸리티 함수입니다. 구현은 `lib/utils.js`에 위치하며, 주로 WS-Discovery 및 ONVIF SOAP 메시지 처리에서 사용됩니다 (`lib/utils.js:12`).

## 동작 방식

1. **배열 축약**  
   - `xml2js`는 모든 노드를 배열로 감싸는데, 이 함수는 배열 길이가 1일 경우 첫 번째 요소만 남기고 재귀적으로 처리합니다. 동일 노드가 여러 번 등장할 때만 배열을 유지합니다 (`lib/utils.js:16`).

2. **객체 재귀 순회**  
   - 객체를 만나면 키마다 다시 `linerase`를 호출하여 계층 구조를 얕게 만듭니다. 결과적으로 XML 트리의 중첩 정도가 최소화됩니다 (`lib/utils.js:21`).

3. **타입 변환**  
   - 문자열로 표현된 `true`/`false`는 불리언으로, 숫자 패턴을 만족하는 문자열은 `parseFloat`로 숫자로, ISO 8601 형식의 날짜 문자열은 `Date` 객체로 변환합니다. 그 외의 문자열은 그대로 유지합니다 (`lib/utils.js:27`).

## 기대 효과

- SOAP 응답의 필드를 배열 인덱싱 없이 쉽게 접근할 수 있습니다.
- 문자열 기반 타입을 즉시 사용 가능한 기본 타입으로 변환해 추가 가공 없이 로직에 활용할 수 있습니다.

## 사용 예시

WS-Discovery 처리 흐름에서 `parseSOAPString`으로 SOAP 메시지를 파싱한 후 `linerase`를 호출해 `probeMatches` 정보를 평탄화하고, 그 결과를 바탕으로 카메라 정보를 추출합니다 (`lib/discovery.js:111`). 이 과정을 통해 복잡한 XML 구조를 간결한 JS 객체로 받아볼 수 있습니다.

### 간단한 예제

```js
// xml2js 기본 출력
const raw = {
  discoverResponse: [{
    device: [{
      endpoint: ['urn:uuid:camera-1'],
      scopes: ['onvif://www.onvif.org/type/video_encoder']
    }]
  }]
};

// linerase 적용 결과
const flat = linerase(raw);
/*
{
  discoverResponse: {
    device: {
      endpoint: 'urn:uuid:camera-1',
      scopes: 'onvif://www.onvif.org/type/video_encoder'
    }
  }
}
*/
```

위와 같이 단일 요소만 포함한 배열이 제거되고, 문자열 숫자나 불리언이 포함된 경우에는 자동으로 기본 타입으로 변환되어 더 짧고 읽기 쉬운 구조를 얻을 수 있습니다.
