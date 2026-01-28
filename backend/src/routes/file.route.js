import express from "express";
import {
  uploadFile,
  generateDownloadUrl,
  getFileStats,
} from "../controllers/file.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Upload file to Cloudinary
router.post("/upload", protectRoute, uploadFile);

// Generate presigned URL for downloading files (if needed)
router.get("/download/:fileKey", protectRoute, generateDownloadUrl);

// Get file upload statistics
router.get("/stats", protectRoute, getFileStats);

export default router;
