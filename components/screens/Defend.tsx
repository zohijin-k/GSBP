"use client";

import { useEffect, useState } from "react";
import { SAMPLES } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Signal, Verdict } from "@/lib/detect";

type Flag = { q: string; t: string };
type Analysis = { verdict: Verdict; signals: Signal[]; flags: Flag[]; source: "ai" | "fallback" };

/**
 * 판정 근거가 원문 어디였는지 보이게 한다.
 * 하이라이트 구간은 반드시 서버가 돌려준 signals[].matched 기준으로 만든다 —
 * 클라이언트가 따로 판단하면 화면과 판정 근거가 어긋난다.
 */
function segments(text: string, matches: string[]) {
  const ranges: { s: number; e: number }[] = [];
  for (const m of matches) {
    if (!m) continue;
    let i = text.indexOf(m);
    while (i !== -1) {
      ranges.push({ s: i, e: i + m.length });
      i = text.indexOf(m, i + m.length);
    }
  }
  ranges.sort((a, b) => a.s - b.s);

  const merged: { s: number; e: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.s <= last.e) last.e = Math.max(last.e, r.e);
    else merged.push({ ...r });
  }

  const out: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const r of merged) {
    if (r.s > pos) out.push({ text: text.slice(pos, r.s), hit: false });
    out.push({ text: text.slice(r.s, r.e), hit: true });
    pos = r.e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

const MAX_TEXT = 1000;

export default function Defend() {
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  /** 분석을 요청한 문장. n 을 올려 같은 문장도 다시 보낼 수 있게 한다. */
  const [query, setQuery] = useState<{ text: string; n: number } | null>(null);
  const [outcome, setOutcome] = useState<{ key: string; data?: Analysis; error?: boolean } | null>(
    null
  );

  // 언어도 키에 넣는다 — 언어를 바꾸면 설명 문장을 그 언어로 다시 받아 온다.
  const key = query ? `${query.n}:${lang}` : null;

  useEffect(() => {
    if (!query) return;
    const k = `${query.n}:${lang}`;
    const ac = new AbortController();
    let alive = true;

    void (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: query.text.slice(0, MAX_TEXT), lang }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Analysis;
        if (alive) setOutcome({ key: k, data });
      } catch {
        if (alive) setOutcome({ key: k, error: true });
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [query, lang]);

  // 로딩은 상태로 들지 않고 파생시킨다 — 요청 키와 응답 키가 어긋난 동안이 로딩이다.
  const settled = key !== null && outcome?.key === key ? outcome : null;
  const loading = key !== null && settled === null;
  const data = settled?.data;
  const failed = Boolean(settled?.error);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setQuery((prev) => ({ text: v, n: (prev?.n ?? 0) + 1 }));
  };

  return (
    <section className="screen" role="tabpanel" aria-label={t({ ko: "방어", en: "Defence" })}>
      <span className="eyebrow">{t({ ko: "Step 04 · 방어", en: "Step 04 · Defence" })}</span>
      <h2 className="title">
        {t({ ko: "받은 메시지를 확인하세요", en: "Check the message you received" })}
      </h2>
      <p className="lede">
        {t({
          ko: "통장을 빌려달라는 제안은 대부분 메신저로 옵니다. 받은 문장을 그대로 붙여넣으면 위험 신호를 짚어 드립니다.",
          en: "Offers to borrow your account almost always arrive by messenger. Paste what you received and the warning signs are marked for you.",
        })}
      </p>

      <h3 className="sub">{t({ ko: "직접 붙여넣기", en: "Paste it here" })}</h3>
      <div className="composer">
        <textarea
          value={text}
          maxLength={MAX_TEXT}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          placeholder={t({
            ko: "받은 메시지를 붙여넣으세요",
            en: "Paste the message you received",
          })}
          aria-label={t({ ko: "받은 메시지", en: "The message you received" })}
        />
        <span className="cc mono" aria-live="off">
          {text.length} / {MAX_TEXT}
        </span>
      </div>
      <button className="cta" onClick={() => submit(text)} disabled={loading || !text.trim()}>
        {loading
          ? t({ ko: "분석 중…", en: "Analyzing…" })
          : t({ ko: "확인하기", en: "Check" })}
      </button>

      <h3 className="sub" style={{ marginTop: 26 }}>
        {t({ ko: "예시 메시지", en: "Example messages" })}
      </h3>
      <div className="samples">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            className="sample"
            disabled={loading}
            onClick={() => {
              setText(t(s.text));
              submit(t(s.text));
            }}
          >
            <span className="who">{t(s.who)}</span>
            {t(s.text)}
          </button>
        ))}
      </div>

      {failed && (
        <div className="errbox">
          <p>
            {t({
              ko: "일시적으로 분석할 수 없습니다. 다시 시도해 주세요.",
              en: "Analysis is temporarily unavailable. Please try again.",
            })}
          </p>
          <button className="cta ghost" onClick={() => submit(query?.text ?? text)}>
            {t({ ko: "다시 시도", en: "Try again" })}
          </button>
        </div>
      )}

      {data && query && (
        <div
          className={`result ${data.verdict}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="rh">
            <span className="rt">
              {data.verdict === "risk" &&
                t({
                  ko: "위험 — 명의대여 제안입니다",
                  en: "Danger — this is a request for your account",
                })}
              {data.verdict === "caution" &&
                t({ ko: "판단 보류 — 확인이 필요합니다", en: "Inconclusive — please check carefully" })}
              {data.verdict === "clear" &&
                t({ ko: "금융 관련 내용이 아닙니다", en: "Not about financial accounts" })}
            </span>
          </div>
          <div className="rb">
            <blockquote className="quoted">
              {segments(
                query.text,
                data.signals.map((s) => s.matched)
              ).map((p, i) =>
                p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>
              )}
            </blockquote>

            {data.verdict === "caution" && (
              <p className="holdnote">
                {t({
                  ko: "명확한 위험 신호는 찾지 못했습니다. 다만 통장·계좌 이야기가 오갔다면 어떤 경우에도 남에게 넘기지 마세요.",
                  en: "We did not find a clear warning sign. But if this conversation involves your bank account, never hand it to anyone.",
                })}
              </p>
            )}

            <div className="flags">
              {data.flags.map((f) => (
                <div className="flag" key={f.q}>
                  <span className="fq mono">{f.q}</span>
                  {/* 서버(LLM) 응답이므로 HTML로 렌더하지 않는다 — 순수 텍스트만 */}
                  <span>{f.t}</span>
                </div>
              ))}
            </div>

            {data.verdict === "risk" && (
              <>
                <p className="trade-head">
                  {t({
                    ko: "10일 빌려주고, 4,380일을 잃습니다",
                    en: "Lend it for 10 days. Lose 4,380.",
                  })}
                </p>

                <div className="tradeoff">
                  <div className="gain">
                    <span className="tl">{t({ ko: "얻는 것", en: "What you gain" })}</span>
                    <div className="tv">{t({ ko: "300,000원", en: "300,000 KRW" })}</div>
                    <div className="tsub">
                      {t({
                        ko: "모집책이 학생·외국인·일용직에게 지급하는 실제 금액",
                        en: "The amount recruiters actually pay students, foreign nationals and day labourers",
                      })}
                    </div>
                  </div>
                  <div className="lose">
                    <span className="tl">{t({ ko: "잃는 것", en: "What you lose" })}</span>
                    <div className="tv">{t({ ko: "12년", en: "12 years" })}</div>
                    <div className="tsub">
                      {t({
                        ko: "금융질서문란행위자 등록 — 유효 7년 + 참고 5년",
                        en: "Registration as a financial-order offender (금융질서문란행위자) — 7 years active plus 5 years on record",
                      })}
                    </div>
                  </div>
                </div>

                {/* 단위가 달라 직접 비교가 안 되니 시간 축으로 통일해 대비시킨다 */}
                <div className="timescale">
                  <div className="ts-row">
                    <div className="ts-head">
                      <span className="ts-k">{t({ ko: "빌려주는 기간", en: "Lent for" })}</span>
                      <span className="ts-v">{t({ ko: "10일", en: "10 days" })}</span>
                    </div>
                    <div
                      className="ts-track"
                      role="img"
                      aria-label={t({
                        ko: "빌려주는 기간 10일 — 잃는 기간의 438분의 1",
                        en: "Lending period 10 days — one 438th of the period you lose",
                      })}
                    >
                      <i className="lend" style={{ width: "0.23%" }} />
                    </div>
                  </div>

                  <div className="ts-row">
                    <div className="ts-head">
                      <span className="ts-k">{t({ ko: "잃는 기간", en: "Lost for" })}</span>
                      <span className="ts-v">{t({ ko: "4,380일", en: "4,380 days" })}</span>
                    </div>
                    <div className="ts-bottom">
                      <div
                        className="ts-track"
                        role="img"
                        aria-label={t({
                          ko: "잃는 기간 4,380일 — 빌려주는 기간의 438배",
                          en: "Period you lose 4,380 days — 438 times the lending period",
                        })}
                      >
                        <i className="lose" style={{ width: "100%" }} />
                      </div>
                      <span className="ts-mult">{t({ ko: "438배", en: "438×" })}</span>
                    </div>
                  </div>

                  <div className="ts-note">
                    {t({
                      ko: "금융질서문란행위자 등록 12년 = 4,380일",
                      en: "12 years on the financial-order offender register = 4,380 days",
                    })}
                  </div>
                </div>
              </>
            )}

            {/* 법적 근거는 risk 와 caution 모두에 보인다 — 판단 보류라도 법은 같다 */}
            {data.verdict !== "clear" && (
              <>
                <div className="legal">
                  {lang === "ko" ? (
                    <>
                      <b>전자금융거래법 제6조 제3항</b> — 접근매체의 양도·대여 금지
                      <br />
                      <b>금융질서문란행위자 등록</b> — 신규 계좌개설 거절, 카드 정지, 보험 가입 거절
                      <br />
                      <b>출입국관리법 제46조 제1항</b> — 금고 이상의 형 선고 시 강제퇴거 대상
                      <br />
                      <span className="dim">
                        2025년 들어 단순 가담 초범에게도 실형(1년 6개월~2년) 선고가 늘고 있습니다.
                      </span>
                    </>
                  ) : (
                    <>
                      <b>Electronic Financial Transactions Act, Article 6(3)</b> — transferring or
                      lending an access medium is prohibited
                      <br />
                      <b>Registration as a financial-order offender</b> — new accounts refused,
                      cards suspended, insurance applications refused
                      <br />
                      <b>Immigration Act, Article 46(1)</b> — a sentence of imprisonment or heavier
                      makes you subject to deportation
                      <br />
                      <span className="dim">
                        Since 2025, prison terms of 1 year 6 months to 2 years have increasingly
                        been handed down even to first-time, minor participants.
                      </span>
                    </>
                  )}
                </div>
              </>
            )}

            {/* 무엇이 돌았는지 숨기지 않는다 */}
            {data.source === "fallback" && (
              <p className="srcnote">
                {t({
                  ko: "AI 설명 생성이 일시적으로 불가하여 기본 안내를 표시합니다",
                  en: "AI explanation is temporarily unavailable; showing standard guidance",
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {data && data.verdict !== "clear" && (
        <div className="note">
          {lang === "ko" ? (
            <>
              <b>돈이 급하시다면.</b> 통장을 빌려주는 대신 이용할 수 있는 경로가 있습니다 — 하나은행
              외국인 EZ 대출(한도 1,000만원), 신한 SOL 글로벌론(한도 2,000만원), NH K-외국인
              신용대출(100만~3,000만원). 금리는 높지만 <b>강제퇴거 위험은 없습니다.</b>
            </>
          ) : (
            <>
              <b>If you need money now.</b> There are routes to use instead of lending your account
              — Hana Bank EZ Loan for foreign nationals (limit 10,000,000 KRW), Shinhan SOL Global
              Loan (limit 20,000,000 KRW), NH K-Foreigner Personal Loan (1,000,000–30,000,000 KRW).
              The interest is high, but <b>there is no deportation risk.</b>
            </>
          )}
        </div>
      )}
    </section>
  );
}
