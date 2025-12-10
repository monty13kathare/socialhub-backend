import express from "express";

import { authMiddleware } from "../middleware/auth.js"; // optional
import {
  createCommunity,
  deleteAllUserCommunities,
  deleteCommunity,
  getAllCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
} from "../controllers/community.controller.js";
import { getPostByCommunityId } from "../controllers/communityPost.controller.js";

const router = express.Router();

// POST - Create a new community
router.post("/create", authMiddleware, createCommunity);

// GET - Fetch all communities
router.get("/", getAllCommunities);
router.delete("/delete-all", authMiddleware, deleteAllUserCommunities);


// GET - Fetch single community by ID
router.get("/:id", getCommunityById);

router.post("/:communityId/join", authMiddleware, joinCommunity);

router.put("/:communityId/leave", authMiddleware, leaveCommunity);

router.get("/:communityId/post", authMiddleware, getPostByCommunityId);
router.patch("/:id", authMiddleware, updateCommunity);
router.delete("/:id", authMiddleware, deleteCommunity);



export default router;
