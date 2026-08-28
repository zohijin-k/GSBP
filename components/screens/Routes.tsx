"use client";

import { useMemo, useState } from "react";
import { BANKS, CHECKS, type Persona } from "@/lib/data";
import { useLang, type L } from "@/lib/i18n";

/**
 * 통과 가능성은 3단계 라벨로만 노출한다.
 * 점수를 숫자로 보여줄 만한 정밀도가 우리에게 없다 — "96점의 근거가 뭐냐"에 답할 수 없다.
 * 진짜 근거는 요건별 충족 여부(factors)다.
 */
const BANDS: { tier: string; min: number; label: L }[] = [
  { tier: "high", min: 75, label: { ko: "높음", en: "High" } },
  { tier: "mid", min: 45, label: { ko: "보통", en: "Medium" } },
  { tier: "low", min: 1, label: { ko: "낮음", en: "Low" } },
  { tier: "none", min: 0, label: { ko: "불가", en: "Unavailable" } },
];

const bandOf = (s: number) => BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];

export default function Routes({ persona, go }: { persona: Persona; go: (n: number) => void }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  /** 통과 가능성 순으로 정렬 — 확정이 아니라 순위임 */
  const ranked = useMemo(
    () => BANKS.map((b) => ({ b, f: b.fit[persona.id] })).sort((a, z) => z.f.s - a.f.s),
    [persona.id]
  );

  const count = Object.values(checked).filter(Boolean).length;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function doExport() {
    if (count === 0) {
      setExportMsg(
        t({ ko: "먼저 확보한 서류를 선택해 주세요", en: "Select the documents you have first" })
      );
    } else {
      setExportMsg(
        lang === "ko"
          ? `요약본 ${count}건 준비 완료 — 창구에서 제시하세요`
          : `Summary ready — ${count} document${count > 1 ? "s" : ""} to show at the counter`
      );
    }
    window.setTimeout(() => setExportMsg(null), 2400);
  }

  return (
    <section className="screen" role="tabpanel" aria-label={t({ ko: "경로", en: "Routes" })}>
      <span className="eyebrow">{t({ ko: "Step 03 · 경로", en: "Step 03 · Routes" })}</span>
      <h2 className="title">
        {t({ ko: "어느 은행에서, 어떤 서류로", en: "Which bank, and with which documents" })}
      </h2>
      <p className="lede">
        {t({
          ko: "해제 요건은 은행마다 다르고 대부분 공시되지 않습니다. 공개된 안내를 모아 당신 상황에 대입했습니다. 은행을 눌러 상세를 보세요.",
          en: "The requirements differ by bank and most are never published. We collected what is public and applied it to your situation. Tap a bank for the detail.",
        })}
      </p>

      <div className="banks">
        {ranked.map(({ b, f }, i) => {
          const isOpen = open === b.name.ko;
          const verdict = f.good ?? f.bad;
          const band = bandOf(f.s);
          const cls = [
            "bank",
            i === 0 && f.s > 0 ? "best" : "",
            f.s === 0 ? "blocked" : "",
            isOpen ? "open" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={cls} key={b.name.ko}>
              <button
                className="bh"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : b.name.ko)}
              >
                <span className="rank mono">{f.s > 0 ? String(i + 1).padStart(2, "0") : "—"}</span>
                <span className="bn">{t(b.name)}</span>
                <span className={`bdg ${b.grade}`}>{t(b.gradeLabel)}</span>
                <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div className={`likelihood ${band.tier}`}>
                <div className="lk-meta">
                  <span className="lk-lbl">{t({ ko: "통과 가능성", en: "Likelihood" })}</span>
                  <span className="lk-band">{t(band.label)}</span>
                </div>
                {f.s > 0 && (
                  <div className="lk-bar" aria-hidden="true">
                    <i style={{ width: `${f.s}%` }} />
                  </div>
                )}
              </div>

              <div className={`verdict ${f.good ? "good" : "bad"}`}>
                <span className="ic">{f.good ? "▲" : "▼"}</span>
                <span>{verdict ? t(verdict) : null}</span>
              </div>

              {isOpen && (
                <div className="detail">
                  <div className="chan">{t(b.channel)}</div>

                  <span className="dt">{t({ ko: "요건 대조", en: "Requirement check" })}</span>
                  <ul className="factors">
                    {f.factors.map((x) => (
                      <li key={x.label.ko} className={x.met ? "met" : "unmet"}>
                        <svg className="fic" viewBox="0 0 24 24" aria-hidden="true">
                          {x.met ? (
                            <path d="M4 12l6 6L20 6" />
                          ) : (
                            <path d="M6 6l12 12M18 6L6 18" />
                          )}
                        </svg>
                        <span>
                          <span className="sr-only">
                            {x.met
                              ? t({ ko: "충족: ", en: "Met: " })
                              : t({ ko: "미충족: ", en: "Not met: " })}
                          </span>
                          <span className="ftxt">{t(x.label)}</span>
                          {x.note && <span className="fnote">{t(x.note)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="req">
                    <span className="rt">
                      {t({ ko: "인정 요건", en: "Accepted requirements" })}
                    </span>
                    {t(b.req)}
                  </div>
                  <div className="src">
                    {t({ ko: "출처 — ", en: "Source — " })}
                    {t(b.src)}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="note">
        {lang === "ko" ? (
          <>
            <b>기준은 지점 재량으로 운영됩니다.</b> NH농협은행 관계자는 “한도해제 가이드를 각
            영업점에 주지만 판단은 영업점의 몫”이라고 밝혔습니다(SAT경제, 2024.1.15). 위 결과는
            확정이 아니라 <b>통과 가능성이 높은 순서</b>이며, 대안 서류를 함께 준비하시기 바랍니다.
          </>
        ) : (
          <>
            <b>The criteria are applied at each branch&apos;s discretion.</b> An NH Nonghyup Bank
            official stated that “the guide for lifting limits goes to every branch, but the
            judgement belongs to the branch” (SAT Economy, 2024-01-15). This list is not a decision
            — it is <b>the order of likelihood of passing</b>. Prepare backup documents as well.
          </>
        )}
      </div>

      <h3 className="sub" style={{ marginTop: 28 }}>
        {t({ ko: "준비할 서류", en: "Documents to prepare" })}
      </h3>
      <div className="progress">
        <div className="pmeta">
          <span>{t({ ko: "확보한 근거", en: "Evidence secured" })}</span>
          <span className="n">
            {count} / {CHECKS.length}
          </span>
        </div>
        <div className="bar">
          <i style={{ width: `${(count / CHECKS.length) * 100}%` }} />
        </div>
      </div>

      <div className="checks">
        {CHECKS.map((c) => (
          <button
            key={c.id}
            className="chk"
            aria-pressed={!!checked[c.id]}
            onClick={() => toggle(c.id)}
          >
            <span className="box">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12l6 6L20 6" />
              </svg>
            </span>
            <span>
              <span className="cn">
                {t(c.n)}
                {c.star && <span className="star">{t(c.star)}</span>}
              </span>
              <span className="cd">{t(c.d)}</span>
            </span>
          </button>
        ))}
      </div>

      <button className="cta" onClick={doExport}>
        {exportMsg ?? t({ ko: "창구 제출용 요약 만들기", en: "Build a counter-ready summary" })}
      </button>
      <button className="cta ghost" onClick={() => go(4)}>
        {t({ ko: "브로커 연락을 받으셨나요?", en: "Has a broker contacted you?" })}
      </button>
    </section>
  );
}
