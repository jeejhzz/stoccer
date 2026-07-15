import { useEffect, useState } from 'react';
import type { DataProvider, Quote } from '../lib/provider';
import { findStock } from '../data/stocks';

interface Props {
  provider: DataProvider | null;
  codes: string[]; // 현재 스쿼드에 배치된 종목코드 (현금 제외)
}

/** 스쿼드 종목의 현재가/등락률 전광판 */
export function LiveQuotesPanel({ provider, codes }: Props) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    if (!provider || codes.length === 0) return;
    setQuotes({});
    const unsubscribe = provider.subscribe(codes, (q) =>
      setQuotes((prev) => ({ ...prev, [q.code]: q })),
    );
    return unsubscribe;
  }, [provider, codes.join(',')]);

  const live = provider?.name === 'kis' || provider?.name === 'yahoo';
  const badge = !provider
    ? '연결 중…'
    : provider.name === 'kis'
      ? '🔴 실시간 KIS'
      : provider.name === 'yahoo'
        ? '🟢 실제 시세 (야후·지연)'
        : '🟡 샘플 데이터';

  return (
    <section className="panel">
      <h3>
        📟 시세 전광판 <span className={`live-badge ${live ? 'live' : ''}`}>{badge}</span>
      </h3>
      {codes.length === 0 ? (
        <p className="quotes-hint">종목을 영입하면 시세가 표시됩니다.</p>
      ) : (
        <table className="quotes-table">
          <tbody>
            {codes.map((code) => {
              const q = quotes[code];
              return (
                <tr key={code}>
                  <td>{findStock(code).name}</td>
                  <td className="q-price">{q ? q.price.toLocaleString() : '—'}</td>
                  <td className={q ? (q.changePercent >= 0 ? 'up' : 'down') : ''}>
                    {q ? `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!live && codes.length > 0 && (
        <p className="quotes-hint">
          KIS API 키를 서버에 설정하면 이 전광판이 실제 시세로 바뀝니다.
        </p>
      )}
    </section>
  );
}
