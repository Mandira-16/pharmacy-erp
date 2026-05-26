import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { patientId } = await req.json()
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })

    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    if (!patient.email) return NextResponse.json({ error: 'Patient has no email address registered' }, { status: 400 })

    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000)
    const revokeToken = crypto.randomBytes(32).toString('hex')
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    console.log('[Consent] baseUrl:', baseUrl, 'NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    const revokeUrl = `${baseUrl}/consent/revoke?token=${revokeToken}`

    await prisma.patient.update({
      where: { id: patientId },
      data: { consentOtp: otp, consentOtpExpiry: otpExpiry, consentRevokeToken: revokeToken },
    })

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#0ea5e9);padding:32px 36px;">
      <div style="font-size:20px;font-weight:700;color:white;">+ Ceylon Pharmacy</div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">Medical Records Access Request</p>
    </div>
    <div style="padding:32px 36px;">
      <p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:600;">Dear ${patient.name},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">Ceylon Pharmacy is requesting access to view your medication history. This access will last for <strong>10 days</strong> from when you approve it.</p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;">Please provide the following one-time code to the pharmacist to grant access:</p>
      <div style="background:#f1f5f9;border:2px dashed #2563eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
        <div style="font-size:36px;font-weight:800;color:#2563eb;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</div>
        <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Valid for 15 minutes only</p>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">⚠ Important</p>
        <p style="margin:6px 0 0;font-size:12px;color:#dc2626;line-height:1.6;">Only share this code with the pharmacist at Ceylon Pharmacy. If you did not request this, please ignore this email.</p>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">🔒 Your Privacy Rights</p>
        <p style="margin:6px 0 8px;font-size:12px;color:#15803d;line-height:1.6;">You can revoke access at any time by clicking the link below. Your records will be immediately locked.</p>
        <a href="${revokeUrl}" style="display:inline-block;padding:8px 16px;background:#15803d;color:white;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">Revoke Access Now</a>
      </div>
    </div>
    <div style="padding:20px 36px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Ceylon Pharmacy · Colombo, Sri Lanka · PDPA Compliant</p>
    </div>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: 'Ceylon Pharmacy <onboarding@resend.dev>',
      to: patient.email,
      subject: `Your Consent OTP — Ceylon Pharmacy (${otp})`,
      html,
    })

    return NextResponse.json({ success: true, message: `OTP sent to ${patient.email}` })
  } catch (err: any) {
    console.error('[Request Consent Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}