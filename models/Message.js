import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema({
  emoji: { 
    type: String, 
    required: true,
    trim: true
  },
  users: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
  url: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  size: { 
    type: Number, 
    min: 0 
  },
  mimeType: { 
    type: String,
    trim: true
  },
  thumbnailUrl: { 
    type: String 
  }, // for images/videos
  duration: { 
    type: Number 
  } // for audio/video in seconds
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Conversation", 
    required: true,
    index: true
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true
  },
  content: { 
    type: String, 
    default: "",
    trim: true,
    // Required for text messages, optional for media messages
    validate: {
      validator: function(v) {
        // Content is required if no attachments, optional if there are attachments
        return this.type !== 'text' || v.trim().length > 0;
      },
      message: 'Content is required for text messages'
    }
  },
  type: { 
    type: String, 
    enum: ["text", "image", "file", "audio", "video", "system"], 
    default: "text",
    index: true
  },
  attachments: [AttachmentSchema],
  isReadBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  reactions: [ReactionSchema],
  replyTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Message" 
  }, // for message replies
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date }
  },
  deleted: {
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  // For system messages (user joined, left, etc.)
  systemType: {
    type: String,
    enum: ["user_joined", "user_left", "group_created", "name_changed", "photo_changed"],
    required: false
  },
  systemData: {
    type: mongoose.Schema.Types.Mixed // flexible data for system events
  },
  // Message status for real-time updates
  status: {
    type: String,
    enum: ["sending", "sent", "delivered", "read", "failed"],
    default: "sent"
  },
  // For push notifications
  notificationSent: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ "reactions.users": 1 });
MessageSchema.index({ "isReadBy": 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

// Virtual for populating reply message
MessageSchema.virtual('replyMessage', {
  ref: 'Message',
  localField: 'replyTo',
  foreignField: '_id',
  justOne: true
});

// Method to mark message as read by a user
MessageSchema.methods.markAsRead = function(userId) {
  if (!this.isReadBy.includes(userId)) {
    this.isReadBy.push(userId);
    this.status = this.isReadBy.length >= 2 ? 'read' : 'delivered';
  }
  return this.save();
};

// Method to add reaction
MessageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    if (!existingReaction.users.includes(userId)) {
      existingReaction.users.push(userId);
    }
  } else {
    this.reactions.push({
      emoji,
      users: [userId],
      createdAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove reaction
MessageSchema.methods.removeReaction = function(userId, emoji) {
  const reactionIndex = this.reactions.findIndex(r => r.emoji === emoji);
  
  if (reactionIndex !== -1) {
    const reaction = this.reactions[reactionIndex];
    reaction.users = reaction.users.filter(u => u.toString() !== userId.toString());
    
    if (reaction.users.length === 0) {
      this.reactions.splice(reactionIndex, 1);
    }
  }
  
  return this.save();
};

// Static method to get unread count for a user in conversation
MessageSchema.statics.getUnreadCount = function(conversationId, userId) {
  return this.countDocuments({
    conversationId,
    sender: { $ne: userId },
    isReadBy: { $ne: userId },
    deleted: { $ne: true }
  });
};

// Pre-save middleware to handle message edits
MessageSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.edited = {
      isEdited: true,
      editedAt: new Date()
    };
  }
  next();
});

export default mongoose.model("Message", MessageSchema);