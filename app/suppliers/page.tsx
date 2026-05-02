'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard' },
  { icon: '⊞', label: 'Point of Sale', path: '/pos' },
  { icon: '◈', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers', active: true },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

interface Medicine {
  id: string; sku: string; name: string; category: string
  totalStock: number; reorderPoint: number; unitPrice: number
  daysToExpiry: number | null; expiryDate: string | null
  stockStatus: string; expiryStatus: string; needsAction: boolean
}

interface Supplier {
  id: string; name: string; contactInfo: string | null; email: string | null
  medicines: Medicine[]; medicineCount: number; alertCount: number; criticalCount: number
}

interface EmailDraft {
  supplierId: string
  supplierName: string
  supplierEmail: string
  subject: string
  selectedMedicines: Medicine[]
}

const stockColors: Record<string, string> = {
  OK: '#10b981', LOW_STOCK: '#f59e0b', CRITICAL: '#ef4444', OUT_OF_STOCK: '#ef4444',
}
const stockLabels: Record<string, string> = {
  OK: 'OK', LOW_STOCK: 'Low Stock', CRITICAL: 'Critical', OUT_OF_STOCK: 'Out of Stock',
}

function buildEmailBody(supplierName: string, medicines: Medicine[]): string {
  if (medicines.length === 0) return ''
  const outOfStock = medicines.filter(m => m.stockStatus === 'OUT_OF_STOCK')
  const critical = medicines.filter(m => m.stockStatus === 'CRITICAL')
  const lowStock = medicines.filter(m => m.stockStatus === 'LOW_STOCK')
  const expiryWarning = medicines.filter(m => m.expiryStatus !== 'OK' && m.stockStatus === 'OK')

  let body = `We are writing to inform you of stock requirements for medicines supplied by ${supplierName}.\n\n`

  if (outOfStock.length > 0) {
    body += `CRITICAL — OUT OF STOCK (Immediate supply required):\n`
    outOfStock.forEach(m => {
      body += `  • ${m.name} (${m.sku}) — Current stock: 0 units. Please supply ${m.reorderPoint * 2} units urgently.\n`
    })
    body += '\n'
  }
  if (critical.length > 0) {
    body += `URGENT — CRITICALLY LOW STOCK:\n`
    critical.forEach(m => {
      body += `  • ${m.name} (${m.sku}) — Current stock: ${m.totalStock} units (ROP: ${m.reorderPoint}). Please supply ${m.reorderPoint * 2} units.\n`
    })
    body += '\n'
  }
  if (lowStock.length > 0) {
    body += `LOW STOCK — Reorder Required:\n`
    lowStock.forEach(m => {
      body += `  • ${m.name} (${m.sku}) — Current stock: ${m.totalStock} units (ROP: ${m.reorderPoint}). Please supply ${m.reorderPoint * 2} units.\n`
    })
    body += '\n'
  }
  if (expiryWarning.length > 0) {
    body += `EXPIRY NOTICE:\n`
    expiryWarning.forEach(m => {
      body += `  • ${m.name} (${m.sku}) — ${m.totalStock} units expiring on ${m.expiryDate} (${m.daysToExpiry} days remaining).\n`
    })
    body += '\n'
  }
  body += `Please confirm availability and expected delivery timelines at your earliest convenience.\nFor urgent orders, please contact us immediately.`
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

  const fetchSuppliers = () => {
    setLoading(true)
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setSuppliers(d.suppliers ?? []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (status === 'authenticated') fetchSuppliers() }, [status])

  const openEmailDraft = (supplier: Supplier) => {
    const actionMeds = supplier.medicines.filter(m => m.needsAction)
    const urgencyPrefix = supplier.criticalCount > 0 ? '[URGENT] ' : '[ACTION REQUIRED] '
    setEmailDraft({
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierEmail: supplier.email ?? '',
      subject: `${urgencyPrefix}Stock Replenishment Request — ${supplier.name}`,
      selectedMedicines: [...actionMeds],
    })
  }

  const removeMedicineFromDraft = (medicineId: string) => {
    if (!emailDraft) return
    setEmailDraft({
      ...emailDraft,
      selectedMedicines: emailDraft.selectedMedicines.filter(m => m.id !== medicineId),
    })
  }

  const sendEmail = async () => {
    if (!emailDraft) return
    if (emailDraft.selectedMedicines.length === 0) {
      setError('No medicines selected — add at least one medicine to the order.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const emailBody = buildEmailBody(emailDraft.supplierName, emailDraft.selectedMedicines)
      const res = await fetch('/api/suppliers/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: emailDraft.supplierId,
          supplierEmail: emailDraft.supplierEmail,
          supplierName: emailDraft.supplierName,
          subject: emailDraft.subject,
          emailBody,
          adminName: session?.user?.name ?? 'Admin',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSentSuccess(`Email sent to ${emailDraft.supplierEmail}`)
      setEmailDraft(null)
      setTimeout(() => setSentSuccess(null), 5000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const iStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: 'white', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'DM Sans, sans-serif',
  }

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading suppliers...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

      {/* Sidebar */}
      <div style={{ width: '220px', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>+</div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.label} onClick={() => router.push(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent', color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: item.active ? '600' : '400', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            ><span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>{item.label}</div>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{session?.user?.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{(session?.user as any)?.role}</div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Suppliers</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Supplier management · Stock alerts · Procurement email notifications</p>
          </div>
          <button onClick={fetchSuppliers} style={{ fontSize: '12px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>↻ Refresh</button>
        </div>

        {sentSuccess && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#10b981', fontSize: '13px' }}>
            ✉ {sentSuccess}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'TOTAL SUPPLIERS', value: suppliers.length, color: '#3b82f6' },
            { label: 'TOTAL MEDICINES', value: suppliers.reduce((s, sup) => s + sup.medicineCount, 0), color: '#10b981' },
            { label: 'SUPPLIERS WITH ALERTS', value: suppliers.filter(s => s.alertCount > 0).length, color: '#f59e0b' },
            { label: 'CRITICAL ALERTS', value: suppliers.reduce((s, sup) => s + sup.criticalCount, 0), color: '#ef4444' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Supplier cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {suppliers.map(supplier => (
            <div key={supplier.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${supplier.criticalCount > 0 ? 'rgba(239,68,68,0.2)' : supplier.alertCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '16px', overflow: 'hidden' }}>

              <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' }}>
                    {supplier.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{supplier.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{supplier.contactInfo ?? '—'}</div>
                    <div style={{ fontSize: '12px', color: supplier.email ? '#60a5fa' : 'rgba(255,255,255,0.25)', marginTop: '2px' }}>✉ {supplier.email ?? 'No email configured'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '4px 12px', borderRadius: '20px' }}>
                    {supplier.medicineCount} medicines
                  </span>
                  {supplier.alertCount > 0 && (
                    <span style={{ fontSize: '12px', background: supplier.criticalCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${supplier.criticalCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, color: supplier.criticalCount > 0 ? '#f87171' : '#f59e0b', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                      ⚠ {supplier.alertCount} alert{supplier.alertCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {supplier.alertCount > 0 && (
                    <button onClick={() => openEmailDraft(supplier)} disabled={!supplier.email}
                      style={{ padding: '8px 18px', background: supplier.email ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '9px', color: supplier.email ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: '600', cursor: supplier.email ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', boxShadow: supplier.email ? '0 4px 12px rgba(59,130,246,0.25)' : 'none' }}>
                      ✉ Draft Supplier Email
                    </button>
                  )}
                  <button onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)}
                    style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {expandedSupplier === supplier.id ? '▲ Hide' : '▼ View Medicines'}
                  </button>
                </div>
              </div>

              {expandedSupplier === supplier.id && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {['SKU', 'MEDICINE', 'CATEGORY', 'STOCK', 'ROP', 'EXPIRY', 'STOCK STATUS', 'EXPIRY STATUS'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.medicines.map(med => (
                        <tr key={med.id}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: med.needsAction ? 'rgba(239,68,68,0.02)' : 'transparent' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = med.needsAction ? 'rgba(239,68,68,0.02)' : 'transparent'}
                        >
                          <td style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{med.sku}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500' }}>{med.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{med.category}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: med.totalStock <= med.reorderPoint ? '#ef4444' : 'rgba(255,255,255,0.8)' }}>{med.totalStock}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{med.reorderPoint}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: med.daysToExpiry !== null && med.daysToExpiry <= 30 ? '#ef4444' : med.daysToExpiry !== null && med.daysToExpiry <= 90 ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}>
                            {med.expiryDate ?? '—'}
                            {med.daysToExpiry !== null && med.daysToExpiry <= 90 && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({med.daysToExpiry}d)</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${stockColors[med.stockStatus] ?? '#6b7280'}20`, color: stockColors[med.stockStatus] ?? '#6b7280', border: `1px solid ${stockColors[med.stockStatus] ?? '#6b7280'}30` }}>
                              {stockLabels[med.stockStatus] ?? med.stockStatus}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {med.expiryStatus !== 'OK' ? (
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: med.expiryStatus === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: med.expiryStatus === 'CRITICAL' ? '#f87171' : '#f59e0b', border: `1px solid ${med.expiryStatus === 'CRITICAL' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                                {med.expiryStatus === 'CRITICAL' ? 'Expiring Soon' : 'Warning'}
                              </span>
                            ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>}
                          </td>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', padding: '32px', width: '640px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0' }}>Review & Send Supplier Email</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Remove medicines you don't want to order, then confirm</p>
              </div>
              <button onClick={() => setEmailDraft(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '22px', padding: '4px', lineHeight: 1 }}>×</button>
            </div>

            {/* To */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>To</label>
              <input value={emailDraft.supplierEmail} onChange={e => setEmailDraft({ ...emailDraft, supplierEmail: e.target.value })} style={iStyle} />
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Subject</label>
              <input value={emailDraft.subject} onChange={e => setEmailDraft({ ...emailDraft, subject: e.target.value })} style={iStyle} />
            </div>

            {/* Medicine order list */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Medicines in this order ({emailDraft.selectedMedicines.length})
                </label>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Click × to remove from order</span>
              </div>

              {emailDraft.selectedMedicines.length === 0 ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center', fontSize: '13px', color: '#f87171' }}>
                  No medicines in order — add at least one to send
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  {emailDraft.selectedMedicines.map((med, i) => (
                    <div key={med.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < emailDraft.selectedMedicines.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>{med.name}</span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>{med.sku}</span>
                          <span style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', background: `${stockColors[med.stockStatus] ?? '#6b7280'}20`, color: stockColors[med.stockStatus] ?? '#6b7280' }}>
                            {stockLabels[med.stockStatus] ?? med.stockStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
                          Stock: {med.totalStock} · ROP: {med.reorderPoint} · Order qty: {med.reorderPoint * 2}
                          {med.expiryStatus !== 'OK' && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>· Expiry: {med.expiryDate} ({med.daysToExpiry}d)</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMedicineFromDraft(med.id)}
                        title="Remove from order"
                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email preview */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Email Preview</label>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '180px', overflowY: 'auto' }}>
                {emailDraft.selectedMedicines.length > 0
                  ? buildEmailBody(emailDraft.supplierName, emailDraft.selectedMedicines)
                  : 'Remove all medicines to see an empty preview...'}
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>This preview updates live as you remove medicines.</p>
            </div>

            {!emailDraft.supplierEmail && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#f59e0b' }}>
                ⚠ No supplier email configured. Add an email address in the To field above.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEmailDraft(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button
                onClick={sendEmail}
                disabled={sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0}
                style={{ flex: 2, padding: '12px', background: (sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0) ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: (sending || !emailDraft.supplierEmail || emailDraft.selectedMedicines.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                {sending ? 'Sending...' : `✉ Confirm & Send (${emailDraft.selectedMedicines.length} medicine${emailDraft.selectedMedicines.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}@keyframes spin{to{transform:rotate(360deg)}}input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </div>
  )
}