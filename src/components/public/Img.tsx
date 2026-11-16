import { preload } from "react-dom";
import type { MediaInfo } from "./env";

/**
 * A plain <img> for public cards (no client JS). With the BE's media info for an upload it gets
 * width/height (the box is reserved before the bytes arrive: no layout shift) and a srcset of the
 * ready ?w= variants (AVIF/WebP negotiated by Accept). `priority` preloads with fetchpriority=high
 * (avatar, first image); everything else is lazy.
 */
export function Img({
  src,
  alt,
  media,
  width,
  height,
  sizes,
  priority = false,
  className,
  style,
}: {
  src: string;
  alt: string;
  media?: MediaInfo;
  /** fallback size when there's no media info (fixed-size slots like the avatar) */
  width?: number;
  height?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const w = media?.width ?? width;
  const h = media?.height ?? height;
  const variants = (media?.widths ?? []).filter((x) => x < (media?.width ?? Infinity));
  const join = src.includes("?") ? "&" : "?";
  const srcSet = variants.length ? [...variants.map((x) => `${src}${join}w=${x} ${x}w`), `${src} ${media!.width}w`].join(", ") : undefined;
  if (priority) preload(src, { as: "image", fetchPriority: "high", ...(srcSet ? { imageSrcSet: srcSet, imageSizes: sizes } : {}) });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={w}
      height={h}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? undefined : "async"}
    />
  );
}
