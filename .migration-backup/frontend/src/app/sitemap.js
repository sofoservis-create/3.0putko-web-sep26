import { 
  generateListingSitemap, 
  generateHostSitemap, 
  generateBlogSitemap, 
  generateCategorySitemap, 
  generateLocationSitemap,
  fetchSitemapData 
} from './utlis/sitemapGenerator';

// export const maxDuration = 60; // Set max duration for Vercel

export default async function sitemap() {
  const baseUrl =  'https://putko.sk';
  
  // Fetch dynamic data
  const dynamicData = await fetchSitemapData();
  
  // Static routes with proper SEO metadata
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/About`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/FAQ`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/General-business-conditions`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    
    
    // {
    //   url: `${baseUrl}/listings`,
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // },
    {
      url: `${baseUrl}/listing-stay-map`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    
  ];

  // Generate dynamic routes
  const dynamicRoutes = [
    ...generateListingSitemap(baseUrl, dynamicData.listings),
    // ...generateHostSitemap(baseUrl, dynamicData.hosts),
    ...generateBlogSitemap(baseUrl, dynamicData.blogPosts),
    // ...generateCategorySitemap(baseUrl, dynamicData.categories),
    // ...generateLocationSitemap(baseUrl, dynamicData.locations),
  ];

  // Combine all routes
  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  return allRoutes;
} 