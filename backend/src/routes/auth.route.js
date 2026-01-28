import express from "express";
import {
  checkAuth,
  login,
  logout,
  logoutAll,
  refreshAccessToken,
  signup,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

import { body } from "express-validator";
import { validateRequest } from "../middleware/validator.middleware.js";

router.post(
  "/signup",
  [
    body("fullName").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Must be a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validateRequest,
  signup
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Must be a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  login
);
router.post("/logout", logout);
router.post("/logout-all", protectRoute, logoutAll);

// Refresh token endpoint - no auth middleware needed (uses refresh token)
router.post("/refresh", refreshAccessToken);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

export default router;
