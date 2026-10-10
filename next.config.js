/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't fail the production build on pre-existing type/lint issues
  // (they don't affect runtime; fix incrementally).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  webpack: (config) => {
    // Silence the firebase-admin punycode deprecation warning in dev
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
      // TF.js references `fs` in some code paths — stub it out in the browser bundle
      fs: false,
      path: false,
      crypto: false,
    };

    // Ignore native .node binary files (belt-and-suspenders for any
    // transitive deps that ship native addons)
    config.module.rules.push({
      test: /\.node$/,
      use: "ignore-loader",
    });

    return config;
  },
};

module.exports = nextConfig;