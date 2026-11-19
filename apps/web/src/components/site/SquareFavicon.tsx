import { useEffect } from "react";

import { useSiteConfig } from "@/lib/site-config";

const ICON_SIZE = 128;
/** Wide logos are stretched vertically toward this width/height ratio... */
const TARGET_ASPECT = 2.2;
/** ...by at most this factor, so the logo never looks distorted. */
const MAX_STRETCH = 1.3;
/** Working resolution for background removal (keeps large logos fast). */
const WORK_MAX = 512;
/** A pixel counts as background when it is (near) white or (near) transparent. */
const isBackground = (data: Uint8ClampedArray, k: number) =>
  data[k + 3]! < 24 || (data[k]! > 236 && data[k + 1]! > 236 && data[k + 2]! > 236);

/**
 * Makes the logo's outer background transparent: flood-fills near-white pixels connected
 * to the image edge (white areas inside the logo are kept). Returns the content bounds.
 */
function clearOuterBackground(image: ImageData) {
  const { width: w, height: h, data } = image;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const i = y * w + x;
    if (seen[i] || !isBackground(data, i * 4)) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    data[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  let top = h;
  let bottom = -1;
  let left = w;
  let right = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! < 24) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return bottom < 0 ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/**
 * Builds the tab icon: removes the logo's outer white/empty background, trims to the
 * logo itself, and centres it on a transparent square at its own aspect ratio.
 */
function squareIcon(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (!w || !h) return resolve(null);

        const ratio = Math.min(1, WORK_MAX / Math.max(w, h));
        const work = document.createElement("canvas");
        work.width = Math.max(1, Math.round(w * ratio));
        work.height = Math.max(1, Math.round(h * ratio));
        const wctx = work.getContext("2d", { willReadFrequently: true });
        if (!wctx) return resolve(null);
        wctx.imageSmoothingQuality = "high";
        wctx.drawImage(img, 0, 0, work.width, work.height);
        const pixels = wctx.getImageData(0, 0, work.width, work.height);
        const bounds = clearOuterBackground(pixels) ?? {
          x: 0,
          y: 0,
          w: work.width,
          h: work.height,
        };
        wctx.putImageData(pixels, 0, 0);

        const canvas = document.createElement("canvas");
        canvas.width = ICON_SIZE;
        canvas.height = ICON_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        const scale = Math.min(ICON_SIZE / bounds.w, ICON_SIZE / bounds.h);
        const dw = bounds.w * scale;
        // Wide logos end up as a thin strip in the square tab icon. Stretch them a little
        // vertically (at most MAX_STRETCH, never past the square) so they read taller
        // without cropping anything; at 16px the stretch is not noticeable.
        const aspect = bounds.w / bounds.h;
        const stretch = Math.min(MAX_STRETCH, Math.max(1, aspect / TARGET_ASPECT));
        const dh = Math.min(ICON_SIZE, bounds.h * scale * stretch);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          work,
          bounds.x,
          bounds.y,
          bounds.w,
          bounds.h,
          (ICON_SIZE - dw) / 2,
          (ICON_SIZE - dh) / 2,
          dw,
          dh,
        );
        resolve(canvas.toDataURL("image/png"));
      } catch {
        // Cross-origin images taint the canvas; keep the original favicon.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Keeps the tab icon at the logo's own aspect ratio. Purely presentational:
 * it only rewrites the `<link rel="icon">` href in the browser.
 */
export function SquareFavicon() {
  const { config } = useSiteConfig();
  const logo = config.images.logo?.trim();

  useEffect(() => {
    if (!logo) return;
    let cancelled = false;
    let observer: MutationObserver | null = null;

    void squareIcon(logo).then((icon) => {
      if (cancelled || !icon) return;
      const apply = () => {
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((link) => {
          if (link.href !== icon) {
            link.href = icon;
            link.type = "image/png";
          }
        });
      };
      apply();
      // Route head updates may reset the link to the raw logo; re-apply when that happens.
      observer = new MutationObserver(apply);
      observer.observe(document.head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href"],
      });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [logo]);

  return null;
}
