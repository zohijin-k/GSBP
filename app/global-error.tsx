"use client";

/**
 * 루트 레이아웃 자체가 실패한 경우. 이 경우 layout.tsx 가 렌더되지 않으므로
 * html/body 를 직접 포함해야 하고, globals.css 도 적용되지 않을 수 있어 스타일을 인라인으로 둔다.
 */

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#E4E3EB",
          color: "#12111A",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div
            style={{
              fontFamily: "ui-monospace,monospace",
              letterSpacing: "0.2em",
              fontSize: 15,
              fontWeight: 700,
              color: "#282366",
              marginBottom: 18,
            }}
          >
            GSBP
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>
            일시적인 오류가 발생했습니다
          </p>
          <p style={{ fontSize: 14, color: "#57546A", margin: "0 0 22px" }}>Something went wrong</p>
          <button
            onClick={reset}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 13,
              border: "none",
              background: "#282366",
              color: "#FFFFFF",
              fontSize: 15.5,
              fontWeight: 700,
              cursor: "pointer",
              font: "inherit",
              fontFamily: "inherit",
            }}
          >
            다시 시도 · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
