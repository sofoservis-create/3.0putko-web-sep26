import express from 'express';
import { 
  createComment, 
  getCommentsByBlogId, 
  getCommentById, 
  updateComment, 
  deleteComment,
  getCommentStats 
} from '../Controllers/BlogCommentController.js';

const router = express.Router();

// Create a new comment
router.post('/', createComment);

// Get all comments for a specific blog
router.get('/blog/:blogId', getCommentsByBlogId);

// Get comment statistics for a blog
router.get('/blog/:blogId/stats', getCommentStats);

// Get a single comment by ID
router.get('/:commentId', getCommentById);

// Update a comment
router.put('/:commentId', updateComment);

// Delete a comment
router.delete('/:commentId', deleteComment);

export default router;
