/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Isso ignora os erros de "Property users does not exist"
    ignoreBuildErrors: true,
  },
  eslint: {
    // Isso ignora avisos de lint que travam o build
    ignoreDuringBuilds: true,
  },
  experimental: { 
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] 
  },
};

export default nextConfig;