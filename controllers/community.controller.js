import Community from "../models/Community.js";
import User from "../models/User.js";


// Helper: send error response
const sendError = (res, status, msg) =>
  res.status(status).json({ message: msg });


// ✅ Create a new community
export const createCommunity = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      privacy,
      tags,
      rules,
      bannerColor,
      allowImage,
      allowCode,
      allowPoll,
      allowAchievement,
      allowLink,
      requireApproval,
    } = req.body;

    if (!name || !description || !category) {
      return res
        .status(400)
        .json({ message: "Name, description and category are required" });
    }

    const existing = await Community.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Community name already exists" });
    }

    const community = new Community({
      name,
      description,
      category,
      privacy,
      tags,
      rules,
      bannerColor,
      allowImage,
      allowCode,
      allowPoll,
      allowAchievement,
      allowLink,
      requireApproval,
      createdBy: req.user?._id || null, // optional, set by authMiddleware
    });

    await community.save();

    res.status(201).json({
      message: "Community created successfully",
      community,
    });
  } catch (error) {
    console.error("Error creating community:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get all communities
export const getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate("members.user", "name avatar username")
      .populate("createdBy", "name email avatar username") // optional
      .sort({ createdAt: -1 });

    res.status(200).json({ communities });
  } catch (error) {
    console.error("Error fetching communities:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get single community by ID
export const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const community = await Community.findById(id).populate(
      "createdBy",
      "name email avatar"
    );

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    res.status(200).json({ community });
  } catch (error) {
    console.error("Error fetching community:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟩 JOIN COMMUNITY
export const joinCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { communityId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // 🔍 Check if already a member
    const alreadyMember = community.members.some(
      (member) => member.user.toString() === userId.toString()
    );
    if (alreadyMember) {
      return res
        .status(400)
        .json({ message: "You are already a member of this community" });
    }

    // 🔐 If community requires approval
    if (community.requireApproval) {
      return res
        .status(403)
        .json({ message: "This community requires admin approval to join" });
    }

    // 🧩 Add user to community members
    community.members.push({ user: userId, role: "member" });
    await community.save();

    // 🧠 Add community to user's joined communities list
    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          communities: { community: communityId, role: "user" },
        },
      },
      { new: true }
    );

    // 🧩 Populate for response
    const updatedCommunity = await Community.findById(communityId)
      .populate("members.user", "name email avatar username")
      .populate("createdBy", "name email avatar username");

    res.status(200).json({
      message: "Successfully joined the community",
      community: updatedCommunity,
    });
  } catch (error) {
    console.error("Join Community Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🟥 LEAVE COMMUNITY
export const leaveCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { communityId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // 🔍 Check membership
    const memberIndex = community.members.findIndex(
      (member) => member.user.toString() === userId.toString()
    );
    if (memberIndex === -1) {
      return res
        .status(400)
        .json({ message: "You are not a member of this community" });
    }

    // 🛑 Prevent creator from leaving their own community
    if (community.createdBy.toString() === userId.toString()) {
      return res.status(403).json({
        message: "Community creator cannot leave their own community",
      });
    }

    // 🧹 Remove user from community
    community.members.splice(memberIndex, 1);
    await community.save();

    // 🧠 Remove community from user’s record
    await User.findByIdAndUpdate(userId, {
      $pull: { communities: { community: communityId } },
    });

    // 🧩 Populate for response
    const updatedCommunity = await Community.findById(communityId)
      .populate("members.user", "name email avatar username")
      .populate("createdBy", "name email avatar username");

    res.status(200).json({
      message: "You have successfully left the community",
      community: updatedCommunity,
    });
  } catch (error) {
    console.error("Leave Community Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ======================================================
// 🔵 UPDATE COMMUNITY
// ======================================================
export const updateCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) return sendError(res, 404, "Community not found");

    if (community.createdBy.toString() !== req.user._id.toString())
      return sendError(res, 403, "Only the creator can update this community");

    const updated = await Community.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .populate("members.user", "name avatar username")
      .populate("createdBy", "name email avatar username");

    res.status(200).json({
      message: "Community updated successfully",
      community: updated,
    });

  } catch (error) {
    console.error("Update Error:", error);
    sendError(res, 500, error.message);
  }
};


// ======================================================
// 🔴 DELETE COMMUNITY (Single)
// ======================================================
export const deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) return sendError(res, 404, "Community not found");

    if (community.createdBy.toString() !== req.user._id.toString())
      return sendError(res, 403, "Only creator can delete this community");

    await Community.deleteOne({ _id: id });

    await User.updateMany(
      {},
      { $pull: { communities: { community: id } } }
    );

    res.status(200).json({ message: "Community deleted successfully" });

  } catch (error) {
    console.error("Delete Error:", error);
    sendError(res, 500, error.message);
  }
};



// 🗑️ Delete all communities created by logged-in user
export const deleteAllUserCommunities = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔍 Find all communities created by user
    const userCommunities = await Community.find({ createdBy: userId });

    if (userCommunities.length === 0) {
      return res.status(404).json({
        message: "You haven't created any communities."
      });
    }

    // 📌 Delete communities
    await Community.deleteMany({ createdBy: userId });

    // 🧹 Remove these communities from all user records
    const communityIds = userCommunities.map(c => c._id);

    await User.updateMany(
      {},
      { $pull: { communities: { community: { $in: communityIds } } } }
    );

    res.status(200).json({
      message: `${userCommunities.length} community(s) deleted successfully`,
      deletedCommunities: userCommunities,
    });

  } catch (error) {
    console.error("Delete Communities Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
