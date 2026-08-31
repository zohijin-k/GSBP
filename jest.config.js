/**
 * Jest 설정 — Next.js 16 (SWC 변환) 기반.
 *
 * next/jest 가 tsconfig 의 paths(@/*), .env 로딩, TS/JSX 변환을 처리한다.
 * 규칙 엔진·프롬프트·API 라우트는 순수 로직이라 testEnvironment 는 node 로 둔다.
 */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  clearMocks: true,
};

module.exports = createJestConfig(config);
