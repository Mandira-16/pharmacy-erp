import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
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
      select: { id: true, name: true, nic: true, phone: true, email: true, consentFlag: true, createdAt: true },
    })

    const result = patients.map((p, i) => ({ ...p, patientId: `PAT${String(i + 1).padStart(3, '0')}` }))
    return NextResponse.json({ patients: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, nic, phone, email, consentFlag } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const patient = await prisma.patient.create({
      data: {
        name,
        nic: nic || null,
        phone: phone || null,
        email: email || null,
        consentFlag: consentFlag ?? true,
      },
    })

    return NextResponse.json({ patient })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'A patient with this NIC already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}