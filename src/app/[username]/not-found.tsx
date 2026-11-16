import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>This page isn&apos;t here</h1>
        <p style={{ margin: "0 0 20px", opacity: 0.7 }}>The link may be mistyped, or the page isn&apos;t published yet.</p>
        <Link href="/" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Make your own page on Tautan
        </Link>
      </div>
    </main>
  );
}
