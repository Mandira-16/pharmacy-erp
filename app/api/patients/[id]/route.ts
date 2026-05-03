import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { history: { orderBy: { date: 'desc' } } },
    })

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const now = new Date()
    const consentExpired = (patient as any).consentExpiresAt && new Date((patient as any).consentExpiresAt) < now
    const hasConsent = patient.consentFlag && !consentExpired

    if (!hasConsent) {
      if (consentExpired) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { consentFlag: false, consentGrantedAt: null, consentExpiresAt: null } as any,
        })
      }
      return NextResponse.json({
        patient: { id: patient.id, name: patient.name, consentFlag: false },
        history: [],
      })
    }

    const history = (patient.history as any[]).map((h) => ({
      id: h.id,
      date: h.date,
      medicineName: h.medicineName ?? h.notes ?? '—',
      quantity: h.quantity ?? null,
      doctorName: h.doctorName ?? null,
      doctorSlmc: h.doctorSlmc ?? null,
      notes: h.notes ?? null,
    }))

    return NextResponse.json({
      patient: {
        id: patient.id,
        name: patient.name,
        nic: patient.nic,
        phone: patient.phone,
        email: (patient as any).email ?? null,
        consentFlag: patient.consentFlag,
        consentExpiresAt: (patient as any).consentExpiresAt ?? null,
      },
      history,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}