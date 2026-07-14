import type { Weather } from '../types';

/**
 * 경기장 날씨 = 거시 지표 3종
 *  - 유가 → 온도 : 유가가 오르면 그라운드가 뜨거워진다 (비용 부담, 인플레 압력)
 *  - 금리 → 습도 : 금리가 높으면 공기가 눅눅해 공이 무겁다 (밸류에이션 부담)
 *  - 환율 → 풍향 : 원화 약세는 수출주에 순풍, 내수주에 역풍
 */
export function WeatherPanel({ weather }: { weather: Weather }) {
  const temp = weather.oilUsd >= 90 ? '폭염' : weather.oilUsd >= 75 ? '더움' : weather.oilUsd >= 60 ? '쾌적' : '서늘';
  const tempIcon = weather.oilUsd >= 90 ? '🥵' : weather.oilUsd >= 75 ? '☀️' : weather.oilUsd >= 60 ? '⛅' : '🌤️';
  const humid = weather.rate >= 4 ? '찜통' : weather.rate >= 3 ? '눅눅' : weather.rate >= 2 ? '보통' : '건조';
  const humidIcon = weather.rate >= 4 ? '💦' : weather.rate >= 3 ? '💧' : '🌫️';
  const wind =
    weather.usdKrw >= 1400 ? '수출주 강한 순풍' : weather.usdKrw >= 1300 ? '수출주 순풍' : weather.usdKrw >= 1200 ? '중립' : '내수주 순풍';
  const windIcon = weather.usdKrw >= 1300 ? '🌬️' : '🍃';

  return (
    <section className="panel weather">
      <h3>🏟️ 오늘의 그라운드 컨디션</h3>
      <div className="weather-grid">
        <div className="weather-item" title="유가가 오르면 기업 비용 부담과 인플레 압력이 커집니다.">
          <span className="weather-icon">{tempIcon}</span>
          <div>
            <div className="weather-label">온도 · 유가(WTI)</div>
            <div className="weather-value">${weather.oilUsd.toFixed(1)} <em>{temp}</em></div>
          </div>
        </div>
        <div className="weather-item" title="금리가 높으면 공이 무거워집니다. 성장주 밸류에이션 부담.">
          <span className="weather-icon">{humidIcon}</span>
          <div>
            <div className="weather-label">습도 · 기준금리</div>
            <div className="weather-value">{weather.rate.toFixed(2)}% <em>{humid}</em></div>
          </div>
        </div>
        <div className="weather-item" title="원화 약세는 수출주에 순풍, 내수주·외인 수급에는 역풍.">
          <span className="weather-icon">{windIcon}</span>
          <div>
            <div className="weather-label">풍향 · 원/달러</div>
            <div className="weather-value">₩{weather.usdKrw.toLocaleString()} <em>{wind}</em></div>
          </div>
        </div>
      </div>
    </section>
  );
}
