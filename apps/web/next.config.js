/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@peakform/ui", "@peakform/shared-types", "@peakform/validation"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "http",
        hostname: "minio",
        port: "9000",
      },
    ],
    // Disable optimization for remote images to avoid server-side fetch issues in containers
    unoptimized: true,
  },
};

module.exports = nextConfig;
