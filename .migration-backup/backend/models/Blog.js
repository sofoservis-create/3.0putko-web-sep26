import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true, index: true },
  author: { type: String, default: 'Admin', index: true },
  authorName: { type: String, index: true }, // Explicit author name
  authorImg: { type: String, index: true }, // Added field for author image
  categories: { type: String, required: true, index: true },
  tags: { type: [String], default: [], index: true },
  image: { type: String, index: true },
  summary: { type: String, required: true, index: true },
  blogType: {
    type: String,
    enum: ['customer', 'provider'],
    required: true,
    index: true
  },
  views: { type: Number, default: 0, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Virtual field to format created date
blogSchema.virtual('formattedDate').get(function () {
  return new Date(this.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Helper: Convert title → slug (without slugify)
function createSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove invalid chars
    .replace(/\s+/g, '-')           // collapse whitespace → dash
    .replace(/-+/g, '-');           // collapse multiple dashes
}

// Pre-save hook for slug creation
blogSchema.pre('validate', async function (next) {
  if (this.title) {
    let generatedSlug = createSlug(this.title);

    // Ensure uniqueness by appending a counter if needed
    let slugExists = await mongoose.models.Blog.findOne({ slug: generatedSlug });
    let counter = 1;
    while (slugExists && slugExists._id.toString() !== this._id.toString()) {
      generatedSlug = `${createSlug(this.title)}-${counter}`;
      slugExists = await mongoose.models.Blog.findOne({ slug: generatedSlug });
      counter++;
    }

    this.slug = generatedSlug;
  }
  next();
});

export default mongoose.model('Blog', blogSchema);
