'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard' },
  { icon: '⊞', label: 'Point of Sale', path: '/pos', active: true },
  { icon: '◈', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

interface Medicine {
  id: string; sku: string; name: string; genericName: string | null
  category: string; unitPrice: number; totalStock: number
  scheduleType: string | null; daysToExpiry: number | null
}
interface CartItem {
  medicineId: string; name: string; sku: string
  unitPrice: number; quantity: number; totalStock: number; scheduleType: string | null
}
interface ReceiptData {
  saleId: string; items: CartItem[]; totalAmount: number; paymentMethod: string
  patientName: string; patientEmail: string; doctorName: string
  doctorSlmc: string; emailSent: boolean; saleDate: string
}

function formatLKR(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function POSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [searching, setSearching] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<NodeJS.Timeout | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [doctorSlmc, setDoctorSlmc] = useState('')
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const searchMedicines = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/pos/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.medicines ?? [])
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchMedicines(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMedicines])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) { setSearchQuery(barcodeBuffer.current); searchMedicines(barcodeBuffer.current) }
        barcodeBuffer.current = ''
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        return
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchMedicines])

  const addToCart = (med: Medicine) => {
    if (med.totalStock === 0) return
    setCart(prev => {
      const existing = prev.find(i => i.medicineId === med.id)
      if (existing) {
        if (existing.quantity >= med.totalStock) return prev
        return prev.map(i => i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { medicineId: med.id, name: med.name, sku: med.sku, unitPrice: med.unitPrice, quantity: 1, totalStock: med.totalStock, scheduleType: med.scheduleType }]
    })
    setSearchQuery(''); setSearchResults([])
  }

  const updateQty = (medicineId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.medicineId !== medicineId)); return }
    setCart(prev => prev.map(i => i.medicineId === medicineId ? { ...i, quantity: Math.min(qty, i.totalStock) } : i))
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const hasScheduledDrug = cart.some(i => i.scheduleType && i.scheduleType !== 'OTC')

  const processCheckout = async () => {
    setCheckingOut(true); setError(null)
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ medicineId: i.medicineId, quantity: i.quantity, unitPrice: i.unitPrice })),
          patientName: patientName || 'Walk-in Customer',
          patientEmail: patientEmail || null,
          paymentMethod, userId: (session?.user as any)?.id,
          doctorName: doctorName || null, doctorSlmc: doctorSlmc || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReceipt({ saleId: data.saleId, items: [...cart], totalAmount, paymentMethod, patientName: patientName || 'Walk-in Customer', patientEmail, doctorName, doctorSlmc, emailSent: data.emailSent, saleDate: new Date().toLocaleString('en-LK') })
      setCart([]); setPatientName(''); setPatientEmail(''); setDoctorName(''); setDoctorSlmc('')
    } catch (e: any) { setError(e.message) }
    finally { setCheckingOut(false) }
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    if (hasScheduledDrug && (!doctorName || !doctorSlmc)) { setShowDoctorModal(true); return }
    processCheckout()
  }

  const printReceipt = () => {
    if (!receipt) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:20px;font-size:13px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:10px 0}.r{display:flex;justify-content:space-between;margin:4px 0}@media print{body{margin:0;padding:10px}}</style></head><body><div class="c b" style="font-size:16px">+ SmartERP PHARMACY</div><div class="c" style="font-size:11px;margin-bottom:8px">Purchase Receipt</div><div class="l"></div><div class="r"><span>Date:</span><span>${receipt.saleDate}</span></div><div class="r"><span>Receipt #:</span><span>${receipt.saleId.slice(-8).toUpperCase()}</span></div><div class="r"><span>Patient:</span><span>${receipt.patientName}</span></div><div class="r"><span>Payment:</span><span>${receipt.paymentMethod}</span></div>${receipt.doctorName ? `<div class="r"><span>Doctor:</span><span>Dr.${receipt.doctorName} (${receipt.doctorSlmc})</span></div>` : ''}<div class="l"></div>${receipt.items.map(i => `<div class="r"><span class="b">${i.name}</span></div><div class="r"><span>  ${i.quantity} x LKR ${i.unitPrice.toFixed(2)}</span><span>LKR ${(i.quantity * i.unitPrice).toFixed(2)}</span></div>`).join('')}<div class="l"></div><div class="r b"><span>TOTAL</span><span>LKR ${receipt.totalAmount.toFixed(2)}</span></div><div class="l"></div><div class="c" style="font-size:11px;margin-top:10px">Thank you for your purchase!</div><script>window.onload=()=>{window.print()}<\/script></body></html>`)
    win.document.close()
  }

  if (status === 'loading') return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>Loading...</div>

  const iStyle = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'DM Sans, sans-serif' }

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
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Point of Sale</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Scan barcode or search · FEFO batch deduction · Gmail receipt</p>
        </div>

        {/* Receipt modal */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '460px', maxWidth: '90vw' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>Sale Complete</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>#{receipt.saleId.slice(-8).toUpperCase()} · {receipt.saleDate}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                {receipt.items.map(i => (
                  <div key={i.medicineId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{i.name} × {i.quantity}</span>
                    <span style={{ fontWeight: '600' }}>{formatLKR(i.quantity * i.unitPrice)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '18px', fontWeight: '700' }}>
                  <span>Total</span><span style={{ color: '#10b981' }}>{formatLKR(receipt.totalAmount)}</span>
                </div>
              </div>
              {receipt.emailSent && <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#10b981' }}>✉ Receipt emailed to {receipt.patientEmail}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={printReceipt} style={{ flex: 1, padding: '11px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>🖨 Print</button>
                <button onClick={() => setReceipt(null)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>New Sale</button>
              </div>
            </div>
          </div>
        )}

        {/* Doctor modal */}
        {showDoctorModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '20px', padding: '32px', width: '400px', maxWidth: '90vw' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>Prescription Required</h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 24px 0' }}>Cart contains scheduled medicine. Doctor details are required.</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Doctor Name</label>
                <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Perera" style={iStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>SLMC Number</label>
                <input value={doctorSlmc} onChange={e => setDoctorSlmc(e.target.value)} placeholder="SLMC/12345" style={iStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowDoctorModal(false)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                <button onClick={() => { setShowDoctorModal(false); if (doctorName && doctorSlmc) processCheckout() }} disabled={!doctorName || !doctorSlmc}
                  style={{ flex: 1, padding: '11px', background: (!doctorName || !doctorSlmc) ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: '10px', color: 'white', cursor: (!doctorName || !doctorSlmc) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>Confirm & Checkout</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⊞</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Search or Scan Barcode</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Type name / SKU or point barcode scanner here</div>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search medicine name, SKU..." style={{ ...iStyle, padding: '12px 16px', fontSize: '14px' }} onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                {searching && <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                  {searchResults.map(med => (
                    <div key={med.id} onClick={() => addToCart(med)}
                      style={{ padding: '12px 16px', cursor: med.totalStock === 0 ? 'not-allowed' : 'pointer', opacity: med.totalStock === 0 ? 0.4 : 1, borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (med.totalStock > 0) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{med.name}
                            {med.scheduleType && med.scheduleType !== 'OTC' && <span style={{ marginLeft: '8px', background: 'rgba(249,115,22,0.2)', color: '#fb923c', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>Rx</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{med.sku} · {med.category}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{formatLKR(med.unitPrice)}</div>
                          <div style={{ fontSize: '11px', color: med.totalStock === 0 ? '#ef4444' : med.totalStock < 10 ? '#f59e0b' : 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {med.totalStock === 0 ? 'Out of stock' : `${med.totalStock} units`}
                            {med.daysToExpiry !== null && med.daysToExpiry < 30 && <span style={{ color: '#ef4444' }}> · exp {med.daysToExpiry}d</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 14px 0' }}>Patient Details <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>(optional for OTC)</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Name</label>
                  <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Walk-in Customer" style={iStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Email for Receipt</label>
                  <input value={patientEmail} onChange={e => setPatientEmail(e.target.value)} placeholder="patient@email.com" type="email" style={iStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Right — Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', flex: 1, minHeight: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Cart</h3>
                {cart.length > 0 && <span style={{ fontSize: '11px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px' }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>}
              </div>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🛒</div>
                  <div style={{ fontSize: '13px' }}>Cart is empty</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Search or scan a medicine</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cart.map(item => (
                    <div key={item.medicineId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{item.sku} · {formatLKR(item.unitPrice)}</div>
                        </div>
                        <button onClick={() => updateQty(item.medicineId, 0)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '18px', padding: '0 0 0 8px', lineHeight: 1, fontFamily: 'DM Sans, sans-serif' }}>×</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => updateQty(item.medicineId, item.quantity - 1)} style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>−</button>
                          <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateQty(item.medicineId, item.quantity + 1)} disabled={item.quantity >= item.totalStock} style={{ width: '28px', height: '28px', background: item.quantity >= item.totalStock ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: item.quantity >= item.totalStock ? 'rgba(255,255,255,0.2)' : 'white', cursor: item.quantity >= item.totalStock ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>+</button>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{formatLKR(item.quantity * item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment + checkout */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Payment Method</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['CASH', 'CARD'] as const).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${paymentMethod === m ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`, background: paymentMethod === m ? 'rgba(59,130,246,0.15)' : 'transparent', color: paymentMethod === m ? '#60a5fa' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: paymentMethod === m ? '600' : '400', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>{m === 'CASH' ? '💵 Cash' : '💳 Card'}</button>
                ))}
              </div>
              {hasScheduledDrug && <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#fb923c' }}>⚠ Scheduled medicine — doctor details required</div>}
              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#f87171' }}>⚠ {error}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{formatLKR(totalAmount)}</span>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0 || checkingOut}
                style={{ width: '100%', padding: '14px', background: cart.length === 0 ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: '10px', color: cart.length === 0 ? 'rgba(255,255,255,0.3)' : 'white', fontSize: '15px', fontWeight: '700', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: cart.length > 0 ? '0 4px 20px rgba(59,130,246,0.25)' : 'none', transition: 'all 0.15s' }}
              >{checkingOut ? 'Processing...' : `⊞ Complete Sale · ${formatLKR(totalAmount)}`}</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}@keyframes spin{to{transform:rotate(360deg)}}input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </div>
  )
}