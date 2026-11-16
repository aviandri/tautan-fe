"use client";
// Temporary: replaced by the dashboard shell + editor in the next PR.
import { Button, Spinner } from "@/components/ui";
import { useLogout, useRequireSession } from "@/lib/session";

export default function DashboardPage() {
  const session = useRequireSession();
  const logout = useLogout();
  if (!session.data) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="text-muted">Signed in as {session.data.user.email}</p>
      <h1 className="mt-2 text-2xl font-semibold">/{session.data.profile.username}</h1>
      <Button variant="secondary" className="mt-6" onClick={logout}>Log out</Button>
    </main>
  );
}
