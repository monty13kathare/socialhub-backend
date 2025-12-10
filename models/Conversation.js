import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  role: { 
    type: String, 
    enum: ["member", "admin", "owner"], 
    default: "member" 
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  leftAt: { 
    type: Date 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  nickname: { 
    type: String, 
    trim: true 
  },
  // Notification settings for this conversation
  notifications: {
    muted: { type: Boolean, default: false },
    muteUntil: { type: Date },
    customSound: { type: String }
  }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  // For direct messages: participants array
  // For group chats: participants array with roles
  participants: [ParticipantSchema],
  
  type: { 
    type: String, 
    enum: ["direct", "group"], 
    default: "direct",
    required: true,
    index: true
  },
  
  // Group conversation fields
  name: { 
    type: String, 
    trim: true,
    // Required for groups, optional for direct messages
    validate: {
      validator: function(v) {
        return this.type !== 'group' || (v && v.trim().length > 0);
      },
      message: 'Name is required for group conversations'
    }
  },
  
  description: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  
  photo: {
    url: { type: String },
    thumbnail: { type: String }
  },
  
  // Conversation settings
  settings: {
    isPublic: { type: Boolean, default: false },
    allowInvites: { type: Boolean, default: true },
    adminOnlyMessages: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 1000 }
  },
  
  // Last message reference for quick access
  lastMessage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Message" 
  },
  
  // Cached last message content for display
  lastMessageContent: { 
    type: String,
    trim: true
  },
  
  lastMessageAt: { 
    type: Date,
    index: true
  },
  
  // Message counters
  messageCount: { 
    type: Number, 
    default: 0 
  },
  
  // For direct messages - ensure unique combination
  directMessageKey: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Archive/delete status
  archivedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  
  // Pinned messages
  pinnedMessages: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Message" 
  }],
  
  // Custom conversation data
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better performance
ConversationSchema.index({ type: 1, lastMessageAt: -1 });
ConversationSchema.index({ "participants.user": 1, lastMessageAt: -1 });
ConversationSchema.index({ "participants.user": 1, type: 1 });
ConversationSchema.index({ directMessageKey: 1 }, { unique: true, sparse: true });
ConversationSchema.index({ lastMessageAt: -1 });

// Virtual for active participants
ConversationSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.isActive);
});

// Virtual for admins
ConversationSchema.virtual('admins').get(function() {
  return this.participants.filter(p => 
    p.isActive && (p.role === 'admin' || p.role === 'owner')
  );
});

// Pre-save middleware to generate directMessageKey for direct conversations
ConversationSchema.pre('save', function(next) {
  if (this.type === 'direct' && this.participants.length === 2) {
    // Create a unique key by sorting user IDs and joining
    const userIds = this.participants.map(p => p.user.toString()).sort();
    this.directMessageKey = userIds.join('_');
  }
  
  // Set default name for direct conversations
  if (this.type === 'direct' && !this.name) {
    this.name = 'Direct Message';
  }
  
  next();
});

// Static method to find or create direct conversation
ConversationSchema.statics.findOrCreateDirect = async function(userId1, userId2) {
  const userIds = [userId1, userId2].sort();
  const directMessageKey = userIds.join('_');
  
  let conversation = await this.findOne({ 
    directMessageKey,
    type: 'direct'
  }).populate('participants.user', 'name username avatar isOnline lastSeen verified');
  
  if (!conversation) {
    conversation = await this.create({
      type: 'direct',
      participants: [
        { user: userId1, role: 'member' },
        { user: userId2, role: 'member' }
      ],
      directMessageKey
    });
    
    // Populate the newly created conversation
    conversation = await this.findById(conversation._id)
      .populate('participants.user', 'name username avatar isOnline lastSeen verified');
  }
  
  return conversation;
};

// Method to add participant to group
ConversationSchema.methods.addParticipant = function(userId, role = 'member') {
  if (this.type !== 'group') {
    throw new Error('Can only add participants to group conversations');
  }
  
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
  } else if (!existingParticipant.isActive) {
    existingParticipant.isActive = true;
    existingParticipant.leftAt = undefined;
  }
  
  return this.save();
};

// Method to remove participant from group
ConversationSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString() && p.isActive
  );
  
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
  }
  
  return this.save();
};

// Method to update last message
ConversationSchema.methods.updateLastMessage = function(messageId, content) {
  this.lastMessage = messageId;
  this.lastMessageContent = content;
  this.lastMessageAt = new Date();
  this.messageCount += 1;
  
  return this.save();
};

// Method to check if user is participant
ConversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(
    p => p.user.toString() === userId.toString() && p.isActive
  );
};

// Method to get user's role in conversation
ConversationSchema.methods.getUserRole = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString() && p.isActive
  );
  
  return participant ? participant.role : null;
};

export default mongoose.model("Conversation", ConversationSchema);