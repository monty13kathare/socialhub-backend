import express from "express";
import multer from "multer";
import {
  addComment,
  addReply,
  createUserPost,
  deleteAllUserPosts,
  deleteComment,
  deletePost,
  getAllPosts,
  likeComment,
  sharePost,
  toggleLike,
  updatePost,
  votePoll,
} from "../controllers/userPost.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
const upload = multer(); // memory storage for Cloudinary

router
  .route("/")
  .post(authMiddleware, upload.single("image"), createUserPost)
  .get(authMiddleware, getAllPosts);

router.delete("/delete-all", authMiddleware, deleteAllUserPosts);

router
  .route("/:id")
  .put(authMiddleware, upload.single("image"), updatePost)
  .delete(authMiddleware, deletePost);

router.post("/:id/share", authMiddleware, sharePost);
router.post("/:id/comment", authMiddleware, addComment);
router.delete("/:postId/comment/:commentId", authMiddleware, deleteComment);
router.put("/:id/like", authMiddleware, toggleLike);

router.post("/:postId/comments/:commentId/reply", authMiddleware, addReply);
router.put("/:postId/comments/:commentId/like", authMiddleware, likeComment);

router.post("/:postId/vote", authMiddleware, votePoll);




export default router;
