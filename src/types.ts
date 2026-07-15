/** 포지션 코드. 축구 포지션 = 주식 속성 분류 */
export type Position = 'GK' | 'CB' | 'FB' | 'CDM' | 'CAM' | 'WG' | 'ST';

/** 화면 표기용 슬롯 라벨 (LB/RB, LW/RW 구분 등) */
export interface Slot {
  id: string;
  position: Position;
  label: string; // 예: 'LB', 'RB', 'CB', 'ST', 'LW' ...
  x: number; // 경기장 좌표 (0~100, 왼쪽 기준 %)
  y: number; // 경기장 좌표 (0~100, 위 = 상대 골대)
}

export interface Formation {
  id: string;
  name: string; // 예: '4-3-3'
  description: string;
  slots: Slot[]; // GK 제외 10개
}

/** 주식의 재무 특성 + 시장 특성 (샘플 데이터) */
export interface StockMetrics {
  marketCapJo: number; // 시가총액 (조 원)
  revenueGrowth: number; // 매출액 성장률 %
  opm: number; // 영업이익률 %
  npm: number; // 순이익률 %
  debtRatio: number; // 부채비율 %
  dividendYield: number; // 배당수익률 %
  dpr: number; // 배당성향 %
  per: number; // PER (연중 평균 근사)
  pbr: number; // PBR
  mdd: number; // 최대낙폭 % (최근 1년)
  foreignRate: number; // 외국인 보유 비율 %
  volatility: number; // 연환산 변동성 % (시뮬레이션용)
  fcfPositive: boolean; // 잉여현금흐름 흑자 여부
}

export interface Stock {
  code: string; // 종목코드
  name: string;
  sector: string;
  positions: Position[]; // 소화 가능한 포지션
  metrics: StockMetrics;
  comment: string; // 스카우트 리포트 한 줄
}

/** 슬롯 배치 상태: slotId -> 종목코드 (GK는 항상 현금) */
export type Lineup = Record<string, string | null>;

export interface TacticPreset {
  id: string;
  manager: string; // 축구 감독
  guru: string; // 투자 구루
  formationId: string;
  title: string;
  philosophy: string;
  cashPercent: number;
  lineup: string[]; // 슬롯 순서대로 종목코드
}

/** 경기장 날씨 = 거시 지표 */
export interface Weather {
  oilUsd: number; // 유가(WTI) = 온도
  rate: number; // 기준금리 % = 습도
  usdKrw: number; // 환율 = 풍향
}

export interface WeeklyResult {
  week: number;
  label: string; // 예: '~7/11' (주 마지막 거래일)
  weeklyReturn: number; // %
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
  points: number;
}

/** 일별 종가 (실데이터 리그 계산용) */
export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

/** 날짜가 붙은 일간 수익률 */
export interface DatedReturn {
  date: string;
  ret: number; // %
}

export interface SeasonRow {
  playerName: string;
  isUser: boolean;
  weekly: WeeklyResult[];
  totalReturn: number; // 누적 수익률 %
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}
