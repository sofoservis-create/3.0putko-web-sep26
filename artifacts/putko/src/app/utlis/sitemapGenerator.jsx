/**
 * Sitemap Generator Utility
 * This utility helps generate dynamic sitemaps for better SEO
 */

export const generateSitemapEntry = (url, options = {}) => {
  const {
    lastModified = new Date(),
    changeFrequency = 'weekly',
    priority = 0.5,
    image = null,
    news = null
  } = options;

  const entry = {
    url,
    lastModified,
    changeFrequency,
    priority
  };

  // Add image if provided
  if (image) {
    entry.image = image;
  }

  // Add news if provided
  if (news) {
    entry.news = news;
  }

  return entry;
};

const safeDate = (date) => {
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const generateListingSitemap = (baseUrl, listings = []) => {
  return listings.map(listing => 
    generateSitemapEntry(`${baseUrl}/listings/${listing.slug || listing.id}`, {
      lastModified: safeDate(listing.updatedAt || listing.createdAt),
      changeFrequency: 'daily', 
      priority: 0.9,
      image: listing.featuredImage ? {
        url: listing.featuredImage,
        title: listing.title,
        caption: listing.description
      } : null
    })
  );
};

export const generateHostSitemap = (baseUrl, hosts = []) => {
  return hosts.map(host => 
    generateSitemapEntry(`${baseUrl}/host-detail/${host.id}`, {
      lastModified: safeDate(host.updatedAt || host.createdAt),
      changeFrequency: 'weekly',
      priority: 0.8,
      image: host.profileImage ? {
        url: host.profileImage,
        title: host.name,
        caption: host.bio
      } : null
    })
  );
};

export const generateBlogSitemap = (baseUrl, blogPosts = []) => {
  return blogPosts.map(post => 
    generateSitemapEntry(`${baseUrl}/Blog-Detail/${post.slug}`, {
      lastModified: safeDate(post.updatedAt || post.publishedAt),
      changeFrequency: 'daily',
      priority: 1.0,
      image: post.featuredImage ? {
        url: post.featuredImage,
        title: post.title,
        caption: post.excerpt
      } : null,
      news: {
        publication: {
          name: 'Putko',
          language: 'en'
        },
        publication_date: post.publishedAt,
        title: post.title,
        keywords: post.tags?.join(', ') || '',
        stock_tickers: post.stockTickers || ''
      }
    })
  );
};

export const generateCategorySitemap = (baseUrl, categories = []) => {
  return categories.map(category => 
    generateSitemapEntry(`${baseUrl}/category/${category.slug}`, {
      lastModified: safeDate(category.updatedAt || category.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
      image: category.image ? {
        url: category.image,
        title: category.name,
        caption: category.description
      } : null
    })
  );
};

export const generateLocationSitemap = (baseUrl, locations = []) => {
  return locations.map(location => 
    generateSitemapEntry(`${baseUrl}/location/${location.slug}`, {
      lastModified: safeDate(location.updatedAt || location.createdAt),
      changeFrequency: 'monthly',
      priority: 0.7,
      image: location.image ? {
        url: location.image,
        title: location.name,
        caption: location.description
      } : null
    })
  );
};


// Helper function to fetch data from your API
export const fetchSitemapData = async () => {
  try {
    // Fetch accommodation data from the API
    const accommodationResponse = await fetch('https://backend-9k3q.onrender.com/api/accommodation/sitemap', {
      method: 'GET', 
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!accommodationResponse.ok) {
      throw new Error(`Failed to fetch accommodations: ${accommodationResponse.status}`);
    }

    const accommodations = await accommodationResponse.json();

    // Fetch blog posts data
    const blogResponse = await fetch('https://backend-9k3q.onrender.com/api/blog/sitemap', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!blogResponse.ok) {
      throw new Error(`Failed to fetch blogs: ${blogResponse.status}`);
    }

    const blogPosts = await blogResponse.json();

    // Transform accommodation data
    const listings = accommodations.map(accommodation => ({
      id: accommodation._id,
      slug: accommodation.slug || accommodation._id,
      title: accommodation.name,
      description: accommodation.description,
      featuredImage: accommodation.images && accommodation.images.length > 0 ? accommodation.images[0] : null,
      updatedAt: accommodation.updatedAt,
      createdAt: accommodation.createdAt,
      location: accommodation.locationDetails,
      propertyType: accommodation.propertyType,
      price: accommodation.priceMonThus || accommodation.flexiblePrice?.[0]?.price
    }));

    // Extract unique hosts
    const hosts = accommodations
      .filter(accommodation => accommodation.userId)
      .map(accommodation => ({
        id: accommodation.userId,
        name: accommodation.name, // ideally fetch actual host details
        profileImage: accommodation.images && accommodation.images.length > 0 ? accommodation.images[0] : null,
        bio: accommodation.description,
        updatedAt: accommodation.updatedAt,
        createdAt: accommodation.createdAt
      }))
      .filter((host, index, self) => 
        index === self.findIndex(h => h.id === host.id)
      );

    // Extract unique locations
    const locations = accommodations
      .filter(accommodation => accommodation.locationDetails?.city)
      .map(accommodation => ({
        slug: accommodation.locationDetails.city.toLowerCase().replace(/\s+/g, '-'),
        name: accommodation.locationDetails.city,
        description: `Accommodations in ${accommodation.locationDetails.city}`,
        image: accommodation.images && accommodation.images.length > 0 ? accommodation.images[0] : null,
        updatedAt: accommodation.updatedAt,
        createdAt: accommodation.createdAt
      }))
      .filter((location, index, self) => 
        index === self.findIndex(l => l.slug === location.slug)
      );

    // Return all collected sitemap data
    return {
      listings,
      hosts,
      blogPosts: blogPosts.map(post => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        publishedAt: post.createdAt,
        updatedAt: post.updatedAt,
        tags: post.tags,
        stockTickers: post.stockTickers || ''
      })),
      categories: [], 
      locations
    };
  } catch (error) {
    console.error('Error fetching sitemap data:', error);
    return {
      listings: [],
      hosts: [],
      blogPosts: [],
      categories: [],
      locations: []
    };
  }
};
