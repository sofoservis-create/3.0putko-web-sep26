# Sitemap and SEO Setup for Putko

This document explains how to use and customize the sitemap and SEO system for your Next.js application.

## 🗺️ What's Included

### 1. Dynamic Sitemap (`/src/app/sitemap.js`)
- Automatically generates XML sitemap for search engines
- Includes all static routes with proper SEO metadata
- Supports dynamic content (listings, hosts, blog posts, etc.)
- Configurable priorities and change frequencies

### 2. Sitemap Index (`/src/app/sitemap-index.xml/route.js`)
- Organizes multiple sitemaps for better performance
- Useful for large sites with many pages
- Improves crawling efficiency

### 3. Robots.txt (`/public/robots.txt`)
- Guides search engine crawlers
- Blocks admin and private routes
- Points to your sitemap

### 4. SEO Configuration (`/src/app/seo-config.js`)
- Centralized SEO settings
- Open Graph and Twitter Card support
- Schema.org structured data
- Page-specific metadata configurations

### 5. Sitemap Utilities (`/src/utils/sitemapGenerator.js`)
- Helper functions for generating dynamic sitemaps
- Support for images, news, and rich content
- Easy integration with your data sources

## 🚀 Quick Start

### 1. Update Your Domain
Edit the following files and replace `https://yourdomain.com` with your actual domain:

- `src/app/sitemap.js`
- `src/app/sitemap-index.xml/route.js`
- `src/app/seo-config.js`
- `public/robots.txt`

### 2. Set Environment Variable
Add to your `.env.local`:
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 3. Customize Sitemap Content
Edit `src/app/sitemap.js` to add/remove routes or modify priorities.

### 4. Add Dynamic Content
Uncomment and implement the API calls in `src/utils/sitemapGenerator.js` to include dynamic content.

## 📝 Customization Guide

### Adding New Routes
To add a new route to your sitemap, edit `src/app/sitemap.js`:

```javascript
{
  url: `${baseUrl}/your-new-page`,
  lastModified: new Date(),
  changeFrequency: 'weekly', // daily, weekly, monthly, yearly
  priority: 0.8, // 0.0 to 1.0
}
```

### Including Dynamic Content
To include dynamic content (e.g., blog posts, listings), implement the API calls in `fetchSitemapData()`:

```javascript
export const fetchSitemapData = async () => {
  try {
    const [listings, hosts, blogPosts] = await Promise.all([
      fetch('/api/listings').then(res => res.json()),
      fetch('/api/hosts').then(res => res.json()),
      fetch('/api/blog-posts').then(res => res.json()),
    ]);
    
    return { listings, hosts, blogPosts, categories: [], locations: [] };
  } catch (error) {
    console.error('Error fetching sitemap data:', error);
    return { listings: [], hosts: [], blogPosts: [], categories: [], locations: [] };
  }
};
```

### Customizing SEO Metadata
Edit `src/app/seo-config.js` to customize:
- Site information
- Keywords
- Social media links
- Verification codes
- Page-specific metadata

### Adding Structured Data
Use the `generateStructuredData()` function to add Schema.org markup:

```javascript
import { generateStructuredData } from '../app/seo-config';

// In your page component
const structuredData = generateStructuredData('TravelAgency', {
  name: 'Custom Name',
  description: 'Custom Description'
});

// Add to your page
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

## 🔧 Advanced Features

### Image Sitemaps
The system supports image sitemaps for better image SEO:

```javascript
{
  url: `${baseUrl}/listing/123`,
  image: {
    url: 'https://example.com/image.jpg',
    title: 'Listing Title',
    caption: 'Listing Description'
  }
}
```

### News Sitemaps
For blog/news content, the system can generate news sitemaps:

```javascript
{
  url: `${baseUrl}/blog/post-123`,
  news: {
    publication: { name: 'Putko Blog', language: 'en' },
    publication_date: '2024-01-01',
    title: 'Post Title',
    keywords: 'travel, accommodation'
  }
}
```

### Multiple Languages
Configure language alternatives in `seo-config.js`:

```javascript
alternates: {
  languages: {
    'en-US': '/en-US',
    'de-DE': '/de-DE',
    'fr-FR': '/fr-FR',
  },
}
```

## 📊 Testing Your Sitemap

### 1. Build and Deploy
```bash
npm run build
npm start
```

### 2. Test URLs
- Main sitemap: `https://yourdomain.com/sitemap.xml`
- Sitemap index: `https://yourdomain.com/sitemap-index.xml`
- Robots.txt: `https://yourdomain.com/robots.txt`

### 3. Validate with Google
- Submit your sitemap to Google Search Console
- Use Google's sitemap testing tools
- Check for any validation errors

## 🎯 SEO Best Practices

### 1. Priority Settings
- **1.0**: Homepage and main landing pages
- **0.9**: Product/service pages
- **0.8**: Category pages
- **0.7**: Blog posts and articles
- **0.6**: General information pages
- **0.5**: Legal and policy pages

### 2. Change Frequency
- **daily**: News, frequently updated content
- **weekly**: Product listings, blog posts
- **monthly**: General content, about pages
- **yearly**: Legal pages, terms of service

### 3. Content Optimization
- Use descriptive URLs
- Include relevant keywords in titles and descriptions
- Add structured data where appropriate
- Optimize images with alt text and captions

## 🚨 Important Notes

### 1. Environment Variables
Make sure `NEXT_PUBLIC_BASE_URL` is set correctly in your environment.

### 2. Build Process
The sitemap is generated at build time, so changes require a rebuild.

### 3. Dynamic Content
For frequently changing content, consider implementing a cron job to regenerate sitemaps.

### 4. Search Engine Submission
Don't forget to submit your sitemap to:
- Google Search Console
- Bing Webmaster Tools
- Yandex Webmaster
- Other search engines

## 🔍 Troubleshooting

### Common Issues

1. **Sitemap not accessible**: Check if the route is properly configured
2. **Missing routes**: Verify all routes are included in the sitemap array
3. **Invalid URLs**: Ensure all URLs are absolute and accessible
4. **Build errors**: Check for syntax errors in sitemap configuration

### Debug Tips

1. Check browser console for errors
2. Verify environment variables are loaded
3. Test individual sitemap routes
4. Use online sitemap validators

## 📚 Additional Resources

- [Next.js Sitemap Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Google Sitemap Guidelines](https://developers.google.com/search/docs/advanced/sitemaps/overview)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)

## 🤝 Support

If you need help customizing your sitemap or have questions about SEO implementation, refer to the documentation above or check the Next.js community forums. 