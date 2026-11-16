import { Fragment, type ReactNode } from "react";
import { safeHref } from "./safe-url";

// Markdown subset for text blocks: paragraphs (blank line), line breaks, **bold**, *italic*,
// `code` and [label](url). Builds React nodes, never HTML strings, so nothing can inject markup.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const href = safeHref(mm[2]);
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {mm[1]}
          </a>
        ) : (
          mm[1]
        ),
      );
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MiniMarkdown({ source }: { source: string }) {
  const paras = source.replace(/\r\n/g, "\n").split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      {paras.map((p, pi) => (
        <p key={pi}>
          {p.split("\n").map((line, li) => (
            <Fragment key={li}>
              {li > 0 && <br />}
              {inline(line, `${pi}-${li}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
