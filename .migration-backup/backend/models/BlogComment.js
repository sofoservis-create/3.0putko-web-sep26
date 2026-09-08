import mongoose from 'mongoose';

const blogCommentSchema = new mongoose.Schema({
  blogId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Blog', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  comment: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  isApproved: {
    type: Boolean,
    default: true // Auto-approve comments for now
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogComment',
    default: null // For nested comments/replies
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
blogCommentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
blogCommentSchema.index({ blogId: 1, createdAt: -1 });
blogCommentSchema.index({ parentCommentId: 1 });

// Virtual for formatted date
blogCommentSchema.virtual('formattedDate').get(function () {
  return new Date(this.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

export default mongoose.model('BlogComment', blogCommentSchema);
