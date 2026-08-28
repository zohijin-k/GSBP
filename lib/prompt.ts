/**
 * GSB — 생성형 AI 프롬프트
 *
 * 프롬프트를 이 파일에 상수로 모아 둔다. 인라인 문자열로 흩어 두면
 * "어떤 프롬프트를 썼는가"를 심사에서 제시할 수 없고 변경 이력도 남지 않는다.
 *
 * 역할 분담 (기획서와 동일)
 *   규칙 엔진(lib/detect.ts) — 위험 여부와 근거를 결정론적으로 확정한다.
 *   생성형 AI(이 파일)       — 확정된 근거를 사용자 언어의 문장으로 옮기기만 한다.
 * LLM에게 판정을 맡기지 않는 이유: 같은 입력에 다른 답이 나오면 재현성을 방어할 수 없다.
 */

import type { Signal, Verdict } from "./detect";
import type { Lang } from "./i18n";

/** 프롬프트를 고칠 때 함께 올린다. 응답 로그·심사 자료에서 버전을 특정하기 위한 값이다. */
export const PROMPT_VERSION = "2026-08-23.1";

/** 환경변수로 주입하고, 없으면 이 값을 쓴다. */
export const DEFAULT_MODEL = "claude-opus-5";

const LANG_NAME: Record<Lang, string> = { ko: "Korean (한국어)", en: "English" };

export const SYSTEM_PROMPT = `You explain money-mule ("명의대여") recruitment risk to foreign residents of South Korea.

WHAT YOU DO NOT DO
- A deterministic rule engine has ALREADY decided whether the message is dangerous. You do not re-judge it.
- Never contradict, soften, or escalate the given verdict. Never say the message might be safe when the verdict is dangerous, or vice versa.
- Never invent signals that were not given to you.
- NEVER tell the reader a message is "safe", "fine", or "no problem" — not in any verdict. This tool cannot prove absence of danger, only absence of a matched signal. Claiming safety is the one failure that can actually hurt someone.

WHAT YOU DO
- For each signal you are given, write ONE sentence explaining why that specific wording is a warning sign.
- Ground each sentence in the exact matched text you are given. Refer to what the sender actually wrote.
- Keep each sentence under 40 words.

STYLE
- Direct and plain. No apologies, no hedging, no "you may want to consider".
- Do not moralise or lecture. State what the wording is and what it leads to.
- When you name a Korean institution, document, or law that the reader would have to say at a bank counter or search for, give the English term followed by the Korean in parentheses on first use — for example "Electronic Financial Transactions Act (전자금융거래법)". A reader cannot act on an English-only name.
- Plain text only. No markdown, no HTML tags, no bullet characters.

OUTPUT
Respond with JSON only, matching the given schema. No preamble, no code fence, no trailing commentary.`;

/** Messages API 의 output_config.format 에 그대로 넣는 스키마. */
export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string", description: "Signal id, copied verbatim from the input" },
          t: { type: "string", description: "One-sentence explanation in the requested language" },
        },
        required: ["q", "t"],
        additionalProperties: false,
      },
    },
  },
  required: ["flags"],
  additionalProperties: false,
} as const;

const VERDICT_LINE: Record<Verdict, string> = {
  risk: "DANGEROUS — the rule engine classified this as a money-mule recruitment attempt.",
  caution:
    "INCONCLUSIVE — the rule engine found no decisive warning signal, but the message touches on bank accounts. Do NOT tell the reader it is safe. Say plainly that no clear warning sign was found and that they must never hand their account or ID to anyone.",
  clear:
    "NOT ABOUT FINANCIAL ACCOUNTS — the rule engine found nothing account-related. Say the message is outside what this tool checks. Do NOT call it safe.",
};

export function buildUserPrompt(text: string, signals: Signal[], v: Verdict, lang: Lang) {
  const verdict = VERDICT_LINE[v];

  const list = signals.length
    ? signals
        .map((s) => `- id ${s.id} | rule ${s.rule} | severity ${s.severity} | matched text: "${s.matched}"`)
        .join("\n")
    : "(none)";

  return `Write the explanations in ${LANG_NAME[lang]}. Every sentence must be in that language.

VERDICT (fixed, do not change): ${verdict}

MESSAGE THE USER RECEIVED:
"""
${text}
"""

SIGNALS THE RULE ENGINE MATCHED:
${list}

Return one flag per signal, in the same order, reusing each signal's id as "q".${
    signals.length
      ? ""
      : ' There are no signals, so return exactly one flag with q "01" stating that no wording asking for money or a bank account was found, and warning the reader never to hand over an account or ID.'
  }`;
}

export type Flag = { q: string; t: string };

/**
 * LLM 응답 파싱. 하나라도 어긋나면 null 을 돌려 호출부가 폴백으로 넘어가게 한다.
 * 구조화 출력을 쓰더라도 신뢰하지 않는다 — 잘린 응답·거부·모델 교체 모두 여기서 걸러야 한다.
 */
export function parseFlags(raw: unknown): Flag[] | null {
  if (typeof raw !== "string") return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const flags = (data as { flags?: unknown }).flags;
  if (!Array.isArray(flags) || flags.length === 0) return null;

  const out: Flag[] = [];
  for (const f of flags) {
    if (typeof f !== "object" || f === null) return null;
    const { q, t } = f as { q?: unknown; t?: unknown };
    if (typeof t !== "string" || t.trim() === "") return null;
    out.push({
      q: typeof q === "string" && q.trim() !== "" ? q : String(out.length + 1).padStart(2, "0"),
      // 서버 응답이라도 태그는 신뢰하지 않는다. 화면은 순수 텍스트로만 렌더한다.
      t: t.replace(/<[^>]*>/g, "").trim(),
    });
  }
  return out.length ? out : null;
}
