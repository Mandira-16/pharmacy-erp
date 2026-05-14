import path from 'path'
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'
dotenv.config()

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})