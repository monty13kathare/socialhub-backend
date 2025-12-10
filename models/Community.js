import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    category: {
      type: String,
      required: true,
    },
    privacy: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "public",
    },
    tags: {
      type: [String],
      validate: [(arr) => arr.length <= 5, "Maximum 5 tags allowed"],
    },
    rules: {
      type: [String],
      validate: [(arr) => arr.length <= 10, "Maximum 10 rules allowed"],
    },
    bannerColor: {
      type: String,
      default: "from-blue-500 to-cyan-500",
    },
    allowImage: {
      type: Boolean,
      default: true,
    },
    allowCode: {
      type: Boolean,
      default: true,
    },
    allowPoll: {
      type: Boolean,
      default: true,
    },
     allowLink: {
      type: Boolean,
      default: true,
    },
     allowAchievement: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    isJoined: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          // enum: ["admin", "member", "moderator"],
          // default: "",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Community = mongoose.model("Community", communitySchema);
export default Community;
