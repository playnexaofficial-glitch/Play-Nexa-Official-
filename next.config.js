/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from these domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'unavatar.io',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // Allow local public images
    unoptimized: false,
  },
  // Disable x-powered-by header
  poweredByHeader: false,
  // Compress responses
  compress: true,
  // For Capacitor APK later
  output: 'standalone',
}

module.exports = nextConfig
