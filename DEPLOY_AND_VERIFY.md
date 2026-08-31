# GSB — 배포 & 검증 런북

작성 기준: 2026-08-31 (테스트 보강 후 갱신). 로컬 검증까지 완료, **Vercel 배포는 로그인 필요로 보류**(아래 4단계).

---

## 0. 현재까지 완료된 것 (실 API 키 없이 검증 가능한 범위)

| 항목 | 상태 | 근거 |
|---|---|---|
| 의존성 설치 · 프로덕션 빌드 | ✅ | `npm install` → `npx next build` 성공 (TypeScript 통과) |
| Jest 러너 설정 | ✅ | `jest.config.js`(`next/jest`, node 환경), `npm test` |
| 전체 테스트 | ✅ **64/64 통과** (`npm test`) | 아래 5장 |
| Origin 강등 로직 테스트 (신규) | ✅ 5/5 통과 | `app/api/analyze/route.origin.test.ts` — `global.fetch` mock, 크레딧 소모 없음 |
| COMPENSATION 정규식 `드리겠` 보강 | ✅ | `lib/detect.ts` — 데모 예시 1~3 verdict 회귀 없음(2장) |
| `AI_SIGNAL_UNAVAILABLE` 처리 | ✅ 확정: **(a) 폴백에서 AI_GEN 생략** | 상수 제거, `lib/detect.ts` 주석으로 근거 명시 (아래 3장) |
| 규칙 엔진 + 폴백 경로 실서버 동작 | ✅ 로컬 `next start` + 실제 HTTP 호출로 확인 | 아래 2장 응답 예시 |
| API 오류 처리(400/405/429) | ✅ | 아래 2장 |
| `source:"ai"` / 언어일치(LLM) / Origin 실측 강등 | ⛔ 실 API 키 필요 — 미검증 | 아래 6장 체크리스트 |

---

## 1. 검증 스크립트

```bash
# 로컬(먼저 npm run build && npx next start 필요) 또는 배포 URL 모두 동일
node scripts/verify-api.mjs http://localhost:3000
node scripts/verify-api.mjs https://<배포도메인>
node scripts/verify-api.mjs https://<배포도메인> --origin https://<배포도메인>
```

각 샘플의 `verdict / source / signals(rule) / flags 수 / promptVersion`을 출력하고,
verdict·rule 기대값과 다르면 `[MISMATCH]`로 표시합니다. (`--origin` 미지정 시 Origin 헤더 없음)

> **Windows 주의**: `curl -d "한글..."`은 Git Bash에서 인코딩이 깨져 규칙이 안 걸립니다
> (verdict가 전부 clear로 나옴). 반드시 이 스크립트를 쓰거나 `curl --data-binary @파일.json`을 쓰세요.

---

## 2. 로컬 실서버 동작 확인 결과 (2026-08-31, `next start`, 키 없음 → `source:"fallback"`)

| 입력 | verdict | signals (rule) | flags | source |
|---|---|---|---|---|
| `형님 통장 하나만 빌려주면 30만원 드려요. 10일만 쓰고 바로 돌려드립니다. 절대 문제 없어요` | `risk` | ACCESS_MEDIUM(high, "통장 하나만 빌려"), COMPENSATION(medium, "30만원 드려"), SHORT_TERM(medium, "10일만"), REASSURANCE(medium, "절대 문제 없") | 규칙별 안내 4문장 | fallback |
| `재직증명서 없어도 대출 가능합니다. 신용조회 안 하고 당일 입금. 담보는 통장이면 됩니다` | `risk` | FAKE_LOAN×3 (high, "신용조회 안" / "당일 입금" / "담보는 통장") | 대출 가장 안내 1문장(규칙 단위 중복 제거) | fallback |
| `[OO은행] 고객님이 신청하신 금융거래한도 해제 심사 결과를 안내드립니다. 영업점 방문 없이 앱에서 확인해 주세요` | `caution` | (없음 — 금융 어휘 "금융거래한도"로 caution 승격) | NO_SIGNAL_COPY 1문장 | fallback |
| `내일 3시에 학교 앞에서 만나요` | `clear` | (없음) | NO_SIGNAL_COPY 1문장 | fallback |
| `Lend me your bank account for 3 days and I'll pay you 500,000 KRW. No problem at all.` (`lang:"en"`) | `risk` | ACCESS_MEDIUM, SHORT_TERM, COMPENSATION, REASSURANCE | **영문** 규칙 폴백 문장 4개 | fallback |

오류 처리: 빈 텍스트 → `400 {"error":"empty_text"}` · 잘못된 JSON → `400 {"error":"invalid_json"}` ·
1000자 초과 → `400 {"error":"text_too_long"}` · `GET /api/analyze` → `405` · 동일 IP 분당 21번째 요청부터 → `429 {"error":"rate_limited"}` (20회까지 200).

> 폴백 경로의 **한/영 언어 전환은 검증됨** — 위 English 케이스가 `RULE_FALLBACK[].en` 문장을 반환.
> LLM 경로(`source:"ai"`)의 언어일치만 미검증(6장).

---

## 3. AI_SIGNAL_UNAVAILABLE 처리 방식 — 확정: (a) 폴백에서 AI_GEN 생략

**결정**: 폴백 응답에서 AI_GEN 신호를 별도 문구 없이 그대로 생략한다. `AI_SIGNAL_UNAVAILABLE` 상수는 제거.

**이유**
1. `flags[]`는 "판정 근거"를 담는 자리다. AI_GEN은 verdict에 영향이 없는 **보조 정보**이므로,
   "AI 판별 불가"라는 메타 안내를 가짜 flag로 끼워 넣으면 실제 경고 문장과 뒤섞여 오히려 흐려진다.
2. 폴백으로 내려갔다는 사실은 방어 화면(`Defend.tsx`)이 이미 별도 배너로 표시한다
   ("AI 설명 생성이 일시적으로 불가하여 기본 안내를 표시합니다"). 중복 안내가 된다.
3. 사용자의 안전 판단(위험/보류/무관)에 필요한 정보는 폴백에서도 전부 제공된다 —
   AI_GEN이 빠져도 결정에 지장 없음. 조용한 생략이 "우리가 확인했다고 주장하지 않는" 정직한 태도.
4. `fallbackFlags()`가 순수 규칙 파생으로만 유지되어 로직이 단순하다.

**구현**: `lib/detect.ts`의 `WEAK_SIGNAL_COPY` 아래 주석 블록으로 근거 고정. 동작 코드 변경 없음
(현재도 AI_GEN은 LLM이 반환할 때만 노출되고 폴백엔 원래 없음). 문서 3종(`AI_SIGNAL_IMPLEMENTATION.md`,
`CHANGES_QUICK_REFERENCE.md`) 갱신.

향후 (b)안("AI 판별 불가"를 명시)로 바꾸려면 약 5줄이면 복구 가능하나, 현재는 불필요.

---

## 4. Vercel 배포 (사람이 실행해야 하는 단계)

> **자동 진행 불가 사유**: `vercel` CLI가 로그아웃 상태이고 `vercel login`은 브라우저/이메일 인증이
> 필요한 대화형 절차다. 아래를 직접 실행한 뒤, 나온 URL을 알려주면 기능명세서 3·5번을 채운다.

### 4-1. 로그인 & 최초 배포 (키 없이 = 폴백 전용)

```bash
npx vercel login            # 이메일 인증
npx vercel link             # 프로젝트 연결(최초 1회) — 새 프로젝트로 생성
npx vercel --prod           # 최초 프로덕션 배포 → 도메인 확보 (예: gsb-onit.vercel.app)
```

### 4-2. 환경변수 설정 (Project Settings → Environment Variables, Production)

| 이름 | 지금 값 | 비고 |
|---|---|---|
| `ANTHROPIC_API_KEY` | **설정하지 않음** | 결제 완료 후 6장에서 추가 |
| `GSB_MODEL` | `claude-opus-5` | 기본값과 동일하지만 명시해 둠 |
| `GSB_ALLOWED_ORIGINS` | `<4-1에서 나온 도메인>` (예: `gsb-onit.vercel.app`) | 커스텀 도메인 쓰면 콤마로 함께 |
| `NEXT_PUBLIC_SITE_URL` | `https://<4-1에서 나온 도메인>` | metadata/OG 절대 URL용 |

CLI로 넣어도 됨:
```bash
printf 'gsb-onit.vercel.app'          | npx vercel env add GSB_ALLOWED_ORIGINS production
printf 'https://gsb-onit.vercel.app'  | npx vercel env add NEXT_PUBLIC_SITE_URL production
printf 'claude-opus-5'                | npx vercel env add GSB_MODEL production
```

### 4-3. 환경변수 반영 재배포 & 확인

```bash
npx vercel --prod
node scripts/verify-api.mjs https://<도메인>            # 5케이스 verdict/rule 일치 확인 (source=fallback 예상)
```

브라우저로 `https://<도메인>` 접속 → 하단 탭 ④(방어) → 예시 메시지 3종 클릭 →
verdict/하이라이트/설명 문장/법조문까지 뜨는지 확인. `source:"fallback"` 배너가 보이는 게 정상.

### 4-4. 필수 후속 (README에도 있음)

- Anthropic 콘솔에서 **월 지출 한도** 설정 — Origin 헤더는 위조 가능하므로 이게 최후 방어선.
- 제출 URL은 2026-09-07 11:00 ~ 09-11 23:59 내내 접속 가능해야 함. 배포 후 모바일·데스크톱 각각 확인.

---

## 5. 테스트 실행 결과 (정확히)

`npm test` → **Test Suites: 4 passed / Tests: 64 passed, 0 failed** (신규 origin 테스트 5개 포함).

> 이력: 최초 실행 시 4건 실패(`detect.test.ts` 2, `prompt.test.ts` 2). 아래 5-2·5-3에서 처리 완료.

### 5-1. `app/api/analyze/route.test.ts` — 전부 통과 (단, 실효성 제한적)
모든 `it`이 **테스트 파일 안에 직접 쓴 목(mock) 객체 리터럴**에 대해 `toHaveProperty` 등을 검사한다.
실제 `route.ts`를 import 하지도, 호출하지도 않는다. → "응답 스키마는 이런 모양이어야 한다"는
**명세 문서 수준이며 회귀 방지 효과는 제한적**이다. (실제 라우트 검증은 신규 `route.origin.test.ts`가 담당)
이번에는 재작성하지 않고 그대로 둠.

### 5-2. `lib/detect.test.ts` — 해결됨 (규칙 보강 1 + 테스트 수정 1)

| 테스트 | 최초 실패 원인 | 조치 |
|---|---|---|
| `should detect COMPENSATION in Korean` (`"계좌를 사용하면 100만원을 드리겠습니다"`) | COMPENSATION 정규식 지급 표현에 **`드리겠` 어미가 없어** 미매칭 (`드려\|드립니다\|드릴\|…`) | **코드 보강**: `lib/detect.ts` COMPENSATION 두 그룹 모두에 `드리겠` 추가. + 이 테스트의 verdict 기대값을 `risk`→`caution`으로 수정 (COMPENSATION 단독 = medium 1개 → 규칙상 `caution`이 정답. 원래 기대값이 규칙과 불일치했음) |
| `should return 'risk' when 2+ medium severity signals detected` (`"3일만 계좌를 빌려주면 100만원을 드리겠습니다"`) | 위와 동일 — COMPENSATION 미매칭으로 medium 1개 | `드리겠` 보강으로 medium 2개(SHORT_TERM+COMPENSATION) → **자동 통과**, 테스트 수정 없음 |

`드리겠` 보강은 **민감도만 상승**(가짜 flag가 늘지 않고 놓치던 유인 문구를 잡음). 데모 예시 1~3 verdict 회귀 없음(2장 재확인).

### 5-3. `lib/prompt.test.ts` — 해결됨 (테스트 어설션 수정, 코드 무변경)

| 테스트 | 최초 실패 원인 | 조치 |
|---|---|---|
| `should mention specific AI patterns to detect` | `toContain`은 대소문자 구분 — 테스트는 소문자(`"excessively smooth multilingual"` 등) 기대, 실제 `SYSTEM_PROMPT`는 첫 글자 대문자 | `SYSTEM_PROMPT.toLowerCase()`로 비교하도록 수정 |
| `should ask for AI signal detection when signals are present` | user 프롬프트에 한국어 `"AI 생성"`이 있길 기대 — 실제로는 영어 지시문이라 `"AI_GEN"`만 존재 | 기대값을 `"AI_GEN"` + `"AI-generated or AI-assisted attacks"`(실제 코드 문구)로 수정 |

`parseFlags` 관련(HTML strip, AI_GEN 파싱, 잘못된 JSON 거부 등) 12개는 처음부터 전부 통과.

### 5-4. `app/api/analyze/route.origin.test.ts` (신규) — 5/5 통과
`global.fetch`를 `jest.fn()`으로 가로채고 `ANTHROPIC_API_KEY`를 더미값으로 설정:
1. 허용 Origin → fetch 1회 호출(`https://api.anthropic.com/v1/messages`), `source:"ai"`, verdict `risk`
2. 비허용 Origin → **fetch 미호출**, `source:"fallback"`, verdict/signals 동일, `AI_GEN` flag 없음
3. Referer만 있고 비허용 → 폴백
4. 키 없음 + 허용 Origin → fetch 미호출, 폴백
5. `GSB_ALLOWED_ORIGINS` 미설정 → 검사 생략, 허용 취급 (`source:"ai"`)

---

## 6. 결제 완료 후 실행할 실 API 키 검증 체크리스트

사용자가 "실키 검증해줘"라고 하면 아래를 순서대로 실행한다.

### 준비
```bash
# Vercel 프로덕션에 실 키 추가 후 재배포
printf '<진짜 sk-ant-... 키>' | npx vercel env add ANTHROPIC_API_KEY production
npx vercel --prod
DOMAIN=https://<배포도메인>
```

### 6-1. `source:"ai"` 양성 경로
```bash
node scripts/verify-api.mjs $DOMAIN --origin $DOMAIN
```
- **기대**: 예시1·2·5의 `source`가 `ai`로 바뀐다. `flags[].t` 문장이 규칙 템플릿(2장 표)과 **다른 문구**여야 한다(LLM 생성).
- 예시3(정상 은행 알림)은 `caution` + `source:"ai"`, flags 1개(안전 단정 없이 "명확한 위험 표현 없음" 취지).
- 정교한 문장(예시1)에서 `flags`에 `q:"AI_GEN"` 항목이 붙을 수 있음(붙어도/안 붙어도 통과 — 오탐률만 관찰).
- **verdict/signals는 폴백일 때와 반드시 동일해야 함** (규칙 엔진이 판정, LLM은 설명만).

### 6-2. 언어일치 (LLM 경로)
```bash
node scripts/verify-api.mjs $DOMAIN --origin $DOMAIN   # 5번째 케이스가 lang:"en"
```
추가 수동 확인 — 같은 한국어 위험 문장을 `lang` 바꿔 두 번:
```bash
curl -s $DOMAIN/api/analyze -H 'content-type: application/json' -H "origin: $DOMAIN" \
  --data-binary '{"text":"통장 빌려주면 50만원 줄게. 며칠만 쓰고 돌려줌. 문제 없어.","lang":"en"}'
```
- **기대**: `source:"ai"`이고 `flags[].t`의 모든 문장이 **영어**. (한국어가 섞이면 실패 — 단, 법령·기관명은
  `영문 (한국어)` 병기가 정상: `"Electronic Financial Transactions Act (전자금융거래법)"`)
- `lang:"ko"`로 같은 요청 → 모든 문장이 한국어.

### 6-3. Origin `ai → fallback` 강등 (실배포 실측)
```bash
# (a) 올바른 Origin — ai 기대
curl -s $DOMAIN/api/analyze -H 'content-type: application/json' -H "origin: $DOMAIN" \
  --data-binary @<(printf '%s' '{"text":"통장 빌려주면 30만원 드려요. 3일만.","lang":"ko"}') | grep -o '"source":"[a-z]*"'

# (b) 위조/타 Origin — 실 키가 있어도 fallback 기대
curl -s $DOMAIN/api/analyze -H 'content-type: application/json' -H 'origin: https://attacker.example.com' \
  --data-binary @<(printf '%s' '{"text":"통장 빌려주면 30만원 드려요. 3일만.","lang":"ko"}') | grep -o '"source":"[a-z]*"'

# (c) Origin 헤더 없음 — GSB_ALLOWED_ORIGINS가 설정돼 있으면 fallback 기대
curl -s $DOMAIN/api/analyze -H 'content-type: application/json' \
  --data-binary @<(printf '%s' '{"text":"통장 빌려주면 30만원 드려요. 3일만.","lang":"ko"}') | grep -o '"source":"[a-z]*"'
```
- **기대**: (a) `"source":"ai"` / (b) `"source":"fallback"` / (c) `"source":"fallback"`.
- (b)에서 verdict·signals는 (a)와 동일해야 하고 화면도 정상(강등이지 차단이 아님).
- 이 동작은 이미 `route.origin.test.ts`가 mock으로 검증함 — 6-3은 **실배포·실키에서의 최종 실측**.

### 6-4. 회귀 확인
```bash
npm test          # 64/64 통과 유지
npx next build    # 성공
```

### 검증 완료 기록 위치
결과는 이 파일 0장 표의 마지막 3행(`source:"ai"` / 언어일치 / Origin 실측)을 ✅로 갱신하고,
기능명세서 5-4의 "미검증" 항목을 "검증됨 (YYYY-MM-DD)"으로 바꾼다.
