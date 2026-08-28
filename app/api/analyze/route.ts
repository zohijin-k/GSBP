/**
 * POST /api/analyze — 명의대여 유인 메시지 판별
 *
 * 처리 순서
 *   1. 입력 검증 (실패 시 400)
 *   2. detect() 로 risk·signals 확정 — 이후 단계에서 절대 변경하지 않는다
 *   3. 키가 있으면 LLM으로 설명 문장 생성(source: "ai")
 *   4. 키가 없거나 호출이 실패하면 규칙 기반 문장(source: "fallback")
 *   → 검증 실패를 제외하면 어떤 경우에도 200과 유효한 응답을 돌려준다.
 *
 * ⚠️ 폴백은 선택이 아니라 필수다.
 *    제출 URL은 2026-09-07 11:00 ~ 09-11 23:59 내내 접속 가능해야 하며 불가 시 결격이다.
 *    키 만료·한도 초과·네트워크 장애 중 무엇이 일어나도 화면이 깨지면 안 된다.
 *
 * ⚠️ 개인정보
 *    입력 텍스트를 저장하거나 로깅하지 않는다. 에러 로그에도 길이만 남긴다.
 *    (판별을 위해 Anthropic API로 1회 전송되며, 그 외 어디에도 남기지 않는다.)
 */

import { NextResponse } from "next/server";
import {
  detect,
  NO_SIGNAL_COPY,
  RULE_FALLBACK,
  WEAK_SIGNAL_COPY,
  type RuleId,
  type Signal,
  type Verdict,
} from "@/lib/detect";
import {
  DEFAULT_MODEL,
  OUTPUT_SCHEMA,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseFlags,
  type Flag,
} from "@/lib/prompt";
import type { Lang } from "@/lib/i18n";

export const runtime = "nodejs";
/** 정적 최적화 대상이 아님을 명시한다. */
export const dynamic = "force-dynamic";

const MAX_TEXT = 1000;
const LLM_TIMEOUT_MS = 8000;

/* ---------------- 남용 방지 ----------------
   외부 저장소를 붙이지 않는다. 인스턴스별 인메모리라 완벽한 전역 제한은 아니고,
   데모 트래픽에서 한 클라이언트가 키를 소진시키는 것을 막는 것이 목적이다. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // 오래된 항목 정리 — Map이 무한히 자라지 않도록
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_LIMIT;
}

/**
 * 허용 Origin 이 아니면 차단하지 않고 "강등"한다 — LLM 호출만 생략하고 폴백으로 응답한다.
 * 심사자가 어떤 환경에서 열지 알 수 없다(프록시·사내망·특이한 브라우저 설정).
 * 비용은 막되 화면은 반드시 살아 있어야 한다.
 * GSB_ALLOWED_ORIGINS 가 비어 있으면 검사를 생략한다(로컬 개발용).
 */
function originAllowed(req: Request): boolean {
  const raw = process.env.GSB_ALLOWED_ORIGINS?.trim();
  if (!raw) return true;

  const allow = raw
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
  if (allow.length === 0) return true;

  const header = req.headers.get("origin") ?? req.headers.get("referer");
  if (!header) return false;
  try {
    return allow.includes(new URL(header).host.toLowerCase());
  } catch {
    return false;
  }
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/* ---------------- 폴백 문장 ---------------- */

function fallbackFlags(signals: Signal[], verdict: Verdict, lang: Lang): Flag[] {
  if (signals.length === 0) return [{ q: "01", t: NO_SIGNAL_COPY[lang] }];

  // 같은 규칙이 여러 번 걸려도 안내 문장은 한 번만 낸다.
  // (LLM 경로는 매칭 문구가 달라 서로 다른 문장을 쓰므로 이 처리가 필요 없다.)
  const usedRules = new Set<string>();
  const flags: Flag[] = [];
  for (const s of signals) {
    if (usedRules.has(s.rule)) continue;
    usedRules.add(s.rule);
    flags.push({
      q: String(flags.length + 1).padStart(2, "0"),
      t: RULE_FALLBACK[s.rule as RuleId][lang],
    });
  }

  // 신호는 있으나 위험 판정에 이르지 않은 경우 그 사실을 말해 준다.
  if (verdict !== "risk")
    flags.push({ q: String(flags.length + 1).padStart(2, "0"), t: WEAK_SIGNAL_COPY[lang] });
  return flags;
}

/* ---------------- LLM 호출 ---------------- */

async function generateFlags(
  text: string,
  signals: Signal[],
  verdict: Verdict,
  lang: Lang,
  apiKey: string
): Promise<Flag[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.GSB_MODEL || DEFAULT_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(text, signals, verdict, lang) }],
        output_config: {
          // 짧은 설명 한 묶음이라 깊은 추론이 필요 없다. 지연을 8초 예산 안에 붙잡아 둔다.
          effort: "low",
          format: { type: "json_schema", schema: OUTPUT_SCHEMA },
        },
      }),
    });

    if (!res.ok) return null;

    const body = (await res.json()) as {
      content?: { type?: string; text?: string }[];
      stop_reason?: string;
    };
    if (body.stop_reason === "refusal") return null;

    const textBlock = body.content?.find((b) => b.type === "text");
    return parseFlags(textBlock?.text);
  } catch {
    // 타임아웃·네트워크 오류·JSON 오류 — 원인과 무관하게 폴백으로 넘어간다.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- 핸들러 ---------------- */

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { text, lang } = (payload ?? {}) as { text?: unknown; lang?: unknown };
  if (typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: "text_too_long" }, { status: 400 });
  }
  const language: Lang = lang === "en" ? "en" : "ko";

  // 판정은 여기서 끝난다. 아래 어떤 코드도 verdict 와 signals 를 바꾸지 않는다.
  const { verdict, signals } = detect(text);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let flags: Flag[] | null = null;

  // Origin 이 허용 목록 밖이면 LLM 호출을 생략한다(강등). 판정과 화면은 그대로다.
  if (apiKey && originAllowed(req)) {
    try {
      flags = await generateFlags(text, signals, verdict, language, apiKey);
    } catch {
      flags = null;
    }
  }

  return NextResponse.json({
    verdict,
    signals,
    flags: flags ?? fallbackFlags(signals, verdict, language),
    source: flags ? "ai" : "fallback",
    promptVersion: PROMPT_VERSION,
  });
}
