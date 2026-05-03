/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@prisma/client': './src/generated/prisma',
    },
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  },
};
export default nextConfig;
