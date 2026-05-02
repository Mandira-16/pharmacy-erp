import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') ?? ''

    if (!query || query.length < 1) {
      return NextResponse.json({ medicines: [] })
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { genericName: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      take: 10,
    })

    const results = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
      const nearestExpiry = med.batches[0]?.expiryDate ?? null
      const daysToExpiry = nearestExpiry
        ? Math.floor((new Date(nearestExpiry).getTime() - Date.now()) / 86400000)
        : null

      return {
        id: med.id,
        sku: med.sku,
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        unitPrice: Number(med.unitPrice),
        totalStock,
        scheduleType: med.scheduleType,
        daysToExpiry,
        batches: med.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
        })),
      }
    })

    return NextResponse.json({ medicines: results })
  } catch (err: any) {
    console.error('[POS Search Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}