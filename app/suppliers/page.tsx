'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'

interface Medicine { id: string; sku: string; name: string; category: string; totalStock: number; reorderPoint: number; unitPrice: number; daysToExpiry: number | null; expiryDate: string | null; stockStatus: string; expiryStatus: string; needsAction: boolean }
interface Supplier { id: string; name: string; contactInfo: string | null; email: string | null; medicines: Medicine[]; medicineCount: number; alertCount: number; criticalCount: number }
interface EmailDraft { supplierId: string; supplierName: string; supplierEmail: string; subject: string; selectedMedicines: Medicine[] }

const stockColors: Record<string, string> = { OK: '#10b981', LOW_STOCK: '#f59e0b', CRITICAL: '#ef4444', OUT_OF_STOCK: '#ef4444' }
const stockLabels: Record<string, string> = { OK: 'OK', LOW_STOCK: 'Low Stock', CRITICAL: 'Critical', OUT_OF_STOCK: 'Out of Stock' }

function buildEmailBody(supplierName: string, medicines: Medicine[]): string {
  if (medicines.length === 0) return ''
  const outOfStock = medicines.filter(m => m.stockStatus === 'OUT_OF_STOCK')
  const critical = medicines.filter(m => m.stockStatus === 'CRITICAL')
  const lowStock = medicines.filter(m => m.stockStatus === 'LOW_STOCK')
  const expiryWarning = medicines.filter(m => m.expiryStatus !== 'OK' && m.stockStatus === 'OK')
  let body = `Dear ${supplierName} Team,\n\nWe are writing regarding stock requirements for medicines supplied by your company.\n\n`
  if (outOfStock.length > 0) { body += `OUT OF STOCK — Immediate supply required:\n`; outOfStock.forEach(m => { body += `  • ${m.name} (${m.sku}) — Please supply ${m.reorderPoint * 2} units urgently.\n` }); body += '\n' }
  if (critical.length > 0) { body += `CRITICALLY LOW — Urgent reorder:\n`; critical.forEach(m => { body += `  • ${m.name} (${m.sku}) — Stock: ${m.totalStock} units. Please supply ${m.reorderPoint * 2} units.\n` }); body += '\n' }
  if (lowStock.length > 0) { body += `LOW STOCK — Reorder required:\n`; lowStock.forEach(m => { body += `  • ${m.name} (${m.sku}) — Stock: ${m.totalStock} units. Please supply ${m.reorderPoint * 2} units.\n` }); body += '\n' }
  if (expiryWarning.length > 0) { body += `EXPIRY NOTICE:\n`; expiryWarning.forEach(m => { body += `  • ${m.name} (${m.sku}) — ${m.totalStock} units expiring ${m.expiryDate} (${m.daysToExpiry} days).\n` }); body += '\n' }
  body += `Please confirm availability and expected delivery dates at your earliest convenience.\n\nKind regards,\nCeylon Pharmacy Management`
  return body
}

export default function SuppliersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState<string | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchSuppliers = () => { setLoading(true); fetch('/api/suppliers').then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); setSuppliers(d.suppliers ?? []) }).catch(e => setError(e.message)).finally(() => setLoading(false)) }

  useEffect(() => { if (status === 'authenticated') fetchSuppliers() }, [status])

  const openEmailDraft = (supplier: Supplier) => {
    const actionMeds = supplier.medicines.filter(m => m.needsAction)
    setEmailDraft({ supplierId: supplier.id, supplierName: supplier.name, supplierEmail: supplier.email ?? '', subject: `${supplier.criticalCount > 0 ? '[URGENT] ' : '[ACTION REQUIRED] '}Stock Replenishment — ${supplier.name}`, selectedMedicines: [...actionMeds] })
  }

  const removeMedicineFromDraft = (id: string) => { if (!emailDraft) return; setEmailDraft({ ...emailDraft, selectedMedicines: emailDraft.selectedMedicines.filter(m => m.id !== id) }) }

  const sendEmail = async () => {
    if (!emailDraft) return
    setSending(true); setError(null)
    try {
      const res = await fetch('/api/suppliers/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: emailDraft.supplierId, supplierEmail: emailDraft.supplierEmail, supplierName: emailDraft.supplierName, subject: emailDraft.subject, emailBody: buildEmailBody(emailDraft.supplierName, emailDraft.selectedMedicines), adminName: session?.user?.name ?? 'Admin' }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSentSuccess(`Email sent to ${emailDraft.supplierEmail}`)
      setEmailDraft(null)
      setTimeout(() => setSentSuccess(null), 5000)
    } catch (e: any) { setError(e.message) }
    finally { setSending(false) }
  }

  const iStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }

  if (status === 'loading' || loading) return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /><span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading suppliers...</span></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Suppliers</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Supplier management · Stock alerts · Procurement notifications</p>
          </div>
          <button onClick={fetchSuppliers} style={{ fontSize: '12px', padding: '8px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', boxShadow: 'var(--shadow-sm)' }}>↻ Refresh</button>
        </div>

        {sentSuccess && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--success)', fontSize: '13px', fontWeight: '500' }}>✉ {sentSuccess}</div>}
        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Suppliers', value: suppliers.length, color: '#2563eb' },
            { label: 'Total Medicines', value: suppliers.reduce((s, sup) => s + sup.medicineCount, 0), color: '#10b981' },
            { label: 'Suppliers with Alerts', value: suppliers.filter(s => s.alertCount > 0).length, color: '#f59e0b' },
            { label: 'Critical Alerts', value: suppliers.reduce((s, sup) => s + sup.criticalCount, 0), color: '#ef4444' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {suppliers.map(supplier => (
            <div key={supplier.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${supplier.criticalCount > 0 ? 'var(--danger-border)' : supplier.alertCount > 0 ? 'var(--warning-border)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white' }}>{supplier.name[0]}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{supplier.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{supplier.contactInfo ?? '—'}</div>
                    <div style={{ fontSize: '12px', color: supplier.email ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>✉ {supplier.email ?? 'No email configured'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>{supplier.medicineCount} medicines</span>
                  {supplier.alertCount > 0 && <span style={{ fontSize: '12px', background: supplier.criticalCount > 0 ? 'var(--danger-bg)' : 'var(--warning-bg)', border: `1px solid ${supplier.criticalCount > 0 ? 'var(--danger-border)' : 'var(--warning-border)'}`, color: supplier.criticalCount > 0 ? 'var(--danger)' : 'var(--warning)', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>⚠ {supplier.alertCount} alert{supplier.alertCount !== 1 ? 's' : ''}</span>}
                  {supplier.alertCount > 0 && <button onClick={() => openEmailDraft(supplier)} disabled={!supplier.email} style={{ padding: '8px 16px', background: supplier.email ? 'var(--brand-primary)' : 'var(--bg-surface-3)', border: 'none', borderRadius: 'var(--radius-md)', color: supplier.email ? 'white' : 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600', cursor: supplier.email ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: supplier.email ? '0 2px 8px rgba(37,99,235,0.2)' : 'none' }}>✉ Draft Order Email</button>}
                  <button onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)} style={{ padding: '8px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>{expandedSupplier === supplier.id ? '▲ Hide' : '▼ View Medicines'}</button>
                </div>
              </div>

              {expandedSupplier === supplier.id && (
                <div style={{ borderTop: '1px solid var(--border-default)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--bg-surface-2)' }}>{['SKU', 'Medicine', 'Category', 'Stock', 'ROP', 'Expiry', 'Stock Status', 'Expiry Status'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-default)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {supplier.medicines.map(med => (
                        <tr key={med.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface-2)'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '11px 16px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{med.sku}</td>
                          <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{med.name}</td>
                          <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{med.category}</td>
                          <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: '700', color: med.totalStock <= med.reorderPoint ? 'var(--danger)' : 'var(--text-primary)' }}>{med.totalStock}</td>
                          <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--text-tertiary)' }}>{med.reorderPoint}</td>
                          <td style={{ padding: '11px 16px', fontSize: '12px', color: med.daysToExpiry !== null && med.daysToExpiry <= 30 ? 'var(--danger)' : med.daysToExpiry !== null && med.daysToExpiry <= 90 ? 'var(--warning)' : 'var(--text-secondary)' }}>{med.expiryDate ?? '—'}{med.daysToExpiry !== null && med.daysToExpiry <= 90 && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({med.daysToExpiry}d)</span>}</td>
                          <td style={{ padding: '11px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${stockColors[med.stockStatus] ?? '#6b7280'}12`, color: stockColors[med.stockStatus] ?? '#6b7280', border: `1px solid ${stockColors[med.stockStatus] ?? '#6b7280'}25` }}>{stockLabels[med.stockStatus] ?? med.stockStatus}</span></td>
                          <td style={{ padding: '11px 16px' }}>{med.expiryStatus !== 'OK' ? <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: med.expiryStatus === 'CRITICAL' ? 'var(--danger-bg)' : 'var(--warning-bg)', color: med.expiryStatus === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)', border: `1px solid ${med.expiryStatus === 'CRITICAL' ? 'var(--danger-border)' : 'var(--warning-border)'}` }}>{med.expiryStatus === 'CRITICAL' ? 'Expiring Soon' : 'Warning'}</span> : <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Email Draft Modal */}
      {emailDraft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '32px', width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div><h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Review & Send Order Email</h2><p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Remove medicines you don't want to include, then confirm</p></div>
              <button onClick={() => setEmailDraft(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', padding: '4px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
              <input value={emailDraft.supplierEmail} onChange={e => setEmailDraft({ ...emailDraft, supplierEmail: e.target.value })} style={iStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</label>
              <input value={emailDraft.subject} onChange={e => setEmailDraft({ ...emailDraft, subject: e.target.value })} style={iStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medicines in Order ({emailDraft.selectedMedicines.length})</label>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Click × to remove</span>
              </div>
              {emailDraft.selectedMedicines.length === 0 ? (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--danger)' }}>No medicines — add at least one</div>
              ) : (
                <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {emailDraft.selectedMedicines.map((med, i) => (
                    <div key={med.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: i < emailDraft.selectedMedicines.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{med.name}</span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)', background: 'var(--bg-surface-3)', padding: '1px 6px', borderRadius: '4px' }}>{med.sku}</span>
                          <span style={{ padding: '2px 6px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', background: `${stockColors[med.stockStatus] ?? '#6b7280'}12`, color: stockColors[med.stockStatus] ?? '#6b7280' }}>{stockLabels[med.stockStatus]}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Stock: {med.totalStock} · ROP: {med.reorderPoint} · Order: {med.reorderPoint * 2} units</div>
                      </div>
                      <button onClick={() => removeMedicineFromDraft(med.id)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px', fontFamily: 'inherit' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Preview</label>
              <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto' }}>
                {emailDraft.selectedMedicines.length > 0 ? buildEmailBody(emailDraft.supplierName, emailDraft.selectedMedicines) : 'No medicines selected...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEmailDraft(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={sendEmail} disabled={sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0} style={{ flex: 2, padding: '11px', background: sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0 ? 'var(--bg-surface-3)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0 ? 'var(--text-tertiary)' : 'white', fontSize: '13px', fontWeight: '700', cursor: sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {sending ? 'Sending...' : `✉ Confirm & Send (${emailDraft.selectedMedicines.length} medicine${emailDraft.selectedMedicines.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}