import { Share2, UserPlus } from "lucide-react";
import { API_BASE } from "@/lib/api";
import s from "./public.module.css";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/**
 * Share and save-contact buttons for visitors (settings.show_share / show_save_contact). Server HTML:
 * save-contact is a plain download link, and PageRuntime opens the share sheet (data-share), loading
 * the QR library only when the fallback panel is needed.
 */
export function PageActions({ username, name, share, saveContact }: { username: string; name: string; share: boolean; saveContact: boolean }) {
  if (!share && !saveContact) return null;
  return (
    <div className={s.pageActions}>
      {saveContact ? (
        <a className={s.pageAction} href={`${API_BASE}/public/${encodeURIComponent(username)}/vcard`} download={`${username}.vcf`} aria-label={`Save ${name} to contacts`}>
          <UserPlus aria-hidden />
          <span>Save contact</span>
        </a>
      ) : null}
      {share ? (
        <button type="button" className={s.pageAction} data-share={`${SITE || ""}/${username}`} data-name={name} aria-haspopup="dialog" aria-label={`Share ${name}'s page`}>
          <Share2 aria-hidden />
          <span>Share</span>
        </button>
      ) : null}
    </div>
  );
}
