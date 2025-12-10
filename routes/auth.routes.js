import express from "express";
import {
  register,
  verifyOtp,
  login,
  completeProfile,
} from "../controllers/auth.controller.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/complete-profile", upload.single("avatar"), completeProfile);

export default router;
