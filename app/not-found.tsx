import Link from "next/link";

/** 존재하지 않는 경로. 심사자가 URL을 잘못 입력해도 GSB 화면 안에 머무르게 한다. */
export default function NotFound() {
  return (
    <main className="fallback-page">
      <div className="fallback-card">
        <span className="fallback-mark">GSBP</span>
        <p className="fallback-msg">요청하신 페이지를 찾을 수 없습니다</p>
        <p className="fallback-sub">This page could not be found</p>
        <Link className="cta" href="/">
          처음으로 · Back to start
        </Link>
      </div>
    </main>
  );
}
