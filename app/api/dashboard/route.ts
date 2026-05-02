import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)

    // Run all queries in parallel for speed
    const [
      todaySales,
      yesterdaySales,
      activeMedicines,
      lowStockCount,
      todayTransactions,
      expiryAlerts,
      criticalExpiry,
      topMedicines,
      smartAlerts,
      monthlySales,
      categoryBreakdown,
    ] = await Promise.all([

      // Today's total revenue
      prisma.sale.aggregate({
        where: { saleDate: { gte: todayStart, lt: todayEnd } },
        _sum: { totalAmount: true },
      }),

      // Yesterday's total revenue (for % change)
      prisma.sale.aggregate({
        where: { saleDate: { gte: yesterdayStart, lt: todayStart } },
        _sum: { totalAmount: true },
      }),

      // Active medicines with stock > 0
      prisma.medicine.count({
        where: {
          batches: { some: { quantity: { gt: 0 } } },
        },
      }),

      // Low stock medicines (total stock < reorderPoint)
      prisma.medicine.count({
        where: {
          batches: { every: { quantity: { lt: 50 } } },
        },
      }),

      // Today's transaction count
      prisma.sale.count({
        where: { saleDate: { gte: todayStart, lt: todayEnd } },
      }),

      // Batches expiring within 90 days
      prisma.batch.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 90 * 86400000),
          },
          quantity: { gt: 0 },
        },
      }),

      // Critical expiry — within 30 days
      prisma.batch.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 86400000),
          },
          quantity: { gt: 0 },
        },
      }),

      // Top selling medicines — by total quantity sold across all time
      prisma.saleItem.groupBy({
        by: ['medicineId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Active DSS alerts
      prisma.alert.findMany({
        where: { isResolved: false },
        include: { medicine: { select: { name: true } } },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 4,
      }),

      // Monthly revenue — last 12 months
      prisma.sale.groupBy({
        by: ['saleDate'],
        _sum: { totalAmount: true },
        where: {
          saleDate: {
            gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
          },
        },
      }),

      // Sales by medicine category
      prisma.saleItem.findMany({
        include: {
          medicine: { select: { category: true } },
        },
        where: {
          sale: {
            saleDate: {
              gte: new Date(now.getFullYear(), now.getMonth() - 2, 1),
            },
          },
        },
      }),
    ])

    // Process top medicines — fetch medicine details
    const topMedDetails = await Promise.all(
      topMedicines.map(async (item) => {
        const med = await prisma.medicine.findUnique({
          where: { id: item.medicineId },
          include: {
            batches: {
              where: { quantity: { gt: 0 } },
            },
          },
        })
        const totalStock = med?.batches.reduce((s, b) => s + b.quantity, 0) ?? 0
        return {
          name: med?.name ?? 'Unknown',
          sold: item._sum.quantity ?? 0,
          stock: totalStock,
        }
      })
    )

    // Process monthly revenue into chart format
    const monthlyMap: Record<string, number> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    monthlySales.forEach((s) => {
      const d = new Date(s.saleDate)
      const key = monthNames[d.getMonth()]
      monthlyMap[key] = (monthlyMap[key] ?? 0) + Number(s._sum.totalAmount ?? 0)
    })

    // Build 12-month chart data
    const chartData = monthNames.map((month) => ({
      month,
      actual: Math.round(monthlyMap[month] ?? 0),
      forecast: Math.round((monthlyMap[month] ?? 0) * 1.05), // 5% above actual as forecast placeholder
    }))

    // Process category breakdown
    const catMap: Record<string, number> = {}
    categoryBreakdown.forEach((item) => {
      const cat = item.medicine.category
      catMap[cat] = (catMap[cat] ?? 0) + item.quantity
    })
    const totalCatUnits = Object.values(catMap).reduce((s, v) => s + v, 0) || 1
    const categoryColors: Record<string, string> = {
      Antibiotic: '#3b82f6',
      Antipyretic: '#10b981',
      Chronic: '#8b5cf6',
      Antidiabetic: '#f59e0b',
      Vitamin: '#06b6d4',
      Cough_Cold: '#ec4899',
      Antihypertensive: '#14b8a6',
      Antilipemic: '#f97316',
    }
    const categoryData = Object.entries(catMap)
      .map(([label, count]) => ({
        label,
        pct: Math.round((count / totalCatUnits) * 100),
        color: categoryColors[label] ?? '#6b7280',
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)

    // Calculate revenue change
    const todayRev = Number(todaySales._sum.totalAmount ?? 0)
    const yestRev = Number(yesterdaySales._sum.totalAmount ?? 0)
    const revChange = yestRev > 0 ? (((todayRev - yestRev) / yestRev) * 100).toFixed(1) : null

    // Format smart alerts
    const alertColorMap: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH: '#f59e0b',
      MEDIUM: '#3b82f6',
      LOW: '#6b7280',
    }
    const formattedAlerts = smartAlerts.map((a) => ({
      message: a.message,
      color: alertColorMap[a.severity] ?? '#6b7280',
      severity: a.severity,
      type: a.alertType,
    }))

    return NextResponse.json({
      kpis: {
        todayRevenue: todayRev,
        revenueChange: revChange,
        activeSKUs: activeMedicines,
        lowStockCount,
        todayTransactions,
        expiryAlerts,
        criticalExpiry,
      },
      chartData,
      topMedicines: topMedDetails,
      smartAlerts: formattedAlerts,
      categoryData,
    })
  } catch (err: any) {
    console.error('[Dashboard API Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}