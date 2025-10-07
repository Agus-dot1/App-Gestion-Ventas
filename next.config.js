/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Remove static export config for development
  // output: 'export',
  // trailingSlash: true,
  // distDir: 'out',
  // assetPrefix: './',
  experimental: {
    // Completely disable RSC for static export
    ppr: false,
  },
  serverExternalPackages: [],
  // Disable server-side features for Electron
  poweredByHeader: false,
  reactStrictMode: false,
  // Force static generation without RSC
  generateBuildId: () => 'build',
  // Custom webpack config to handle RSC in Electron
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
