import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const take = parseInt(searchParams.get('take') || '30')

  const dailies = await prisma.daily.findMany({
    orderBy: { date: 'desc' },
    take,
    select: {
      date: true,
      title: true,
      summary: true,
    },
  })

  return Response.json({ dailies })
}
