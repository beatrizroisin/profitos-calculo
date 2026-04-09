/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bcryptjs',
      'xlsx',       // must be external — uses fs/buffer APIs not available in edge
      'papaparse',  // same reason
    ],
  },
};
export default nextConfig;