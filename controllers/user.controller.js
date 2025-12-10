import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import { userPopulateFields } from "../utils/userPopulateFields.js";
import UserPost from "../models/UserPost.js";
import Comment from "../models/Comment.js";
import Community from "../models/Community.js";
import { postPopulateFields } from "../utils/postPopulateFields.js";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    let user = await User.findById(userId).select("-password -otp");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Find communities created by the user
    const createdCommunities = await Community.find({ createdBy: userId });

    // Convert user to plain object
    user = user.toObject();

    // Replace `communities` with only created communities
    user.communities = createdCommunities;

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, username, bio, bannerColor, location } = req.body;
    const user = await User.findById(req.user._id).select("-password -otp");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (bannerColor) user.bannerColor = bannerColor;
    if (name) user.name = name;
    if (username) user.username = username;
    if (bio) user.bio = bio;

    if (location) {
      user.location = {
        ...user.location?.toObject(), // keep existing
        ...location, // override only provided values
      };
    }

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

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id.toString();

    const loggedInUser = await User.findById(loggedInUserId).select(
      "following"
    );

    const users = await User.find()
      .select("-otp -password")
      .populate(userPopulateFields);

    // ❌ Remove logged-in user from the list
    const filteredUsers = users.filter(
      (u) => u._id.toString() !== loggedInUserId
    );

    const updatedUsers = filteredUsers.map((u) => {
      const isFollowing = loggedInUser.following.some(
        (id) => id.toString() === u._id.toString()
      );

      return {
        ...u._doc,
        isFollowing,
      };
    });

    res.json(updatedUsers);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const loggedInUserId = req.user._id.toString();
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch User
    const user = await User.findById(userId)
      .select("-otp -password")
      .populate(userPopulateFields);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // =====================================================
    // 🔵 Fetch communities CREATED by user
    // =====================================================
    const createdCommunities = await Community.find({ createdBy: userId })
      .populate([
        { path: "createdBy", select: "name username avatar" },
        { path: "members.user", select: "name username avatar" },
      ])
      .sort({ createdAt: -1 });

    // =====================================================
    // 🟢 Fetch communities JOINED by user
    // =====================================================
    const joinedCommunities = await Community.find({
      "members.user": userId,
    })
      .populate([
        { path: "createdBy", select: "name username avatar" },
        { path: "members.user", select: "name username avatar" },
      ])
      .sort({ createdAt: -1 });

    // Convert to plain object
    const userObj = user.toObject();

    // Inject both
    userObj.createdCommunities = createdCommunities;
    userObj.joinedCommunities = joinedCommunities;

    // =====================================================
    // Follow status
    // =====================================================
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === loggedInUserId
    );

    const isFollowedBy = user.following.some(
      (following) => following._id.toString() === loggedInUserId
    );

    res.json({
      ...userObj,
      isFollowing,
      isFollowedBy,
      isOwnProfile: loggedInUserId === userId.toString(),
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    if (targetId === userId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // Already following?
    if (user.following.includes(targetId)) {
      return res.json({ message: "Already following" });
    }

    user.following.push(targetId);
    target.followers.push(userId);

    await user.save();
    await target.save();

    res.json({ message: "Followed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    user.following.pull(targetId);
    target.followers.pull(userId);

    await user.save();
    await target.save();

    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "followers",
      "name username avatar"
    );

    res.json(user.followers);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "following",
      "name username avatar"
    );

    res.json(user.following);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // ---------- 1️⃣ Get user ----------
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ---------- 2️⃣ Delete Avatar + Banner from Cloudinary (if exists) ----------
    try {
      if (user.avatar && user.avatar.includes("cloudinary")) {
        const publicId = user.avatar.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      }
    } catch (err) {
      console.log("⚠️ Avatar deletion failed:", err.message);
    }

    // ---------- 3️⃣ Delete User Posts ----------
    const userPosts = await UserPost.find({ author: userId });

    for (const post of userPosts) {
      // delete images of posts
      if (post.image?.public_id) {
        try {
          await cloudinary.uploader.destroy(post.image.public_id);
        } catch (err) {
          console.log("⚠️ Post image deletion failed:", err.message);
        }
      }
    }

    await UserPost.deleteMany({ author: userId });

    // ---------- 4️⃣ Delete Comments Made by User Optional ----------
    await Comment.deleteMany({ user: userId });

    // ---------- 5️⃣ Remove user from followers/following lists ----------
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );

    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );

    // ---------- 6️⃣ Remove from communities (if exists) ----------
    await Community.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // ---------- 7️⃣ Delete user ----------
    await user.deleteOne();

    res.json({
      success: true,
      message: "Account deleted permanently.",
    });
  } catch (err) {
    console.error("❌ Error deleting account:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getAllLikedPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find posts where userId exists in likes array
    const posts = await UserPost.find({ likes: userId })
      .populate(postPopulateFields)
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "✅ Liked posts fetched successfully",
      posts,
    });
  } catch (error) {
    console.error("❌ Error fetching liked posts:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

