import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: { history: { orderBy: { date: 'desc' } } },
    })

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    if (!patient.consentFlag) {
      return NextResponse.json({ patient: { id: patient.id, name: patient.name, consentFlag: false }, history: [] })
    }

    const history = patient.history.map((h: any) => ({
      id: h.id,
      date: h.date,
      medicineName: h.medicineName ?? h.notes ?? '—',
      quantity: h.quantity ?? null,
      doctorName: h.doctorName ?? null,
      doctorSlmc: h.doctorSlmc ?? null,
      notes: h.notes ?? null,
    }))

    return NextResponse.json({
      patient: { id: patient.id, name: patient.name, nic: patient.nic, phone: patient.phone, email: (patient as any).email ?? null, consentFlag: patient.consentFlag },
      history,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}