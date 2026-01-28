import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, addReaction, deleteMessage, editMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/:messageId/react", protectRoute, addReaction);
router.delete("/:id", protectRoute, deleteMessage);
router.patch("/:id", protectRoute, editMessage);

export default router;
