import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: Request) {
  try {
    const { supplierId, supplierEmail, supplierName, subject, emailBody, adminName } = await req.json()

    if (!supplierEmail) {
      return NextResponse.json({ error: 'Supplier has no email address configured' }, { status: 400 })
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#3b82f6,#10b981);padding:32px 36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;">+</div>
        <span style="font-size:20px;font-weight:700;color:white;letter-spacing:-0.5px;">SmartERP Pharmacy</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">Procurement Notification</p>
    </div>

    <div style="padding:32px 36px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Dear ${supplierName} Team,</p>
      
      <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${emailBody}</div>

      <p style="margin:16px 0 4px;font-size:13px;color:#6b7280;">Please respond at your earliest convenience.</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Best regards,<br><strong style="color:#111827;">${adminName}</strong><br>SmartERP Pharmacy Management System</p>
    </div>

    <div style="padding:20px 36px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">This is an automated procurement alert from SmartERP Pharmacy Management System.</p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: `"SmartERP Pharmacy" <${process.env.GMAIL_USER}>`,
      to: supplierEmail,
      subject,
      html,
    })

    return NextResponse.json({ success: true, sentTo: supplierEmail })
  } catch (err: any) {
    console.error('[Supplier Notify Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}