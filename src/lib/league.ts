import type {
  DatedReturn,
  Formation,
  Lineup,
  PricePoint,
  SeasonRow,
  WeeklyResult,
} from '../types';
import { slotWeights } from '../data/formations';

/**
 * 스톡커 리그 규칙
 *  - 일간: 수익률 +1%마다 1득점, -1%마다 1실점
 *  - 주간: 주 수익률 >= +1% 승(3점) / -1% < r < +1% 무(1점) / <= -1% 패(0점)
 *    ※ 표준 리그 규칙에 맞춰 패배는 승점 0으로 처리
 *  - 시즌 누적 승점 + 누적 수익률로 순위 결정
 *
 * 계산은 실제 일별 종가(PricePoint)를 기반으로 하며, 데이터 소스는
 * DataProvider.getHistory 가 공급한다 (KIS/야후 = 실데이터, mock = 시뮬레이션).
 */

export interface Holding {
  code: string;
  w: number; // 전체 자산 대비 비중 (0~1)
}

/** 현재 스쿼드 배치를 보유 비중 목록으로 변환 */
export function lineupHoldings(
  formation: Formation,
  lineup: Lineup,
  cashPercent: number,
): { holdings: Holding[]; cashWeight: number } {
  const weights = slotWeights(formation, cashPercent);
  const holdings = formation.slots.flatMap((sl) => {
    const code = lineup[sl.id];
    return code ? [{ code, w: (weights[sl.id] ?? 0) / 100 }] : [];
  });
  return { holdings, cashWeight: cashPercent / 100 };
}

const CASH_DAILY_RET = 3.0 / 252; // 현금은 연 3% 수익 가정 (%)

/**
 * 종목별 종가 시계열 → 포트폴리오 일간 수익률.
 * 거래일 달력은 calendarCode(기본 KOSPI 지수)의 날짜를 기준으로 하고,
 * 특정 종목의 데이터가 빠진 날은 해당 종목 수익률 0으로 간주한다.
 */
export function portfolioDailyReturns(
  series: Record<string, PricePoint[]>,
  holdings: Holding[],
  cashWeight: number,
  calendarCode = '^KS11',
): DatedReturn[] {
  const calendar = (series[calendarCode] ?? Object.values(series)[0] ?? []).map((p) => p.date);
  const closeMaps = new Map<string, Map<string, number>>();
  for (const h of holdings) {
    closeMaps.set(h.code, new Map((series[h.code] ?? []).map((p) => [p.date, p.close])));
  }
  const lastClose = new Map<string, number>();
  const out: DatedReturn[] = [];
  calendar.forEach((date, i) => {
    let ret = cashWeight * CASH_DAILY_RET;
    for (const h of holdings) {
      const close = closeMaps.get(h.code)!.get(date);
      if (close != null) {
        const prev = lastClose.get(h.code);
        if (prev != null) ret += h.w * ((close / prev - 1) * 100);
        lastClose.set(h.code, close);
      }
    }
    if (i > 0) out.push({ date, ret }); // 첫날은 기준일
  });
  return out;
}

export interface DayLog {
  date: string;
  ret: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function toDayLogs(returns: DatedReturn[]): DayLog[] {
  return returns.map((r) => ({
    date: r.date,
    ret: r.ret,
    goalsFor: r.ret >= 0 ? Math.floor(r.ret) : 0,
    goalsAgainst: r.ret < 0 ? Math.floor(-r.ret) : 0,
  }));
}

/** 해당 날짜가 속한 주의 월요일 (주간 라운드 묶음 기준) */
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function toWeeklyResults(logs: DayLog[]): WeeklyResult[] {
  const weeks = new Map<string, DayLog[]>();
  for (const l of logs) {
    const key = mondayOf(l.date);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(l);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, ls], i) => {
      const weeklyReturn = (ls.reduce((acc, l) => acc * (1 + l.ret / 100), 1) - 1) * 100;
      const result: WeeklyResult['result'] =
        weeklyReturn >= 1 ? 'W' : weeklyReturn <= -1 ? 'L' : 'D';
      const last = ls[ls.length - 1].date;
      return {
        week: i + 1,
        label: `~${Number(last.slice(5, 7))}/${last.slice(8, 10)}`,
        weeklyReturn,
        goalsFor: ls.reduce((a, l) => a + l.goalsFor, 0),
        goalsAgainst: ls.reduce((a, l) => a + l.goalsAgainst, 0),
        result,
        points: result === 'W' ? 3 : result === 'D' ? 1 : 0,
      };
    });
}

export function buildSeasonRow(playerName: string, isUser: boolean, returns: DatedReturn[]): SeasonRow {
  const weekly = toWeeklyResults(toDayLogs(returns));
  const totalReturn = (returns.reduce((acc, r) => acc * (1 + r.ret / 100), 1) - 1) * 100;
  return {
    playerName,
    isUser,
    weekly,
    totalReturn,
    points: weekly.reduce((a, w) => a + w.points, 0),
    wins: weekly.filter((w) => w.result === 'W').length,
    draws: weekly.filter((w) => w.result === 'D').length,
    losses: weekly.filter((w) => w.result === 'L').length,
    goalsFor: weekly.reduce((a, w) => a + w.goalsFor, 0),
    goalsAgainst: weekly.reduce((a, w) => a + w.goalsAgainst, 0),
  };
}

/** 승점 → 득실차 → 누적수익률 순 정렬 */
export function rankTable(rows: SeasonRow[]): SeasonRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
      b.totalReturn - a.totalReturn,
  );
}

// ── 시뮬레이션 유틸 (MockProvider 가 가상 시계열을 만들 때 사용) ──

/** mulberry32 — 시드 고정 PRNG */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller 표준정규 */
export function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
