import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { validateBatchForm } from '@/lib/validations'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any)?.role
    if (!['ADMIN', 'PHARMACIST', 'ASSISTANT'].includes(role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()

    const validation = validateBatchForm(body)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    // Check batch number uniqueness for this medicine
    const existing = await prisma.batch.findFirst({
      where: { medicineId: id, batchNumber: body.batchNumber.toUpperCase().trim() }
    })
    if (existing) {
      return NextResponse.json({ error: 'Validation failed', errors: { batchNumber: 'This batch number already exists for this medicine' } }, { status: 400 })
    }

    const batch = await prisma.batch.create({
      data: {
        medicineId: id,
        batchNumber: body.batchNumber.toUpperCase().trim(),
        quantity: Number(body.quantity),
        expiryDate: new Date(body.expiryDate),
      },
    })
    return NextResponse.json({ batch }, { status: 201 })
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
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    if (!batchId) return NextResponse.json({ error: 'Batch ID required' }, { status: 400 })

    await prisma.batch.delete({ where: { id: batchId } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}