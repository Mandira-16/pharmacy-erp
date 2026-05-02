import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 86400000)
    const in90Days = new Date(now.getTime() + 90 * 86400000)

    const suppliers = await prisma.supplier.findMany({
      include: {
        medicines: {
          include: {
            batches: {
              orderBy: { expiryDate: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = suppliers.map((supplier) => {
      const medicines = supplier.medicines.map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
        const nearestBatch = med.batches.find((b) => b.quantity > 0)
        const expiryDate = nearestBatch?.expiryDate ?? null
        const daysToExpiry = expiryDate
          ? Math.floor((new Date(expiryDate).getTime() - now.getTime()) / 86400000)
          : null

        let stockStatus = 'OK'
        if (totalStock === 0) stockStatus = 'OUT_OF_STOCK'
        else if (totalStock <= med.reorderPoint * 0.5) stockStatus = 'CRITICAL'
        else if (totalStock <= med.reorderPoint) stockStatus = 'LOW_STOCK'

        let expiryStatus = 'OK'
        if (daysToExpiry !== null) {
          if (daysToExpiry <= 30) expiryStatus = 'CRITICAL'
          else if (daysToExpiry <= 90) expiryStatus = 'WARNING'
        }

        const needsAction = stockStatus !== 'OK' || expiryStatus !== 'OK'

        return {
          id: med.id,
          sku: med.sku,
          name: med.name,
          category: med.category,
          totalStock,
          reorderPoint: med.reorderPoint,
          unitPrice: Number(med.unitPrice),
          daysToExpiry,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null,
          stockStatus,
          expiryStatus,
          needsAction,
        }
      })

      const alertCount = medicines.filter((m) => m.needsAction).length
      const criticalCount = medicines.filter(
        (m) => m.stockStatus === 'OUT_OF_STOCK' || m.stockStatus === 'CRITICAL' || m.expiryStatus === 'CRITICAL'
      ).length

      return {
        id: supplier.id,
        name: supplier.name,
        contactInfo: supplier.contactInfo,
        email: supplier.email,
        medicines,
        medicineCount: medicines.length,
        alertCount,
        criticalCount,
      }
    })

    return NextResponse.json({ suppliers: result })
  } catch (err: any) {
    console.error('[Suppliers API Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}