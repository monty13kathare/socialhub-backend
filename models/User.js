import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    
   location: {
  type: {
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
  },
  default: {
    country: "",
    state: "",
    city: ""
  }
},

    bannerColor: { type: String, default: "from-blue-500 to-cyan-500" },
    coverImage: { type: String, default: ""},
    bio: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserPost",
      },
    ],
    communities: [
      {
        community: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Community",
        },
        role: {
          type: String,
        },
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
     lastSeen: { type: Date, default: Date.now },
       website: { type: String, default: "" },
       gender:{ type: String, default: "" },
       birthDate: { type: Date},
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
