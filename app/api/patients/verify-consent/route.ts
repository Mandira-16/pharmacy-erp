import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { patientId, otp } = await req.json()
    if (!patientId || !otp) return NextResponse.json({ error: 'Patient ID and OTP required' }, { status: 400 })

    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    if (!patient.consentOtp || !patient.consentOtpExpiry) {
      return NextResponse.json({ error: 'No OTP requested. Please request consent first.' }, { status: 400 })
    }

    if (new Date() > new Date(patient.consentOtpExpiry)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }

    if (patient.consentOtp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        consentFlag: true,
        consentGrantedAt: now,
        consentExpiresAt: expiresAt,
        consentOtp: null,
        consentOtpExpiry: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Consent granted successfully',
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err: any) {
    console.error('[Verify Consent Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
