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
