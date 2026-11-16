import QRCode from "qrcode";

// QR codes for a profile URL, generated entirely in the browser (SPEC: "generated on the FE").

export interface QrOptions {
  /** Dark modules. Keep it dark on light for scanners. */
  fg?: string;
  bg?: string;
  /** Quiet zone in modules (4 is the spec minimum for reliable scanning). */
  margin?: number;
}

const base = (o: QrOptions) => ({
  errorCorrectionLevel: "M" as const,
  margin: o.margin ?? 4,
  color: { dark: o.fg ?? "#111111", light: o.bg ?? "#ffffff" },
});

export function qrSvg(text: string, o: QrOptions = {}): Promise<string> {
  return QRCode.toString(text, { ...base(o), type: "svg" });
}

export function qrPngDataUrl(text: string, size = 1024, o: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(text, { ...base(o), type: "image/png", width: size });
}

/** Public URL for a username. Uses NEXT_PUBLIC_SITE_URL, else the current origin. */
export function profileUrl(username: string): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = env ? env.replace(/\/$/, "") : typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/${username}`;
}

export function downloadHref(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
