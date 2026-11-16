import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { qrSvg } from "../qr";

describe("qr", () => {
  it("produces an SVG with a white ground and dark modules", async () => {
    const svg = await qrSvg("http://localhost:3000/demo");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#111111"');
  });
  it("decodes back to the exact URL", () => {
    const url = "https://tautan.example/sekar.ayu?tab=musik";
    const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
    // rasterise the module matrix (4px per module, 4-module quiet zone) and decode it
    const n = qr.modules.size, scale = 4, quiet = 4, w = (n + quiet * 2) * scale;
    const rgba = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (qr.modules.get(y, x))
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const i = (((y + quiet) * scale + dy) * w + (x + quiet) * scale + dx) * 4;
              rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
            }
    expect(jsQR(rgba, w, w)?.data).toBe(url);
  });
});
