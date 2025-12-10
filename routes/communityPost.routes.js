import express from "express";

import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import { createCommunityPost } from "../controllers/communityPost.controller.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", authMiddleware, upload.single("image"), createCommunityPost);

export default router;
