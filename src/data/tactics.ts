import type { TacticPreset } from '../types';

/**
 * 전문가 전술 프리셋 — 명장 × 투자 구루 콜라보.
 * lineup 배열은 각 포메이션의 slots 정의 순서와 1:1 대응한다.
 */
export const TACTICS: TacticPreset[] = [
  {
    id: 'ferguson-buffett',
    manager: '알렉스 퍼거슨',
    guru: '워런 버핏',
    formationId: '433',
    title: '왕조의 클래식 4-3-3',
    philosophy:
      '검증된 우량주만 쓴다. 이해할 수 있는 비즈니스, 꾸준한 현금흐름, 확실한 해자. ' +
      '"폼은 일시적이지만 클래스는 영원하다" — 퍼기 타임에도 흔들리지 않는 명가의 축구.',
    cashPercent: 10,
    lineup: [
      '042700', // LW 한미반도체
      '005930', // ST 삼성전자
      '012330', // RW 현대모비스
      '035420', // CAM NAVER
      '259960', // CAM 크래프톤
      '033780', // CDM KT&G
      '011780', // LB 금호석유
      '105560', // CB KB금융
      '017670', // CB SK텔레콤
      '005490', // RB POSCO홀딩스
    ],
  },
  {
    id: 'mourinho-dalio',
    manager: '조세 무리뉴',
    guru: '레이 달리오',
    formationId: '541',
    title: '올웨더 두 줄 버스 5-4-1',
    philosophy:
      '이기는 것보다 지지 않는 것이 먼저다. 배당·통신·은행으로 두 줄 수비를 세우고 ' +
      '현금 20%를 벤치에 앉힌다. 어떤 거시 날씨에도 무너지지 않는 올웨더 포트폴리오.',
    cashPercent: 20,
    lineup: [
      '005930', // ST 삼성전자
      '012330', // LM 현대모비스
      '033780', // CDM KT&G
      '271560', // CDM 오리온
      '128940', // RM 한미약품
      '011780', // LWB 금호석유
      '105560', // CB KB금융
      '055550', // CB 신한지주
      '024110', // CB 기업은행
      '010950', // RWB S-Oil
    ],
  },
  {
    id: 'klopp-wood',
    manager: '위르겐 클롭',
    guru: '캐시 우드',
    formationId: '343',
    title: '게겐프레싱 이노베이션 3-4-3',
    philosophy:
      '헤비메탈 투자. 파괴적 혁신 성장주로 전방 압박을 걸고, 변동성(MDD)은 ' +
      '기꺼이 감수한다. 현금은 5%만 — 풀 스로틀로 달리는 극단적 공격 전술.',
    cashPercent: 5,
    lineup: [
      '042700', // LW 한미반도체
      '000660', // ST SK하이닉스
      '196170', // RW 알테오젠
      '011200', // LWB HMM
      '352820', // CAM 하이브
      '097950', // CDM CJ제일제당
      '096770', // RWB SK이노베이션
      '105560', // CB KB금융
      '086790', // CB 하나금융지주
      '017670', // CB SK텔레콤
    ],
  },
  {
    id: 'guardiola-lynch',
    manager: '펩 과르디올라',
    guru: '피터 린치',
    formationId: '442',
    title: '일상 속 점유율 4-4-2',
    philosophy:
      '네가 아는 것에 투자하라. 마트와 도로에서 매일 만나는 기업들로 ' +
      '볼 점유율을 가져가는 티키타카. 화려하지 않지만 패스 성공률(승률)이 높다.',
    cashPercent: 10,
    lineup: [
      '005380', // ST 현대차
      '000270', // ST 기아
      '214150', // LM 클래시스
      '035420', // CAM NAVER
      '271560', // CDM 오리온
      '012330', // RM 현대모비스
      '011780', // LB 금호석유
      '055550', // CB 신한지주
      '030200', // CB KT
      '010950', // RB S-Oil
    ],
  },
];
