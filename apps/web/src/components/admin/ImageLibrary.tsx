import { Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/request";
import { useI18n, type Localized } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Image types accepted by the image uploads (site settings and news covers). */
const UPLOAD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
/** Max size of one uploaded image; matches the API limit. */
const UPLOAD_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

const uploadTooLarge: Localized = {
  vi: "Ảnh quá lớn, vui lòng chọn ảnh tối đa 15MB.",
  en: "The image is too large, please pick one up to 15MB.",
};

const uploadInvalidType: Localized = {
  vi: "Định dạng không hỗ trợ. Dùng PNG, JPG, WebP hoặc SVG.",
  en: "Unsupported format. Use PNG, JPG, WebP or SVG.",
};

/**
 * File picker that accepts several images at once, validates each one, uploads them with
 * `upload` (one after another, with progress) and hands back their /uploads/... URLs in
 * selection order, so the data stores links instead of embedded images.
 */
export function ImageUploadButton({
  label,
  upload,
  onUploaded,
  disabled,
  onBusyChange,
}: {
  label: Localized;
  /** Uploads one file and resolves to its URL. */
  upload: (file: File) => Promise<string>;
  onUploaded: (urls: string[]) => void;
  disabled?: boolean;
  /** Called with true when an upload starts and false when it ends (e.g. to block saving). */
  onBusyChange?: (busy: boolean) => void;
}) {
  const { tr } = useI18n();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const uploadOne = async (file: File): Promise<string | null> => {
    if (!UPLOAD_IMAGE_TYPES.includes(file.type)) {
      toast.error(`${file.name}: ${tr(uploadInvalidType)}`);
      return null;
    }
    if (file.size > UPLOAD_IMAGE_MAX_BYTES) {
      toast.error(`${file.name}: ${tr(uploadTooLarge)}`);
      return null;
    }
    try {
      return await upload(file);
    } catch (error) {
      toast.error(
        `${file.name}: ${
          error instanceof ApiError && (error.code === "FILE_TOO_LARGE" || error.status === 413)
            ? tr(uploadTooLarge)
            : error instanceof Error
              ? error.message
              : tr({ vi: "Không tải ảnh lên được.", en: "Failed to upload image." })
        }`,
      );
      return null;
    }
  };

  const onFiles = async (files: File[]) => {
    setProgress({ done: 0, total: files.length });
    onBusyChange?.(true);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const url = await uploadOne(file);
        if (url) urls.push(url);
        setProgress((current) => (current ? { ...current, done: current.done + 1 } : current));
      }
    } finally {
      setProgress(null);
      onBusyChange?.(false);
    }
    if (urls.length > 0) onUploaded(urls);
  };

  const busy = !!progress || !!disabled;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        className={cn(
          // `relative` keeps the sr-only (absolute) file input inside scrolling containers;
          // without it the input escapes to <body> and adds a page-level scrollbar.
          "relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {progress
          ? tr({
              vi: `Đang tải ${progress.done}/${progress.total}…`,
              en: `Uploading ${progress.done}/${progress.total}…`,
            })
          : tr(label)}
        <input
          type="file"
          multiple
          accept={UPLOAD_IMAGE_TYPES.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void onFiles(files);
            e.target.value = "";
          }}
        />
      </label>
      <span className="text-xs text-muted-foreground">
        {tr({
          vi: "Chọn được nhiều ảnh. PNG, JPG, WebP hoặc SVG, tối đa 15MB mỗi ảnh.",
          en: "You can pick several images. PNG, JPG, WebP or SVG, up to 15MB each.",
        })}
      </span>
    </div>
  );
}

/** One image tile of an image library: selectable, with an optional remove button. */
export function LibraryTile({
  src,
  label,
  selected,
  onSelect,
  onRemove,
  removeLabel,
  fit = "cover",
}: {
  src: string;
  label: string;
  selected: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  fit?: "cover" | "contain";
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 text-left transition-colors",
        selected ? "border-accent" : "border-border hover:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className="block w-full text-left"
      >
        <img
          src={src}
          alt={label}
          loading="lazy"
          className={cn(
            "h-20 w-full",
            fit === "contain" ? "bg-white object-contain p-2" : "bg-surface object-cover",
          )}
        />
        <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{label}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
