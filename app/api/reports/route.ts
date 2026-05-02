import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? '30' // days

    const now = new Date()
    const periodDays = parseInt(period)
    const periodStart = new Date(now.getTime() - periodDays * 86400000)
    const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 86400000)

    // ── Sales in period ──────────────────────────────────────────────────────
    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: periodStart } },
      include: {
        saleItems: {
          include: { medicine: { select: { name: true, category: true } } },
        },
        user: { select: { name: true } },
      },
      orderBy: { saleDate: 'desc' },
    })

    // Previous period sales for comparison
    const prevSales = await prisma.sale.aggregate({
      where: { saleDate: { gte: prevPeriodStart, lt: periodStart } },
      _sum: { totalAmount: true },
      _count: true,
    })

    // ── Revenue totals ───────────────────────────────────────────────────────
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
    const prevRevenue = Number(prevSales._sum.totalAmount ?? 0)
    const revenueChange = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null

    const totalTransactions = sales.length
    const avgSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // ── Payment method breakdown ─────────────────────────────────────────────
    const paymentBreakdown: Record<string, { count: number; amount: number }> = {}
    sales.forEach(s => {
      const method = (s as any).paymentMethod ?? 'CASH'
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, amount: 0 }
      paymentBreakdown[method].count++
      paymentBreakdown[method].amount += Number(s.totalAmount)
    })

    // ── Daily revenue for chart ──────────────────────────────────────────────
    const dailyMap: Record<string, number> = {}
    sales.forEach(s => {
      const day = new Date(s.saleDate).toISOString().split('T')[0]
      dailyMap[day] = (dailyMap[day] ?? 0) + Number(s.totalAmount)
    })
    const dailyRevenue = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount: Math.round(amount) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // ── Medicine performance ─────────────────────────────────────────────────
    const medMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {}
    sales.forEach(s => {
      s.saleItems.forEach(item => {
        const id = item.medicineId
        if (!medMap[id]) medMap[id] = { name: item.medicine.name, category: item.medicine.category, qty: 0, revenue: 0 }
        medMap[id].qty += item.quantity
        medMap[id].revenue += Number(item.totalAmount)
      })
    })
    const medicinePerformance = Object.entries(medMap)
      .map(([id, d]) => ({ id, ...d, revenue: Math.round(d.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── Category revenue breakdown ───────────────────────────────────────────
    const catMap: Record<string, number> = {}
    sales.forEach(s => {
      s.saleItems.forEach(item => {
        const cat = item.medicine.category
        catMap[cat] = (catMap[cat] ?? 0) + Number(item.totalAmount)
      })
    })
    const categoryRevenue = Object.entries(catMap)
      .map(([category, revenue]) => ({ category, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── Inventory summary ────────────────────────────────────────────────────
    const allMedicines = await prisma.medicine.findMany({
      include: { batches: { where: { quantity: { gt: 0 } } } },
    })
    const inventorySummary = {
      totalSKUs: allMedicines.length,
      inStock: allMedicines.filter(m => m.batches.reduce((s, b) => s + b.quantity, 0) > 0).length,
      lowStock: allMedicines.filter(m => {
        const total = m.batches.reduce((s, b) => s + b.quantity, 0)
        return total > 0 && total <= m.reorderPoint
      }).length,
      outOfStock: allMedicines.filter(m => m.batches.reduce((s, b) => s + b.quantity, 0) === 0).length,
      expiringIn30: await prisma.batch.count({
        where: { expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) }, quantity: { gt: 0 } },
      }),
      expiringIn90: await prisma.batch.count({
        where: { expiryDate: { gte: now, lte: new Date(now.getTime() + 90 * 86400000) }, quantity: { gt: 0 } },
      }),
      totalStockValue: allMedicines.reduce((sum, m) => {
        const total = m.batches.reduce((s, b) => s + b.quantity, 0)
        return sum + total * Number(m.unitPrice)
      }, 0),
    }

    // ── Recent transactions (for table) ─────────────────────────────────────
    const recentTransactions = sales.slice(0, 20).map(s => ({
      id: s.id,
      date: new Date(s.saleDate).toLocaleDateString('en-LK'),
      time: new Date(s.saleDate).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }),
      amount: Number(s.totalAmount),
      paymentMethod: (s as any).paymentMethod ?? 'CASH',
      itemCount: s.saleItems.reduce((sum, i) => sum + i.quantity, 0),
      pharmacist: s.user.name,
    }))

    return NextResponse.json({
      period: periodDays,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        prevRevenue: Math.round(prevRevenue),
        revenueChange,
        totalTransactions,
        avgSaleValue: Math.round(avgSaleValue),
        prevTransactions: prevSales._count,
      },
      paymentBreakdown,
      dailyRevenue,
      medicinePerformance,
      categoryRevenue,
      inventorySummary,
      recentTransactions,
    })
  } catch (err: any) {
    console.error('[Reports API Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}