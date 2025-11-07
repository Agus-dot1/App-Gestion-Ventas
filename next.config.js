/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },


  output: 'export',
  trailingSlash: true,
  experimental: {


    ppr: false,
  },
  serverExternalPackages: [],


  poweredByHeader: false,
  reactStrictMode: false,


  generateBuildId: () => 'build',


  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
