import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 86400000)
    const in90Days = new Date(now.getTime() + 90 * 86400000)

    const medicines = await prisma.medicine.findMany({
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
        supplier: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    })

    const rows = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
      const nearestBatch = med.batches.find((b) => b.quantity > 0)
      const expiryDate = nearestBatch?.expiryDate ?? null
      const batchNumber = nearestBatch?.batchNumber ?? '—'
      const daysToExpiry = expiryDate
        ? Math.floor((new Date(expiryDate).getTime() - now.getTime()) / 86400000)
        : null

      let status = 'In Stock'
      if (totalStock === 0) status = 'Out of Stock'
      else if (totalStock <= med.reorderPoint * 0.5) status = 'Critical'
      else if (totalStock <= med.reorderPoint) status = 'Low Stock'

      return {
        id: med.id,
        sku: med.sku,
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        batchNumber,
        totalStock,
        reorderPoint: med.reorderPoint,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null,
        daysToExpiry,
        unitPrice: Number(med.unitPrice),
        status,
        supplier: med.supplier?.name ?? '—',
        batchCount: med.batches.length,
      }
    })

    // KPI calculations
    const totalValue = rows.reduce((sum, r) => sum + r.totalStock * r.unitPrice, 0)
    const lowStockCount = rows.filter((r) => r.status === 'Low Stock' || r.status === 'Critical' || r.status === 'Out of Stock').length
    const expiring90 = rows.filter((r) => r.daysToExpiry !== null && r.daysToExpiry <= 90 && r.daysToExpiry >= 0).length
    const expiring30 = rows.filter((r) => r.daysToExpiry !== null && r.daysToExpiry <= 30 && r.daysToExpiry >= 0).length
    const categories = new Set(rows.map((r) => r.category)).size
    const suppliers = await prisma.supplier.count()

    return NextResponse.json({
      medicines: rows,
      kpis: {
        totalSKUs: rows.length,
        totalValue,
        lowStockCount,
        expiring90,
        expiring30,
        categories,
        suppliers,
      },
    })
  } catch (err: any) {
    console.error('[Inventory API Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}