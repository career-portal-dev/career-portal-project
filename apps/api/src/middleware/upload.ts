import fs from "node:fs";
import path from "node:path";
import multer from "multer";

/**
 * Thư mục lưu file upload. Mặc định cạnh app api (apps/api/uploads); production (IIS)
 * đặt UPLOAD_DIR ra ngoài thư mục release để file không bị mất khi deploy lại.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../../uploads");

// Đảm bảo thư mục tồn tại trước khi multer ghi file.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const cvStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `cv-${unique}${ext}`);
  },
});

/** Ảnh cho Cấu hình giao diện (logo, ảnh bìa, văn hoá, băng ảnh): tối đa 15MB. */
export const SITE_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

/** Allowed site image types; the stored extension comes from the type, not the file name. */
const SITE_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

/** Upload groups of the Images tab; each picker only lists its own group. */
export const SITE_IMAGE_CATEGORIES = ["hero", "culture", "logo", "about", "story", "gallery"] as const;
export type SiteImageCategory = (typeof SITE_IMAGE_CATEGORIES)[number];

export function parseSiteImageCategory(value: unknown): SiteImageCategory | null {
  return SITE_IMAGE_CATEGORIES.find((category) => category === value) ?? null;
}

export const uploadSiteImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    // Name: site-<category>-<time>-<random>.<ext>; the route validates ?category= first.
    filename: (req, file, cb) => {
      const category = parseSiteImageCategory(req.query.category) ?? "hero";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `site-${category}-${unique}${SITE_IMAGE_EXTENSIONS[file.mimetype] ?? ".img"}`);
    },
  }),
  limits: { fileSize: SITE_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!SITE_IMAGE_EXTENSIONS[file.mimetype]) {
      cb(new Error("Only PNG, JPG, WebP or SVG images are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Ảnh bìa tin tức: cùng giới hạn và định dạng với ảnh Cấu hình giao diện (khớp frontend). */
export const COVER_MAX_BYTES = SITE_IMAGE_MAX_BYTES;

/**
 * Uploaded news cover files: news-<time>-<random>.<ext>. Older uploads kept the extension of
 * the original file name, so any short extension is accepted when listing or deleting.
 */
export const NEWS_IMAGE_NAME = /^news-\d+-\d+\.[a-z0-9]{2,5}$/;

/** PNG, JPG, WebP or SVG, tối đa 15MB; đuôi file lấy theo định dạng thật. */
export const uploadCover = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `news-${unique}${SITE_IMAGE_EXTENSIONS[file.mimetype] ?? ".img"}`);
    },
  }),
  limits: { fileSize: COVER_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!SITE_IMAGE_EXTENSIONS[file.mimetype]) {
      cb(new Error("Only PNG, JPG, WebP or SVG images are allowed"));
      return;
    }
    cb(null, true);
  },
});

const CV_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Stores candidate CV files alongside other public uploads, up to 5MB. */
export const uploadCv = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!CV_EXTENSIONS.has(extension) || !CV_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only PDF, DOC or DOCX files are allowed"));
      return;
    }
    cb(null, true);
  },
});
