import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'Revoke token required' }, { status: 400 })

    const patient = await prisma.patient.findUnique({
      where: { consentRevokeToken: token },
    })

    if (!patient) return NextResponse.json({ error: 'Invalid or expired revoke link' }, { status: 404 })

    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        consentFlag: false,
        consentGrantedAt: null,
        consentExpiresAt: null,
        consentRevokeToken: null,
        consentOtp: null,
        consentOtpExpiry: null,
      },
    })

    return NextResponse.json({ success: true, patientName: patient.name })
  } catch (err: any) {
    console.error('[Revoke Consent Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}