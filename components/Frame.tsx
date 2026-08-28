"use client";

/**
 * 디바이스 프레임 바깥의 설명 문구(데스크톱에서만 보인다).
 * GsbApp의 Context 바깥이라 언어 저장소를 직접 구독한다 — 값은 동일한 원본을 본다.
 */

import { useLangState, type L } from "@/lib/i18n";

const CAPTIONS: { k: string; v: L }[] = [
  {
    k: "Source",
    v: {
      ko: "은행 요건은 각 은행 공식 FAQ·공지·상품안내에서 수집했으며, 출처 등급을 화면에 표기합니다.",
      en: "Bank requirements were collected from each bank's official FAQ, notices and product pages; the source grade is shown on screen.",
    },
  },
  {
    k: "Demo",
    v: {
      ko: "등록증은 데모용 목업이며 실제 신분증이 아닙니다. OCR·판정은 프리셋 데이터로 시연됩니다.",
      en: "The residence card is a demo mock-up, not a real identity document. OCR and assessment run on preset data.",
    },
  },
  {
    k: "Caution",
    v: {
      ko: "법정형 등 일부 조문은 국가법령정보센터 원문 확인이 필요합니다.",
      en: "Some provisions, including statutory penalties, still need checking against the original text at the Korea Law Information Center.",
    },
  },
];

export function BrandBar() {
  const lang = useLangState();
  return (
    <div className="brandbar">
      <span className="mark">GSB</span>
      <span className="desc">
        {lang === "ko" ? "Good Standing Bridge · 프로토타입" : "Good Standing Bridge · prototype"}
      </span>
    </div>
  );
}

export function Caption() {
  const lang = useLangState();
  return (
    <div className="caption">
      {CAPTIONS.map((c) => (
        <div className="row" key={c.k}>
          <span className="k">{c.k}</span>
          <span>{c.v[lang]}</span>
        </div>
      ))}
    </div>
  );
}
