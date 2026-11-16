// Placeholder. The landing page is owned by tautan-c6 and will replace this file.
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Tautan</h1>
      <p className="text-muted">One link for everything you make.</p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-ink">
          Create your page
        </Link>
        <Link href="/login" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">
          Log in
        </Link>
      </div>
    </main>
  );
}
