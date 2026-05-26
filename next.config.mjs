/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@prisma/client': './src/generated/prisma',
    },
  },
  serverExternalPackages: ['@prisma/client'],
};
export default nextConfig;