/**
 * Tests for prompt generation and LLM integration (lib/prompt.ts)
 *
 * These tests ensure:
 * 1. Prompts are correctly built
 * 2. AI signal detection instructions are present
 * 3. Flag parsing works correctly
 * 4. Backward compatibility with existing flag structure
 */

import { buildUserPrompt, parseFlags, SYSTEM_PROMPT, PROMPT_VERSION } from "./prompt";
import { detect } from "./detect";

describe("prompt.ts - Prompt Generation", () => {
  describe("SYSTEM_PROMPT contains AI signal detection", () => {
    it("should include AI-GENERATED SIGNAL DETECTION section", () => {
      expect(SYSTEM_PROMPT).toContain("AI-GENERATED SIGNAL DETECTION");
    });

    it("should mention specific AI patterns to detect", () => {
      // SYSTEM_PROMPT 의 실제 대소문자에 맞춰 대소문자 무시로 비교한다.
      const prompt = SYSTEM_PROMPT.toLowerCase();
      expect(prompt).toContain("excessively smooth multilingual");
      expect(prompt).toContain("over-personalization");
      expect(prompt).toContain("standardized bait phrases");
      expect(prompt).toContain("impersonation of real");
      expect(prompt).toContain("mass distribution pattern");
    });

    it("should instruct LLM to use AI_GEN signal id", () => {
      expect(SYSTEM_PROMPT).toContain("AI_GEN");
    });

    it("should maintain determinism clause", () => {
      expect(SYSTEM_PROMPT).toContain("deterministic rule engine");
      expect(SYSTEM_PROMPT).toContain("do not re-judge");
    });

    it("should maintain safety clause", () => {
      expect(SYSTEM_PROMPT).toContain("NEVER tell the reader a message is");
      expect(SYSTEM_PROMPT).toContain("safe");
    });
  });

  describe("buildUserPrompt with AI signal instructions", () => {
    it("should ask for AI signal detection when signals are present", () => {
      const text = "통장을 빌려주세요";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "ko");
      // user 프롬프트는 영어로 지시되며 AI 보조 신호 요청은 "AI_GEN" 토큰으로 들어간다.
      expect(prompt).toContain("AI_GEN");
      expect(prompt).toContain("AI-generated or AI-assisted attacks");
    });

    it("should ask for AI signal detection when no signals present", () => {
      const text = "안녕하세요";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "ko");
      expect(prompt).toContain("AI_GEN");
    });

    it("should preserve backward compatibility - include all rule signals", () => {
      const text = "통장을 빌려주면 100만원을 드리겠습니다";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "ko");
      expect(prompt).toContain("SIGNALS THE RULE ENGINE MATCHED:");
      for (const signal of signals) {
        expect(prompt).toContain(signal.id);
        expect(prompt).toContain(signal.rule);
      }
    });

    it("should support Korean language", () => {
      const text = "계좌 빌려주세요";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "ko");
      expect(prompt).toContain("한국어");
    });

    it("should support English language", () => {
      const text = "Lend me your account";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "en");
      expect(prompt).toContain("English");
    });

    it("should include the actual message text", () => {
      const text = "이것이 테스트 메시지입니다";
      const { signals, verdict } = detect(text);
      const prompt = buildUserPrompt(text, signals, verdict, "ko");
      expect(prompt).toContain("MESSAGE THE USER RECEIVED:");
      expect(prompt).toContain(text);
    });
  });

  describe("parseFlags - backward compatibility", () => {
    it("should parse valid flag structure", () => {
      const response = '{"flags": [{"q": "01", "t": "This is a warning"}]}';
      const flags = parseFlags(response);
      expect(flags).not.toBeNull();
      expect(flags).toHaveLength(1);
      expect(flags![0].q).toBe("01");
      expect(flags![0].t).toBe("This is a warning");
    });

    it("should parse multiple flags in order", () => {
      const response = JSON.stringify({
        flags: [
          { q: "01", t: "First warning" },
          { q: "02", t: "Second warning" },
          { q: "AI_GEN", t: "This looks AI-generated" },
        ],
      });
      const flags = parseFlags(response);
      expect(flags).toHaveLength(3);
      expect(flags![0].q).toBe("01");
      expect(flags![2].q).toBe("AI_GEN");
    });

    it("should parse AI_GEN signal along with rule-based signals", () => {
      const response = JSON.stringify({
        flags: [
          { q: "01", t: "Rule-based warning 1" },
          { q: "02", t: "Rule-based warning 2" },
          { q: "AI_GEN", t: "AI detection pattern found" },
        ],
      });
      const flags = parseFlags(response);
      expect(flags).not.toBeNull();
      const aiGen = flags!.find((f) => f.q === "AI_GEN");
      expect(aiGen).toBeDefined();
      expect(aiGen!.t).toContain("AI");
    });

    it("should handle missing q field by auto-generating", () => {
      const response = JSON.stringify({
        flags: [{ t: "Warning without q" }, { q: "AI_GEN", t: "AI signal" }],
      });
      const flags = parseFlags(response);
      expect(flags).not.toBeNull();
      expect(flags![0].q).toBe("01");
      expect(flags![1].q).toBe("AI_GEN");
    });

    it("should reject invalid JSON", () => {
      const response = "not valid json";
      const flags = parseFlags(response);
      expect(flags).toBeNull();
    });

    it("should reject empty flags array", () => {
      const response = JSON.stringify({ flags: [] });
      const flags = parseFlags(response);
      expect(flags).toBeNull();
    });

    it("should reject missing flags field", () => {
      const response = JSON.stringify({ other: [] });
      const flags = parseFlags(response);
      expect(flags).toBeNull();
    });

    it("should reject flags that are not array", () => {
      const response = JSON.stringify({ flags: "not an array" });
      const flags = parseFlags(response);
      expect(flags).toBeNull();
    });

    it("should reject flags with missing text", () => {
      const response = JSON.stringify({
        flags: [{ q: "01" }], // missing 't' field
      });
      const flags = parseFlags(response);
      expect(flags).toBeNull();
    });

    it("should strip HTML tags from parsed text", () => {
      const response = JSON.stringify({
        flags: [
          { q: "01", t: "This has <b>bold</b> and <script>attack</script> text" },
        ],
      });
      const flags = parseFlags(response);
      expect(flags).not.toBeNull();
      expect(flags![0].t).not.toContain("<");
      expect(flags![0].t).not.toContain(">");
      expect(flags![0].t).toContain("bold");
      expect(flags![0].t).not.toContain("script");
    });

    it("should trim whitespace from text", () => {
      const response = JSON.stringify({
        flags: [{ q: "01", t: "  spaced text  " }],
      });
      const flags = parseFlags(response);
      expect(flags![0].t).toBe("spaced text");
    });
  });

  describe("PROMPT_VERSION", () => {
    it("should have a version string", () => {
      expect(PROMPT_VERSION).toBeTruthy();
      expect(typeof PROMPT_VERSION).toBe("string");
    });

    it("should be updated for AI signal addition", () => {
      // Version should be after 2026-08-31 when AI signals were added
      expect(PROMPT_VERSION).toBe("2026-08-31.1");
    });
  });
});
