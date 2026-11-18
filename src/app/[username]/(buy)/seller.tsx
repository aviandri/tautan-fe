import { assetUrl } from "@/lib/api";
import type { Profile } from "@/lib/types";

export function sellerName(p: Pick<Profile, "display_name" | "username">): string {
  return p.display_name?.trim() || `@${p.username}`;
}

/** The seller's avatar and name, linking back to their page. */
export function Seller({ profile }: { profile: Pick<Profile, "display_name" | "username" | "avatar_url"> }) {
  const name = sellerName(profile);
  const avatar = assetUrl(profile.avatar_url);
  return (
    <a className="tb-seller" href={`/${profile.username}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {avatar ? <img src={avatar} alt="" width={36} height={36} /> : <span className="tb-avatar" aria-hidden>{name.replace("@", "").slice(0, 1).toUpperCase()}</span>}
      <span>{name}</span>
    </a>
  );
}
