import BlogComment from '../models/BlogComment.js';
import Blog from '../models/Blog.js';
import mongoose from 'mongoose';

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { blogId, name, email, comment, rating, parentCommentId } = req.body;

    // Validate required fields
    if (!blogId || !name || !email || !comment) {
      return res.status(400).json({ 
        error: 'Blog ID, name, email, and comment are required' 
      }); 
    }

    // Check if blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create new comment
    const newComment = new BlogComment({
      blogId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      comment: comment.trim(),
      rating: rating || 5,
      parentCommentId: parentCommentId || null
    });

    await newComment.save();

    // Populate the comment with virtual fields
    const populatedComment = await BlogComment.findById(newComment._id)
      .populate('parentCommentId', 'name comment')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ 
      error: 'Error creating comment',
      details: error.message 
    });
  }
};

// Get all comments for a specific blog
export const getCommentsByBlogId = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    // Validate blogId
    if (!blogId) {
      return res.status(400).json({ error: 'Blog ID is required' });
    }

    // Check if blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'rating':
        sortObj = { rating: -1, createdAt: -1 };
        break;
      default: // newest
        sortObj = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get comments with pagination
    const comments = await BlogComment.find({ 
      blogId, 
      isApproved: true 
    })
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('parentCommentId', 'name comment createdAt')
    .lean();

    // Get total count for pagination
    const totalComments = await BlogComment.countDocuments({ 
      blogId, 
      isApproved: true 
    });

    // Calculate average rating
    const ratingStats = await BlogComment.aggregate([
      { $match: { blogId: new mongoose.Types.ObjectId(blogId), isApproved: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
        totalComments,
        hasNext: skip + comments.length < totalComments,
        hasPrev: parseInt(page) > 1
      },
      ratingStats: ratingStats[0] || { averageRating: 0, totalRatings: 0 }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
      error: 'Error fetching comments',
      details: error.message 
    });
  }
};

// Get a single comment by ID
export const getCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await BlogComment.findById(commentId)
      .populate('parentCommentId', 'name comment createdAt')
      .lean();

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.status(200).json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ 
      error: 'Error fetching comment',
      details: error.message 
    });
  }
};

// Update a comment (for future use if needed)
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { name, email, comment, rating } = req.body;

    const updatedComment = await BlogComment.findByIdAndUpdate(
      commentId,
      { 
        name: name?.trim(), 
        email: email?.trim().toLowerCase(), 
        comment: comment?.trim(), 
        rating,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ 
      error: 'Error updating comment',
      details: error.message 
    });
  }
};

// Delete a comment (for future use if needed)
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const deletedComment = await BlogComment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      error: 'Error deleting comment',
      details: error.message 
    });
  }
};

// Get comment statistics for a blog
export const getCommentStats = async (req, res) => {
  try {
    const { blogId } = req.params;

    const stats = await BlogComment.aggregate([
      { $match: { blogId: new mongoose.Types.ObjectId(blogId), isApproved: true } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalComments: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    const ratingDistribution = stats[0].ratingDistribution.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      stats: {
        totalComments: stats[0].totalComments,
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching comment stats:', error);
    res.status(500).json({ 
      error: 'Error fetching comment statistics',
      details: error.message 
    });
  }
};
