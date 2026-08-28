"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { SCREENS } from "@/lib/data";
import { useLang } from "@/lib/i18n";

const ICONS: Record<number, ReactNode> = {
  1: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2.5" />
      <path d="M14 10h5M14 14h3" />
    </>
  ),
  2: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  3: (
    <>
      <path d="M4 18V6M4 6l8 4-8 4" />
      <path d="M20 6v12M20 18l-8-4 8-4" />
    </>
  ),
  4: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

export default function TabBar({ screen, go }: { screen: number; go: (n: number) => void }) {
  const { t } = useLang();
  const navRef = useRef<HTMLElement>(null);

  /** tablist 는 좌우 화살표로 이동한다. 포커스는 선택된 탭 하나만 받는다(roving tabindex). */
  function onKey(e: KeyboardEvent<HTMLElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const last = SCREENS.length;
    let next = screen;
    if (e.key === "ArrowLeft") next = screen === 1 ? last : screen - 1;
    else if (e.key === "ArrowRight") next = screen === last ? 1 : screen + 1;
    else if (e.key === "Home") next = 1;
    else next = last;
    go(next);
    navRef.current?.querySelectorAll<HTMLButtonElement>(".tab")[next - 1]?.focus();
  }

  return (
    <nav
      className="tabs"
      role="tablist"
      ref={navRef}
      aria-label={t({ ko: "화면", en: "Screens" })}
      onKeyDown={onKey}
    >
      {SCREENS.map((s) => (
        <button
          key={s.id}
          className="tab"
          role="tab"
          aria-selected={screen === s.id}
          tabIndex={screen === s.id ? 0 : -1}
          onClick={() => go(s.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {ICONS[s.id]}
          </svg>
          <span>{t(s.name)}</span>
        </button>
      ))}
    </nav>
  );
}
