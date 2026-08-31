# AI-Generated Attack Signal Detection - Feature Specification

## Feature ID
GSB-2026-08-31: AI-Generated Attack Signal Detection

## Description
Enhances the Defend feature to detect messages that exhibit patterns of AI-generated or AI-assisted attacks beyond pattern-matching rules.

## Scope
- Applies to POST /api/analyze endpoint
- Supplementary to existing verdict (risk/caution/clear)
- Optional signal - only present when LLM detects patterns

## Detection Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| Multilingual Fluency | Unnaturally perfect translation/localization | Korean message reads too polished for casual message |
| Hyper-Personalization | Targeted based on specific user circumstances | Message correctly identifies visa type, salary bracket |
| Templated Phrases | Standardized bait phrases in formulaic patterns | "no documents required, just passbook as collateral" |
| Institutional Tone | Real financial institution with polished language | Bank name + unnaturally professional writing style |
| Mass Distribution | Evidence of bulk sending | Generic urgency, "others doing this" language |

## Signal Identifier
- **ID**: `AI_GEN`
- **Type**: Supplementary/Optional
- **Severity**: Information-level (doesn't affect verdict)

## Response Format

### When AI-Generated Pattern Detected (AI Mode)
```json
{
  "flags": [
    {"q": "01", "t": "Rule-based warning..."},
    {"q": "AI_GEN", "t": "Message pattern suggests AI generation: [reason]"}
  ],
  "source": "ai"
}
```

### When Pattern Not Detected or Fallback Mode
```json
{
  "flags": [
    {"q": "01", "t": "Rule-based warning..."}
  ],
  "source": "fallback"
}
```

## Technical Requirements

1. **Backward Compatibility**
   - Existing signals unchanged
   - Response schema extended only
   - Fallback behavior identical

2. **Determinism**
   - Verdict unchanged from AI signal analysis
   - AI signal is supplementary only
   - Rule engine verdict final

3. **Privacy**
   - No additional logging of message content
   - No message persistence
   - AI analysis via Anthropic API only

4. **Availability**
   - Present only with `source: "ai"`
   - Omitted when `source: "fallback"`
   - No fallback for AI signals

## Testing Checklist

- [x] Rule engine signals unchanged
- [x] Verdict classification unchanged
- [x] Response schema backward compatible
- [x] AI signals only in AI mode
- [x] Fallback gracefully omits AI signals
- [x] Flag parsing handles AI_GEN
- [x] TypeScript compilation clean
- [x] No new dependencies
- [x] No environment variable changes

## Deployment

### Version
- PROMPT_VERSION: 2026-08-31.1

### Environment
- No new variables required
- Works with existing GSB_MODEL and ANTHROPIC_API_KEY
- Automatic when API available

### Rollback
- No database migrations
- Automatic fallback if ANTHROPIC_API_KEY unavailable
- No client-side changes required

## Usage Examples

### Example 1: AI-Generated Phishing (Korean)
```
Input: "안녕하세요 김철수님, 지난달 체류자격 갱신 비용으로 임시 계좌 필요하신데요. 
        2일만 사용하면 되고 서류 없이 대출가능하면 좋겠는데요. 500만원 대출 가능하신가요?"

Response includes:
- q: "01", t: "[Rule-based warning about account request]"
- q: "02", t: "[Rule-based warning about documents]"  
- q: "03", t: "[Rule-based warning about compensation]"
- q: "AI_GEN", t: "Message shows AI generation patterns: extremely precise 
                     personalization (visa category, exact individual name) 
                     and multilingual communication structure"
```

### Example 2: Simple Phishing (No AI Patterns)
```
Input: "통장 빌려줄래?"

Response includes:
- q: "01", t: "[Rule-based warning about account request]"
(No AI_GEN signal - too simple, clearly human-written)
```

### Example 3: Legitimate Message
```
Input: "안녕하세요, 계좌 이체 관련 질문이 있습니다."

Response:
- source: "fallback" or "ai" (depending on API availability)
- No AI_GEN signal detected
- Verdict: "caution" (financial term present but no danger signals)
```

## Success Metrics

1. **Accuracy**: LLM correctly identifies AI patterns with <10% false positive rate
2. **Performance**: <100ms latency increase per request
3. **Reliability**: 99.9% uptime with fallback
4. **Usability**: AI signals improve user detection of sophisticated attacks
5. **Maintainability**: No impact on existing rule engine or fallback

## Future Roadmap

1. **Phase 2**: Confidence scoring for each pattern
2. **Phase 3**: Per-pattern configuration
3. **Phase 4**: Multi-language AI analysis
4. **Phase 5**: Temporal pattern analysis (tracking AI campaigns)

## Notes

- AI signal is supplementary; does not change verdict determination
- Requires `ANTHROPIC_API_KEY` environment variable
- Automatic fallback if API unavailable
- Compatible with all existing deployment configurations
