import type { Formation, Lineup } from '../types';
import { findStock, POSITION_INFO } from '../data/stocks';

interface Props {
  formation: Formation;
  lineup: Lineup;
  weights: Record<string, number>;
  cashPercent: number;
  onSlotClick: (slotId: string) => void;
}

export function Pitch({ formation, lineup, weights, cashPercent, onSlotClick }: Props) {
  return (
    <div className="pitch">
      {/* 경기장 라인 */}
      <div className="pitch-line half" />
      <div className="pitch-line center-circle" />
      <div className="pitch-line box-top" />
      <div className="pitch-line box-bottom" />

      {formation.slots.map((sl) => {
        const code = lineup[sl.id];
        const stock = code ? findStock(code) : null;
        const info = POSITION_INFO[sl.position];
        return (
          <button
            key={sl.id}
            className={`player ${stock ? 'filled' : 'empty'}`}
            style={{ left: `${sl.x}%`, top: `${sl.y}%`, ['--pos-color' as string]: info.color }}
            onClick={() => onSlotClick(sl.id)}
            title={`${info.name} — ${info.criteria}`}
          >
            <span className="player-pos" style={{ background: info.color }}>{sl.label}</span>
            <span className="player-name">{stock ? stock.name : '선수 영입'}</span>
            <span className="player-weight">{weights[sl.id]?.toFixed(1)}%</span>
          </button>
        );
      })}

      {/* GK = 현금 */}
      <div
        className="player filled gk"
        style={{ left: '50%', top: '93%', ['--pos-color' as string]: POSITION_INFO.GK.color }}
        title={POSITION_INFO.GK.criteria}
      >
        <span className="player-pos" style={{ background: POSITION_INFO.GK.color }}>GK</span>
        <span className="player-name">현금 🧤</span>
        <span className="player-weight">{cashPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
