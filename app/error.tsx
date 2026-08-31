"use client";

/**
 * 라우트 렌더링 중 예외가 났을 때의 화면.
 * 제출 URL은 심사 기간 내내 살아 있어야 하므로 Next.js 기본 오류 화면을 노출하지 않는다.
 * 기술 용어·스택 트레이스·오류 코드는 사용자에게 보이지 않는다.
 */

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="fallback-page">
      <div className="fallback-card">
        <span className="fallback-mark">GSBP</span>
        <p className="fallback-msg">일시적인 오류가 발생했습니다</p>
        <p className="fallback-sub">Something went wrong</p>
        <button className="cta" onClick={reset}>
          다시 시도 · Try again
        </button>
      </div>
    </main>
  );
}
