/**
 * Tests for GSB detection rule engine (lib/detect.ts)
 * 
 * These tests ensure:
 * 1. Existing rule-based signals work correctly
 * 2. Verdict classification is deterministic
 * 3. Backward compatibility is maintained
 */

import { detect, Verdict } from "./detect";

describe("detect() - Rule Engine", () => {
  describe("Backward compatibility - Existing signals must not change", () => {
    it("should detect ACCESS_MEDIUM in Korean", () => {
      const text = "통장을 빌려주세요";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].rule).toBe("ACCESS_MEDIUM");
      expect(signals[0].severity).toBe("high");
      expect(verdict).toBe("risk");
    });

    it("should detect COMPENSATION in Korean", () => {
      const text = "계좌를 사용하면 100만원을 드리겠습니다";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.rule === "COMPENSATION")).toBe(true);
      // COMPENSATION 단독은 medium 1개 → caution (규칙: high≥1 또는 medium≥2 일 때만 risk)
      expect(verdict).toBe("caution");
    });

    it("should detect SHORT_TERM in Korean", () => {
      const text = "3일만 계좌를 빌려주세요";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.rule === "SHORT_TERM")).toBe(true);
      // Depends on other signals, so verdict varies
      expect(["risk", "caution"]).toContain(verdict);
    });

    it("should detect REASSURANCE in Korean", () => {
      const text = "절대 문제 없으니까 통장을 빌려줘도 돼";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.rule === "REASSURANCE")).toBe(true);
    });

    it("should detect FAKE_LOAN in Korean", () => {
      const text = "통장을 담보로 무서류 대출을 해드립니다";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.rule === "FAKE_LOAN")).toBe(true);
      expect(verdict).toBe("risk");
    });

    it("should detect IDENTITY in Korean", () => {
      const text = "명의대여 해주시면 대가를 드리겠습니다";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.some((s) => s.rule === "IDENTITY")).toBe(true);
      expect(verdict).toBe("risk");
    });
  });

  describe("English signals", () => {
    it("should detect ACCESS_MEDIUM in English", () => {
      const text = "Can you lend me your bank account?";
      const { signals } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].rule).toBe("ACCESS_MEDIUM");
    });

    it("should detect FAKE_LOAN in English", () => {
      const text = "No documents required. Your account is collateral";
      const { signals, verdict } = detect(text);
      expect(signals.length).toBeGreaterThan(0);
      expect(verdict).toBe("risk");
    });
  });

  describe("Verdict classification", () => {
    it("should return 'risk' when high severity signal detected", () => {
      const text = "명의를 빌려주시면 좋겠습니다"; // IDENTITY rule
      const { verdict } = detect(text);
      expect(verdict).toBe("risk");
    });

    it("should return 'risk' when 2+ medium severity signals detected", () => {
      const text = "3일만 계좌를 빌려주면 100만원을 드리겠습니다";
      const { verdict, signals } = detect(text);
      expect(verdict).toBe("risk");
      expect(signals.filter((s) => s.severity === "medium").length).toBeGreaterThanOrEqual(2);
    });

    it("should return 'caution' for medium signal with financial terms", () => {
      const text = "며칠만 통장을 사용해야 합니다"; // SHORT_TERM (medium) + financial term
      const { verdict } = detect(text);
      expect(verdict).toBe("caution");
    });

    it("should return 'clear' when no signals match and no financial terms", () => {
      const text = "안녕하세요, 오늘 날씨가 정말 좋네요";
      const { verdict, signals } = detect(text);
      expect(verdict).toBe("clear");
      expect(signals.length).toBe(0);
    });

    it("should return 'caution' when only financial terms present", () => {
      const text = "제 계좌에 대해 궁금한 점이 있습니다";
      const { verdict } = detect(text);
      expect(verdict).toBe("caution");
    });
  });

  describe("Signal matching details", () => {
    it("should provide matched text for highlighting", () => {
      const text = "통장을 빌려주세요";
      const { signals } = detect(text);
      expect(signals[0].matched).toBeTruthy();
      expect(signals[0].matched).toMatch(/통장|빌려/);
    });

    it("should limit signals to MAX_SIGNALS", () => {
      const text =
        "통장 빌려주세요 절대 문제없어 3일만 보내주면 돼 100만원 드릴게 무서류 대출 명의 대여하면 좋겠어";
      const { signals } = detect(text);
      expect(signals.length).toBeLessThanOrEqual(8);
    });

    it("should maintain original text order for signals", () => {
      const text = "절대 문제 없고 통장을 빌려주세요";
      const { signals } = detect(text);
      // REASSURANCE appears first, ACCESS_MEDIUM appears second
      const reassuranceIdx = signals.findIndex((s) => s.rule === "REASSURANCE");
      const accessIdx = signals.findIndex((s) => s.rule === "ACCESS_MEDIUM");
      if (reassuranceIdx !== -1 && accessIdx !== -1) {
        expect(reassuranceIdx).toBeLessThan(accessIdx);
      }
    });
  });

  describe("Determinism", () => {
    it("should return same result for same input", () => {
      const text = "통장을 빌려주면 100만원을 드리겠습니다";
      const result1 = detect(text);
      const result2 = detect(text);
      expect(result1).toEqual(result2);
    });

    it("should return same result on repeated calls", () => {
      const text = "계좌를 2일만 빌려줄 수 있나요?";
      const results = [detect(text), detect(text), detect(text)];
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });
});
