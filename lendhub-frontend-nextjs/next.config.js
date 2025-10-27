/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_RPC_URL: 'http://localhost:7545',
    NEXT_PUBLIC_CHAIN_ID: '1337',
    MONGODB_URI: 'mongodb://localhost:27017/lendhub_local',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Disable webpack cache to avoid ENOENT errors
    config.cache = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb', 'ethers'],
  },
};

module.exports = nextConfig;
