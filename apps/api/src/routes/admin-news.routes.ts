import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as RouterType,
} from "express";
import multer from "multer";
import { adminNewsController } from "../controllers/admin-news.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { COVER_MAX_BYTES, uploadCover } from "../middleware/upload";

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

// GET /api/admin/news/:id — chi tiết bài viết (sau /categories để không bị bắt sai)
adminNewsRoutes.get("/:id", adminNewsController.getDetail);

// CRUD
adminNewsRoutes.post("/", adminNewsController.create);
adminNewsRoutes.put("/:id", adminNewsController.update);
adminNewsRoutes.patch("/:id", adminNewsController.update);
adminNewsRoutes.delete("/:id", adminNewsController.delete);

export default adminNewsRoutes;