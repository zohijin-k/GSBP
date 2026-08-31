/**
 * /api/analyze 검증 스크립트 — 로컬(next start)이든 배포 URL이든 동일하게 사용.
 *
 *   node scripts/verify-api.mjs                       # http://localhost:3000 기본
 *   node scripts/verify-api.mjs https://<배포도메인>
 *   node scripts/verify-api.mjs https://<배포도메인> --origin https://<배포도메인>
 *
 * Windows 에서 curl -d "한글" 은 인코딩이 깨지므로 이 스크립트(또는 curl --data-binary @파일)를 쓴다.
 *
 * 출력: 각 샘플의 verdict / source / signals(rule) / flags 수.
 * 기대값과 다르면 [MISMATCH] 표시.
 */

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const originIdx = process.argv.indexOf("--origin");
const origin = originIdx > -1 ? process.argv[originIdx + 1] : null;

const CASES = [
  {
    id: "예시1 (명의대여 유인)",
    body: {
      text: "형님 통장 하나만 빌려주면 30만원 드려요. 10일만 쓰고 바로 돌려드립니다. 절대 문제 없어요",
      lang: "ko",
    },
    expect: { verdict: "risk", rules: ["ACCESS_MEDIUM", "COMPENSATION", "SHORT_TERM", "REASSURANCE"] },
  },
  {
    id: "예시2 (대출 가장)",
    body: {
      text: "재직증명서 없어도 대출 가능합니다. 신용조회 안 하고 당일 입금. 담보는 통장이면 됩니다",
      lang: "ko",
    },
    expect: { verdict: "risk", rules: ["FAKE_LOAN"] },
  },
  {
    id: "예시3 (정상 은행 알림 → 판단 보류)",
    body: {
      text: "[OO은행] 고객님이 신청하신 금융거래한도 해제 심사 결과를 안내드립니다. 영업점 방문 없이 앱에서 확인해 주세요",
      lang: "ko",
    },
    expect: { verdict: "caution", rules: [] },
  },
  {
    id: "무관한 문장 → clear",
    body: { text: "내일 3시에 학교 앞에서 만나요", lang: "ko" },
    expect: { verdict: "clear", rules: [] },
  },
  {
    id: "English (언어 일치 확인용)",
    body: {
      text: "Lend me your bank account for 3 days and I'll pay you 500,000 KRW. No problem at all.",
      lang: "en",
    },
    expect: { verdict: "risk", rules: ["ACCESS_MEDIUM", "SHORT_TERM", "COMPENSATION", "REASSURANCE"] },
  },
];

const headers = { "content-type": "application/json", connection: "close" };
if (origin) headers.origin = origin;

let anyMismatch = false;

for (const c of CASES) {
  try {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify(c.body),
    });
    const j = await res.json();
    const rules = (j.signals || []).map((s) => s.rule);
    const uniqRules = [...new Set(rules)];
    const okVerdict = j.verdict === c.expect.verdict;
    const okRules = c.expect.rules.every((r) => uniqRules.includes(r));
    const aiGen = (j.flags || []).some((f) => f.q === "AI_GEN");
    const mark = okVerdict && okRules ? "OK    " : "MISMATCH";
    if (!(okVerdict && okRules)) anyMismatch = true;
    console.log(
      `[${mark}] ${c.id}\n` +
        `        http ${res.status} | verdict=${j.verdict} (기대 ${c.expect.verdict}) | source=${j.source} | ` +
        `signals=[${uniqRules.join(",")}] | flags=${(j.flags || []).length}${aiGen ? " | +AI_GEN" : ""} | ` +
        `promptVersion=${j.promptVersion}`
    );
  } catch (e) {
    anyMismatch = true;
    console.log(`[ERROR] ${c.id} — ${e.message}`);
  }
}

console.log(
  `\n종합: ${anyMismatch ? "일부 MISMATCH/ERROR 있음" : "모든 케이스 verdict/rule 일치"}` +
    `\n참고: source 는 배포 환경의 ANTHROPIC_API_KEY / Origin 설정에 따라 "ai" 또는 "fallback".`
);
process.exitCode = anyMismatch ? 1 : 0;
