/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_RPC_URL: 'http://localhost:8545',
    NEXT_PUBLIC_CHAIN_ID: '1337',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
