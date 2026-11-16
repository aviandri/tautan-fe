import { NextResponse, type NextRequest } from "next/server";

/**
 * /alice?tab=shop → (internal rewrite) /alice/t/shop. Keeps the public URL shape while letting each
 * tab be a statically cached ISR page (reading searchParams in the page would force per-request SSR).
 */
export function middleware(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  if (!tab || !/^[a-z0-9_-]{1,60}$/i.test(tab)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `${url.pathname.replace(/\/$/, "")}/t/${encodeURIComponent(tab)}`;
  url.searchParams.delete("tab");
  return NextResponse.rewrite(url);
}

export const config = {
  // single-segment paths only, minus the app's own top-level routes
  matcher: ["/((?!_next|api|dashboard|login|signup|onboarding|favicon\\.ico)[^/.]+)"],
};
