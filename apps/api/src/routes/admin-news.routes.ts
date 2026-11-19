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
import { db } from "@career-portal/database";
import { adminNewsController } from "../controllers/admin-news.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { COVER_MAX_BYTES, NEWS_IMAGE_NAME, UPLOAD_DIR, uploadCover } from "../middleware/upload";

export const adminNewsRoutes: RouterType = Router();
adminNewsRoutes.use(requireAuth, requireRole("ADMIN", "RECRUITER"));

// GET /api/admin/news — danh sách bài viết (phân trang, lọc, tìm kiếm)
adminNewsRoutes.get("/stats", adminNewsController.getStats);
adminNewsRoutes.get("/", adminNewsController.getPaginated);

// GET /api/admin/news/categories — chuyên mục tin tức từ Taxonomy type=newsCategory
adminNewsRoutes.get("/categories", adminNewsController.categories);
adminNewsRoutes.post("/categories", adminNewsController.createCategory);
adminNewsRoutes.delete("/categories/:id", adminNewsController.deleteCategory);

/** Runs the cover upload and turns multer errors into JSON 400s (instead of a 500 HTML page). */
const handleCoverUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadCover.single("cover")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        code: "FILE_TOO_LARGE",
        error: `Image must not exceed ${COVER_MAX_BYTES / (1024 * 1024)}MB`,
      });
      return;
    }
    res.status(400).json({
      success: false,
      code: "INVALID_IMAGE",
      error: error instanceof Error ? error.message : "Invalid image file",
    });
  });
};

// POST /api/admin/news/upload — tải ảnh bìa lên uploads/
adminNewsRoutes.post("/upload", handleCoverUpload, adminNewsController.uploadCover);

// GET /api/admin/news/uploads — uploaded news cover images, newest first (the news form's
// image library). Registered before /:id so "uploads" is not read as an article id.
adminNewsRoutes.get("/uploads", async (_req: Request, res: Response) => {
  try {
    const names = (await fs.readdir(UPLOAD_DIR)).filter((name) => NEWS_IMAGE_NAME.test(name));
    const items = await Promise.all(
      names.map(async (name) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, name));
        return {
          name,
          url: `/uploads/${name}`,
          size: stat.size,
          uploadedAt: stat.mtime.toISOString(),
        };
      }),
    );
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    res.json({ success: true, data: items });
  } catch (error) {
    console.error("GET /api/admin/news/uploads error:", error);
    res.status(500).json({ success: false, error: "Failed to list uploaded images" });
  }
});

// DELETE /api/admin/news/uploads/:name — deletes an uploaded news image, unless an article
// (not deleted) still uses it as its cover or inside its content.
adminNewsRoutes.delete("/uploads/:name", async (req: Request, res: Response) => {
  const name = req.params.name ?? "";
  if (!NEWS_IMAGE_NAME.test(name)) {
    res.status(400).json({ success: false, code: "INVALID_NAME", error: "Invalid image name" });
    return;
  }
  const url = `/uploads/${name}`;
  try {
    const [usage] = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM news
      WHERE isdelete = false AND ("coverUrl" = ${url} OR body::text LIKE ${`%${url}%`})`;
    if (Number(usage?.count ?? 0) > 0) {
      res.status(409).json({
        success: false,
        code: "IMAGE_IN_USE",
        error: "The image is used by an article",
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
    console.error("DELETE /api/admin/news/uploads/:name error:", error);
    res.status(500).json({ success: false, error: "Failed to delete image" });
  }
});

// GET /api/admin/news/:id — chi tiết bài viết (sau /categories để không bị bắt sai)
adminNewsRoutes.get("/:id", adminNewsController.getDetail);

// CRUD
adminNewsRoutes.post("/", adminNewsController.create);
adminNewsRoutes.put("/:id", adminNewsController.update);
adminNewsRoutes.patch("/:id", adminNewsController.update);
adminNewsRoutes.delete("/:id", adminNewsController.delete);

export default adminNewsRoutes;