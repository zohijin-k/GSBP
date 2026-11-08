import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * 폰트 로딩 방침
 * ------------------------------------------------------------------
 * next/font(빌드 타임 자체 호스팅) 대신 런타임 <link>를 사용한다.
 * 이유: next/font는 빌드 시점에 fonts.gstatic.com 접근이 반드시 성공해야 하며,
 *       실패하면 빌드 자체가 깨진다. 제출 URL은 2026-09-07 11:00 ~ 09-11 23:59
 *       동안 무중단이어야 하므로 빌드가 외부 네트워크에 의존하지 않는 편이 안전하다.
 * <link> 방식은 폰트를 못 받아도 폴백 스택으로 정상 렌더된다 (graceful degradation).
 */

const DESCRIPTION =
  "한국에 체류하는 외국인이 체류자격별 금융 정보를 확인하고, 은행별 준비 경로를 찾으며, 계좌 명의대여 사기 메시지를 판별하도록 돕는 한국어·영어 모바일 서비스입니다.";

/** 배포 도메인. 없으면 로컬로 폴백한다 — 없을 때 상대 URL 경고가 뜬다. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GSBP — Good Standing Bridge Path",
  description: DESCRIPTION,
  openGraph: {
    title: "GSBP — Good Standing Bridge Path",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "GSBP",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GSBP — Good Standing Bridge Path",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router 전역 레이아웃이라 모든 페이지에 적용됨 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;600;700;800&family=Courier+Prime:wght@400;700&family=Gowun+Batang:wght@400;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
