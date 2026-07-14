import type { Weather } from '../types';

/**
 * 시세 데이터 프로바이더 추상화 레이어.
 *
 * 현재는 MockProvider(샘플 데이터)만 구현되어 있고, 실서비스 전환 시
 * 아래 인터페이스를 구현하는 KisProvider 를 추가하면 된다.
 *
 * 권장 아키텍처 (docs/data-integration.md 참고):
 *
 *   [브라우저] ←WebSocket/REST→ [스톡커 백엔드 프록시] ←→ 외부 데이터 소스
 *
 *   - 실시간 시세: 한국투자증권 KIS Developers (REST + WebSocket, 무료)
 *     https://apiportal.koreainvestment.com
 *   - 대안: 키움증권 REST API https://openapi.kiwoom.com
 *   - 일별/과거 데이터: KRX 정보데이터시스템, FinanceDataReader, pykrx
 *   - 재무제표: DART 전자공시 OpenAPI (opendart.fss.or.kr)
 *   - 금리/환율: 한국은행 ECOS OpenAPI (ecos.bok.or.kr)
 *   - 유가: 공공데이터포털(오피넷) 또는 해외 무료 API
 *
 *   앱키/시크릿은 반드시 백엔드에만 보관한다 (브라우저 노출 금지).
 */

export interface Quote {
  code: string;
  price: number; // 현재가
  changePercent: number; // 등락률 %
  volume: number; // 거래량
  asOf: string; // ISO timestamp
}

export interface DailyCandle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DataProvider {
  readonly name: string;
  /** 현재가 스냅샷 조회 */
  getQuotes(codes: string[]): Promise<Quote[]>;
  /** 일봉 과거 데이터 조회 */
  getDailyCandles(code: string, from: string, to: string): Promise<DailyCandle[]>;
  /** 거시 지표 (경기장 날씨) */
  getWeather(): Promise<Weather>;
  /** 실시간 체결가 구독 (WebSocket). 구독 해제 함수를 반환 */
  subscribe(codes: string[], onQuote: (q: Quote) => void): () => void;
}

/** 개발/데모용 목 프로바이더 — 랜덤워크로 실시간 체결을 흉내낸다 */
export class MockProvider implements DataProvider {
  readonly name = 'mock';
  private base = new Map<string, number>();

  private priceOf(code: string): number {
    if (!this.base.has(code)) {
      // 종목코드 해시로 그럴듯한 기준가 생성
      const h = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 90;
      this.base.set(code, 10_000 + h * 3_000);
    }
    return this.base.get(code)!;
  }

  async getQuotes(codes: string[]): Promise<Quote[]> {
    return codes.map((code) => ({
      code,
      price: this.priceOf(code),
      changePercent: +((Math.random() - 0.48) * 3).toFixed(2),
      volume: Math.floor(Math.random() * 5_000_000),
      asOf: new Date().toISOString(),
    }));
  }

  async getDailyCandles(code: string, from: string, to: string): Promise<DailyCandle[]> {
    const out: DailyCandle[] = [];
    let p = this.priceOf(code);
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) continue;
      const drift = (Math.random() - 0.49) * 0.04;
      const open = p;
      p = Math.max(100, p * (1 + drift));
      out.push({
        date: d.toISOString().slice(0, 10),
        open,
        high: Math.max(open, p) * 1.01,
        low: Math.min(open, p) * 0.99,
        close: p,
        volume: Math.floor(Math.random() * 3_000_000),
      });
    }
    return out;
  }

  async getWeather(): Promise<Weather> {
    return { oilUsd: 68.4, rate: 2.5, usdKrw: 1382 };
  }

  subscribe(codes: string[], onQuote: (q: Quote) => void): () => void {
    const timer = setInterval(() => {
      const code = codes[Math.floor(Math.random() * codes.length)];
      const p = this.priceOf(code) * (1 + (Math.random() - 0.5) * 0.02);
      onQuote({
        code,
        price: Math.round(p),
        changePercent: +((Math.random() - 0.48) * 3).toFixed(2),
        volume: Math.floor(Math.random() * 100_000),
        asOf: new Date().toISOString(),
      });
    }, 1500);
    return () => clearInterval(timer);
  }
}

export const provider: DataProvider = new MockProvider();
