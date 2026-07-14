import type { Formation, Lineup, SeasonRow, WeeklyResult } from '../types';
import { findStock } from '../data/stocks';
import { slotWeights } from '../data/formations';

/**
 * 스톡커 리그 규칙
 *  - 일간: 수익률 +1%마다 1득점, -1%마다 1실점
 *  - 주간: 주 수익률 >= +1% 승(3점) / -1% < r < +1% 무(1점) / <= -1% 패(0점)
 *    ※ 표준 리그 규칙에 맞춰 패배는 승점 0으로 처리
 *  - 시즌 누적 승점 + 누적 수익률로 순위 결정
 */

/** mulberry32 — 시드 고정 PRNG (데모 시뮬레이션 재현성 확보) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller 표준정규 */
function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const TRADING_DAYS_PER_WEEK = 5;

export interface DayLog {
  day: number;
  week: number;
  ret: number; // 일간 수익률 %
  goalsFor: number;
  goalsAgainst: number;
}

/** 포트폴리오의 일간 수익률 시계열 생성 (샘플 시뮬레이션) */
export function simulatePortfolioDaily(
  formation: Formation,
  lineup: Lineup,
  cashPercent: number,
  weeks: number,
  seed: number,
): number[] {
  const weights = slotWeights(formation, cashPercent);
  const rng = mulberry32(seed);
  const days = weeks * TRADING_DAYS_PER_WEEK;
  const out: number[] = [];

  // 종목별 파라미터 준비
  const holdings = formation.slots
    .map((sl) => ({ w: (weights[sl.id] ?? 0) / 100, code: lineup[sl.id] }))
    .filter((h): h is { w: number; code: string } => !!h.code);

  const cashDaily = 3.0 / 252; // 현금은 연 3% 수익 가정

  for (let d = 0; d < days; d++) {
    const market = gaussian(rng) * 0.9; // 공통 시장 팩터 (일 표준편차 0.9%)
    let ret = (cashPercent / 100) * cashDaily;
    for (const h of holdings) {
      const st = findStock(h.code);
      const dailyVol = st.metrics.volatility / Math.sqrt(252);
      const beta = 0.4 + st.metrics.volatility / 60;
      const idio = gaussian(rng) * dailyVol * 0.8;
      ret += h.w * (market * beta + idio + 0.02);
    }
    out.push(ret);
  }
  return out;
}

/** 라이벌(AI/벤치마크)의 일간 수익률 시계열 */
export function simulateRivalDaily(weeks: number, seed: number, vol: number, drift: number): number[] {
  const rng = mulberry32(seed);
  const days = weeks * TRADING_DAYS_PER_WEEK;
  return Array.from({ length: days }, () => gaussian(rng) * vol + drift);
}

/** 일간 수익률 → 득점/실점 로그 */
export function toDayLogs(daily: number[]): DayLog[] {
  return daily.map((ret, i) => ({
    day: i + 1,
    week: Math.floor(i / TRADING_DAYS_PER_WEEK) + 1,
    ret,
    goalsFor: ret >= 0 ? Math.floor(ret) : 0,
    goalsAgainst: ret < 0 ? Math.floor(-ret) : 0,
  }));
}

/** 일간 로그 → 주간 경기 결과 */
export function toWeeklyResults(logs: DayLog[]): WeeklyResult[] {
  const weeks = new Map<number, DayLog[]>();
  for (const l of logs) {
    if (!weeks.has(l.week)) weeks.set(l.week, []);
    weeks.get(l.week)!.push(l);
  }
  const out: WeeklyResult[] = [];
  for (const [week, ls] of weeks) {
    // 주간 수익률은 일간 수익률의 복리 누적
    const weeklyReturn = (ls.reduce((acc, l) => acc * (1 + l.ret / 100), 1) - 1) * 100;
    const result: WeeklyResult['result'] = weeklyReturn >= 1 ? 'W' : weeklyReturn <= -1 ? 'L' : 'D';
    out.push({
      week,
      weeklyReturn,
      goalsFor: ls.reduce((a, l) => a + l.goalsFor, 0),
      goalsAgainst: ls.reduce((a, l) => a + l.goalsAgainst, 0),
      result,
      points: result === 'W' ? 3 : result === 'D' ? 1 : 0,
    });
  }
  return out.sort((a, b) => a.week - b.week);
}

export function buildSeasonRow(playerName: string, isUser: boolean, daily: number[]): SeasonRow {
  const logs = toDayLogs(daily);
  const weekly = toWeeklyResults(logs);
  const totalReturn = (daily.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100;
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
