import cloudinary from "../config/cloudinary.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import UserPost from "../models/UserPost.js";
import { uploadSingleImage } from "../utils/cloudinaryUpload.js";
import { postPopulateFields } from "../utils/postPopulateFields.js";



// ------------------------ UserPost Controller -------------------------------------------
export const createUserPost = async (req, res) => {
  try {
    const userId = req.user._id;

    let {
      content,
      type,
      tags,
      code,
      poll,
      achievement,
      privacy,
      taggedUsers,
      location,
    } = req.body;

    // Parse JSON fields (if sent as stringified JSON)
    if (tags && typeof tags === "string") tags = JSON.parse(tags);
    if (code && typeof code === "string") code = JSON.parse(code);
    if (poll && typeof poll === "string") poll = JSON.parse(poll);
    if (achievement && typeof achievement === "string")
      achievement = JSON.parse(achievement);
    if (taggedUsers && typeof taggedUsers === "string")
      taggedUsers = JSON.parse(taggedUsers);

    // Handle image upload if provided
    let image = {};
    if (req.file) {
      const uploaded = await uploadSingleImage(
        req.file.buffer,
        req.file.mimetype,
        "posts"
      );
      image = {
        public_id: uploaded.public_id,
        url: uploaded.url,
      };
    }

    const newPost = await UserPost.create({
      content,
      type,
      author: userId,
      tags,
      code,
      poll,
      achievement,
      privacy,
      taggedUsers,
      location,
      image,
    });

    // ⭐ Add post to user's posts array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: newPost._id },
    });

    const populatedPost = await newPost.populate(
      "author",
      "name username avatar"
    );

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    console.error("❌ Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const getAllPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;

    const query = cursor
      ? { _id: { $lt: cursor } } // load posts older than last cursor
      : {};

    const posts = await UserPost.find(query)
      .populate(postPopulateFields)
      .sort({ _id: -1 }) // newest first, stable for cursor pagination
      .limit(limit + 1); // load 1 extra to detect hasMore

    let hasMore = false;

    if (posts.length > limit) {
      hasMore = true;
      posts.pop(); // remove extra post
    }

    // next cursor = last post's id
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

    res.status(200).json({
      success: true,
      count: posts.length,
      hasMore,
      nextCursor,
      posts,
    });
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    let post = await UserPost.findById(id)
      .populate("author", "name username avatar")
      .populate("taggedUsers", "name username avatar")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "name username avatar"
          },
          {
            path: "likes",
            select: "name username avatar"
          },
          {
            path: "replies.user",
            select: "name username avatar"
          }
        ]
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      post,
    });

  } catch (error) {
    console.error("❌ Error fetching post by ID:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await UserPost.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Only author can update
    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Handle image update
    if (req.file) {
      const uploaded = await uploadSingleImage(
        req.file.buffer,
        req.file.mimetype,
        "posts"
      );
      req.body.image = {
        public_id: uploaded.public_id,
        url: uploaded.url,
      };
    }

    const updatedPost = await UserPost.findByIdAndUpdate(postId, req.body, {
      new: true,
      runValidators: true,
    }).populate("author", "name username avatar");

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("❌ Error updating post:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await UserPost.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Only author can delete
    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // ✅ Delete image from Cloudinary if it exists
    if (post.image && post.image.public_id) {
      try {
        await cloudinary.uploader.destroy(post.image.public_id);
        console.log("🧹 Deleted image from Cloudinary:", post.image.public_id);
      } catch (cloudErr) {
        console.error(
          "⚠️ Failed to delete image from Cloudinary:",
          cloudErr.message
        );
      }
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Like And unLike Post
export const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    let post = await UserPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Toggle like
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      post.likes.push(userId);
    }

    await post.save();

    // Re-fetch fully populated post
    const updatedPost = await UserPost.findById(postId)
      .populate("author", "name username avatar")
      .populate("taggedUsers", "name username avatar")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "name username avatar" },
          { path: "likes", select: "name username avatar" },
          { path: "replies.user", select: "name username avatar" },
        ],
      });

    res.json({
      message: alreadyLiked ? "Post unliked" : "Post liked",
      post: updatedPost,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Share Post
export const sharePost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await UserPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.shares.push({
      user: req.user._id,
      sharedAt: new Date(),
    });

    await post.save();

    res.json({ message: "Post shared successfully", post });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Vote Poll
export const votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const post = await UserPost.findById(req.params.postId);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!post.poll)
      return res.status(400).json({ message: "This post is not a poll" });

    // Already voted?
    if (post.poll.userVoted.includes(userId)) {
      return res.status(400).json({ message: "You already voted!" });
    }

    // Update vote count
    const currentVotes = post.poll.votes.get(String(optionIndex)) || 0;
    post.poll.votes.set(String(optionIndex), currentVotes + 1);

    post.poll.totalVotes += 1;
    post.poll.userVoted.push(userId);

    await post.save();

    return res.json({
      message: "Vote submitted",
      votes: Object.fromEntries(post.poll.votes),
      totalVotes: post.poll.totalVotes,
      userVoted: post.poll.userVoted,
    });
  } catch (error) {
    res.status(500).json({ message: "Error voting", error: error.message });
  }
};

// Delete All Post
export const deleteAllUserPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all posts created by user
    const posts = await UserPost.find({ author: userId });

    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: "No posts found for this user",
      });
    }

    // OPTIONAL: Delete images from Cloudinary if exist
    for (const post of posts) {
      if (post.image?.public_id) {
        try {
          await cloudinary.uploader.destroy(post.image.public_id);
        } catch (err) {
          console.log(
            `⚠️ Cloudinary delete failed for ${post._id}:`,
            err.message
          );
        }
      }
    }

    // Delete all posts
    await UserPost.deleteMany({ author: userId });

    // Remove post references from User schema
    await User.findByIdAndUpdate(userId, { $set: { posts: [] } });

    res.status(200).json({
      success: true,
      message: "All posts deleted successfully",
      deletedCount: posts.length,
    });
  } catch (error) {
    console.error("❌ Error deleting all user posts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



// ----------------- Comment Controller ------------------------------------------

// ADD COMMENT
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // Find post
    let post = await UserPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Create standalone comment document
    const comment = await Comment.create({
      user: req.user._id,
      text,
    });

    // Store comment ID inside post
    post.comments.push(comment._id);
    await post.save();

    // Repopulate the entire comments array with pure comment objects
    post = await UserPost.findById(postId)
      .populate("author", "name username avatar")
      .populate("taggedUsers", "name username avatar")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "avatar username name",
          },
          {
            path: "likes",
            select: "avatar username name",
          },
          {
            path: "replies.user",
            select: "avatar username name",
          },
        ],
      });

    res.json({
      message: "Comment added",
      post, // return full populated data to frontend
    });
  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// DELETE COMMENT
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    // 1. Find the comment document
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // 2. Check owner
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 3. Delete the standalone comment document
    await Comment.findByIdAndDelete(commentId);

    // 4. Remove commentId from UserPost.comments array
    await UserPost.findByIdAndUpdate(postId, {
      $pull: { comments: commentId },
    });

    // 5. Re-fetch updated post with populated comments
    const post = await UserPost.findById(postId)
      .populate("author", "name username avatar")
      .populate("taggedUsers", "name username avatar")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "avatar username name" },
          { path: "likes", select: "avatar username name" },
          { path: "replies.user", select: "avatar username name" },
        ],
      });

    return res.json({
      message: "Comment deleted",
      post,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// ADD REPLY
export const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;

    if (!text)
      return res.status(400).json({ message: "Reply cannot be empty" });

    const post = await UserPost.findById(postId)
      .populate("author", "name username avatar")
      .populate("taggedUsers", "name username avatar")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "avatar username name",
          },
          {
            path: "likes",
            select: "avatar username name",
          },
          {
            path: "replies.user",
            select: "avatar username name",
          },
        ],
      });

    if (!post) return res.status(404).json({ message: "Post not found" });

    // Get full comment object (NOT an ObjectId)
    const comment = post.comments.find((c) => c._id.toString() === commentId);

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    comment.replies.push(reply);

    await comment.save(); // IMPORTANT: save comment, not post

    res.json({ message: "Reply added", replies: comment.replies });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// DELETE REPLY
export const deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;

    const post = await UserPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    // only reply owner can delete
    if (reply.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    reply.deleteOne();
    await post.save();

    res.json({ message: "Reply deleted", replies: comment.replies });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// LIKE / UNLIKE COMMENT
export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id.toString();

    // Find the comment document
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const liked = comment.likes.some((id) => id.toString() === userId);

    if (liked) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    res.json({
      message: liked ? "Comment unliked" : "Comment liked",
      likes: comment.likes,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};