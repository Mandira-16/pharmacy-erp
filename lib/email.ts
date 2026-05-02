import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export interface ReceiptEmailData {
  to: string
  patientName: string
  saleId: string
  saleDate: string
  items: {
    medicineName: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }[]
  totalAmount: number
  paymentMethod: string
  pharmacistName: string
  doctorName?: string
  doctorSlmc?: string
}

export async function sendReceiptEmail(data: ReceiptEmailData) {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${item.medicineName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right;">LKR ${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;text-align:right;">LKR ${Number(item.totalAmount).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6,#10b981);padding:32px 36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;">+</div>
        <span style="font-size:20px;font-weight:700;color:white;letter-spacing:-0.5px;">SmartERP Pharmacy</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">Purchase Receipt</p>
    </div>

    <!-- Receipt info -->
    <div style="padding:28px 36px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div>
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Receipt for</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${data.patientName}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${data.saleDate}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;font-family:monospace;">#${data.saleId.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      ${
        data.doctorName
          ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:12px;color:#3b82f6;font-weight:600;">PRESCRIPTION</p>
              <p style="margin:4px 0 0;font-size:13px;color:#1e40af;">Dr. ${data.doctorName} — SLMC ${data.doctorSlmc}</p>
            </div>`
          : ''
      }

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Medicine</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Qty</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Unit Price</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Total -->
      <div style="border-top:2px solid #111827;margin-top:8px;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <p style="margin:0;font-size:13px;color:#6b7280;">Payment: <span style="color:#111827;font-weight:600;">${data.paymentMethod}</span></p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Served by: ${data.pharmacistName}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Total Amount</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;">LKR ${Number(data.totalAmount).toFixed(2)}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 36px;margin-top:24px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Thank you for your purchase. Please keep this receipt for your records.</p>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;text-align:center;">SmartERP Pharmacy Management System</p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"SmartERP Pharmacy" <${process.env.GMAIL_USER}>`,
    to: data.to,
    subject: `Your Receipt — LKR ${Number(data.totalAmount).toFixed(2)} — SmartERP Pharmacy`,
    html,
  })
}