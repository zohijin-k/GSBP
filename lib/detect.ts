/**
 * GSB — 명의대여 유인 판별 규칙 엔진
 *
 * ⚠️ 이 파일이 판정의 유일한 근거다.
 *  - risk 판정은 여기서만 결정된다. LLM은 이 결과를 바꾸지 못한다.
 *  - 같은 입력에 항상 같은 출력이 나와야 한다(재현성). 난수·시각·외부 호출을 쓰지 않는다.
 *  - matched 에는 원문에서 실제로 잘라낸 문자열을 담는다. 이것이 UI 하이라이트의 근거다.
 *
 * 규칙은 실제 수사·보도 사례에서 반복 확인된 문구만 넣는다.
 */

import type { L } from "./i18n";

export type RuleId =
  | "ACCESS_MEDIUM"
  | "COMPENSATION"
  | "SHORT_TERM"
  | "REASSURANCE"
  | "FAKE_LOAN"
  | "IDENTITY";

export type Severity = "high" | "medium";

export type Signal = {
  id: string;
  /** 원문에서 실제로 매칭된 구간 */
  matched: string;
  /** 어떤 규칙에 걸렸는지 (내부 식별자) */
  rule: string;
  severity: Severity;
};

/**
 * 판정은 3단계다. 이진 판정(위험/안전)은 금융 안전 서비스에서 위험하다 —
 * 규칙이 놓친 문구에 "안전"을 찍으면 그게 거짓 안심이 되고, 최악의 실패다.
 * "caution" 은 시스템이 자기 한계를 인정하는 상태다.
 */
export type Verdict = "risk" | "caution" | "clear";

export type Detection = {
  verdict: Verdict;
  signals: Signal[];
};

const SEVERITY: Record<RuleId, Severity> = {
  ACCESS_MEDIUM: "high",
  FAKE_LOAN: "high",
  IDENTITY: "high",
  COMPENSATION: "medium",
  SHORT_TERM: "medium",
  REASSURANCE: "medium",
};

/**
 * 규칙별 정규식. 한국어/영어를 모두 커버한다.
 * 한국어는 어순이 "명사 … 동사"이고 영어는 "동사 … 명사"라 양방향 패턴을 둔다.
 * [^.!?\n]{0,N} 로 같은 문장 안에서만 이어지도록 제한한다.
 */
const RULES: Record<RuleId, RegExp[]> = {
  // 접근매체 요구 — 통장·계좌·카드를 빌려달라는 요구
  ACCESS_MEDIUM: [
    /(통장|계좌|체크카드|현금카드|카드)[^.!?\n]{0,14}?(빌려|빌리|대여|양도|넘겨|넘기|맡겨|맡기)/g,
    /(빌려|대여|양도|넘겨|맡겨)[^.!?\n]{0,14}?(통장|계좌|체크카드|카드)/g,
    /\b(lend|rent|borrow|transfer|hand\s+over|give\s+me)\b[^.!?\n]{0,25}?\b(bank\s+)?(account|bankbook|passbook|debit\s+card|card)\b/gi,
    /\b(bank\s+)?(account|bankbook|passbook|debit\s+card)\b[^.!?\n]{0,25}?\b(lend|rent|borrow|transfer|hand\s+over)\b/gi,
  ],

  // 대가 제시 — 금액과 지급 표현이 같은 문장에 함께 나올 때
  COMPENSATION: [
    /\d[\d,]*\s*(만\s?원|천\s?원|원|만)[^.!?\n]{0,16}?(드려|드립니다|드릴|드리겠|지급|입금|사례|줄게|줍니다|보내드)/g,
    /(드려|드립니다|드릴|드리겠|지급|입금|사례비?|줄게)[^.!?\n]{0,16}?\d[\d,]*\s*(만\s?원|천\s?원|원|만)/g,
    /\b(pay|paid|give|deposit|send)\b[^.!?\n]{0,28}?[\d,]+\s*(krw|won|만원)\b/gi,
    /[\d,]+\s*(krw|won)\b[^.!?\n]{0,28}?\b(pay|paid|give|deposit|reward)\b/gi,
  ],

  // 단기 사용 강조 — 계좌를 즉시 쓰고 버리는 수법의 전형적 문구
  SHORT_TERM: [
    /\d+\s*일(?:만|\s*동안만)/g,
    /며칠\s*만/g,
    /하루\s*만/g,
    /잠깐/g,
    /잠시/g,
    /단기간/g,
    /\b(just|only)\s+(a\s+)?(few\s+days|\d+\s+days?|one\s+day|a\s+day|a\s+moment)\b/gi,
    /\bfor\s+(just\s+|only\s+)?\d+\s+days?\b/gi,
  ],

  // 안심 유도 — 처벌 위험을 없는 것처럼 말하는 문구
  REASSURANCE: [
    /절대\s*(문제\s*)?없/g,
    /문제\s*(가\s*)?없(어|습니다|다|요|을)/g,
    /안전\s*(해|합니다|하니|한)/g,
    /합법/g,
    /걸릴\s*일\s*(이\s*)?없/g,
    /걸리지\s*않/g,
    /아무\s*일\s*(도\s*)?없/g,
    /\b(absolutely|totally|completely|100%)?\s*no\s+problem\b/gi,
    /\b(it'?s|is|are)\s+(100%\s+)?(safe|legal)\b/gi,
    /\bnothing\s+(will\s+)?happens?\b/gi,
    /\bwon'?t\s+get\s+caught\b/gi,
  ],

  // 대출 가장 — 계좌 매입을 대출로 포장하는 문구
  FAKE_LOAN: [
    /담보[는은]?\s*(통장|계좌|카드)/g,
    /(통장|계좌|카드)[가이은는]?\s*담보/g,
    /신용조회\s*(안|없|불필요|생략)/g,
    /무심사/g,
    /무서류/g,
    /서류\s*(가\s*)?없(이|어도|어서)/g,
    /당일\s*(입금|대출|송금)/g,
    /\bno\s+credit\s+check\b/gi,
    /\bwithout\s+(any\s+)?documents?\b/gi,
    /\bno\s+documents?\b/gi,
    /\bsame[-\s]day\s+(deposit|transfer|loan)\b/gi,
    /\b(account|bankbook|passbook)\b[^.!?\n]{0,30}?\bcollateral\b/gi,
    /\bcollateral\b[^.!?\n]{0,30}?\b(account|bankbook|passbook)\b/gi,
  ],

  // 명의 대여 — 이름·신분증만 빌려달라는 요구
  IDENTITY: [
    /명의\s*대여/g,
    /명의[를을]?\s*(빌려|빌리|대여|양도|넘겨)/g,
    /이름\s*(만)?\s*[을를]?\s*(빌려|빌리|대여)/g,
    /신분증\s*(사진|사본|촬영|스캔)/g,
    /외국인등록증\s*(사진|사본|촬영)/g,
    /\b(lend|borrow|use|rent)\b[^.!?\n]{0,18}?\b(your|my)\s+name\b/gi,
    /\bname\s+lending\b/gi,
    /\b(id|identity)\s+(card\s+)?(photo|picture|scan|copy)\b/gi,
  ],
};

const RULE_IDS = Object.keys(RULES) as RuleId[];

/** 신호가 지나치게 많아도 응답 크기와 LLM 입력을 일정하게 유지한다. */
const MAX_SIGNALS = 8;

/**
 * 금융 어휘 감시 목록. 이것 자체는 위험 신호가 아니다 —
 * 규칙에 걸린 문구가 없더라도 통장·계좌 이야기가 오갔다면
 * "판별 대상이 아님(clear)"이라고 말해서는 안 되므로 caution 으로 끌어올린다.
 */
const FINANCIAL_TERMS: RegExp[] = [
  /통장|계좌|체크카드|현금카드|카드|명의|신분증|외국인등록증/,
  // 이 서비스의 도메인 용어. 은행 알림처럼 "계좌"라는 낱말 없이 계좌를 다루는 문장이 있다 —
  // 그런 문장에 "금융 관련 내용이 아닙니다"라고 답하면 명백한 오답이다.
  /금융거래한도|한도제한|한도\s*해제|입출금|예금|적금|송금|이체/,
  /\b(bank\s+)?account\b/i,
  /\b(bank|debit|credit|cash)\s+card\b/i,
  /\bbankbook|passbook\b/i,
  /\bID\s+card\b/i,
  /\btransaction\s+limit\b/i,
  /\b(wire\s+)?transfer|remittance|deposit\s+account\b/i,
];

function hasFinancialTerm(text: string): boolean {
  return FINANCIAL_TERMS.some((re) => re.test(text));
}

/**
 * 결정론적 판정.
 *   high 1개 이상   → risk true
 *   medium 2개 이상 → risk true
 *   그 외           → risk false
 */
export function detect(text: string): Detection {
  const found: { start: number; end: number; matched: string; rule: RuleId }[] = [];

  for (const rule of RULE_IDS) {
    // 같은 규칙 안에서 겹치는 매칭은 하나로 본다.
    // "절대 문제 없"과 "문제 없어"는 같은 한 문구이므로 medium 2개로 세면 안 된다.
    const taken: { start: number; end: number }[] = [];
    for (const re of RULES[rule]) {
      // 전역 정규식은 lastIndex를 공유하므로 매 호출마다 새 인스턴스를 만든다.
      const scan = new RegExp(re.source, re.flags);
      let m: RegExpExecArray | null;
      while ((m = scan.exec(text)) !== null) {
        const matched = m[0];
        if (!matched) {
          scan.lastIndex += 1;
          continue;
        }
        const start = m.index;
        const end = start + matched.length;
        if (taken.some((r) => start < r.end && end > r.start)) continue;
        taken.push({ start, end });
        found.push({ start, end, matched, rule });
      }
    }
  }

  // 원문 등장 순서대로 정렬해야 화면의 인용문과 번호가 같은 순서로 읽힌다.
  found.sort((a, b) => a.start - b.start || a.rule.localeCompare(b.rule));

  const signals: Signal[] = found.slice(0, MAX_SIGNALS).map((f, i) => ({
    id: String(i + 1).padStart(2, "0"),
    matched: f.matched,
    rule: f.rule,
    severity: SEVERITY[f.rule],
  }));

  const high = signals.filter((s) => s.severity === "high").length;
  const medium = signals.filter((s) => s.severity === "medium").length;

  // 위에서부터 순서대로 평가한다.
  let verdict: Verdict;
  if (high >= 1 || medium >= 2) verdict = "risk";
  else if (medium === 1) verdict = "caution";
  else if (hasFinancialTerm(text)) verdict = "caution";
  else verdict = "clear";

  return { verdict, signals };
}

/**
 * AI 호출이 불가할 때 쓰는 규칙 기반 설명 문장.
 * LLM이 생성하는 문장과 같은 자리에 들어가므로 톤을 맞춘다.
 */
export const RULE_FALLBACK: Record<RuleId, L> = {
  ACCESS_MEDIUM: {
    ko: "통장·계좌·카드를 빌려달라는 요구입니다. 접근매체 대여는 그 자체로 전자금융거래법 제6조 제3항 위반입니다.",
    en: "This asks you to lend a bank account or card. Lending an access medium is itself a breach of the Electronic Financial Transactions Act (전자금융거래법), Article 6(3).",
  },
  COMPENSATION: {
    ko: "대가를 제시하고 있습니다. 돈을 받으면 처벌 요건이 명확히 성립합니다.",
    en: "Payment is being offered. Taking money establishes the elements of the offence outright.",
  },
  SHORT_TERM: {
    ko: "짧은 기간만 쓰겠다고 강조합니다. 계좌를 즉시 자금세탁에 쓰고 버리는 전형적 수법입니다.",
    en: "It stresses a short period of use. The standard method is to run laundering through the account at once, then discard it.",
  },
  REASSURANCE: {
    ko: "문제가 없다고 안심시키는 문구입니다. 실제로는 명의자 본인이 처벌받습니다.",
    en: "This is reassurance that nothing will go wrong. In practice the person whose name is on the account is the one punished.",
  },
  FAKE_LOAN: {
    ko: "대출을 가장한 계좌 매입 제안입니다. 정상 금융회사는 통장을 담보로 잡거나 신용조회를 건너뛰지 않습니다.",
    en: "This is an account purchase disguised as a loan. A legitimate financial company never takes a bank account as collateral or skips the credit check.",
  },
  IDENTITY: {
    ko: "이름이나 신분증만 빌려달라는 요구입니다. 명의를 빌려준 사람이 범죄 계좌의 명의자가 됩니다.",
    en: "This asks to borrow only your name or ID. Whoever lends their name becomes the registered holder of a criminal account.",
  },
};

/** 위험 신호가 하나도 없을 때의 안내. */
export const NO_SIGNAL_COPY: L = {
  ko: "금전이나 계좌를 요구하는 표현이 발견되지 않았습니다. 다만 새로운 수법은 계속 나오므로 계좌·신분증을 요구하면 응하지 마세요.",
  en: "No wording that asks for money or an account was found. New methods keep appearing, so never comply if anyone asks for your account or ID.",
};

/** medium 1개만 걸려 risk 판정에는 이르지 않았을 때 덧붙이는 안내. */
export const WEAK_SIGNAL_COPY: L = {
  ko: "신호가 하나만 확인되어 위험으로 판정하지 않았습니다. 계좌나 대가 이야기가 이어지면 즉시 중단하세요.",
  en: "Only one signal was found, so this is not flagged as dangerous. Stop immediately if the conversation turns to your account or to payment.",
};

/*
 * AI_GEN(AI 생성/보조 공격) 신호는 LLM 경로에서만 나온다.
 * 폴백(source: "fallback")에서는 이 신호를 별도 문구로 표시하지 않고 그대로 생략한다.
 *   - flags[] 는 "판정 근거"만 담는 자리이고, AI_GEN 은 verdict 에 영향이 없는 보조 정보다.
 *   - 폴백으로 내려갔다는 사실은 방어 화면이 이미 별도 배너로 표시한다.
 *   - "AI 판별 불가"를 가짜 flag 로 끼워 넣으면 실제 경고 문장과 뒤섞여 오히려 흐려진다.
 * 이 주석이 그 결정의 근거다. (별도 상수는 두지 않는다.)
 */
