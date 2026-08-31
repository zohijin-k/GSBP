"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COORDS, PERSONAS, type Persona } from "@/lib/data";
import { FLOW_COPY, useLang } from "@/lib/i18n";

interface Props {
  persona: Persona;
  onPersona: (p: Persona) => void;
  scanned: boolean;
  onScanned: () => void;
  go: (n: number) => void;
}

export default function Onboard({ persona, onPersona, scanned, onScanned, go }: Props) {
  const { t } = useLang();
  const [scanning, setScanning] = useState(false);
  const timer = useRef<number | null>(null);
  const coords = COORDS[persona.status];

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** 언마운트 시 타이머 정리 — 사라진 컴포넌트에 setState 하지 않도록 */
  useEffect(() => clear, []);

  /** 스캔 중 카드나 버튼을 탭하면 애니메이션을 기다리지 않고 즉시 완료한다. */
  const finish = useCallback(() => {
    clear();
    setScanning(false);
    onScanned();
  }, [onScanned]);

  function scan() {
    // 모션을 줄이도록 설정한 사용자에게는 애니메이션 없이 바로 결과를 보여준다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onScanned();
      return;
    }
    setScanning(true);
    timer.current = window.setTimeout(finish, 1600);
  }

  return (
    <section className="screen" role="tabpanel" aria-label={t({ ko: "시작", en: "Start" })}>
      <span className="eyebrow">{t({ ko: "Step 01 · 신분 인식", en: "Step 01 · Identity" })}</span>
      <h2 className="title">
        {t({
          ko: "당신의 금융 좌표를 먼저 확인합니다",
          en: "First, find out where you stand financially",
        })}
      </h2>
      <p className="quiet">
        {t({
          ko: "한국의 은행은 당신의 비자 코드와 남은 체류기간으로 무엇을 할 수 있는지 정합니다. 그런데 그 기준을 당신의 언어로 알려주는 곳은 없습니다.",
          en: "Korean banks decide what you are allowed to do from your visa code and the time left on your stay. Nowhere are those rules written in your language.",
        })}
      </p>

      <h3 className="sub">{t({ ko: "데모용 프로필 선택", en: "Choose a demo profile" })}</h3>
      <div className="personas">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className="persona"
            aria-pressed={p.id === persona.id}
            onClick={() => onPersona(p)}
          >
            <span className="flag">{p.code}</span>
            <span>
              <span className="nm">{t(p.name)}</span>
              <br />
              <span className="mt">{t(p.meta)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={`cardwrap${scanning ? " scanning" : ""}`}>
        <div className="idcard">
          <div className="demo-stamp">DEMO</div>
          <div>
            <span className="hd">
              {t({ ko: "외국인등록증 · RESIDENCE CARD", en: "RESIDENCE CARD · 외국인등록증" })}
            </span>
            <div className="no">{persona.cardNo}</div>
          </div>
          <dl className="rows">
            <dt>NAME</dt>
            <dd>{t(persona.name).replace(/\s*\(.*\)/, "").toUpperCase()}</dd>
            <dt>COUNTRY</dt>
            <dd>{persona.country}</dd>
            <dt>STATUS</dt>
            <dd>{persona.status}</dd>
          </dl>
          <div className="scanline" />
        </div>
        {scanning && (
          <button
            className="skipcard"
            onClick={finish}
            aria-label={t({ ko: "인식 건너뛰기", en: "Skip the scan" })}
          />
        )}
      </div>

      {!scanned && (
        <button className="cta" onClick={scanning ? finish : scan}>
          {scanning
            ? t({ ko: "인식 중… 탭하면 건너뜁니다", en: "Reading… tap to skip" })
            : t({ ko: "등록증 인식하기", en: "Scan the card" })}
        </button>
      )}

      {scanned && (
        <>
          <div className="extracted">
            <div className="eh">{t({ ko: "추출 완료 · Vision OCR", en: "Extracted · Vision OCR" })}</div>
            <div className="exrow">
              <span className="k">{t({ ko: "체류자격", en: "Residence status" })}</span>
              <span className="v">
                {t(persona.visa)}
                <small>{t(persona.visaSub)}</small>
              </span>
            </div>
            <div className="exrow">
              <span className="k">{t({ ko: "잔여 체류기간", en: "Time left on stay" })}</span>
              <span className="v">{t(persona.remain)}</span>
            </div>
            <div className="exrow">
              <span className="k">{t({ ko: "입국 후 경과", en: "Time since arrival" })}</span>
              <span className="v">{t(persona.since)}</span>
            </div>
            <div className="exrow">
              <span className="k">{t({ ko: "계좌 상태", en: "Account status" })}</span>
              <span className="v">
                {t({ ko: "한도제한계좌", en: "Limited-transaction account (한도제한계좌)" })}
                <small>
                  {t({
                    ko: "창구 300만 / ATM 100만 / 이체 100만",
                    en: "Teller 3,000,000 KRW / ATM 1,000,000 KRW / transfer 1,000,000 KRW",
                  })}
                </small>
              </span>
            </div>
          </div>

          <h3 className="sub">
            {t({
              ko: "이 체류자격으로 지금 할 수 있는 것",
              en: "What this residence status allows",
            })}
          </h3>
          <div className="coords">
            <div className="coord now">
              <span className="ct">{t({ ko: "지금 가능", en: "Available now" })}</span>
              <ul>
                {coords.now.map((x) => (
                  <li key={x.ko}>{t(x)}</li>
                ))}
              </ul>
            </div>
            <div className="coord soon">
              <span className="ct">
                {t({ ko: "조건 충족 시 가능", en: "Available once conditions are met" })}
              </span>
              <ul>
                {coords.soon.map((x) => (
                  <li key={x.ko}>{t(x)}</li>
                ))}
              </ul>
            </div>
            <div className="coord never">
              <span className="ct">
                {t({ ko: "이 체류자격으로는 불가", en: "Not available on this status" })}
              </span>
              <ul>
                {coords.never.map((x) => (
                  <li key={x.ko}>{t(x)}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 체류자격 판정 결과 → 진단 화면으로 넘어가는 명시적 CTA.
              문구는 lib/i18n.ts 의 FLOW_COPY.onboardToDiagnose 에서 고친다. */}
          <button className="cta" onClick={() => go(2)}>
            {t(FLOW_COPY.onboardToDiagnose)}
          </button>
        </>
      )}
    </section>
  );
}
