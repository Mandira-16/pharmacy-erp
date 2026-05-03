import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReceiptEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, patientId, patientEmail, patientName, paymentMethod, userId, doctorName, doctorSlmc } = body

    if (!items || items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'User session required' }, { status: 401 })

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0
      const saleItemsData: any[] = []
      const medicineNames: { name: string; quantity: number }[] = []

      for (const item of items) {
        const { medicineId, quantity, unitPrice } = item
        const batches = await tx.batch.findMany({ where: { medicineId, quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } })
        const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0)
        if (totalAvailable < quantity) throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`)
        let remaining = quantity
        for (const batch of batches) {
          if (remaining <= 0) break
          const deduct = Math.min(batch.quantity, remaining)
          await tx.batch.update({ where: { id: batch.id }, data: { quantity: { decrement: deduct } } })
          remaining -= deduct
        }
        const lineTotal = quantity * unitPrice
        totalAmount += lineTotal
        saleItemsData.push({ medicineId, quantity, unitPrice, totalAmount: lineTotal })
        const med = await tx.medicine.findUnique({ where: { id: medicineId }, select: { name: true } })
        if (med) medicineNames.push({ name: med.name, quantity })
      }

      const sale = await tx.sale.create({
        data: {
          totalAmount, paymentMethod,
          doctorName: doctorName || null, doctorSlmc: doctorSlmc || null,
          userId, patientId: patientId || null,
          saleItems: { create: saleItemsData },
        },
        include: {
          saleItems: { include: { medicine: { select: { name: true } } } },
          user: { select: { name: true } },
        },
      })

      // Auto-create PatientHistory if patient linked and has PDPA consent
      if (patientId) {
        const patient = await tx.patient.findUnique({ where: { id: patientId }, select: { consentFlag: true } })
        if (patient?.consentFlag) {
          for (const med of medicineNames) {
            await (tx.patientHistory as any).create({
              data: {
                patientId,
                medicineName: med.name,
                quantity: med.quantity,
                doctorName: doctorName || null,
                doctorSlmc: doctorSlmc || null,
                notes: doctorName ? `Prescribed by Dr. ${doctorName} (SLMC: ${doctorSlmc})` : 'Over-the-counter purchase',
              },
            })
          }
        }
      }

      return { sale, totalAmount }
    })

    if (patientEmail && patientName) {
      try {
        await sendReceiptEmail({
          to: patientEmail, patientName, saleId: result.sale.id,
          saleDate: new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          items: result.sale.saleItems.map((si: any) => ({ medicineName: si.medicine.name, quantity: si.quantity, unitPrice: Number(si.unitPrice), totalAmount: Number(si.totalAmount) })),
          totalAmount: result.totalAmount, paymentMethod,
          pharmacistName: result.sale.user.name, doctorName, doctorSlmc,
        })
      } catch (emailErr) { console.error('[Email Error]', emailErr) }
    }

    return NextResponse.json({ success: true, saleId: result.sale.id, totalAmount: result.totalAmount, emailSent: !!(patientEmail && patientName) })
  } catch (err: any) {
    console.error('[POS Checkout Error]', err)
    return NextResponse.json({ error: err.message ?? 'Checkout failed' }, { status: 500 })
  }
}