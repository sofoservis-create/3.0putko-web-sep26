/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress:true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  env: {
    NEXT_PUBLIC_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUD_NAME,
    NEXT_PUBLIC_UPLOAD_PRESET: process.env.NEXT_PUBLIC_UPLOAD_PRESET,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
 images: {
  domains: [
    "res.cloudinary.com",
    "cdn-icons-png.flaticon.com",
    "images.hauzi.com"
  ],
   minimumCacheTTL: 31536000,
  remotePatterns: [
    {
      protocol: "https",
      hostname: "images.pexels.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "a0.muscache.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "www.gstatic.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "images.hauzi.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "i.pinimg.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "**.mm.bing.net", // ✅ Covers tse1, tse2, tse3...
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "i.ytimg.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "thumbs.dreamstime.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "cdn.prod.v2.camping.info",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https", 
      hostname: "cf.bstatic.com",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https", 
      hostname: "geodome.sk",
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "*.gstatic.com", // ✅ Covers t1, t3, www, etc.
      port: "",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "upload.wikimedia.org",
      port: "",
      pathname: "/**",
    },
  ],
},

  async redirects() {
    return [
      {
        source: "/listings/tatry-hrebienok-relax-apartmn",
        destination: "/listings/tatry-hrebienok-relax-apartman",
        permanent: true, // ✅ this makes it 301
      },
      {
        source: "/listings/kr%C3%A1tky-pobyt",
        destination: "/listings/kratky-pobyt",
        permanent: true,
      },
      {
        source: "/listings/dom-na-ervenej-vei",
        destination: "/listings/dom-na-cervenej-vezi",
        permanent: true,
      },
      {
        source: "/listings/apartmn-anicka-tatransk-lomnica",
        destination: "/listings/apartman-anicka-tatranska-lomnica",
        permanent: true,
      },
      {
        source: "/listings/apartmn-tatrafun",
        destination: "/listings/apartman-tatrafun",
        permanent: true,
      },
      {
        source: "/listings/vila-pod-hradišťom",
        destination: "/listings/vila-pod-hradistom",
        permanent: true,
      },
      {
        source: "/listings/chata-maya-domaa",
        destination: "/listings/chata-maya-domasa",
        permanent: true,
      },
    ];
  },
  async headers() {
  return [
    {
      source: "/(.*)", // Apply to all routes
      headers: [
        // ✅ Force HTTPS with HSTS
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },

        // ✅ Prevent iframe embedding (Clickjacking protection)
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },

        // ✅ Prevent MIME sniffing
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },

        // ✅ Basic XSS filter
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },

        // ✅ Control what referrer info is sent
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },

        // ✅ Permissions (allow geolocation, clipboard, downloads, sharing)
        {
          key: "Permissions-Policy",
          value: 
            "geolocation=(self), camera=(self), clipboard-read=(self), clipboard-write=(self), web-share=(self), fullscreen=(self), autoplay=(self)",
        }
      ],
    },
  ];
  }
  
};

export default nextConfig;
