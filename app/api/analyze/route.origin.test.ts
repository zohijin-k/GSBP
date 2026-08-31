/**
 * Origin 강등 로직 검증 — 실제 Anthropic 호출/크레딧 소모 없이 global.fetch 를 mock 한다.
 *
 * 시나리오: ANTHROPIC_API_KEY 는 더미값으로 "설정된 것처럼" 채운다.
 *   (a) 허용 Origin  → mock fetch 가 1회 호출되고 응답 source 가 "ai"
 *   (b) 비허용 Origin → mock fetch 가 전혀 호출되지 않고 즉시 source "fallback"
 *                       (판정/신호는 규칙 엔진 결과 그대로, AI_GEN flag 없음)
 *   (c) 키가 없으면  → 허용 Origin 이어도 fetch 없이 fallback
 *
 * route.ts 의 originAllowed() / POST() 분기를 그대로 통과시킨다.
 */
import { POST } from "./route";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** 규칙 엔진이 결정론적으로 risk(ACCESS_MEDIUM high + COMPENSATION/SHORT_TERM medium)를 내는 문장 */
const RISKY_TEXT =
  "통장 하나만 빌려주면 30만원 드릴게요. 3일만 쓰고 바로 돌려줄게요.";

function makeRequest(origin: string, ip: string) {
  return new Request("https://gsb.example.com/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ text: RISKY_TEXT, lang: "ko" }),
  });
}

/** Anthropic Messages API 성공 응답 형태(파서가 기대하는 최소 구조) */
function okAnthropicResponse() {
  return {
    ok: true,
    json: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            flags: [
              { q: "01", t: "통장을 빌려달라는 요구입니다." },
              { q: "02", t: "대가를 제시하고 있습니다." },
              { q: "03", t: "짧은 기간만 쓰겠다고 강조합니다." },
            ],
          }),
        },
      ],
      stop_reason: "end_turn",
    }),
  };
}

describe("POST /api/analyze — Origin 강등 (fetch mock)", () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(okAnthropicResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.ANTHROPIC_API_KEY = "sk-ant-dummy-not-a-real-key";
    process.env.GSB_ALLOWED_ORIGINS = "allowed.example.com";
    delete process.env.GSB_MODEL;
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GSB_ALLOWED_ORIGINS;
  });

  it("(a) 허용 Origin → Anthropic 을 1회 호출하고 source:'ai'", async () => {
    const res = await POST(makeRequest("https://allowed.example.com", "10.10.0.1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(ANTHROPIC_URL);
    expect(body.source).toBe("ai");
    expect(body.verdict).toBe("risk");
    expect(body.flags).toHaveLength(3);
  });

  it("(b) 비허용 Origin → Anthropic 호출 없이 즉시 폴백, 판정·신호는 동일", async () => {
    const res = await POST(makeRequest("https://evil.example.com", "10.10.0.2"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.source).toBe("fallback");
    expect(body.verdict).toBe("risk");
    expect(body.signals.length).toBeGreaterThan(0);
    expect(body.flags.length).toBeGreaterThan(0);
    expect(body.flags.some((f: { q: string }) => f.q === "AI_GEN")).toBe(false);
  });

  it("(b') Referer 만 있고 비허용 → 폴백", async () => {
    const req = new Request("https://gsb.example.com/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: "https://evil.example.com/some/path",
        "x-forwarded-for": "10.10.0.5",
      },
      body: JSON.stringify({ text: RISKY_TEXT, lang: "ko" }),
    });
    const body = await (await POST(req)).json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.source).toBe("fallback");
  });

  it("(c) 키가 없으면 허용 Origin 이어도 폴백", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(makeRequest("https://allowed.example.com", "10.10.0.3"));
    const body = await res.json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.source).toBe("fallback");
  });

  it("GSB_ALLOWED_ORIGINS 가 비어 있으면 검사 생략 → 허용 Origin 취급", async () => {
    delete process.env.GSB_ALLOWED_ORIGINS;
    const res = await POST(makeRequest("https://anything.example.com", "10.10.0.4"));
    const body = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.source).toBe("ai");
  });
});
