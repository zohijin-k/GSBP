"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Persona } from "@/lib/data";
import { FLOW_COPY, overlapSentence, useLang, type L } from "@/lib/i18n";

const MULE_PATTERN: L[] = [
  { ko: "계좌 개설 직후 대량 입출금", en: "Large deposits and withdrawals right after opening" },
  { ko: "심야 시간대 거래 집중", en: "Transactions concentrated in the small hours" },
  { ko: "복수 계좌 동시 개설", en: "Several accounts opened at the same time" },
  {
    ko: "개설 목적과 무관한 자금 흐름",
    en: "Money flows unrelated to the stated purpose of the account",
  },
];

/**
 * "실제 나"와 대포통장 패턴이 몇 개나 겹치는지 실제로 센다.
 * 현재 데이터에서는 항상 0이 나오지만, 하드코딩하지 않고 계산하는 것이 정직하다 —
 * 겹치는 게 0인데 둘 다 차단당한다는 사실이 이 서비스의 존재 이유다.
 */
function overlapCount(real: L[]) {
  return real.filter((r) => MULE_PATTERN.some((m) => m.ko === r.ko || m.en === r.en)).length;
}

export default function Diagnose({ persona, go }: { persona: Persona; go: (n: number) => void }) {
  const { lang, t } = useLang();
  const trackRef = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);

  const overlap = useMemo(() => overlapCount(persona.real), [persona.real]);

  /** 가로 스냅 캐러셀에서 현재 보이는 카드를 추적한다. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cols = Array.from(track.querySelectorAll<HTMLElement>(".col"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const i = cols.indexOf(e.target as HTMLElement);
            if (i >= 0) setCur(i);
          }
        }
      },
      { root: track, threshold: [0.6] }
    );
    cols.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const goCol = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const col = track.querySelectorAll<HTMLElement>(".col")[i];
    if (!col) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    col.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, []);

  /** 좌우 화살표로도 카드를 넘길 수 있어야 한다. */
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const next = e.key === "ArrowLeft" ? cur - 1 : cur + 1;
      if (next < 0 || next > 2) return;
      goCol(next);
    },
    [cur, goCol]
  );

  const COL_NAMES: L[] = [
    { ko: "은행이 보는 나", en: "How the bank sees you" },
    { ko: "실제 나", en: "Who you actually are" },
    { ko: "대포통장 명의자의 실제 패턴", en: "What a money-mule holder actually does" },
  ];

  return (
    <section className="screen" role="tabpanel" aria-label={t({ ko: "진단", en: "Diagnosis" })}>
      <span className="eyebrow">{t({ ko: "Step 02 · 진단", en: "Step 02 · Diagnosis" })}</span>
      <h2 className="title">
        {t({
          ko: "은행이 보는 나, 그리고 실제 나",
          en: "How the bank sees you, and who you actually are",
        })}
      </h2>
      <p className="lede">
        {t({
          ko: "같은 사람을 두 가지 방식으로 봅니다. 세 번째는 실제 대포통장 명의자의 행동 패턴입니다.",
          en: "The same person, read two ways. The third column is the actual behaviour of a money-mule account holder.",
        })}
      </p>

      <div
        className="compare"
        ref={trackRef}
        role="group"
        aria-roledescription={t({ ko: "캐러셀", en: "carousel" })}
        aria-label={t({ ko: "세 가지 관점 비교", en: "Three views compared" })}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <div className="col bank" role="group" aria-label={`1/3 ${t({ ko: "은행이 보는 나", en: "How the bank sees you" })}`}>
          <div className="ch">
            <span className="lbl">{t({ ko: "은행이 보는 나", en: "How the bank sees you" })}</span>
            <span className="tagx">{t({ ko: "정적 속성", en: "Static attributes" })}</span>
          </div>
          <ul>
            {persona.bankView.map((x) => (
              <li key={x.ko}>{t(x)}</li>
            ))}
          </ul>
          <div className="foot">
            <span>{t({ ko: "1일 이체한도", en: "Daily transfer limit" })}</span>
            <span>{t({ ko: "1,000,000원", en: "1,000,000 KRW" })}</span>
          </div>
        </div>

        <div className="col real" role="group" aria-label={`2/3 ${t({ ko: "실제 나", en: "Who you actually are" })}`}>
          <div className="ch">
            <span className="lbl">{t({ ko: "실제 나", en: "Who you actually are" })}</span>
            <span className="tagx">{t({ ko: "행동 이력", en: "Behavioural record" })}</span>
          </div>
          <ul>
            {persona.real.map((x) => (
              <li key={x.ko}>{t(x)}</li>
            ))}
          </ul>
          <div className="foot">
            <span>{t({ ko: "심사 반영 여부", en: "Counted in review" })}</span>
            <span>{t({ ko: "반영되지 않음", en: "Not counted" })}</span>
          </div>
        </div>

        <div className="col mule" role="group" aria-label={`3/3 ${t({ ko: "대포통장 명의자의 실제 패턴", en: "What a money-mule holder actually does" })}`}>
          <div className="ch">
            <span className="lbl">
              {t({
                ko: "대포통장 명의자의 실제 패턴",
                en: "What a money-mule holder actually does",
              })}
            </span>
          </div>
          <ul>
            {MULE_PATTERN.map((x) => (
              <li key={x.ko}>{t(x)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="segs" role="group" aria-label={t({ ko: "비교 카드", en: "Comparison cards" })}>
        {COL_NAMES.map((n, i) => (
          <button
            key={n.ko}
            className="seg"
            aria-current={cur === i}
            aria-label={
              lang === "ko" ? `${i + 1}/3 ${t(n)} 보기` : `Show ${i + 1} of 3: ${t(n)}`
            }
            onClick={() => goCol(i)}
          />
        ))}
      </div>

      {/* 겹침 지표와 그 해석을 한 카드로 묶는다.
          숫자를 스탯 타일로 떼어내면 "지금은 0이지만 달라질 수 있다"처럼 읽힌다 —
          문장 안에 넣고, 바로 아래 punch 카피와 스크롤 없이 함께 보이게 한다. */}
      <div className="overlap-card">
        <p className="overlap-line">{t(overlapSentence(persona.real.length, overlap))}</p>

        <div className="punch">
          {lang === "ko" ? (
            <>
              현행 규제는 <b>‘실제 나’와 ‘대포통장 명의자의 실제 패턴’을 구분하지 못하고 둘 다 차단</b>
              합니다. 그리고 통장을 사는 조직은 한도 해제를 기다리지 않습니다 — 이미 계좌를 가진 사람의
              명의를 삽니다.
            </>
          ) : (
            <>
              The current rules <b>cannot tell “who you actually are” from “what a money-mule holder
              actually does”, and block both</b>. Meanwhile the groups buying accounts do not wait for
              a limit to be lifted — they buy the name of someone who already has one.
            </>
          )}
        </div>
      </div>

      <div className="note">
        {lang === "ko" ? (
          <>
            <b>법이 요구하는 것과 실제 운영의 차이.</b> 통신사기피해환급법 제2조의6(2024.8.28
            시행)이 요구하는 것은 <b>“거래 목적의 확인”</b> 한 가지입니다. 그러나 은행 운영은
            3개월치 실적 축적을 요구합니다. 목적을 증명하는 것과 시간을 쌓는 것은 다른 일입니다.
          </>
        ) : (
          <>
            <b>What the law asks for, and what banks actually run.</b> The Telecommunications Fraud
            Refund Act, Article 2-6 (통신사기피해환급법 제2조의6, in force 2024-08-28) asks for one
            thing: <b>confirmation of the purpose of the transaction</b>. Bank operations demand
            three months of accumulated record instead. Proving a purpose and accumulating time are
            different things.
          </>
        )}
      </div>

      {/* 하단 분기 — 탭바는 그대로 두고, 다음 화면으로 가는 두 갈래를 명시한다.
          go() 는 GsbApp 의 화면 상태를 그대로 재사용한다(3 = 경로, 4 = 방어). */}
      <button className="cta" onClick={() => go(3)}>
        {t(FLOW_COPY.diagnoseToRoutes)}
      </button>
      <button className="cta ghost" onClick={() => go(4)}>
        {t(FLOW_COPY.diagnoseToDefend)}
      </button>
    </section>
  );
}
