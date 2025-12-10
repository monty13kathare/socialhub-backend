import CommunityPost from "../models/CommunityPost.js";
import { uploadSingleImage } from "../utils/cloudinaryUpload.js";

export const createCommunityPost = async (req, res) => {
  try {
    const userId = req.user._id;
    let { content, type, code, poll, achievement, communityId } = req.body; // ✅ use let instead of const

    // ✅ Safely parse JSON fields
    if (code && typeof code === "string") code = JSON.parse(code);
    if (poll && typeof poll === "string") poll = JSON.parse(poll);
    if (achievement && typeof achievement === "string")
      achievement = JSON.parse(achievement);

    // ✅ Fix poll.options structure if user sends array of strings
    if (poll && Array.isArray(poll.options)) {
      poll.options = poll.options.map((opt) =>
        typeof opt === "string" ? { text: opt } : opt
      );
    }

    let imageData = null;

    // ✅ Upload single image if exists
    if (req.file) {
      const uploadResult = await uploadSingleImage(
        req.file.buffer, // file buffer
        req.file.mimetype, // MIME type
        "posts" // Cloudinary folder
      );
      imageData = {
        public_id: uploadResult.public_id,
        url: uploadResult.url,
      };
    }

    // ✅ Create post document
    const post = new CommunityPost({
      author: userId,
      community: communityId || null,
      type: type || "text",
      content,
      code: code || null,
      poll: poll || null,
      achievement: achievement || null,
      image: imageData, // ✅ single image object
    });

    const savedPost = await post.save();

    // ✅ Populate user info (avatar, username, name)
    const populatedPost = await CommunityPost.findById(savedPost._id)
      .populate("author", "name username avatar") // select only required fields
      .populate("community", "name coverImage"); // optional: show community info

    res.status(201).json({
      message: "✅ Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    console.error("❌ Error creating post:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getPostByCommunityId = async (req, res) => {
  try {
    const { communityId } = req.params;

    // ✅ Find all posts with this community ID
    const posts = await CommunityPost.find({ community: communityId })
      .populate("author", "name username avatar role")
      // .populate("community", "name")
      .sort({ createdAt: -1 }); // latest first

    if (!posts || posts.length === 0) {
      return res
        .status(404)
        .json({ message: "No posts found for this community" });
    }

    res.status(200).json({
      message: "✅ Posts fetched successfully",
      posts,
    });
  } catch (error) {
    console.error("❌ Error fetching community posts:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await CommunityPost.find()
      .populate("author", "name username avatar role")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const posts = await CommunityPost.find({ user: req.params.id })
      .populate("user", "name username avatar")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id;
    const idx = post.likes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (idx === -1) {
      post.likes.push(userId);
      await post.save();
      return res.json({ message: "Post liked", post });
    } else {
      post.likes.splice(idx, 1);
      await post.save();
      return res.json({ message: "Post unliked", post });
    }
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Only the post owner can delete
    if (post.user.toString() !== userId.toString())
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });

    // ✅ Delete Cloudinary images
    if (post.images && post.images.length > 0) {
      await deleteImages(post.images.map((img) => img.public_id));
    }

    await post.deleteOne();

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Only the post owner can edit
    if (post.user.toString() !== userId.toString())
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });

    const { content, type, poll, achievement, code, removeImages } = req.body;

    // ✅ Handle removed images
    if (removeImages && removeImages.length > 0) {
      const imagesToRemove = JSON.parse(removeImages);
      await deleteImages(imagesToRemove.map((img) => img.public_id));

      post.images = post.images.filter(
        (img) => !imagesToRemove.some((r) => r.public_id === img.public_id)
      );
    }

    // ✅ Handle new image uploads
    if (req.files && req.files.length > 0) {
      const uploaded = await uploadMultipleImages(req.files, "community-posts");
      const newImages = uploaded.map((i) => ({
        public_id: i.public_id,
        url: i.url,
      }));
      post.images.push(...newImages);
    }

    // ✅ Update text/code/poll/achievement fields
    if (content) post.content = content;
    if (type) post.type = type;
    if (poll) post.poll = JSON.parse(poll);
    if (achievement) post.achievement = JSON.parse(achievement);
    if (code) post.code = JSON.parse(code);

    const updated = await post.save();

    res.json({ message: "Post updated successfully", post: updated });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
