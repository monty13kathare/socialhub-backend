import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import cloudinary from "../config/cloudinary.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // ✅ Basic validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Create user
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
    });

    // ✅ Send OTP email
    await sendEmail(email, "Your OTP Code", `Your verification code is ${otp}`);

    res.status(201).json({
      message: "OTP sent to email for verification",
      email,
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.isVerified = true;
    user.otp = null;
    await user.save();

    res.json({ message: "Email verified successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};



export const completeProfile = async (req, res) => {
  try {
    const { email, username, bio, bannerColor } = req.body;
    const user = await User.findOne({ email }).select("-password -otp");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (bannerColor) user.bannerColor = bannerColor;
    if (username) user.username = username;
    if (bio) user.bio = bio;

    // if file uploaded via multer memoryStorage -> req.file.buffer exists
    if (req.file && req.file.buffer) {
      const base64Data = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;
      const uploadRes = await cloudinary.uploader.upload(base64Data, {
        folder: "avatars",
      });
      user.avatar = uploadRes.secure_url;
    }

    user.isProfileComplete = true;
    await user.save();

    res.json({ message: "Profile completed successfully", user });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
