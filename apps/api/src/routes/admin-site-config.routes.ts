import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as RouterType,
} from "express";
import multer from "multer";
import { adminSiteConfigController } from "../controllers/admin-site-config.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { SITE_IMAGE_MAX_BYTES, uploadSiteImage } from "../middleware/upload";

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

export default adminSiteConfigRoutes;
