"use client";

/**
 * GSB — 이중 언어 (ko / en)
 *
 * 원칙
 *  - L 타입은 ko/en 둘 다 필수다. optional로 두면 번역 누락이 런타임까지 살아남는다.
 *    타입스크립트가 컴파일 시점에 잡게 하는 것이 이 파일의 목적이다.
 *  - 영문 카피는 UI 번역이 아니라 "은행 창구에서 실제로 통하는" 문장이어야 한다.
 *    창구에서 말하거나 검색해야 하는 고유명사는 첫 등장에 한국어를 괄호로 남긴다.
 */

import { createContext, useContext, useSyncExternalStore } from "react";

export type Lang = "ko" | "en";
export type L = { ko: string; en: string };

export const tr = (s: L, lang: Lang) => s[lang];

export const LANGS: Lang[] = ["ko", "en"];
const STORE_KEY = "gsb.lang";

/** localStorage 접근은 사파리 프라이빗 모드 등에서 throw 한다. 실패하면 기본값 ko. */
function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORE_KEY) === "en" ? "en" : "ko";
  } catch {
    /* storage 사용 불가 — 기본값으로 처리 */
  }
  return "ko";
}

function writeStoredLang(lang: Lang) {
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* storage 사용 불가 — 저장 생략 */
  }
}

/**
 * 언어는 localStorage라는 외부 저장소가 원본이므로 useSyncExternalStore로 구독한다.
 * useState + useEffect 로 읽으면 (a) 서버 렌더와 첫 클라이언트 렌더가 어긋나 hydration이 깨지거나
 * (b) effect 안에서 setState 하여 연쇄 렌더가 발생한다. 서버 스냅샷은 항상 "ko".
 */
let snapshot: Lang | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): Lang {
  if (snapshot === null) snapshot = readStoredLang();
  return snapshot;
}

function getServerSnapshot(): Lang {
  return "ko";
}

export function setLang(lang: Lang) {
  if (snapshot === lang) return;
  snapshot = lang;
  writeStoredLang(lang);
  listeners.forEach((fn) => fn());
}

/** 앱 최상단(GsbApp)에서 한 번만 호출한다. 하위 컴포넌트는 useLang()을 쓴다. */
export function useLangState(): Lang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const LangContext = createContext<LangValue>({ lang: "ko", setLang });

export function useLang() {
  const ctx = useContext(LangContext);
  return { lang: ctx.lang, setLang: ctx.setLang, t: (s: L) => s[ctx.lang] };
}

/* =========================================================
   플로우 재구성용 카피 (초안)
   -------------------------------------------------------
   화면 사이를 잇는 CTA 문구는 여기 한 곳에서만 고친다.
   화면 컴포넌트는 이 객체를 참조할 뿐 문자열을 인라인하지 않는다.
   ========================================================= */
export const FLOW_COPY = {
  /** Onboard: 체류자격 판정(가능/조건부/불가) 결과 아래 → 진단 화면 */
  onboardToDiagnose: {
    ko: "왜 이런 결과인지 보기",
    en: "See why",
  },
  /** Diagnose 하단 분기 ① → 경로 탭 */
  diagnoseToRoutes: {
    ko: "지금 가능한 경로 보기",
    en: "See the routes open to you now",
  },
  /** Diagnose 하단 분기 ② → 방어 탭 */
  diagnoseToDefend: {
    ko: "혹시 이런 제안을 받았다면",
    en: "Got a message like this?",
  },
} satisfies Record<string, L>;

/**
 * 겹침 지표 문장. 숫자를 문장 안에 넣어 별도 스탯 타일처럼 보이지 않게 한다.
 * total·overlap 은 Diagnose 에서 계산한 값을 그대로 받는다(로직은 그쪽에 있다).
 */
export const overlapSentence = (total: number, overlap: number): L => ({
  ko: `은행의 해제 기준이 요구하지 않는 ‘실제 나’ ${total}개 항목 가운데, 대포통장 명의자의 행동과 겹치는 항목은 ${overlap}개입니다.`,
  en: `${total} facts prove who they actually are — none of them required by the bank’s own criteria. ${overlap} of them overlap with how a money-mule account behaves.`,
});
