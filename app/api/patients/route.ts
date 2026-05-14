import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { validatePatientForm } from '@/lib/validations'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''

    const patients = await prisma.patient.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nic: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, nic: true, phone: true, email: true, consentFlag: true, createdAt: true, consentExpiresAt: true },
    })

    const result = patients.map((p, i) => ({ ...p, patientId: `PAT${String(i + 1).padStart(3, '0')}` }))
    return NextResponse.json({ patients: result })
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
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()

    // Validate
    const validation = validatePatientForm(body)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const patient = await prisma.patient.create({
      data: {
        name: body.name.trim(),
        nic: body.nic?.trim() || null,
        phone: body.phone?.replace(/-/g, '').trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        consentFlag: false, // Always false on registration — OTP required
      },
    })

    return NextResponse.json({ patient })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Validation failed', errors: { nic: 'A patient with this NIC already exists' } }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}