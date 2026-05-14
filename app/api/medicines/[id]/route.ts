import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { validateMedicineForm } from '@/lib/validations'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: { batches: { orderBy: { expiryDate: 'asc' } }, supplier: { select: { name: true } } },
    })
    if (!medicine) return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    return NextResponse.json({ medicine })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any)?.role
    if (!['ADMIN', 'PHARMACIST', 'ASSISTANT'].includes(role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()

    const validation = validateMedicineForm(body)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        name: body.name.trim(),
        genericName: body.genericName?.trim() || null,
        category: body.category.trim(),
        unitPrice: Number(body.unitPrice),
        reorderPoint: Number(body.reorderPoint),
        scheduleType: body.scheduleType || 'OTC',
        supplierId: body.supplierId || null,
      },
    })
    return NextResponse.json({ medicine })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any)?.role
    if (!['ADMIN', 'PHARMACIST', 'ASSISTANT'].includes(role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    const { id } = await params

    // Check sales history
    const salesCount = await prisma.saleItem.count({ where: { medicineId: id } })
    if (salesCount > 0) {
      return NextResponse.json({ error: `Cannot delete — this medicine has ${salesCount} sales record(s). Deactivate it instead.` }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.batch.deleteMany({ where: { medicineId: id } })
      await tx.medicine.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}