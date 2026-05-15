import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ReceiptEmailData {
  to: string
  patientName: string
  saleId: string
  saleDate: string
  items: { medicineName: string; quantity: number; unitPrice: number; totalAmount: number }[]
  totalAmount: number
  paymentMethod: string
  pharmacistName: string
  doctorName?: string
  doctorSlmc?: string
}

export async function sendReceiptEmail(data: ReceiptEmailData) {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${item.medicineName}</td>
      <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #f3f4f6;">${item.quantity}</td>
      <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #f3f4f6;">LKR ${item.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">LKR ${item.totalAmount.toFixed(2)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#0ea5e9);padding:32px 36px;">
      <div style="font-size:22px;font-weight:700;color:white;">+ Ceylon Pharmacy</div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:6px 0 0;">Purchase Receipt</p>
    </div>
    <div style="padding:32px 36px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
        <div><p style="margin:0;font-size:13px;color:#6b7280;">Receipt for</p><p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111827;">${data.patientName}</p></div>
        <div style="text-align:right;"><p style="margin:0;font-size:13px;color:#6b7280;">${data.saleDate}</p><p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">#${data.saleId.slice(-8).toUpperCase()}</p></div>
      </div>
      ${data.doctorName ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:20px;"><p style="margin:0;font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">Prescription</p><p style="margin:4px 0 0;font-size:13px;color:#1e40af;">Dr. ${data.doctorName} — SLMC ${data.doctorSlmc}</p></div>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#f9fafb;"><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Medicine</th><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.5px;">Qty</th><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Unit Price</th><th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="border-top:2px solid #111827;padding-top:16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div><p style="margin:0;font-size:13px;color:#6b7280;">Payment: <strong>${data.paymentMethod}</strong></p><p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Served by: ${data.pharmacistName}</p></div>
        <div style="text-align:right;"><p style="margin:0;font-size:12px;color:#6b7280;">Total Amount</p><p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#111827;">LKR ${data.totalAmount.toFixed(2)}</p></div>
      </div>
    </div>
    <div style="padding:20px 36px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Ceylon Pharmacy · Colombo, Sri Lanka · Est. 1987</p>
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: 'Ceylon Pharmacy <onboarding@resend.dev>',
    to: data.to,
    subject: `Your Receipt from Ceylon Pharmacy — LKR ${data.totalAmount.toFixed(2)}`,
    html,
  })
}