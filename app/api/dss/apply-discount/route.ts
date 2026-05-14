import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any)?.role
    if (!['ADMIN', 'PHARMACIST'].includes(role)) {
      return NextResponse.json({ error: 'Only Admin or Pharmacist can apply discounts' }, { status: 403 })
    }

    const { medicineId, alertId, discountPercent } = await req.json()

    if (!medicineId || !discountPercent) {
      return NextResponse.json({ error: 'Medicine ID and discount percent required' }, { status: 400 })
    }

    if (discountPercent < 1 || discountPercent > 90) {
      return NextResponse.json({ error: 'Discount must be between 1% and 90%' }, { status: 400 })
    }

    // Get current price
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      select: { id: true, name: true, unitPrice: true },
    })

    if (!medicine) return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })

    const originalPrice = Number(medicine.unitPrice)
    const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100

    // Apply discount
    await prisma.medicine.update({
      where: { id: medicineId },
      data: { unitPrice: discountedPrice },
    })

    // Mark alert as resolved
    if (alertId) {
      await prisma.alert.update({
        where: { id: alertId },
        data: { isResolved: true },
      })
    }

    return NextResponse.json({
      success: true,
      medicine: medicine.name,
      originalPrice,
      discountedPrice,
      discountPercent,
      message: `Price reduced from LKR ${originalPrice} to LKR ${discountedPrice} (${discountPercent}% off)`,
    })
  } catch (err: any) {
    console.error('[Apply Discount Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}