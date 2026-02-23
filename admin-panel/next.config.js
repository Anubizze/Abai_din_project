/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    webpackMemoryOptimizations:true
  },
  output: "standalone",
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
