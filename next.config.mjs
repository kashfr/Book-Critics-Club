/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'books.google.com',
        pathname: '/books/content/**',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
        pathname: '/books/publisher/content/**',
      },
    ],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
