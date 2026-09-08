/**
 * SEO Configuration for the application
 * This file contains all the SEO-related metadata and configurations
 */

export const siteConfig = {
  name: 'Putko - Your Travel Platform',
  description: 'Discover amazing places to stay, connect with hosts, and create unforgettable travel experiences.',
  url:  'https://putko.sk',
  ogImage: '/og-image.jpg',
  links: {
    twitter: 'https://twitter.com/putko',
    github: 'https://github.com/putko',
    linkedin: 'https://linkedin.com/company/putko',
  },
  keywords: [
    'travel',
    'accommodation',
    'vacation rental',
    'hosting',
    'booking',
    'tourism',
    'lodging',
    'vacation homes',
    'travel platform',
    'unique stays'
  ],
  authors: [
    {
      name: 'Putko Team',
      url: 'https://putko.sk',
    },
  ],
  creator: 'Putko Team',
  publisher: 'Putko',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://putko.sk'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'de-DE': '/de-DE',
      'fr-FR': '/fr-FR',
      'es-ES': '/es-ES',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://putko.sk',
    title: 'Putko - Your Travel Platform',
    description: 'Discover amazing places to stay, connect with hosts, and create unforgettable travel experiences.',
    siteName: 'Putko',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Putko - Your Travel Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Putko - Your Travel Platform',
    description: 'Discover amazing places to stay, connect with hosts, and create unforgettable travel experiences.',
    images: ['/og-image.jpg'],
    creator: '@putko',
    site: '@putko',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
    bing: 'your-bing-verification-code',
  },
};

// Page-specific SEO configurations
export const pageSeoConfig = {
  home: {
    title: 'Putko - Discover Amazing Places to Stay',
    description: 'Find unique accommodations, connect with local hosts, and create unforgettable travel experiences with Putko.',
    keywords: ['travel', 'accommodation', 'vacation rental', 'hosting', 'booking'],
    openGraph: {
      title: 'Putko - Discover Amazing Places to Stay',
      description: 'Find unique accommodations, connect with local hosts, and create unforgettable travel experiences with Putko.',
    },
  },
  about: {
    title: 'About Putko - Our Story and Mission',
    description: 'Learn about Putko\'s mission to connect travelers with unique accommodations and create meaningful travel experiences.',
    keywords: ['about putko', 'our story', 'mission', 'travel platform'],
    openGraph: {
      title: 'About Putko - Our Story and Mission',
      description: 'Learn about Putko\'s mission to connect travelers with unique accommodations and create meaningful travel experiences.',
    },
  },
  faq: {
    title: 'Frequently Asked Questions - Putko',
    description: 'Find answers to common questions about using Putko for your travel accommodation needs.',
    keywords: ['FAQ', 'help', 'support', 'travel questions', 'accommodation help'],
    openGraph: {
      title: 'Frequently Asked Questions - Putko',
      description: 'Find answers to common questions about using Putko for your travel accommodation needs.',
    },
  },
  booking: {
    title: 'Book Your Stay - Putko',
    description: 'Secure your perfect accommodation with our easy booking process. Find and book unique places to stay.',
    keywords: ['book accommodation', 'reserve stay', 'travel booking', 'vacation rental'],
    openGraph: {
      title: 'Book Your Stay - Putko',
      description: 'Secure your perfect accommodation with our easy booking process. Find and book unique places to stay.',
    },
  },
  account: {
    title: 'Your Account - Putko',
    description: 'Manage your Putko account, view bookings, and update your travel preferences.',
    keywords: ['account settings', 'travel preferences', 'booking history'],
    openGraph: {
      title: 'Your Account - Putko',
      description: 'Manage your Putko account, view bookings, and update your travel preferences.',
    },
  },
};

// Helper function to generate metadata for pages
export const generateMetadata = (page, customData = {}) => {
  const baseConfig = pageSeoConfig[page] || pageSeoConfig.home;
  
  return {
    title: customData.title || baseConfig.title,
    description: customData.description || baseConfig.description,
    keywords: customData.keywords || baseConfig.keywords,
    openGraph: {
      ...baseConfig.openGraph,
      ...customData.openGraph,
    },
    twitter: {
      ...siteConfig.twitter,
      ...customData.twitter,
    },
    robots: siteConfig.robots,
    verification: siteConfig.verification,
    alternates: siteConfig.alternates,
  };
};

// Schema.org structured data for better SEO
export const generateStructuredData = (type, data) => {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${siteConfig.url}/${type.toLowerCase()}`,
    name: data.name || siteConfig.name,
    description: data.description || siteConfig.description,
    url: data.url || siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: Object.values(siteConfig.links),
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseStructuredData,
        '@type': 'Organization',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-0123',
          contactType: 'customer service',
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US',
        },
      };
    
    case 'WebSite':
      return {
        ...baseStructuredData,
        '@type': 'WebSite',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteConfig.url}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };
    
    case 'TravelAgency':
      return {
        ...baseStructuredData,
        '@type': 'TravelAgency',
        serviceType: 'Accommodation Booking',
        areaServed: 'Worldwide',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Accommodation Options',
        },
      };
    
    default:
      return baseStructuredData;
  }
}; 