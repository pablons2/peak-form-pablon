/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@peakform/ui", "@peakform/shared-types", "@peakform/validation"],
};

module.exports = nextConfig;
