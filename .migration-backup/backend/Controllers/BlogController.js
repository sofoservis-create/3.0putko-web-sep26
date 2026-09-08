import Blog from '../models/Blog.js';
import redisClient from '../utils/redis.js';

export const clearBlogCache = async () => {
  try {
    await redisClient.del("blogs:all");
    await redisClient.del("sitemap:blogs");
    console.log("🧹 Blog cache cleared");
  } catch (err) {
    console.error("Error clearing blog cache:", err);
  }
};

// Create a new blog post
export const createBlog = async (req, res) => {
  try {
    const { title, content, author, authorName, authorImg, categories, tags, image, summary, blogType } = req.body;
    const blog = new Blog({ title, content, author, authorName, authorImg, categories, tags, image, summary, blogType });
    await blog.save();
    await clearBlogCache();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ error: 'Error creating blog post' });
  }
};

// Get all blog posts
// Get all blog posts with Redis caching
export const getBlogs = async (req, res) => {
  try {
    const CACHE_KEY = "blogs:all";

    // ✅ 1. Try Redis first
    let cachedData = null;
    try {
      cachedData = await redisClient.get(CACHE_KEY);

      if (cachedData) {
        console.log("⚡ CACHE HIT! Returning blogs");
        return res.status(200).json(JSON.parse(cachedData));
      } else {
        console.log("🐢 CACHE MISS! Fetching blogs from MongoDB");
      }
    } catch (err) {
      console.error("Redis GET failed:", err);
    }

    // ✅ 2. Fetch from MongoDB
    const blogs = await Blog.find()
    .select("_id slug createdAt title author authorName authorImg categories tags image summary blogType")
    .sort({ createdAt: -1 })
    .lean();

    // ✅ 3. Store in Redis (1 month cache)
    try {
      const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30; // 30 days

      const result = await redisClient.setEx(
        CACHE_KEY,
        ONE_MONTH_SECONDS,
        JSON.stringify(blogs)
      );

      console.log("💾 Cached blogs:", result);
    } catch (err) {
      console.error("Redis SET failed:", err);
    }

    // ✅ 4. Return response
    res.status(200).json(blogs);

  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(400).json({ error: "Error fetching blogs" });
  }
};

// Get a single blog post by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ error: 'Error fetching blog' });
  }
};

// ✅ Get a single blog post by Slug
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).lean();
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ error: 'Error fetching blog' });
  }
};

// Increment view count
export const incrementView = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ error: 'Error incrementing view count' });
  }
};

// Delete a blog post by ID
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id).lean();
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    await clearBlogCache(); // ✅ AUTO CLEAR
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting blog' });
  }
};

// Edit an existing blog post
export const editBlog = async (req, res) => {
  try {
    const { title, content, author, authorName, authorImg, categories, tags, image, summary, blogType } = req.body;
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, author, authorName, authorImg, categories, tags, image, summary, blogType },
      { new: true }
    ).lean();

    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    await clearBlogCache(); // ✅ AUTO CLEAR
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ error: 'Error updating blog post' });
  }
};


// ✅ Lightweight Blog Sitemap API (FAST)
export const getBlogSitemap = async (req, res) => {
  try {
    const CACHE_KEY = "sitemap:blogs";

    // 1. Check Redis
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log("⚡ Blog Sitemap CACHE HIT");
      return res.json(JSON.parse(cached));
    }

    console.log("🐢 Blog Sitemap CACHE MISS");

    // 2. Fetch minimal fields ONLY
    const blogs = await Blog.find()
      .select("slug title createdAt updatedAt image tags")
      .sort({ createdAt: -1 })
      .lean();

    // 3. Cache (1 day)
    await redisClient.setEx(
      CACHE_KEY,
      86400, // 24 hours
      JSON.stringify(blogs)
    );

    res.json(blogs);

  } catch (error) {
    console.error("Blog sitemap error:", error);
    res.status(500).json({ error: "Error fetching blog sitemap" });
  }
};