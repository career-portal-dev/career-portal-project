import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as RouterType,
} from "express";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { adminSiteConfigController } from "../controllers/admin-site-config.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  SITE_IMAGE_MAX_BYTES,
  UPLOAD_DIR,
  parseSiteImageCategory,
  uploadSiteImage,
  type SiteImageCategory,
} from "../middleware/upload";
import { adminSiteConfigService } from "../services/admin-site-config.service";

/**
 * File names created by `uploadSiteImage`: site-<category>-<time>-<random>.<ext>, or the
 * older site-<time>-<random>.<ext> (uploaded before images were grouped).
 */
const SITE_IMAGE_NAME = /^site-(?:(hero|culture|logo)-)?\d+-\d+\.(png|jpg|webp|svg)$/;

/** Group of an older, ungrouped upload: where the saved configuration uses it (default hero). */
function legacyCategory(url: string, images: Record<string, unknown>): SiteImageCategory {
  if (images.logo === url) return "logo";
  if (images.culture === url) return "culture";
  return "hero";
}

export const adminSiteConfigRoutes: RouterType = Router();
adminSiteConfigRoutes.use(requireAuth, requireRole("ADMIN"));
adminSiteConfigRoutes.get("/", adminSiteConfigController.get);
adminSiteConfigRoutes.put("/", adminSiteConfigController.save);
adminSiteConfigRoutes.post("/reset", adminSiteConfigController.reset);

// POST /api/admin/site-config/upload — stores a site image in uploads/ and returns its URL,
// so the configuration keeps a short /uploads/... link instead of an embedded image.
adminSiteConfigRoutes.post(
  "/upload",
  (req: Request, res: Response, next: NextFunction) => {
    if (!parseSiteImageCategory(req.query.category)) {
      res.status(400).json({
        success: false,
        code: "INVALID_CATEGORY",
        error: "category must be hero, culture or logo",
      });
      return;
    }
    uploadSiteImage.single("image")(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          success: false,
          code: "FILE_TOO_LARGE",
          error: `Image must not exceed ${SITE_IMAGE_MAX_BYTES / (1024 * 1024)}MB`,
        });
        return;
      }
      res.status(400).json({
        success: false,
        code: "INVALID_IMAGE",
        error: error instanceof Error ? error.message : "Invalid image file",
      });
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, code: "INVALID_IMAGE", error: "Image file is required" });
      return;
    }
    res.json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
  },
);

// GET /api/admin/site-config/uploads — uploaded site images with their group, newest first.
adminSiteConfigRoutes.get("/uploads", async (_req: Request, res: Response) => {
  try {
    const names = (await fs.readdir(UPLOAD_DIR)).filter((name) => SITE_IMAGE_NAME.test(name));
    const savedImages = (await adminSiteConfigService.get()).images;
    const items = await Promise.all(
      names.map(async (name) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, name));
        const url = `/uploads/${name}`;
        const grouped = parseSiteImageCategory(SITE_IMAGE_NAME.exec(name)?.[1]);
        return {
          name,
          url,
          category: grouped ?? legacyCategory(url, savedImages),
          size: stat.size,
          uploadedAt: stat.mtime.toISOString(),
        };
      }),
    );
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    res.json({ success: true, data: items });
  } catch (error) {
    console.error("GET /api/admin/site-config/uploads error:", error);
    res.status(500).json({ success: false, error: "Failed to list uploaded images" });
  }
});

// DELETE /api/admin/site-config/uploads/:name — deletes an uploaded site image, unless the
// saved site configuration still uses it (the public site would lose the image).
adminSiteConfigRoutes.delete("/uploads/:name", async (req: Request, res: Response) => {
  const name = req.params.name ?? "";
  if (!SITE_IMAGE_NAME.test(name)) {
    res.status(400).json({ success: false, code: "INVALID_NAME", error: "Invalid image name" });
    return;
  }
  try {
    const saved = JSON.stringify(await adminSiteConfigService.get());
    if (saved.includes(`/uploads/${name}`)) {
      res.status(409).json({
        success: false,
        code: "IMAGE_IN_USE",
        error: "The image is used by the saved site configuration",
      });
      return;
    }
    await fs.unlink(path.join(UPLOAD_DIR, name));
    res.json({ success: true, data: { name } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      res.status(404).json({ success: false, code: "NOT_FOUND", error: "Image not found" });
      return;
    }
    console.error("DELETE /api/admin/site-config/uploads/:name error:", error);
    res.status(500).json({ success: false, error: "Failed to delete image" });
  }
});

export default adminSiteConfigRoutes;
