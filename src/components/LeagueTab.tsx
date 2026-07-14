import { useMemo, useState } from 'react';
import type { Formation, Lineup } from '../types';
import {
  buildSeasonRow,
  rankTable,
  simulatePortfolioDaily,
  simulateRivalDaily,
  toDayLogs,
} from '../lib/league';

interface Props {
  formation: Formation;
  lineup: Lineup;
  cashPercent: number;
  squadReady: boolean;
}

const WEEKS = 12;

/**
 * 스톡커 리그 — 수익률을 득점/승점으로 환산한 친선 리그 (데모 시뮬레이션)
 * 실서비스에서는 provider 를 통해 실제 일별 수익률로 계산한다.
 */
export function LeagueTab({ formation, lineup, cashPercent, squadReady }: Props) {
  const [seed, setSeed] = useState(20260714);

  const { table, myLogs } = useMemo(() => {
    const mine = simulatePortfolioDaily(formation, lineup, cashPercent, WEEKS, seed);
    const rows = [
      buildSeasonRow('나의 스쿼드', true, mine),
      buildSeasonRow('친구A · 성장 FC', false, simulateRivalDaily(WEEKS, seed + 1, 1.4, 0.05)),
      buildSeasonRow('친구B · 배당 유나이티드', false, simulateRivalDaily(WEEKS, seed + 2, 0.6, 0.03)),
      buildSeasonRow('KOSPI 시티', false, simulateRivalDaily(WEEKS, seed + 3, 0.9, 0.02)),
    ];
    return { table: rankTable(rows), myLogs: toDayLogs(mine) };
  }, [formation, lineup, cashPercent, seed]);

  if (!squadReady) {
    return (
      <div className="panel league-empty">
        <h3>⚽ 스톡커 리그</h3>
        <p>스쿼드 탭에서 10개 슬롯을 모두 채우면 리그가 개막합니다!</p>
      </div>
    );
  }

  const me = table.find((r) => r.isUser)!;
  const recentDays = myLogs.slice(-10);

  return (
    <div className="league">
      <section className="panel">
        <div className="league-head">
          <h3>🏆 스톡커 리그 — {WEEKS}주 시즌 (시뮬레이션)</h3>
          <button className="btn" onClick={() => setSeed((s) => s + 1)}>🔄 새 시즌 재개막</button>
        </div>
        <p className="rule-note">
          규칙: 일간 수익률 +1%마다 1득점 · −1%마다 1실점 / 주간 수익률 +1%↑ 승(승점 3) ·
          ±1% 미만 무(1) · −1%↓ 패(0)
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
              <span className="match-week">{w.week}R</span>
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
            <div key={d.day} className="day-chip">
              <span className="day-num">D{d.day}</span>
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
