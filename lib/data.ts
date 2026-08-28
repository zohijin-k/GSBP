/**
 * GSB — Good Standing Bridge
 * 도메인 데이터
 *
 * ⚠️ 출처 원칙
 *  - 각 은행 요건에는 grade(출처 등급)를 반드시 부여한다.
 *    official : 은행 공식 문서(FAQ·공지·상품안내)에서 직접 확인
 *    second   : 2차 출처(언론·정리 자료). 실측 확인 필요
 *    none     : 은행이 공시하지 않음
 *    no       : 외국인 계좌 개설 자체가 불가
 *  - 확정형 판정을 하지 않는다. 지점 재량이 실재하므로 순위는 "통과 가능성"이다.
 *
 * ⚠️ 언어 원칙
 *  - 사용자에게 노출되는 모든 문자열은 L = { ko, en } 이며 둘 다 필수다.
 *  - 창구에서 말하거나 검색해야 하는 서류·제도명은 영문 첫 등장에 한국어를 괄호로 남긴다.
 *    "Health Insurance Certificate" 로는 공단에서 서류를 받을 수 없다.
 */

import type { L } from "./i18n";

export type Grade = "official" | "second" | "none" | "no";
export type VisaCode = "E-9" | "D-2" | "F-6";

export interface Persona {
  id: string;
  code: string;
  name: L;
  meta: L;
  cardNo: string;
  country: string;
  status: VisaCode;
  visa: L;
  visaSub: L;
  remain: L;
  since: L;
  /** 실제 축적된 신뢰 근거 — 은행 심사에 반영되지 않는 것들 */
  real: L[];
  /** 은행이 실제로 보는 정적 속성 */
  bankView: L[];
}

/**
 * 순위의 근거. 점수를 숫자로 노출하지 않는 대신 어떤 요건이 충족/미충족인지를 보여준다.
 * 모든 label 은 같은 은행의 req 문자열에 실제로 존재하는 요건이어야 한다 — 새 요건을 지어내지 않는다.
 */
export interface Factor {
  label: L;
  /** 이 페르소나가 충족 가능한지 */
  met: boolean;
  /** 미충족 사유 (met: false 일 때) */
  note?: L;
}

export interface Fit {
  /** 통과 가능성 점수(0–100). 0이면 경로 자체가 막힘. 화면에 숫자로 노출하지 않는다. */
  s: number;
  good?: L;
  bad?: L;
  factors: Factor[];
}

export interface Bank {
  name: L;
  grade: Grade;
  gradeLabel: L;
  channel: L;
  req: L;
  src: L;
  fit: Record<string, Fit>;
}

export interface CheckItem {
  id: string;
  n: L;
  d: L;
  star?: L;
}

/**
 * 판별 샘플 — 심사자가 타이핑하지 않고도 바로 눌러 볼 수 있는 예시 문장.
 * risk 판정과 설명 문장은 여기에 담지 않는다. 샘플도 실제 /api/analyze 를 타고,
 * 규칙 엔진이 판정하고 생성형 AI가 설명한다. 하드코딩된 결과를 보여주면
 * "AI가 실제로 도는가"라는 질문에 답할 수 없다.
 */
export interface Sample {
  id: string;
  who: L;
  text: L;
}

/* ========================= 페르소나 ========================= */

export const PERSONAS: Persona[] = [
  {
    id: "aziz",
    code: "UZ",
    name: { ko: "아지즈 (Aziz)", en: "Aziz" },
    meta: {
      ko: "우즈베키스탄 · E-9 · 제조업 2년차",
      en: "Uzbekistan · E-9 · 2nd year in manufacturing",
    },
    cardNo: "981104-5******",
    country: "UZBEKISTAN",
    status: "E-9",
    visa: { ko: "E-9 비전문취업", en: "E-9 Non-professional Employment (비전문취업)" },
    visaSub: { ko: "제조업 사업장 근로", en: "Working at a manufacturing site" },
    remain: { ko: "14개월", en: "14 months" },
    since: { ko: "2년 1개월", en: "2 years 1 month" },
    real: [
      { ko: "통신요금 18개월 무연체", en: "18 months of phone bills, none late" },
      {
        ko: "건강보험 자격 유지 · 완납",
        en: "Health insurance (건강보험) active and paid in full",
      },
      { ko: "동일 사업장 2년 1개월 재직", en: "2 years 1 month at the same workplace" },
      {
        ko: "매월 같은 날 정액 본국 송금",
        en: "Fixed remittance home on the same day every month",
      },
    ],
    bankView: [
      { ko: "체류자격 E-9", en: "Residence status E-9" },
      { ko: "잔여 체류 14개월", en: "14 months of stay remaining" },
      { ko: "해당 은행 거래이력 없음", en: "No transaction history at this bank" },
      { ko: "급여이체 실적 미확인", en: "No verified salary-transfer record" },
    ],
  },
  {
    id: "nguyen",
    code: "VN",
    name: { ko: "응우옌 (Nguyen)", en: "Nguyen" },
    meta: {
      ko: "베트남 · D-2 유학생 · 입국 8개월",
      en: "Viet Nam · D-2 student · 8 months in Korea",
    },
    cardNo: "010722-6******",
    country: "VIET NAM",
    status: "D-2",
    visa: { ko: "D-2 유학", en: "D-2 Study Abroad (유학)" },
    visaSub: { ko: "4년제 대학 재학", en: "Enrolled at a four-year university" },
    remain: { ko: "22개월", en: "22 months" },
    since: { ko: "8개월", en: "8 months" },
    real: [
      {
        ko: "임대차계약서 보유 · 본인 명의",
        en: "Holds a lease contract (임대차계약서) in her own name",
      },
      { ko: "건강보험 자격 유지", en: "Health insurance coverage maintained" },
      { ko: "통신요금 8개월 무연체", en: "8 months of phone bills, none late" },
      {
        ko: "재학증명서 발급 가능",
        en: "Can issue a Certificate of Enrolment (재학증명서)",
      },
    ],
    bankView: [
      { ko: "체류자격 D-2", en: "Residence status D-2" },
      { ko: "잔여 체류 22개월", en: "22 months of stay remaining" },
      { ko: "입국 8개월", en: "8 months since arrival" },
      { ko: "정기 급여 없음 (아르바이트)", en: "No regular salary (part-time work)" },
    ],
  },
  {
    id: "maria",
    code: "PH",
    name: { ko: "마리아 (Maria)", en: "Maria" },
    meta: {
      ko: "필리핀 · F-6 결혼이민 · 입국 1년",
      en: "Philippines · F-6 marriage migrant · 1 year in Korea",
    },
    cardNo: "920318-6******",
    country: "PHILIPPINES",
    status: "F-6",
    visa: { ko: "F-6 결혼이민", en: "F-6 Marriage Migrant (결혼이민)" },
    visaSub: { ko: "국민의 배우자", en: "Spouse of a Korean national" },
    remain: { ko: "1년 3개월", en: "1 year 3 months" },
    since: { ko: "1년", en: "1 year" },
    real: [
      {
        ko: "건강보험 피부양자 등록",
        en: "Registered as a health insurance dependant",
      },
      { ko: "통신요금 12개월 무연체", en: "12 months of phone bills, none late" },
      {
        ko: "배우자 명의 공과금 거주 확인",
        en: "Residence confirmed through utility bills in her spouse's name",
      },
      { ko: "본인 명의 소득 없음", en: "No income in her own name" },
    ],
    bankView: [
      { ko: "체류자격 F-6", en: "Residence status F-6" },
      { ko: "잔여 체류 1년 3개월", en: "1 year 3 months of stay remaining" },
      { ko: "본인 명의 소득 없음", en: "No income in her own name" },
      { ko: "거래이력 없음", en: "No transaction history" },
    ],
  },
];

/* ========================= 체류자격별 금융 좌표 ========================= */

export const COORDS: Record<VisaCode, { now: L[]; soon: L[]; never: L[] }> = {
  "E-9": {
    now: [
      {
        ko: "입출금 계좌 개설 (한도제한 상태)",
        en: "Open a deposit account (as a limited-transaction account, 한도제한계좌)",
      },
      {
        ko: "해외송금 (연 10만 달러 이내)",
        en: "Overseas remittance (up to USD 100,000 per year)",
      },
      { ko: "체크카드 발급", en: "Get a debit card (체크카드)" },
      { ko: "건강보험 이용", en: "Use national health insurance" },
    ],
    soon: [
      {
        ko: "한도제한 해제 — 급여이체 실적 또는 재직 증빙 필요",
        en: "Lift the limit — needs a salary-transfer record or proof of employment",
      },
      {
        ko: "신용대출 — 은행별 외국인 상품, 한도 1,000만~3,000만원",
        en: "Personal loan — foreign-national products vary by bank, limit 10,000,000–30,000,000 KRW",
      },
      { ko: "적금·예금 상품", en: "Savings and deposit products" },
    ],
    never: [
      {
        ko: "신용카드 발급 — 국내 신용이력 부재로 사실상 불가",
        en: "Credit card — effectively closed without domestic credit history",
      },
      { ko: "주택담보대출", en: "Mortgage loan" },
      {
        ko: "전세자금대출 — 체류기간 요건 미충족",
        en: "Jeonse deposit loan (전세자금대출) — stay-period requirement not met",
      },
    ],
  },
  "D-2": {
    now: [
      {
        ko: "입출금 계좌 개설 (한도제한 상태)",
        en: "Open a deposit account (as a limited-transaction account, 한도제한계좌)",
      },
      {
        ko: "해외송금 (유학경비 증빙 시)",
        en: "Overseas remittance (with proof of study expenses)",
      },
      { ko: "체크카드 발급", en: "Get a debit card (체크카드)" },
      { ko: "건강보험 이용", en: "Use national health insurance" },
    ],
    soon: [
      {
        ko: "한도제한 해제 — 재학증명서 + 임대차계약 또는 공과금 경로",
        en: "Lift the limit — Certificate of Enrolment (재학증명서) plus a lease or utility-bill route",
      },
      { ko: "일부 은행 유학생 전용 상품", en: "Student-only products at some banks" },
    ],
    never: [
      { ko: "신용카드 발급", en: "Credit card" },
      {
        ko: "신용대출 — 정기 소득 증빙 불가",
        en: "Personal loan — regular income cannot be evidenced",
      },
      { ko: "주택담보대출", en: "Mortgage loan" },
    ],
  },
  "F-6": {
    now: [
      {
        ko: "입출금 계좌 개설 (한도제한 상태)",
        en: "Open a deposit account (as a limited-transaction account, 한도제한계좌)",
      },
      { ko: "해외송금", en: "Overseas remittance" },
      { ko: "체크카드 발급", en: "Get a debit card (체크카드)" },
      {
        ko: "건강보험 피부양자 이용",
        en: "Use health insurance as a registered dependant",
      },
    ],
    soon: [
      {
        ko: "한도제한 해제 — 배우자 소득 연계 또는 공과금 자동이체 경로",
        en: "Lift the limit — link to spouse's income, or a utility auto-debit route",
      },
      { ko: "신용카드 — 배우자 가족카드 경로", en: "Credit card — through a spouse's family card" },
      { ko: "적금·예금 상품", en: "Savings and deposit products" },
    ],
    never: [
      {
        ko: "본인 명의 신용대출 — 소득 증빙 부재",
        en: "Personal loan in her own name — no proof of income",
      },
    ],
  },
};

/* ========================= 은행별 해제 요건 ========================= */

const G_OFFICIAL: L = { ko: "공식 확인", en: "Confirmed" };
const G_SECOND: L = { ko: "2차 출처", en: "2nd source" };
const G_NONE: L = { ko: "미공시", en: "Not disclosed" };
const G_NO: L = { ko: "외국인 개설 불가", en: "Closed to foreigners" };

/**
 * 아래 세 은행의 요건은 페르소나와 무관하게 결정된다 —
 * NH는 요건 자체가 공시되지 않았고, 카카오·케이뱅크는 계좌 개설 단계에서 막힌다.
 * 그래서 factors 를 페르소나별로 복제하지 않고 공유한다.
 */
const NH_FACTORS: Factor[] = [
  {
    label: { ko: "해제 요건 공시", en: "Requirements published" },
    met: false,
    note: {
      ko: "공식 FAQ에 한도제한계좌 항목 자체가 없음",
      en: "The official FAQ has no limited-transaction account entry at all",
    },
  },
  {
    label: { ko: "방문 전 서류 준비 가능", en: "Documents can be prepared before visiting" },
    met: false,
    note: {
      ko: "무엇을 요구할지 알 수 없어 준비 자체가 성립하지 않음",
      en: "With no way to know what will be asked, there is nothing to prepare",
    },
  },
  {
    label: { ko: "2개월 이상 거래내역 확보", en: "2 months or more of transaction history" },
    met: false,
    note: {
      ko: "언론 취재 기준 요구 사례 — 신규 진입자는 시간이 지나야 충족",
      en: "A requirement seen in press reporting — a newcomer can only meet it with time",
    },
  },
];

const KAKAO_FACTORS: Factor[] = [
  { label: { ko: "100% 비대면 해제", en: "Lifted entirely online" }, met: true },
  {
    label: {
      ko: "서류 촬영 업로드만으로 해제",
      en: "Lifted by uploading photographed documents alone",
    },
    met: true,
  },
  {
    label: { ko: "외국인 계좌 개설 지원", en: "Opens accounts for foreign nationals" },
    met: false,
    note: {
      ko: "2026년 4분기 서비스 출시 예고 · 현재는 개설 불가",
      en: "Service announced for Q4 2026 · not available today",
    },
  },
];

const KBANK_FACTORS: Factor[] = [
  { label: { ko: "서류 제출 없이 즉시 해제", en: "Lifted instantly with no documents" }, met: true },
  {
    label: {
      ko: "건강보험 재직정보 조회로 해제 (공공 마이데이터)",
      en: "Lifted by pulling employment data from health insurance (public MyData)",
    },
    met: true,
  },
  {
    label: { ko: "외국인 계좌 개설 지원", en: "Opens accounts for foreign nationals" },
    met: false,
    note: {
      ko: "외국인 대상 계좌 개설을 지원하지 않음",
      en: "Account opening for foreign nationals is not supported",
    },
  },
];

export const BANKS: Bank[] = [
  {
    name: { ko: "토스뱅크", en: "Toss Bank" },
    grade: "second",
    gradeLabel: G_SECOND,
    channel: { ko: "100% 비대면 · 최대 2일 심사", en: "100% online · review within 2 days" },
    req: {
      ko: "재직증명서(최근 3개월) 또는 건강보험자격득실확인서(최근 3개월), 근로계약서",
      en: "Certificate of Employment (재직증명서, issued within 3 months) or Health Insurance Qualification Certificate (건강보험자격득실확인서, within 3 months), plus an employment contract (근로계약서)",
    },
    src: {
      ko: "토스뱅크 고객센터 FAQ · 공식 페이지가 스크립트 렌더링이라 앱 실측 필요",
      en: "Toss Bank help centre FAQ · the official page is script-rendered, so in-app verification is still needed",
    },
    fit: {
      aziz: {
        s: 96,
        good: {
          ko: "지점 방문 없이 서류 촬영만으로 신청 가능. 외국인 비대면 개설을 2022년부터 지원.",
          en: "Apply by photographing documents, with no branch visit. Toss Bank has supported online opening for foreign nationals since 2022.",
        },
        factors: [
          { label: { ko: "비대면 신청 가능", en: "Can apply entirely online" }, met: true },
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: true,
          },
          { label: { ko: "근로계약서 제출 가능", en: "Can submit an employment contract" }, met: true },
        ],
      },
      nguyen: {
        s: 78,
        good: {
          ko: "비대면 신청 가능. 다만 근로계약서가 있어야 하며 아르바이트는 심사가 갈릴 수 있음.",
          en: "Online application is open, but an employment contract is required and part-time work can go either way in review.",
        },
        factors: [
          { label: { ko: "비대면 신청 가능", en: "Can apply entirely online" }, met: true },
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          { label: { ko: "근로계약서 제출 가능", en: "Can submit an employment contract" }, met: true },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: false,
            note: {
              ko: "아르바이트 고용주가 재직증명서를 발급해 주지 않는 경우가 많음",
              en: "Part-time employers often will not issue one",
            },
          },
        ],
      },
      maria: {
        s: 70,
        good: {
          ko: "비대면 신청은 가능하나 본인 명의 소득이 없어 생활비 납부 경로로 접근해야 함.",
          en: "Online application is open, but with no income in her own name the route has to run through household payments.",
        },
        factors: [
          { label: { ko: "비대면 신청 가능", en: "Can apply entirely online" }, met: true },
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: false,
            note: { ko: "본인 명의 재직처가 없음", en: "No workplace in her own name" },
          },
          {
            label: { ko: "근로계약서 제출 가능", en: "Can submit an employment contract" },
            met: false,
            note: { ko: "근로 중이 아니라 계약서가 없음", en: "Not employed, so there is no contract" },
          },
        ],
      },
    },
  },
  {
    name: { ko: "우리은행", en: "Woori Bank" },
    grade: "official",
    gradeLabel: G_OFFICIAL,
    channel: {
      ko: "신청 경로 미확인 · 영업점 문의",
      en: "Application channel unconfirmed · ask at a branch",
    },
    req: {
      ko: "재직증명서, 근로소득원천징수영수증, 건강보험자격득실확인서 / 해외사용: 국외 교육기관 입학허가증·재학증명서",
      en: "Certificate of Employment, Withholding Tax Receipt for Earned Income (근로소득원천징수영수증), Health Insurance Qualification Certificate / For overseas use: letter of admission or certificate of enrolment from a foreign educational institution",
    },
    src: {
      ko: "우리은행 민원사례 FAQ (등록 2017.04.21) · 한도는 모바일 상품안내 MWPRD0199",
      en: "Woori Bank complaint-case FAQ (posted 2017-04-21) · limits from mobile product page MWPRD0199",
    },
    fit: {
      aziz: {
        s: 88,
        good: {
          ko: "건강보험자격득실확인서를 명시적으로 인정. 발급이 쉬워 가장 확실한 경로.",
          en: "Explicitly accepts the Health Insurance Qualification Certificate. It is easy to obtain, which makes this the most dependable route.",
        },
        factors: [
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: true,
          },
          {
            label: {
              ko: "근로소득원천징수영수증 인정",
              en: "Accepts the Withholding Tax Receipt for Earned Income",
            },
            met: true,
          },
          {
            label: { ko: "비대면 신청 경로", en: "An online application route" },
            met: false,
            note: {
              ko: "신청 경로가 공시되지 않아 영업점에 직접 문의해야 함",
              en: "The channel is not published, so the branch has to be asked directly",
            },
          },
        ],
      },
      nguyen: {
        s: 84,
        good: {
          ko: "'해외사용' 항목에 재학증명서가 명시되어 있어 유학생 경로가 열려 있음.",
          en: "The 'overseas use' clause names a certificate of enrolment, so the student route is open.",
        },
        factors: [
          {
            label: {
              ko: "해외사용 항목 — 재학증명서 인정",
              en: "Overseas-use clause — accepts a certificate of enrolment",
            },
            met: true,
          },
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          {
            label: {
              ko: "근로소득원천징수영수증 인정",
              en: "Accepts the Withholding Tax Receipt for Earned Income",
            },
            met: false,
            note: {
              ko: "아르바이트 소득은 원천징수 발급이 불규칙함",
              en: "Part-time earnings produce the receipt only irregularly",
            },
          },
          {
            label: { ko: "비대면 신청 경로", en: "An online application route" },
            met: false,
            note: {
              ko: "신청 경로가 공시되지 않아 영업점에 직접 문의해야 함",
              en: "The channel is not published, so the branch has to be asked directly",
            },
          },
        ],
      },
      maria: {
        s: 62,
        bad: {
          ko: "인정 서류가 모두 소득·재직 기반이라 본인 명의 증빙을 만들기 어려움.",
          en: "Every accepted document is income- or employment-based, so there is nothing she can produce in her own name.",
        },
        factors: [
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: true,
          },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: false,
            note: { ko: "본인 명의 재직처가 없음", en: "No workplace in her own name" },
          },
          {
            label: {
              ko: "근로소득원천징수영수증 인정",
              en: "Accepts the Withholding Tax Receipt for Earned Income",
            },
            met: false,
            note: { ko: "본인 명의 소득이 없음", en: "No income in her own name" },
          },
          {
            label: { ko: "비대면 신청 경로", en: "An online application route" },
            met: false,
            note: {
              ko: "신청 경로가 공시되지 않아 영업점에 직접 문의해야 함",
              en: "The channel is not published, so the branch has to be asked directly",
            },
          },
        ],
      },
    },
  },
  {
    name: { ko: "하나은행", en: "Hana Bank" },
    grade: "official",
    gradeLabel: G_OFFICIAL,
    channel: { ko: "하나원큐 앱 · 팩스 · 영업점", en: "Hana 1Q app · fax · branch" },
    req: {
      ko: "재직증명서, 근로소득원천징수영수증 / 연금: 연금증서 / 해외사용: 입학허가서, 비자",
      en: "Certificate of Employment, Withholding Tax Receipt for Earned Income / Pension: pension certificate / For overseas use: letter of admission, visa",
    },
    src: {
      ko: "하나은행 고객센터 FAQ — “금융거래한도계좌는 어떻게 해제하나요?”",
      en: "Hana Bank help centre FAQ — “How do I lift a transaction-limit account?”",
    },
    fit: {
      aziz: {
        s: 82,
        good: {
          ko: "앱과 팩스로 신청 가능해 방문 부담이 낮음. 재직증명서만으로 접근 가능.",
          en: "App and fax submission keep the visit burden low. A Certificate of Employment alone opens the route.",
        },
        factors: [
          { label: { ko: "앱·팩스로 신청 가능", en: "Can apply by app or fax" }, met: true },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: true,
          },
          {
            label: {
              ko: "근로소득원천징수영수증 인정",
              en: "Accepts the Withholding Tax Receipt for Earned Income",
            },
            met: true,
          },
          {
            label: {
              ko: "건강보험자격득실확인서 인정",
              en: "Accepts the Health Insurance Qualification Certificate",
            },
            met: false,
            note: {
              ko: "하나은행 공시 항목에 건강보험 서류가 없음",
              en: "Health insurance documents do not appear in Hana Bank's published list",
            },
          },
        ],
      },
      nguyen: {
        s: 86,
        good: {
          ko: "'해외사용: 입학허가서, 비자' — 9개 은행 중 비자를 언급한 유일한 공식 문구.",
          en: "'Overseas use: letter of admission, visa' — the only official wording among the 9 banks reviewed that names the visa itself.",
        },
        factors: [
          { label: { ko: "앱·팩스로 신청 가능", en: "Can apply by app or fax" }, met: true },
          {
            label: {
              ko: "해외사용 항목 — 입학허가서 인정",
              en: "Overseas-use clause — accepts a letter of admission",
            },
            met: true,
          },
          {
            label: { ko: "해외사용 항목 — 비자 인정", en: "Overseas-use clause — accepts the visa" },
            met: true,
          },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: false,
            note: {
              ko: "아르바이트 고용주가 재직증명서를 발급해 주지 않는 경우가 많음",
              en: "Part-time employers often will not issue one",
            },
          },
        ],
      },
      maria: {
        s: 58,
        bad: {
          ko: "인정 항목이 급여·연금·해외사용뿐이라 해당되는 경로가 없음.",
          en: "The accepted categories are salary, pension and overseas use only — none of them reach her.",
        },
        factors: [
          { label: { ko: "앱·팩스로 신청 가능", en: "Can apply by app or fax" }, met: true },
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: false,
            note: { ko: "본인 명의 재직처가 없음", en: "No workplace in her own name" },
          },
          {
            label: { ko: "연금 항목 — 연금증서 인정", en: "Pension clause — accepts a pension certificate" },
            met: false,
            note: { ko: "수급 중인 연금이 없음", en: "She receives no pension" },
          },
          {
            label: { ko: "해외사용 항목 경로", en: "Overseas-use route" },
            met: false,
            note: {
              ko: "유학·해외 체류 목적의 계좌가 아님",
              en: "The account is not for study or residence abroad",
            },
          },
        ],
      },
    },
  },
  {
    name: { ko: "KB국민은행", en: "KB Kookmin Bank" },
    grade: "official",
    gradeLabel: G_OFFICIAL,
    channel: {
      ko: "비대면 가능 (4개 조건 중 1개 충족 시)",
      en: "Online available (if 1 of 4 conditions is met)",
    },
    req: {
      ko: "급여이체 전월말 기준 3개월 연속 건별 150만원 이상 / 연금 3개월 연속 건별 50만원 이상 / KB스타클럽 VVIP·VIP·그랜드 / KB able Plus 주식거래",
      en: "Salary transfer of 1,500,000 KRW or more per payment for 3 consecutive months as of the end of last month / Pension of 500,000 KRW or more per payment for 3 consecutive months / KB Star Club VVIP·VIP·Grand / KB able Plus stock trading",
    },
    src: {
      ko: "KB국민은행 KBthink 한도제한계좌 안내 (2025.10.22 업데이트)",
      en: "KB Kookmin Bank KBthink limited-transaction account guide (updated 2025-10-22)",
    },
    fit: {
      aziz: {
        s: 74,
        good: {
          ko: "월 260만원이면 건별 150만원 요건은 충족 가능하나 3개월 연속 실적을 쌓아야 함.",
          en: "At 2,600,000 KRW a month the 1,500,000 KRW per-payment threshold is reachable, but the record still has to run 3 consecutive months.",
        },
        factors: [
          { label: { ko: "비대면 해제 가능", en: "Limit can be lifted online" }, met: true },
          {
            label: {
              ko: "급여이체 건별 150만원 이상",
              en: "Salary transfer of 1,500,000 KRW or more per payment",
            },
            met: true,
          },
          {
            label: { ko: "3개월 연속 급여이체 실적", en: "3 consecutive months of salary transfers" },
            met: false,
            note: {
              ko: "해당 은행 거래이력이 없어 지금부터 3개월을 쌓아야 함",
              en: "No history at this bank, so the three months start from now",
            },
          },
          {
            label: {
              ko: "연금·KB스타클럽·주식거래 경로",
              en: "Pension, KB Star Club or stock-trading route",
            },
            met: false,
            note: { ko: "해당되는 항목이 없음", en: "None of these apply to him" },
          },
        ],
      },
      nguyen: {
        s: 28,
        bad: {
          ko: "급여 건별 150만원 이상 3개월 연속 — 아르바이트 소득으로는 충족 불가.",
          en: "1,500,000 KRW per payment for 3 consecutive months — part-time earnings cannot reach it.",
        },
        factors: [
          { label: { ko: "비대면 해제 가능", en: "Limit can be lifted online" }, met: true },
          {
            label: {
              ko: "급여이체 건별 150만원 이상",
              en: "Salary transfer of 1,500,000 KRW or more per payment",
            },
            met: false,
            note: {
              ko: "아르바이트 소득은 건별 150만원에 미달",
              en: "Part-time pay falls below 1,500,000 KRW per payment",
            },
          },
          {
            label: { ko: "3개월 연속 급여이체 실적", en: "3 consecutive months of salary transfers" },
            met: false,
            note: { ko: "정기 급여가 없음", en: "There is no regular salary" },
          },
          {
            label: {
              ko: "연금·KB스타클럽·주식거래 경로",
              en: "Pension, KB Star Club or stock-trading route",
            },
            met: false,
            note: { ko: "해당되는 항목이 없음", en: "None of these apply to her" },
          },
        ],
      },
      maria: {
        s: 24,
        bad: {
          ko: "본인 명의 급여·연금이 없어 비대면 4개 조건 중 해당 항목 없음.",
          en: "With no salary or pension in her own name, none of the 4 online conditions apply.",
        },
        factors: [
          { label: { ko: "비대면 해제 가능", en: "Limit can be lifted online" }, met: true },
          {
            label: { ko: "급여이체 경로", en: "Salary-transfer route" },
            met: false,
            note: { ko: "본인 명의 급여가 없음", en: "No salary in her own name" },
          },
          {
            label: {
              ko: "연금 건별 50만원 이상 3개월",
              en: "Pension of 500,000 KRW or more per payment for 3 months",
            },
            met: false,
            note: { ko: "본인 명의 연금이 없음", en: "No pension in her own name" },
          },
          {
            label: { ko: "KB스타클럽·주식거래 경로", en: "KB Star Club or stock-trading route" },
            met: false,
            note: {
              ko: "예치 자산과 거래 실적이 없음",
              en: "No assets on deposit and no trading record",
            },
          },
        ],
      },
    },
  },
  {
    name: { ko: "IBK기업은행", en: "IBK Industrial Bank of Korea" },
    grade: "official",
    gradeLabel: G_OFFICIAL,
    channel: {
      ko: "i-ONE 뱅크 (대상 제한) · 영업점",
      en: "i-ONE Bank (restricted eligibility) · branch",
    },
    req: {
      ko: "재직증명서·원천징수·건강보험자격득실 + 직장 전화번호를 통한 재직 확인 / 공과금 3개월 자동이체 (전기·가스·수도·전화·아파트 관리비 — 인터넷·휴대폰 요금 제외) / 신용카드 3개월 매월 30만원 이상",
      en: "Certificate of Employment, withholding tax receipt or Health Insurance Qualification Certificate, plus employment verification by phone call to the workplace / 3 months of utility auto-debit (electricity, gas, water, landline, apartment maintenance — internet and mobile bills excluded) / Credit card spending of 300,000 KRW or more per month for 3 months",
    },
    src: {
      ko: "IBK기업은행 공식 블로그 — 한도계좌와 금융거래목적 증빙서류",
      en: "IBK Industrial Bank of Korea official blog — limited accounts and proof of transaction purpose",
    },
    fit: {
      aziz: {
        s: 41,
        bad: {
          ko: "기숙사 거주라 본인 명의 공과금이 없어 공과금 경로 불가. 직장에서 한국어 확인 전화를 받아야 함.",
          en: "Dormitory housing means no utility bills in his own name, so the utility route is closed. His workplace also has to take a verification call in Korean.",
        },
        factors: [
          {
            label: { ko: "재직증명서 인정", en: "Accepts a Certificate of Employment" },
            met: true,
          },
          {
            label: { ko: "본인 명의 공과금 3개월 자동이체", en: "3 months of utility auto-debit in own name" },
            met: false,
            note: {
              ko: "기숙사 거주 — 본인 명의 공과금이 없음",
              en: "Lives in a dormitory — no utility bill in his own name",
            },
          },
          {
            label: { ko: "직장 전화를 통한 재직 확인", en: "Employment verified by a call to the workplace" },
            met: false,
            note: {
              ko: "사업장에서 한국어 통화 응대가 이뤄져야 함",
              en: "Someone at the workplace has to handle the call in Korean",
            },
          },
          {
            label: {
              ko: "신용카드 3개월 매월 30만원 이상",
              en: "Credit card use of 300,000 KRW or more a month for 3 months",
            },
            met: false,
            note: {
              ko: "국내 신용이력이 없어 신용카드 발급 자체가 어려움",
              en: "With no domestic credit history a credit card is hard to obtain at all",
            },
          },
        ],
      },
      nguyen: {
        s: 52,
        bad: {
          ko: "자취 중이라 공과금 경로는 열려 있으나 인터넷·휴대폰 요금은 인정되지 않음.",
          en: "Living alone keeps the utility route open, but internet and mobile bills do not count.",
        },
        factors: [
          {
            label: { ko: "본인 명의 공과금 3개월 자동이체", en: "3 months of utility auto-debit in own name" },
            met: true,
          },
          {
            label: { ko: "통신요금의 공과금 인정", en: "Telecom bills counted as utilities" },
            met: false,
            note: {
              ko: "인터넷·휴대폰 요금은 공과금에서 제외됨",
              en: "Internet and mobile bills are excluded from the utility list",
            },
          },
          {
            label: {
              ko: "재직 증빙 + 직장 전화 재직 확인",
              en: "Proof of employment plus a verification call to the workplace",
            },
            met: false,
            note: {
              ko: "아르바이트는 재직 확인 절차를 통과하기 어려움",
              en: "Part-time work rarely survives the verification call",
            },
          },
          {
            label: {
              ko: "신용카드 3개월 매월 30만원 이상",
              en: "Credit card use of 300,000 KRW or more a month for 3 months",
            },
            met: false,
            note: {
              ko: "국내 신용이력이 없어 신용카드 발급 자체가 어려움",
              en: "With no domestic credit history a credit card is hard to obtain at all",
            },
          },
        ],
      },
      maria: {
        s: 33,
        bad: {
          ko: "공과금이 배우자 명의라 본인 명의 요건을 충족하지 못함.",
          en: "The utility bills are in her spouse's name, so the own-name requirement is not met.",
        },
        factors: [
          {
            label: { ko: "본인 명의 공과금 3개월 자동이체", en: "3 months of utility auto-debit in own name" },
            met: false,
            note: {
              ko: "공과금이 배우자 명의로 되어 있음",
              en: "The utility bills are in her spouse's name",
            },
          },
          {
            label: {
              ko: "재직 증빙 + 직장 전화 재직 확인",
              en: "Proof of employment plus a verification call to the workplace",
            },
            met: false,
            note: { ko: "본인 명의 재직처가 없음", en: "No workplace in her own name" },
          },
          {
            label: {
              ko: "신용카드 3개월 매월 30만원 이상",
              en: "Credit card use of 300,000 KRW or more a month for 3 months",
            },
            met: false,
            note: {
              ko: "본인 명의 소득이 없어 신용카드 발급 불가",
              en: "With no income in her own name a credit card cannot be issued",
            },
          },
        ],
      },
    },
  },
  {
    name: { ko: "NH농협은행", en: "NH Nonghyup Bank" },
    grade: "none",
    gradeLabel: G_NONE,
    channel: {
      ko: "영업점 방문 · 판단은 영업점 재량",
      en: "Branch visit · the decision rests with the branch",
    },
    req: {
      ko: "공식 FAQ에 한도제한계좌 항목이 존재하지 않음. 언론 취재 기준 2개월 이상 거래내역 및 공과금 자동이체 요구 사례",
      en: "No limited-transaction account entry exists in the official FAQ. Press reporting records cases demanding 2 months or more of transaction history plus utility auto-debit.",
    },
    src: {
      ko: "NH농협은행 민원사례 FAQ 확인 결과 해당 항목 부재 · SAT경제 2024.1.15",
      en: "NH Nonghyup Bank complaint-case FAQ checked — the entry is absent · SAT Economy, 2024-01-15",
    },
    fit: {
      aziz: {
        s: 20,
        bad: {
          ko: "요건이 공시되지 않아 사전 준비가 불가능합니다. 방문 전 지점에 직접 확인이 필요합니다.",
          en: "The requirements are not disclosed, so there is nothing to prepare in advance. Call the branch before going.",
        },
        factors: NH_FACTORS,
      },
      nguyen: {
        s: 20,
        bad: {
          ko: "요건이 공시되지 않아 사전 준비가 불가능합니다.",
          en: "The requirements are not disclosed, so there is nothing to prepare in advance.",
        },
        factors: NH_FACTORS,
      },
      maria: {
        s: 20,
        bad: {
          ko: "요건이 공시되지 않아 사전 준비가 불가능합니다.",
          en: "The requirements are not disclosed, so there is nothing to prepare in advance.",
        },
        factors: NH_FACTORS,
      },
    },
  },
  {
    name: { ko: "카카오뱅크", en: "KakaoBank" },
    grade: "no",
    gradeLabel: G_NO,
    channel: { ko: "—", en: "—" },
    req: {
      ko: "100% 비대면, 서류 촬영 업로드로 해제 — 해제 절차는 가장 간편한 편",
      en: "100% online; the limit is lifted by uploading photographed documents — among the simplest procedures anywhere",
    },
    src: {
      ko: "카카오뱅크 공식 공지 접근 제한 · 2026년 4분기 외국인 서비스 출시 예고",
      en: "KakaoBank official notice is access-restricted · service for foreign nationals announced for Q4 2026",
    },
    fit: {
      aziz: {
        s: 0,
        bad: {
          ko: "해제 절차가 가장 간편하지만 외국인 계좌 개설 자체를 받지 않습니다.",
          en: "The lifting procedure is the simplest of any bank, but KakaoBank does not open accounts for foreign nationals at all.",
        },
        factors: KAKAO_FACTORS,
      },
      nguyen: {
        s: 0,
        bad: {
          ko: "외국인 계좌 개설을 지원하지 않습니다.",
          en: "KakaoBank does not open accounts for foreign nationals.",
        },
        factors: KAKAO_FACTORS,
      },
      maria: {
        s: 0,
        bad: {
          ko: "외국인 계좌 개설을 지원하지 않습니다.",
          en: "KakaoBank does not open accounts for foreign nationals.",
        },
        factors: KAKAO_FACTORS,
      },
    },
  },
  {
    name: { ko: "케이뱅크", en: "K bank" },
    grade: "no",
    gradeLabel: G_NO,
    channel: { ko: "—", en: "—" },
    req: {
      ko: "공동인증서로 건강보험 재직정보 조회 시 즉시 해제 · 공공 마이데이터 경로 보유",
      en: "Instant lifting when employment data is pulled from health insurance records with a joint certificate (공동인증서) · has a public MyData route",
    },
    src: {
      ko: "케이뱅크 FAQ 제목만 확인 · 답변 본문 접근 제한",
      en: "K bank FAQ title confirmed only · the answer body is access-restricted",
    },
    fit: {
      aziz: {
        s: 0,
        bad: {
          ko: "서류 없이 즉시 해제가 가능한 유일한 은행이지만, 외국인은 계좌를 만들 수 없습니다.",
          en: "The only bank that lifts the limit instantly with no documents — but foreign nationals cannot open an account here.",
        },
        factors: KBANK_FACTORS,
      },
      nguyen: {
        s: 0,
        bad: {
          ko: "외국인 계좌 개설을 지원하지 않습니다.",
          en: "K bank does not open accounts for foreign nationals.",
        },
        factors: KBANK_FACTORS,
      },
      maria: {
        s: 0,
        bad: {
          ko: "외국인 계좌 개설을 지원하지 않습니다.",
          en: "K bank does not open accounts for foreign nationals.",
        },
        factors: KBANK_FACTORS,
      },
    },
  },
];

/* ========================= 신뢰 근거 체크리스트 ========================= */

export const CHECKS: CheckItem[] = [
  {
    id: "health",
    n: {
      ko: "건강보험자격득실확인서",
      en: "Health Insurance Qualification Certificate (건강보험자격득실확인서)",
    },
    d: {
      ko: "우리·IBK·토스뱅크 등 확인된 대부분의 은행이 인정합니다. 외국인도 발급 가능한 가장 범용적인 서류입니다.",
      en: "Accepted by most of the banks confirmed here — Woori, IBK, Toss Bank. Foreign nationals can obtain it, which makes it the most widely usable document.",
    },
    star: { ko: "최우선", en: "Top priority" },
  },
  {
    id: "employ",
    n: { ko: "재직증명서", en: "Certificate of Employment (재직증명서)" },
    d: {
      ko: "발급 후 1~3개월 이내를 요구하는 은행이 많습니다. 발급일을 확인하세요.",
      en: "Many banks require it to have been issued within 1–3 months. Check the issue date.",
    },
  },
  {
    id: "tax",
    n: {
      ko: "근로소득원천징수영수증",
      en: "Withholding Tax Receipt for Earned Income (근로소득원천징수영수증)",
    },
    d: {
      ko: "KB국민·하나·우리가 공통으로 인정합니다.",
      en: "KB Kookmin, Hana and Woori all accept it.",
    },
  },
  {
    id: "contract",
    n: { ko: "근로계약서", en: "Employment Contract (근로계약서)" },
    d: {
      ko: "토스뱅크가 인정합니다. 아르바이트는 고용주 사업자등록증이 함께 필요할 수 있습니다.",
      en: "Toss Bank accepts it. For part-time work the employer's business registration certificate may be required alongside it.",
    },
  },
  {
    id: "telecom",
    n: {
      ko: "통신요금 납부확인서",
      en: "Telecom Payment Certificate (통신요금 납부확인서)",
    },
    d: {
      ko: "IBK기업은행은 인터넷·휴대폰 요금을 공과금으로 인정하지 않습니다. 은행별 확인이 필요합니다.",
      en: "IBK does not count internet or mobile bills as utilities. Check bank by bank.",
    },
  },
  {
    id: "lease",
    n: { ko: "임대차계약서", en: "Lease Contract (임대차계약서)" },
    d: {
      ko: "본인 명의여야 합니다. 기숙사·사택 거주자는 이 경로를 사용할 수 없습니다.",
      en: "It has to be in your own name. Dormitory and company-housing residents cannot use this route.",
    },
  },
];

/* ========================= 명의대여 유인 판별 샘플 ========================= */

export const SAMPLES: Sample[] = [
  {
    id: "m1",
    who: { ko: "모르는 번호 · 카카오톡", en: "Unknown number · KakaoTalk" },
    text: {
      ko: "형님 통장 하나만 빌려주면 30만원 드려요. 10일만 쓰고 바로 돌려드립니다. 절대 문제 없어요",
      en: "Lend me one bank account and I'll pay you 300,000 KRW. I'll use it for 10 days and hand it straight back. There is absolutely no problem.",
    },
  },
  {
    id: "m2",
    who: { ko: "SNS 광고 · 다이렉트 메시지", en: "Social media ad · direct message" },
    text: {
      ko: "재직증명서 없어도 대출 가능합니다. 신용조회 안 하고 당일 입금. 담보는 통장이면 됩니다",
      en: "Loans available without a Certificate of Employment. No credit check, same-day deposit. Your bank account is all the collateral we need.",
    },
  },
  {
    id: "m3",
    who: { ko: "거래 은행 · 공식 알림", en: "Your own bank · official notification" },
    text: {
      ko: "[OO은행] 고객님이 신청하신 금융거래한도 해제 심사 결과를 안내드립니다. 영업점 방문 없이 앱에서 확인해 주세요",
      en: "[OO Bank] Here is the result of the review of your request to lift your transaction limit. Check it in the app — no branch visit needed.",
    },
  },
];

/* ========================= 화면 ========================= */

export const SCREENS: { id: number; name: L }[] = [
  { id: 1, name: { ko: "시작", en: "Start" } },
  { id: 2, name: { ko: "진단", en: "Diagnosis" } },
  { id: 3, name: { ko: "경로", en: "Routes" } },
  { id: 4, name: { ko: "방어", en: "Defence" } },
];
