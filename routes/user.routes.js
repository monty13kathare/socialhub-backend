import express from "express";

import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import {
  deleteAccount,
  followUser,
  getAllLikedPosts,
  getAllUsers,
  getFollowers,
  getFollowing,
  getProfile,
  getUserById,
  unfollowUser,
  updateProfile,
} from "../controllers/user.controller.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/me", authMiddleware, getProfile);
router.put("/update", authMiddleware, upload.single("avatar"), updateProfile);
router.get("/all", authMiddleware, getAllUsers);
router.delete("/delete-account", authMiddleware, deleteAccount);
router.get("/likedPost", authMiddleware, getAllLikedPosts);


router.get("/:id", authMiddleware, getUserById);
router.put("/:id/follow", authMiddleware, followUser);
router.put("/:id/unfollow", authMiddleware, unfollowUser);
router.get("/:id/followers", authMiddleware, getFollowers);
router.get("/:id/following", authMiddleware, getFollowing);







export default router;
