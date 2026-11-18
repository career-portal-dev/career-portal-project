import { useEffect } from "react";

import { useSiteConfig } from "@/lib/site-config";

const ICON_SIZE = 128;

/** Draw the logo centred on a transparent square so browsers don't stretch it. */
function squareIcon(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (!w || !h) return resolve(null);
        const canvas = document.createElement("canvas");
        canvas.width = ICON_SIZE;
        canvas.height = ICON_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        const scale = Math.min(ICON_SIZE / w, ICON_SIZE / h);
        const dw = w * scale;
        const dh = h * scale;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (ICON_SIZE - dw) / 2, (ICON_SIZE - dh) / 2, dw, dh);
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
