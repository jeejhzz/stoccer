# 코스피 실시간/과거 데이터 연동 가이드

스톡커에 실제 시장 데이터를 연동하기 위한 조사 결과와 권장 아키텍처입니다.

## 결론 요약

| 용도 | 추천 소스 | 형태 | 비용 |
|---|---|---|---|
| **실시간 체결가/호가** | 한국투자증권 KIS Developers | WebSocket | 무료 (계좌 필요) |
| 실시간 대안 | 키움증권 REST API | REST + WebSocket | 무료 (계좌 필요) |
| 일별 시세/거래량 (역대) | KRX 정보데이터시스템, pykrx, FinanceDataReader | 배치 수집 | 무료 |
| 재무제표 (포지션 분류용) | DART OpenAPI | REST | 무료 |
| 금리·환율 (습도·풍향) | 한국은행 ECOS OpenAPI | REST | 무료 |
| 유가 (온도) | 공공데이터포털 / 해외 무료 API | REST | 무료 |

## 1. 실시간 시세 — 한국투자증권 KIS Developers (1순위 추천)

- 포털: https://apiportal.koreainvestment.com
- 공식 샘플: https://github.com/koreainvestment/open-trading-api
- **REST**: 현재가, 호가, 일/주/월봉, 기간별 시세, 재무비율, 외국인 보유율 등
- **WebSocket**: 실시간 체결가·호가·예상체결. `approval_key`(실시간 접속키) 발급 후 구독
- 준비물: 한국투자증권 계좌 개설 → KIS Developers 신청 → 앱키/앱시크릿 발급
- 모의투자 환경을 제공하므로 개발 단계에서 안전하게 테스트 가능
- 토큰은 24시간 유효(재발급 제한 있음) → 백엔드에서 토큰 캐싱 필수

### 왜 1순위인가
- 개인 개발자에게 무료로 열린 유일한 수준의 **공식 실시간 웹소켓**
- 문서/샘플코드가 가장 풍부하고 커뮤니티(python-kis 등 래퍼)도 활발

## 2. 실시간 대안 — 키움증권 REST API

- 포털: https://openapi.kiwoom.com (2025년 3월 출시)
- 기존 OpenAPI+(Windows 전용 OCX)와 달리 **OS 무관 REST + WebSocket**
- 국내주식 시세·주문·잔고 조회 지원. KIS와 병행해 이중화 가능

## 3. 역대 주가/거래량 — 배치 수집

- **KRX 정보데이터시스템** (data.krx.co.kr): 전 종목 일별 OHLCV, 시가총액, 외국인 보유량. 공식 데이터의 원천
- **pykrx** (파이썬): KRX·네이버 데이터를 크롤링하는 사실상 표준 라이브러리
- **FinanceDataReader** (파이썬): KRX 상장 목록 + 일별 시세를 간단히 수집
- 권장: 백엔드 배치(매일 장 마감 후)로 DB에 적재 → 수익률·MDD·승점 계산은 DB 기준

## 4. 재무 데이터 — DART OpenAPI (포지션 자동 분류의 핵심)

- 포털: https://opendart.fss.or.kr (금융감독원 전자공시, 무료 API 키 발급)
- 사업보고서의 재무제표(자산·부채·자본·매출·영업이익·순이익·현금흐름) 제공
- 스톡커의 포지션 분류 기준(OPM, 부채비율, 배당성향, FCF 등)을 여기서 산출
- 분기 공시 주기에 맞춰 갱신하면 충분 (실시간 불필요)

## 5. 거시 지표 (경기장 날씨)

- **금리(습도)**: 한국은행 ECOS OpenAPI (ecos.bok.or.kr) — 기준금리, 국고채 금리
- **환율(풍향)**: ECOS 원/달러 매매기준율, 또는 KIS 해외지수/환율 API
- **유가(온도)**: 공공데이터포털(data.go.kr) 석유공사 유가 API, 또는 해외 무료 API(WTI)

## 권장 아키텍처

```
[브라우저 (React)]
   ↕ WebSocket (실시간 체결 중계) / REST (스냅샷·과거 데이터)
[스톡커 백엔드 (Node.js 또는 Python FastAPI)]
   ├─ KIS WebSocket 클라이언트 (실시간 시세 수신 → 팬아웃)
   ├─ 토큰 관리자 (KIS 토큰 24h 캐싱, 앱키/시크릿 보관)
   ├─ 일별 배치 (pykrx/FDR → DB 적재, 승점 계산)
   ├─ DART 배치 (분기 재무 → 포지션 자동 분류)
   └─ ECOS/유가 폴링 (경기장 날씨)
[DB (PostgreSQL 등)]
```

### 보안 주의사항
- **앱키/앱시크릿/토큰을 절대 브라우저 코드에 넣지 않는다.** 반드시 백엔드에서만 사용
- KIS WebSocket은 백엔드가 1개 연결을 유지하고, 다수 사용자에게는 스톡커 백엔드가 자체 WebSocket으로 중계(팬아웃)하는 구조가 비용·제한 측면에서 유리
- 시세 재배포는 거래소 규정상 제약이 있을 수 있으므로 상용 서비스 단계에서는 KRX 시세 이용 약관 검토 필요

## 프런트엔드 연동 지점

`src/lib/provider.ts`의 `DataProvider` 인터페이스가 연동 지점입니다.

```ts
export interface DataProvider {
  getQuotes(codes: string[]): Promise<Quote[]>;          // 현재가 스냅샷
  getDailyCandles(code, from, to): Promise<DailyCandle[]>; // 역대 일봉
  getWeather(): Promise<Weather>;                         // 유가·금리·환율
  subscribe(codes, onQuote): () => void;                  // 실시간 구독
}
```

현재는 `MockProvider`가 꽂혀 있으며, 백엔드가 준비되면 같은 인터페이스를 구현한
`ApiProvider`(fetch + WebSocket)로 교체하면 앱 코드는 수정 없이 실데이터로 전환됩니다.
