import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { validateMedicineForm } from '@/lib/validations'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const medicines = await prisma.medicine.findMany({
      include: { batches: { orderBy: { expiryDate: 'asc' } }, supplier: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ medicines })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any)?.role
    if (!['ADMIN', 'PHARMACIST', 'ASSISTANT'].includes(role)) {
      return NextResponse.json({ error: 'You do not have permission to add medicines' }, { status: 403 })
    }

    const body = await req.json()

    // Validate
    const validation = validateMedicineForm(body)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    // Check SKU uniqueness
    const existing = await prisma.medicine.findFirst({ where: { sku: body.sku.toUpperCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Validation failed', errors: { sku: `SKU ${body.sku} already exists` } }, { status: 400 })
    }

    const medicine = await prisma.$transaction(async (tx) => {
      const med = await tx.medicine.create({
        data: {
          name: body.name.trim(),
          genericName: body.genericName?.trim() || null,
          sku: body.sku.toUpperCase().trim(),
          category: body.category.trim(),
          unitPrice: Number(body.unitPrice),
          reorderPoint: Number(body.reorderPoint),
          scheduleType: body.scheduleType || 'OTC',
          supplierId: body.supplierId || null,
        },
      })

      if (body.initialBatch?.quantity && body.initialBatch?.expiryDate && body.initialBatch?.batchNumber) {
        await tx.batch.create({
          data: {
            medicineId: med.id,
            batchNumber: body.initialBatch.batchNumber.toUpperCase().trim(),
            quantity: Number(body.initialBatch.quantity),
            expiryDate: new Date(body.initialBatch.expiryDate),
          },
        })
      }

      return med
    })

    return NextResponse.json({ medicine }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Validation failed', errors: { sku: 'SKU already exists' } }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}