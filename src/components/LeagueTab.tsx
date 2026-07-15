import { useEffect, useMemo, useState } from 'react';
import type { Formation, Lineup, SeasonRow } from '../types';
import type { DataProvider } from '../lib/provider';
import { TACTICS } from '../data/tactics';
import { findFormation } from '../data/formations';
import {
  buildSeasonRow,
  lineupHoldings,
  portfolioDailyReturns,
  rankTable,
  toDayLogs,
  type DayLog,
  type Holding,
} from '../lib/league';

interface Props {
  provider: DataProvider | null;
  formation: Formation;
  lineup: Lineup;
  cashPercent: number;
  squadReady: boolean;
}

const KOSPI = '^KS11';
const DAYS = 92; // 약 12주 + 휴장일 여유

interface Club {
  name: string;
  isUser: boolean;
  holdings: Holding[];
  cashWeight: number;
}

const shortName = (full: string) => full.split(' ').pop() ?? full;

function buildClubs(formation: Formation, lineup: Lineup, cashPercent: number): Club[] {
  const mine = lineupHoldings(formation, lineup, cashPercent);
  const clubs: Club[] = [{ name: '나의 스쿼드', isUser: true, ...mine }];
  for (const t of TACTICS) {
    const f = findFormation(t.formationId);
    const lu = Object.fromEntries(f.slots.map((s, i) => [s.id, t.lineup[i]]));
    clubs.push({
      name: `${shortName(t.manager)}×${shortName(t.guru)} FC`,
      isUser: false,
      ...lineupHoldings(f, lu, t.cashPercent),
    });
  }
  clubs.push({ name: 'KOSPI 시티 (지수)', isUser: false, holdings: [{ code: KOSPI, w: 1 }], cashWeight: 0 });
  return clubs;
}

/**
 * 스톡커 리그 — 최근 12주 실제 주가로 계산하는 실전 리그.
 * 상대 구단은 전문가 전술 4팀 + KOSPI 지수.
 * (데이터 소스가 없으면 샘플 시계열로 동일하게 동작)
 */
export function LeagueTab({ provider, formation, lineup, cashPercent, squadReady }: Props) {
  const [table, setTable] = useState<SeasonRow[] | null>(null);
  const [myLogs, setMyLogs] = useState<DayLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lineupKey = useMemo(() => JSON.stringify(lineup), [lineup]);

  useEffect(() => {
    if (!provider || !squadReady) return;
    let cancelled = false;
    setTable(null);
    setError(null);

    const clubs = buildClubs(formation, lineup, cashPercent);
    const codes = [...new Set([...clubs.flatMap((c) => c.holdings.map((h) => h.code)), KOSPI])];

    provider
      .getHistory(codes, DAYS)
      .then((series) => {
        if (cancelled) return;
        // 데이터를 하나도 확보하지 못한 구단(0% 무승부만 쌓임)은 순위표에서 제외
        const hasData = (c: Club) => c.holdings.some((h) => (series[h.code]?.length ?? 0) > 1);
        const rows = clubs.filter(hasData).map((c) =>
          buildSeasonRow(c.name, c.isUser, portfolioDailyReturns(series, c.holdings, c.cashWeight, KOSPI)),
        );
        setTable(rankTable(rows));
        const me = clubs[0];
        setMyLogs(toDayLogs(portfolioDailyReturns(series, me.holdings, me.cashWeight, KOSPI)));
      })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); });

    return () => { cancelled = true; };
  }, [provider, squadReady, formation.id, lineupKey, cashPercent]);

  if (!squadReady) {
    return (
      <div className="panel league-empty">
        <h3>⚽ 스톡커 리그</h3>
        <p>스쿼드 탭에서 10개 슬롯을 모두 채우면 리그가 개막합니다!</p>
      </div>
    );
  }

  const live = provider?.name === 'kis' || provider?.name === 'yahoo';
  const badge = !provider ? '연결 중…' : live ? '🟢 실제 주가 기준' : '🟡 샘플 데이터';

  if (error) {
    return (
      <div className="panel league-empty">
        <h3>⚽ 스톡커 리그</h3>
        <p>데이터를 불러오지 못했습니다: {error}</p>
        <p>잠시 후 리그 탭을 다시 열어보세요.</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="panel league-empty">
        <h3>⚽ 스톡커 리그</h3>
        <p>경기 기록을 집계하는 중… 실제 주가 데이터를 불러오고 있어요 ⏳</p>
      </div>
    );
  }

  const me = table.find((r) => r.isUser)!;
  const recentDays = myLogs.slice(-10);

  return (
    <div className="league">
      <section className="panel">
        <div className="league-head">
          <h3>
            🏆 스톡커 리그 — 최근 3개월 실전 기록{' '}
            <span className={`live-badge ${live ? 'live' : ''}`}>{badge}</span>
          </h3>
        </div>
        <p className="rule-note">
          규칙: 일간 수익률 +1%마다 1득점 · −1%마다 1실점 / 주간 수익률 +1%↑ 승(승점 3) ·
          ±1% 미만 무(1) · −1%↓ 패(0) — 상대 구단은 전문가 전술 4팀과 KOSPI 지수
        </p>
        <table className="league-table">
          <thead>
            <tr>
              <th>순위</th><th>구단</th><th>경기</th><th>승</th><th>무</th><th>패</th>
              <th>득점</th><th>실점</th><th>득실</th><th>승점</th><th>누적수익률</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.playerName} className={r.isUser ? 'me' : ''}>
                <td>{i + 1}</td>
                <td>{r.isUser ? '⭐ ' : ''}{r.playerName}</td>
                <td>{r.weekly.length}</td>
                <td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                <td>{r.goalsFor}</td><td>{r.goalsAgainst}</td>
                <td>{r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}{r.goalsFor - r.goalsAgainst}</td>
                <td className="pts">{r.points}</td>
                <td className={r.totalReturn >= 0 ? 'up' : 'down'}>
                  {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>📋 나의 주간 경기 기록</h3>
        <div className="match-strip">
          {me.weekly.map((w) => (
            <div key={w.week} className={`match-chip ${w.result}`}>
              <span className="match-week">{w.week}R {w.label}</span>
              <span className="match-score">{w.goalsFor} : {w.goalsAgainst}</span>
              <span className="match-result">{w.result === 'W' ? '승' : w.result === 'D' ? '무' : '패'}</span>
              <span className={`match-ret ${w.weeklyReturn >= 0 ? 'up' : 'down'}`}>
                {w.weeklyReturn >= 0 ? '+' : ''}{w.weeklyReturn.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>⚽ 최근 10경기일 득점 하이라이트</h3>
        <div className="day-strip">
          {recentDays.map((d) => (
            <div key={d.date} className="day-chip">
              <span className="day-num">{Number(d.date.slice(5, 7))}/{d.date.slice(8, 10)}</span>
              <span className="day-goals">
                {d.goalsFor > 0 && '⚽'.repeat(Math.min(d.goalsFor, 4))}
                {d.goalsAgainst > 0 && '🥅'.repeat(Math.min(d.goalsAgainst, 4))}
                {d.goalsFor === 0 && d.goalsAgainst === 0 && '—'}
              </span>
              <span className={`day-ret ${d.ret >= 0 ? 'up' : 'down'}`}>
                {d.ret >= 0 ? '+' : ''}{d.ret.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
