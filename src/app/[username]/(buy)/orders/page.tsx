import type { Metadata } from "next";
import { API_URL } from "@/lib/api";
import { lookupErrorMessage } from "@/lib/buy";
import { getPublicPageCached } from "@/lib/get-public-page";
import { Seller, sellerName } from "../seller";

export const metadata: Metadata = { title: "Find your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Payments (b): order lookup by email + code. The form posts straight to the API, which 303s to the order page. */
export default async function OrderLookupPage({ params, searchParams }: Props) {
  const { username } = await params;
  const q = await searchParams;
  const err = lookupErrorMessage(Array.isArray(q.error) ? q.error[0] : q.error);
  const page = await getPublicPageCached(username).catch(() => null);
  const profile = page?.kind === "page" ? page.data.profile : { username, display_name: "", avatar_url: null };
  return (
    <main className="tb-wrap">
      <Seller profile={profile} />
      <form className="tb-card" method="post" action={`${API_URL}/api/v1/public/${encodeURIComponent(username)}/orders/lookup`}>
        <h1 className="tb-h1">Find your order</h1>
        <p className="tb-sub">Enter the email you paid with and the order code from your receipt, like K7Q2-M9XD.</p>
        {err ? (
          <p className="tb-alert" role="alert">
            {err}
          </p>
        ) : null}
        <label className="tb-field">
          <span className="tb-label">Email</span>
          <input className="tb-input" type="email" name="email" required autoComplete="email" inputMode="email" maxLength={254} />
        </label>
        <label className="tb-field">
          <span className="tb-label">Order code</span>
          <input className="tb-input tb-code" type="text" name="code" required maxLength={12} autoCapitalize="characters" spellCheck={false} placeholder="K7Q2-M9XD" />
        </label>
        <button className="tb-btn" type="submit">
          Open my order
        </button>
      </form>
      <p className="tb-foot">
        <a href={`/${username}`}>Back to {sellerName(profile)}</a>
      </p>
    </main>
  );
}
