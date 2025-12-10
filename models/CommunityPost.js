import mongoose from "mongoose";

const communityPostSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "code", "question", "achievement", "poll"],
      default: "text",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    image: {
      public_id: String,
      url: String,
    },
    code: {
      language: String,
      code: String,
    },
    poll: {
      question: String,
      options: [
        {
          text: String,
        },
      ],
      totalVotes: {
        type: Number,
        default: 0,
      },
    },
    achievement: {
      title: String,
      description: String,
      tags: [String],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    shares: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for likes count
communityPostSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

// Virtual for comments count
communityPostSchema.virtual("commentsCount").get(function () {
  return this.comments.length;
});

// Index for better query performance
communityPostSchema.index({ community: 1, createdAt: -1 });
communityPostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("CommunityPost", communityPostSchema);
