// Reads emails from the backend's log mail driver (MAIL_DRIVER=log, the default). Outside production the
// API logs every message's full text, including the confirm/reset links, as one line:
//   text: ... msg="mail (log driver, not sent)" to=a@b.c subject="..." text="...https://…/verify-email?token=…"
//   json: {"msg":"mail (log driver, not sent)","to":"a@b.c","subject":"...","text":"..."}
// Run the BE with its output in a file and point BE_LOG at it, e.g.
//   cd tautan-be && make dev 2>&1 | tee /tmp/tautan-be.log      →   BE_LOG=/tmp/tautan-be.log
// Production (APP_ENV=production) never logs bodies, so this only works against a dev backend.
import { existsSync, readFileSync, statSync } from 'node:fs';

export const BE_LOG = process.env.BE_LOG || '';

/** Byte offset to search from, so a run only sees mail sent after this point. */
export const logMark = () => (BE_LOG && existsSync(BE_LOG) ? statSync(BE_LOG).size : 0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for a mail to `to` logged after `since` whose text matches `re` (default: any token link) and return
 * the first capture group (or the whole match). Throws after `timeout` ms with a hint when BE_LOG is unset.
 */
export async function waitForMail({ to, since = 0, re = /(?:verify-email|reset-password)\?token=([A-Za-z0-9_%-]+)/, subject, timeout = 20000 }) {
  if (!BE_LOG) throw new Error('BE_LOG is not set: run the backend with its log in a file and pass BE_LOG=<path> (see e2e/mail.mjs)');
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (existsSync(BE_LOG)) {
      const lines = readFileSync(BE_LOG).subarray(since).toString('utf8').split('\n');
      for (const line of lines) {
        if (!line.includes('mail (log driver')) continue;
        if (!line.includes(`to=${to}`) && !line.includes(`"to":"${to}"`)) continue;
        if (subject && !line.includes(subject)) continue;
        const m = line.match(re);
        if (m) return m[1] ?? m[0];
      }
    }
    await sleep(500);
  }
  throw new Error(`no mail to ${to}${subject ? ` (subject ~ "${subject}")` : ''} in ${BE_LOG} within ${timeout} ms`);
}
