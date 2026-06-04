import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // 静态导出构建时，fetch 使用默认缓存行为以便构建时预渲染
  // Vercel 运行时，fetch 使用 no-store 避免缓存
  const isStaticExport = process.env.EXPORT_STATIC === '1'
  const adapter = new PrismaNeonHttp(
    process.env.DATABASE_URL!,
    isStaticExport ? undefined : { fetchOptions: { cache: 'no-store' } },
  )
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
