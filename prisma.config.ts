import path from 'path'
import { defineConfig } from 'prisma/config'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL!,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
      })
      return new PrismaPg(pool)
    },
  },
})