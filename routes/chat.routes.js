import express from 'express';
import {
  getOrCreateDirectConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  toggleReaction,
  getConversationById
} from '../controllers/chat.controller.js';

const router = express.Router();

// Conversation routes
router.post('/conversations/direct', getOrCreateDirectConversation);
router.get('/conversations/:userId', getConversations);
router.get('/conversations/id/:conversationId', getConversationById);

// Message routes
router.get('/messages/:conversationId', getMessages);
router.post('/messages/send', sendMessage);
router.post('/messages/read', markAsRead);
router.put('/messages/:messageId/reaction', toggleReaction);
router.delete('/messages/:messageId', deleteMessage);

export default router;