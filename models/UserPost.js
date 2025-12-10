import mongoose from "mongoose";

const userPostSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["image", "code", "question", "achievement", "poll"],
      default: "image",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],

    image: {
      public_id: String,
      url: String,
    },
    code: {
      language: String,
      code: String,
    },

    achievement: {
      title: String,
      description: String,
    },

    poll: {
      question: { type: String },
      options: [String], // ["Option 1", "Option 2"]
      votes: {
        type: Map,
        of: Number,
        default: {},
      },
      totalVotes: { type: Number, default: 0 },
      userVoted: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      endTime: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },

    privacy: {
      type: String,
      enum: ["public", "private", "friends"],
      default: "public",
    },
    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location: {
      type: String,
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
    shares: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("UserPost", userPostSchema);
