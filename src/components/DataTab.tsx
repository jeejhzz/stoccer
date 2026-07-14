/** 코스피 실시간/과거 데이터 연동 가이드 (요약판 — 전체는 docs/data-integration.md) */
export function DataTab() {
  return (
    <div className="data-tab">
      <section className="panel">
        <h3>📡 코스피 데이터 연동 로드맵</h3>
        <p>
          현재 앱은 <strong>샘플 데이터 + 목(Mock) 프로바이더</strong>로 동작합니다.{' '}
          <code>src/lib/provider.ts</code> 의 <code>DataProvider</code> 인터페이스만 구현하면
          실데이터로 교체됩니다. 상세 가이드는 <code>docs/data-integration.md</code> 참고.
        </p>
        <div className="arch">
          [브라우저] ⇄ WebSocket/REST ⇄ [스톡커 백엔드 프록시] ⇄ KIS · KRX · DART · ECOS
        </div>
        <p className="warn">
          ⚠️ 증권사 앱키/시크릿은 반드시 백엔드에만 보관하세요. 브라우저에 노출되면 안 됩니다.
        </p>
      </section>

      <section className="panel">
        <h3>1순위 · 한국투자증권 KIS Developers (추천)</h3>
        <ul>
          <li>무료 공식 오픈API — REST(현재가·일봉·재무) + <strong>WebSocket 실시간 체결가/호가</strong></li>
          <li>계좌 개설 + 앱키 발급 필요 · 모의투자 환경 제공</li>
          <li>공식 GitHub에 Python 샘플코드 다수 (koreainvestment/open-trading-api)</li>
          <li>포털: apiportal.koreainvestment.com</li>
        </ul>
      </section>

      <section className="panel">
        <h3>대안 · 키움증권 REST API</h3>
        <ul>
          <li>2025년 출시된 차세대 REST API — OS 무관(웹 기반), 실시간 WebSocket 지원</li>
          <li>기존 OpenAPI+(Windows OCX)의 대체제 · 포털: openapi.kiwoom.com</li>
        </ul>
      </section>

      <section className="panel">
        <h3>과거 데이터 · 재무 · 거시 지표</h3>
        <ul>
          <li><strong>KRX 정보데이터시스템</strong> — 전 종목 일별 시세/거래량 (공식, 일 단위)</li>
          <li><strong>FinanceDataReader / pykrx</strong> — 파이썬으로 역대 주가 수집 (백엔드 배치용)</li>
          <li><strong>DART OpenAPI</strong> — 재무제표(자산·부채·이익·현금흐름) → 포지션 자동 분류의 원천</li>
          <li><strong>한국은행 ECOS API</strong> — 기준금리(습도) · 환율(풍향)</li>
          <li><strong>공공데이터포털</strong> — 금융위 주식시세 API(전일 종가), 유가(온도) 데이터</li>
        </ul>
      </section>

      <section className="panel">
        <h3>구현 순서 제안</h3>
        <ol>
          <li>백엔드(Node/Python)에서 pykrx·FinanceDataReader로 일별 데이터 적재 → 수익률/승점 계산</li>
          <li>DART 재무데이터로 포지션 자동 분류 엔진 구축 (분류 기준은 스카우트 DB와 동일)</li>
          <li>KIS WebSocket → 백엔드 → 브라우저로 실시간 체결가 중계</li>
          <li>ECOS·오피넷 연동으로 그라운드 날씨(금리·환율·유가) 실시간화</li>
        </ol>
      </section>
    </div>
  );
}
