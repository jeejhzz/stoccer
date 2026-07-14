import type { Slot, Lineup } from '../types';
import { stocksForPosition, POSITION_INFO } from '../data/stocks';

interface Props {
  slot: Slot;
  lineup: Lineup;
  onPick: (code: string | null) => void;
  onClose: () => void;
}

/** 포지션에 맞는 종목 목록에서 선수(종목)를 영입하는 모달 */
export function StockPicker({ slot, lineup, onPick, onClose }: Props) {
  const info = POSITION_INFO[slot.position];
  const candidates = stocksForPosition(slot.position);
  const used = new Set(Object.values(lineup).filter(Boolean));
  const current = lineup[slot.id];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <span className="pos-badge" style={{ background: info.color }}>{slot.label}</span>
            <strong> {info.name} 스카우트</strong>
            <p className="pos-criteria">{info.criteria}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="scout-list">
          {candidates.map((st) => {
            const taken = used.has(st.code) && st.code !== current;
            const m = st.metrics;
            return (
              <button
                key={st.code}
                className={`scout-card ${taken ? 'taken' : ''} ${st.code === current ? 'current' : ''}`}
                disabled={taken}
                onClick={() => onPick(st.code)}
              >
                <div className="scout-top">
                  <strong>{st.name}</strong>
                  <span className="scout-code">{st.code} · {st.sector}</span>
                  {taken && <span className="taken-tag">출전 중</span>}
                </div>
                <div className="scout-stats">
                  <span>시총 {m.marketCapJo >= 1 ? `${m.marketCapJo}조` : `${Math.round(m.marketCapJo * 10000)}억`}</span>
                  <span>OPM {m.opm}%</span>
                  <span>배당 {m.dividendYield}%</span>
                  <span>PER {m.per || '-'}배</span>
                  <span>PBR {m.pbr}배</span>
                  <span>MDD {m.mdd}%</span>
                </div>
                <p className="scout-comment">“{st.comment}”</p>
              </button>
            );
          })}
        </div>

        {current && (
          <button className="release-btn" onClick={() => onPick(null)}>
            방출하기 (슬롯 비우기)
          </button>
        )}
      </div>
    </div>
  );
}
