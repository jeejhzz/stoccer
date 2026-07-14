/**
 * 스톡커 백엔드 프록시 서버
 *
 * 역할:
 *  - 한국투자증권(KIS) 오픈API 호출을 대신 수행 (앱키/시크릿은 서버에만 보관)
 *  - 브라우저에는 /api/* 로 시세를 중계
 *  - KIS 키가 없으면 샘플(mock) 모드로 동작 → 키를 넣는 순간 실데이터로 전환
 *  - dist/ 가 있으면 정적 파일도 서빙 (단일 프로세스 배포용)
 *
 * 실행: npm run server  (기본 포트 8787)
 * 환경변수: KIS_APP_KEY, KIS_APP_SECRET, KIS_ENV=vts(모의)|real(실전)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// .env 파일이 있으면 로드 (외부 패키지 없이 간단 파싱)
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT || 8787);
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_ENV = process.env.KIS_ENV === 'real' ? 'real' : 'vts';
const KIS_BASE =
  KIS_ENV === 'real'
    ? 'https://openapi.koreainvestment.com:9443'
    : 'https://openapivts.koreainvestment.com:29443';

const kisConfigured = Boolean(KIS_APP_KEY && KIS_APP_SECRET);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

// ── KIS 토큰 관리 (24시간 유효, 재발급 제한이 있으므로 캐싱 필수) ──
let tokenCache = { token: '', expiresAt: 0 };
let tokenInFlight = null;

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60 * 60 * 1000) {
    return tokenCache.token;
  }
  if (tokenInFlight) return tokenInFlight;
  tokenInFlight = (async () => {
    const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`KIS token error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 86400) * 1000,
    };
    return tokenCache.token;
  })().finally(() => { tokenInFlight = null; });
  return tokenInFlight;
}

async function kisGet(pathname, trId, params) {
  const token = await getToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${KIS_BASE}${pathname}?${qs}`, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
      tr_id: trId,
      custtype: 'P',
    },
  });
  if (!res.ok) throw new Error(`KIS ${pathname} error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS ${pathname} rt_cd=${data.rt_cd}: ${data.msg1}`);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 모의투자 서버는 초당 2건 제한이므로 순차 + 간격 호출
const THROTTLE_MS = KIS_ENV === 'real' ? 80 : 600;

/** 현재가 조회 (FHKST01010100) */
async function kisQuote(code) {
  const data = await kisGet('/uapi/domestic-stock/v1/quotations/inquire-price', 'FHKST01010100', {
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: code,
  });
  const o = data.output;
  return {
    code,
    price: Number(o.stck_prpr),
    changePercent: Number(o.prdy_ctrt),
    volume: Number(o.acml_vol),
    asOf: new Date().toISOString(),
  };
}

/** 일봉 조회 (FHKST03010100) — from/to: YYYYMMDD */
async function kisDailyCandles(code, from, to) {
  const data = await kisGet(
    '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
    'FHKST03010100',
    {
      FID_COND_MRKT_DIV_CODE: 'J',
      FID_INPUT_ISCD: code,
      FID_INPUT_DATE_1: from,
      FID_INPUT_DATE_2: to,
      FID_PERIOD_DIV_CODE: 'D',
      FID_ORG_ADJ_PRC: '0',
    },
  );
  return (data.output2 || [])
    .filter((r) => r.stck_bsop_date)
    .map((r) => ({
      date: `${r.stck_bsop_date.slice(0, 4)}-${r.stck_bsop_date.slice(4, 6)}-${r.stck_bsop_date.slice(6, 8)}`,
      open: Number(r.stck_oprc),
      high: Number(r.stck_hgpr),
      low: Number(r.stck_lwpr),
      close: Number(r.stck_clpr),
      volume: Number(r.acml_vol),
    }))
    .reverse();
}

// ── 샘플(mock) 모드: 키가 없을 때 그럴듯한 시세를 생성 ──
const mockBase = new Map();
function mockPrice(code) {
  if (!mockBase.has(code)) {
    const h = [...code].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 90;
    mockBase.set(code, { price: 10_000 + h * 3_000, change: (Math.random() - 0.48) * 3 });
  }
  const st = mockBase.get(code);
  st.change = Math.max(-8, Math.min(8, st.change + (Math.random() - 0.5) * 0.4));
  return {
    code,
    price: Math.round(st.price * (1 + st.change / 100)),
    changePercent: +st.change.toFixed(2),
    volume: Math.floor(Math.random() * 5_000_000),
    asOf: new Date().toISOString(),
  };
}

// ── HTTP 서버 ──
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, source: kisConfigured ? 'kis' : 'mock', env: KIS_ENV });
    }

    if (url.pathname === '/api/quotes') {
      const codes = (url.searchParams.get('codes') || '').split(',').filter(Boolean).slice(0, 20);
      if (!codes.length) return sendJson(res, 400, { error: 'codes 파라미터가 필요합니다' });
      if (!kisConfigured) return sendJson(res, 200, { source: 'mock', quotes: codes.map(mockPrice) });
      const quotes = [];
      for (const code of codes) {
        quotes.push(await kisQuote(code));
        if (codes.length > 1) await sleep(THROTTLE_MS);
      }
      return sendJson(res, 200, { source: 'kis', quotes });
    }

    if (url.pathname.startsWith('/api/candles/')) {
      const code = url.pathname.split('/').pop();
      const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10).replaceAll('-', '');
      const from = url.searchParams.get('from') || String(Number(to.slice(0, 4)) - 1) + to.slice(4);
      if (!kisConfigured) return sendJson(res, 200, { source: 'mock', candles: [] });
      return sendJson(res, 200, { source: 'kis', candles: await kisDailyCandles(code, from, to) });
    }

    if (url.pathname === '/api/weather') {
      // TODO: 한국은행 ECOS(금리·환율) + 오피넷(유가) 연동. 현재는 대표값 반환
      return sendJson(res, 200, { oilUsd: 68.4, rate: 2.5, usdKrw: 1382, source: 'static' });
    }

    // 정적 파일 서빙 (빌드된 dist가 있을 때)
    if (fs.existsSync(DIST)) {
      let filePath = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!filePath.startsWith(DIST) || !fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html');
      const ext = path.extname(filePath);
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
      return res.end(fs.readFileSync(filePath));
    }

    sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`[stoccer] 서버 시작: http://localhost:${PORT}`);
  console.log(`[stoccer] 데이터 소스: ${kisConfigured ? `KIS (${KIS_ENV === 'real' ? '실전' : '모의투자'})` : '샘플(mock) — KIS_APP_KEY/KIS_APP_SECRET 설정 시 실데이터로 전환'}`);
});
