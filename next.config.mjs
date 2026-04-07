/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { 
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] 
  },
};
export default nextConfig;