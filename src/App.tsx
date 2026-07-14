import { useEffect, useMemo, useState } from 'react';
import type { Lineup, Slot, Weather } from './types';
import { FORMATIONS, findFormation, slotWeights } from './data/formations';
import { TACTICS } from './data/tactics';
import { POSITION_INFO } from './data/stocks';
import { detectProvider, type DataProvider } from './lib/provider';
import { LiveQuotesPanel } from './components/LiveQuotesPanel';
import { Pitch } from './components/Pitch';
import { StockPicker } from './components/StockPicker';
import { WeatherPanel } from './components/WeatherPanel';
import { LeagueTab } from './components/LeagueTab';
import { DataTab } from './components/DataTab';

type Tab = 'squad' | 'league' | 'data';

const emptyLineup = (formationId: string): Lineup =>
  Object.fromEntries(findFormation(formationId).slots.map((s) => [s.id, null]));

export default function App() {
  const [tab, setTab] = useState<Tab>('squad');
  const [formationId, setFormationId] = useState('433');
  const [lineup, setLineup] = useState<Lineup>(() => emptyLineup('433'));
  const [cashPercent, setCashPercent] = useState(10);
  const [pickingSlot, setPickingSlot] = useState<Slot | null>(null);
  const [weather, setWeather] = useState<Weather>({ oilUsd: 68.4, rate: 2.5, usdKrw: 1382 });
  const [appliedTactic, setAppliedTactic] = useState<string | null>(null);
  const [dataProvider, setDataProvider] = useState<DataProvider | null>(null);

  const formation = findFormation(formationId);
  const weights = useMemo(() => slotWeights(formation, cashPercent), [formation, cashPercent]);
  const filledCount = Object.values(lineup).filter(Boolean).length;
  const squadReady = filledCount === 10;

  useEffect(() => {
    let cancelled = false;
    detectProvider().then((p) => {
      if (cancelled) return;
      setDataProvider(p);
      p.getWeather().then((w) => { if (!cancelled) setWeather(w); });
    });
    return () => { cancelled = true; };
  }, []);

  const lineupCodes = useMemo(
    () => Object.values(lineup).filter((c): c is string => Boolean(c)),
    [lineup],
  );

  const changeFormation = (id: string) => {
    setFormationId(id);
    setLineup(emptyLineup(id));
    setAppliedTactic(null);
  };

  const applyTactic = (tacticId: string) => {
    const t = TACTICS.find((x) => x.id === tacticId)!;
    const f = findFormation(t.formationId);
    setFormationId(t.formationId);
    setCashPercent(t.cashPercent);
    setLineup(Object.fromEntries(f.slots.map((s, i) => [s.id, t.lineup[i]])));
    setAppliedTactic(tacticId);
  };

  const handlePick = (code: string | null) => {
    if (!pickingSlot) return;
    setLineup((prev) => ({ ...prev, [pickingSlot.id]: code }));
    setPickingSlot(null);
    setAppliedTactic(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">
          ⚽ 스톡커 <span className="logo-en">Stoccer</span>
        </h1>
        <p className="tagline">축구 포메이션처럼 짜는 대한민국 주식 포트폴리오</p>
        <nav className="tabs">
          <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}>⚽ 스쿼드</button>
          <button className={tab === 'league' ? 'on' : ''} onClick={() => setTab('league')}>🏆 리그</button>
          <button className={tab === 'data' ? 'on' : ''} onClick={() => setTab('data')}>📡 데이터 연동</button>
        </nav>
      </header>

      {tab === 'squad' && (
        <main className="squad-layout">
          <div className="pitch-col">
            <Pitch
              formation={formation}
              lineup={lineup}
              weights={weights}
              cashPercent={cashPercent}
              onSlotClick={(slotId) => setPickingSlot(formation.slots.find((s) => s.id === slotId)!)}
            />
            <p className="squad-status">
              스쿼드 구성: <strong>{filledCount} / 10</strong>
              {squadReady ? ' · 출전 준비 완료! 🎉' : ' · 빈 슬롯을 눌러 선수를 영입하세요'}
            </p>
          </div>

          <aside className="side-col">
            <WeatherPanel weather={weather} />
            <LiveQuotesPanel provider={dataProvider} codes={lineupCodes} />

            <section className="panel">
              <h3>📋 포메이션</h3>
              <div className="formation-row">
                {FORMATIONS.map((f) => (
                  <button
                    key={f.id}
                    className={`formation-btn ${f.id === formationId ? 'on' : ''}`}
                    onClick={() => changeFormation(f.id)}
                    title={f.description}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <p className="formation-desc">{formation.description}</p>

              <label className="cash-label">
                🧤 골키퍼(현금) 비중: <strong>{cashPercent}%</strong>
                <input
                  type="range" min={0} max={50} step={1}
                  value={cashPercent}
                  onChange={(e) => setCashPercent(+e.target.value)}
                />
              </label>
            </section>

            <section className="panel">
              <h3>🧠 전문가 전술 복사</h3>
              {TACTICS.map((t) => (
                <button
                  key={t.id}
                  className={`tactic-card ${appliedTactic === t.id ? 'on' : ''}`}
                  onClick={() => applyTactic(t.id)}
                >
                  <div className="tactic-title">
                    {t.manager} × {t.guru} <span className="tactic-formation">{findFormation(t.formationId).name}</span>
                  </div>
                  <div className="tactic-sub">{t.title}</div>
                  <p className="tactic-phil">{t.philosophy}</p>
                </button>
              ))}
            </section>

            <section className="panel">
              <h3>📖 포지션 가이드</h3>
              <ul className="pos-guide">
                {(['ST', 'WG', 'CAM', 'CDM', 'CB', 'FB', 'GK'] as const).map((p) => (
                  <li key={p}>
                    <span className="pos-badge" style={{ background: POSITION_INFO[p].color }}>
                      {POSITION_INFO[p].short}
                    </span>
                    <div>
                      <strong>{POSITION_INFO[p].name}</strong>
                      <p>{POSITION_INFO[p].criteria}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </main>
      )}

      {tab === 'league' && (
        <main className="single-col">
          <LeagueTab
            formation={formation}
            lineup={lineup}
            cashPercent={cashPercent}
            squadReady={squadReady}
          />
        </main>
      )}

      {tab === 'data' && (
        <main className="single-col">
          <DataTab />
        </main>
      )}

      {pickingSlot && (
        <StockPicker
          slot={pickingSlot}
          lineup={lineup}
          onPick={handlePick}
          onClose={() => setPickingSlot(null)}
        />
      )}

      <footer className="footer">
        본 서비스의 종목 데이터는 개발용 샘플이며 투자 권유가 아닙니다. Stock + Soccer = Stoccer ⚽
      </footer>
    </div>
  );
}
