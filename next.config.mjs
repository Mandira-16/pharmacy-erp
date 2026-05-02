/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@prisma/client': './src/generated/prisma',
    },
  },
};

export default nextConfig;