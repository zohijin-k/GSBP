"use client";

import { useCallback, useMemo, useState } from "react";
import { PERSONAS, SCREENS, type Persona } from "@/lib/data";
import { LANGS, LangContext, setLang, tr, useLangState } from "@/lib/i18n";
import TabBar from "./TabBar";
import Onboard from "./screens/Onboard";
import Diagnose from "./screens/Diagnose";
import Routes from "./screens/Routes";
import Defend from "./screens/Defend";

export default function GsbApp() {
  const [screen, setScreen] = useState<number>(1);
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [scanned, setScanned] = useState(false);
  /** 언어는 localStorage가 원본이라 외부 저장소로 구독한다. 저장 실패 시 기본값 "ko". */
  const lang = useLangState();

  const title = useMemo(() => {
    const s = SCREENS.find((x) => x.id === screen);
    return s ? tr(s.name, lang) : "";
  }, [screen, lang]);

  const go = useCallback((n: number) => {
    setScreen(n);
    const vp = document.getElementById("viewport");
    if (vp) vp.scrollTop = 0;
  }, []);

  const choosePersona = useCallback((p: Persona) => {
    setPersona(p);
  }, []);

  const ctx = useMemo(() => ({ lang, setLang }), [lang]);

  return (
    <LangContext.Provider value={ctx}>
      <div className="device" lang={lang}>
        <div className="statusbar">
          <span>{title}</span>
          <div className="langtoggle" role="group" aria-label={lang === "ko" ? "언어" : "Language"}>
            {LANGS.map((l) => (
              <button
                key={l}
                className="langbtn"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="viewport" id="viewport">
          {screen === 1 && (
            <Onboard
              persona={persona}
              onPersona={choosePersona}
              scanned={scanned}
              onScanned={() => setScanned(true)}
              go={go}
            />
          )}
          {screen === 2 && <Diagnose persona={persona} go={go} />}
          {screen === 3 && <Routes persona={persona} go={go} />}
          {screen === 4 && <Defend />}
        </div>

        <TabBar screen={screen} go={go} />
      </div>
    </LangContext.Provider>
  );
}
