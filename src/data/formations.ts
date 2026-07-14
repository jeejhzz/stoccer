import type { Formation, Position } from '../types';

/** 포지션별 기본 투자 비중 가중치 (현금 제외 부분을 이 가중치로 배분) */
export const POSITION_WEIGHT: Record<Position, number> = {
  ST: 1.5,
  WG: 1.2,
  CAM: 1.0,
  CDM: 0.9,
  FB: 0.8,
  CB: 0.7,
  GK: 0,
};

const slot = (id: string, position: Position, label: string, x: number, y: number) => ({
  id, position, label, x, y,
});

export const FORMATIONS: Formation[] = [
  {
    id: '433',
    name: '4-3-3',
    description: '가장 보편적인 균형 전술. 주도주 3톱과 4백의 안정감.',
    slots: [
      slot('lw', 'WG', 'LW', 20, 16),
      slot('st', 'ST', 'ST', 50, 10),
      slot('rw', 'WG', 'RW', 80, 16),
      slot('cam1', 'CAM', 'CAM', 32, 40),
      slot('cam2', 'CAM', 'CAM', 68, 40),
      slot('cdm', 'CDM', 'CDM', 50, 52),
      slot('lb', 'FB', 'LB', 15, 72),
      slot('cb1', 'CB', 'CB', 38, 78),
      slot('cb2', 'CB', 'CB', 62, 78),
      slot('rb', 'FB', 'RB', 85, 72),
    ],
  },
  {
    id: '442',
    name: '4-4-2',
    description: '클래식한 투톱 전술. 주도주 두 종목에 확실하게 힘을 싣는다.',
    slots: [
      slot('st1', 'ST', 'ST', 36, 12),
      slot('st2', 'ST', 'ST', 64, 12),
      slot('lw', 'WG', 'LM', 15, 38),
      slot('cam', 'CAM', 'CAM', 40, 44),
      slot('cdm', 'CDM', 'CDM', 60, 44),
      slot('rw', 'WG', 'RM', 85, 38),
      slot('lb', 'FB', 'LB', 15, 72),
      slot('cb1', 'CB', 'CB', 38, 78),
      slot('cb2', 'CB', 'CB', 62, 78),
      slot('rb', 'FB', 'RB', 85, 72),
    ],
  },
  {
    id: '343',
    name: '3-4-3',
    description: '공격형 전술. 수비수를 줄이고 성장·주도주 비중을 극대화.',
    slots: [
      slot('lw', 'WG', 'LW', 20, 14),
      slot('st', 'ST', 'ST', 50, 8),
      slot('rw', 'WG', 'RW', 80, 14),
      slot('lm', 'FB', 'LWB', 12, 44),
      slot('cam', 'CAM', 'CAM', 40, 40),
      slot('cdm', 'CDM', 'CDM', 60, 46),
      slot('rm', 'FB', 'RWB', 88, 44),
      slot('cb1', 'CB', 'CB', 28, 78),
      slot('cb2', 'CB', 'CB', 50, 80),
      slot('cb3', 'CB', 'CB', 72, 78),
    ],
  },
  {
    id: '541',
    name: '5-4-1',
    description: '극단적 수비 전술. 배당·저변동 종목으로 버스를 세운다.',
    slots: [
      slot('st', 'ST', 'ST', 50, 10),
      slot('lw', 'WG', 'LM', 15, 36),
      slot('cdm1', 'CDM', 'CDM', 38, 44),
      slot('cdm2', 'CDM', 'CDM', 62, 44),
      slot('rw', 'WG', 'RM', 85, 36),
      slot('lb', 'FB', 'LWB', 10, 68),
      slot('cb1', 'CB', 'CB', 30, 78),
      slot('cb2', 'CB', 'CB', 50, 80),
      slot('cb3', 'CB', 'CB', 70, 78),
      slot('rb', 'FB', 'RWB', 90, 68),
    ],
  },
];

export const findFormation = (id: string): Formation =>
  FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];

/**
 * 슬롯별 투자 비중 계산.
 * 현금(GK) 비중을 뺀 나머지를 포지션 가중치에 비례 배분한다.
 */
export function slotWeights(formation: Formation, cashPercent: number): Record<string, number> {
  const investable = 100 - cashPercent;
  const totalW = formation.slots.reduce((acc, sl) => acc + POSITION_WEIGHT[sl.position], 0);
  const out: Record<string, number> = {};
  for (const sl of formation.slots) {
    out[sl.id] = +(investable * (POSITION_WEIGHT[sl.position] / totalW)).toFixed(1);
  }
  return out;
}
