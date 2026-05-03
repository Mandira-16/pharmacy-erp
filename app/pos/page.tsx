'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import AppLayout from '../../components/AppLayout'

interface Medicine { id: string; sku: string; name: string; genericName: string | null; category: string; unitPrice: number; totalStock: number; scheduleType: string | null; daysToExpiry: number | null }
interface CartItem { medicineId: string; name: string; sku: string; unitPrice: number; quantity: number; totalStock: number; scheduleType: string | null }
interface Patient { id: string; name: string; nic: string | null; phone: string | null; email: string | null; consentFlag: boolean }
interface ReceiptData { saleId: string; items: CartItem[]; totalAmount: number; paymentMethod: string; patientName: string; patientEmail: string; doctorName: string; doctorSlmc: string; emailSent: boolean; saleDate: string }

function formatLKR(n: number) { return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

export default function POSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Medicine search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [searching, setSearching] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<NodeJS.Timeout | null>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Patient
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showPatientSearch, setShowPatientSearch] = useState(false)

  // Add patient modal
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', nic: '', phone: '', email: '', consentFlag: true })
  const [addingPatient, setAddingPatient] = useState(false)

  // Doctor
  const [doctorName, setDoctorName] = useState('')
  const [doctorSlmc, setDoctorSlmc] = useState('')
  const [showDoctorModal, setShowDoctorModal] = useState(false)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  // Medicine search
  const searchMedicines = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setSearchResults([]); return }
    setSearching(true)
    try { const res = await fetch(`/api/pos/search?q=${encodeURIComponent(q)}`); const data = await res.json(); setSearchResults(data.medicines ?? []) }
    catch { setSearchResults([]) }
    finally { setSearching(false) }
  }, [])

  useEffect(() => { const t = setTimeout(() => searchMedicines(searchQuery), 300); return () => clearTimeout(t) }, [searchQuery, searchMedicines])

  // Barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') { if (barcodeBuffer.current.length > 2) { setSearchQuery(barcodeBuffer.current); searchMedicines(barcodeBuffer.current) }; barcodeBuffer.current = ''; if (barcodeTimer.current) clearTimeout(barcodeTimer.current); return }
      if (e.key.length === 1) { barcodeBuffer.current += e.key; if (barcodeTimer.current) clearTimeout(barcodeTimer.current); barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 100) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchMedicines])

  // Patient search
  useEffect(() => {
    if (!patientSearch || patientSearch.length < 1) { setPatientResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`)
        const data = await res.json()
        setPatientResults(data.patients ?? [])
      } catch { setPatientResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  const addToCart = (med: Medicine) => {
    if (med.totalStock === 0) return
    setCart(prev => { const existing = prev.find(i => i.medicineId === med.id); if (existing) { if (existing.quantity >= med.totalStock) return prev; return prev.map(i => i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i) }; return [...prev, { medicineId: med.id, name: med.name, sku: med.sku, unitPrice: med.unitPrice, quantity: 1, totalStock: med.totalStock, scheduleType: med.scheduleType }] })
    setSearchQuery(''); setSearchResults([])
  }

  const updateQty = (medicineId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.medicineId !== medicineId)); return }
    setCart(prev => prev.map(i => i.medicineId === medicineId ? { ...i, quantity: Math.min(qty, i.totalStock) } : i))
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const hasScheduledDrug = cart.some(i => i.scheduleType && i.scheduleType !== 'OTC')

  const addPatient = async () => {
    if (!newPatient.name) return
    setAddingPatient(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSelectedPatient(data.patient)
      setShowAddPatient(false)
      setNewPatient({ name: '', nic: '', phone: '', email: '', consentFlag: true })
    } catch (e: any) { setError(e.message) }
    finally { setAddingPatient(false) }
  }

  const processCheckout = async () => {
    setCheckingOut(true); setError(null)
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ medicineId: i.medicineId, quantity: i.quantity, unitPrice: i.unitPrice })),
          patientId: selectedPatient?.id || null,
          patientName: selectedPatient?.name || 'Walk-in Customer',
          patientEmail: selectedPatient?.email || null,
          paymentMethod, userId: (session?.user as any)?.id,
          doctorName: doctorName || null, doctorSlmc: doctorSlmc || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReceipt({ saleId: data.saleId, items: [...cart], totalAmount, paymentMethod, patientName: selectedPatient?.name || 'Walk-in Customer', patientEmail: selectedPatient?.email || '', doctorName, doctorSlmc, emailSent: data.emailSent, saleDate: new Date().toLocaleString('en-LK') })
      setCart([]); setSelectedPatient(null); setPatientSearch(''); setDoctorName(''); setDoctorSlmc('')
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
    const win = window.open('', '_blank'); if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:20px;font-size:13px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:10px 0}.r{display:flex;justify-content:space-between;margin:4px 0}@media print{body{margin:0;padding:10px}}</style></head><body><div class="c b" style="font-size:16px">Ceylon Pharmacy</div><div class="c" style="font-size:11px;margin-bottom:8px">Colombo · Est. 1987</div><div class="l"></div><div class="r"><span>Date:</span><span>${receipt.saleDate}</span></div><div class="r"><span>Receipt #:</span><span>${receipt.saleId.slice(-8).toUpperCase()}</span></div><div class="r"><span>Patient:</span><span>${receipt.patientName}</span></div><div class="r"><span>Payment:</span><span>${receipt.paymentMethod}</span></div>${receipt.doctorName ? `<div class="r"><span>Doctor:</span><span>Dr. ${receipt.doctorName} (${receipt.doctorSlmc})</span></div>` : ''}<div class="l"></div>${receipt.items.map(i => `<div class="r"><span class="b">${i.name}</span></div><div class="r"><span>  ${i.quantity} x LKR ${i.unitPrice.toFixed(2)}</span><span>LKR ${(i.quantity * i.unitPrice).toFixed(2)}</span></div>`).join('')}<div class="l"></div><div class="r b"><span>TOTAL</span><span>LKR ${receipt.totalAmount.toFixed(2)}</span></div><div class="l"></div><div class="c" style="font-size:11px;margin-top:10px">Thank you for choosing Ceylon Pharmacy!</div><script>window.onload=()=>{window.print()}<\/script></body></html>`)
    win.document.close()
  }

  const iStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }

  if (status === 'loading') return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Point of Sale</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Search medicine · Link patient · Process payment · Auto-record medication history</p>
        </div>

        {/* Receipt Modal */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '32px', width: '460px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>✓</div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Sale Complete</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>#{receipt.saleId.slice(-8).toUpperCase()} · {receipt.saleDate}</p>
              </div>
              <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
                {receipt.items.map(i => (
                  <div key={i.medicineId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{i.name} × {i.quantity}</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatLKR(i.quantity * i.unitPrice)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '16px', fontWeight: '800' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ color: 'var(--success)' }}>{formatLKR(receipt.totalAmount)}</span>
                </div>
              </div>
              {receipt.emailSent && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>✉ Receipt sent to {receipt.patientEmail}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={printReceipt} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>🖨 Print</button>
                <button onClick={() => setReceipt(null)} style={{ flex: 1, padding: '11px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>New Sale</button>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Modal */}
        {showDoctorModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-xl)', padding: '32px', width: '400px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Prescription Required</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>This sale contains scheduled medicines. Please enter the prescribing doctor's details.</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Doctor Name</label>
                <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Perera" style={iStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>SLMC Registration No.</label>
                <input value={doctorSlmc} onChange={e => setDoctorSlmc(e.target.value)} placeholder="SLMC/12345" style={iStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowDoctorModal(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => { setShowDoctorModal(false); if (doctorName && doctorSlmc) processCheckout() }} disabled={!doctorName || !doctorSlmc} style={{ flex: 1, padding: '11px', background: !doctorName || !doctorSlmc ? 'var(--bg-surface-3)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: !doctorName || !doctorSlmc ? 'var(--text-tertiary)' : 'white', cursor: !doctorName || !doctorSlmc ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>Confirm & Checkout</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Patient Modal */}
        {showAddPatient && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '32px', width: '440px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Add New Patient</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>Register a new patient for medication history tracking</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Full Name *</label>
                  <input value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} placeholder="Kumara Wijesekara" style={iStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>NIC Number</label>
                  <input value={newPatient.nic} onChange={e => setNewPatient({...newPatient, nic: e.target.value})} placeholder="700123456V" style={iStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Phone</label>
                  <input value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="077-1234567" style={iStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Email</label>
                  <input value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="patient@email.com" type="email" style={iStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setNewPatient({...newPatient, consentFlag: !newPatient.consentFlag})}>
                <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${newPatient.consentFlag ? 'var(--brand-primary)' : 'var(--border-strong)'}`, background: newPatient.consentFlag ? 'var(--brand-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {newPatient.consentFlag && <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>PDPA Consent Granted</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Patient allows medication history to be recorded and viewed</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowAddPatient(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addPatient} disabled={!newPatient.name || addingPatient} style={{ flex: 1, padding: '11px', background: !newPatient.name ? 'var(--bg-surface-3)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: !newPatient.name ? 'var(--text-tertiary)' : 'white', cursor: !newPatient.name ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
                  {addingPatient ? 'Adding...' : 'Add Patient'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Medicine Search */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Search Medicine</h3>
              <div style={{ position: 'relative' }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type medicine name or SKU..." style={{ ...iStyle, paddingRight: '40px' }} onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
                {searching && <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                  {searchResults.map(med => (
                    <div key={med.id} onClick={() => addToCart(med)}
                      style={{ padding: '12px 16px', cursor: med.totalStock === 0 ? 'not-allowed' : 'pointer', opacity: med.totalStock === 0 ? 0.5 : 1, borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (med.totalStock > 0) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface-2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{med.name}
                            {med.scheduleType && med.scheduleType !== 'OTC' && <span style={{ marginLeft: '8px', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', border: '1px solid var(--warning-border)' }}>Rx</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{med.sku} · {med.category}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>{formatLKR(med.unitPrice)}</div>
                          <div style={{ fontSize: '11px', color: med.totalStock === 0 ? 'var(--danger)' : med.totalStock < 10 ? 'var(--warning)' : 'var(--text-tertiary)', marginTop: '2px' }}>{med.totalStock === 0 ? 'Out of stock' : `${med.totalStock} units`}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Section */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Patient</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Link patient for medication history · Required for scheduled medicines</p>
                </div>
                <button onClick={() => setShowAddPatient(true)} style={{ padding: '7px 14px', background: 'var(--brand-primary-light)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ New Patient</button>
              </div>

              {selectedPatient ? (
                <div>
                  {/* Patient card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--brand-primary-light)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{selectedPatient.name[0]}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--brand-primary)' }}>{selectedPatient.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {selectedPatient.nic && <span>{selectedPatient.nic} · </span>}
                          {selectedPatient.consentFlag ? <span style={{ color: 'var(--success)' }}>✓ PDPA Consent</span> : <span style={{ color: 'var(--warning)' }}>⚠ No Consent</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedPatient(null); setPatientSearch(''); setDoctorName(''); setDoctorSlmc('') }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', fontFamily: 'inherit' }}>×</button>
                  </div>
                  {/* Doctor details — always visible when patient is linked */}
                  <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Doctor Details <span style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-tertiary)', textTransform: 'none' as const }}>— required for scheduled medicines, optional for OTC</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Doctor Name</label>
                        <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Perera" style={{ ...iStyle, padding: '8px 12px', fontSize: '12px', background: 'var(--bg-surface)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '5px' }}>SLMC No.</label>
                        <input value={doctorSlmc} onChange={e => setDoctorSlmc(e.target.value)} placeholder="SLMC/12345" style={{ ...iStyle, padding: '8px 12px', fontSize: '12px', background: 'var(--bg-surface)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setShowPatientSearch(true) }} onFocus={() => setShowPatientSearch(true)} placeholder="Search by name or NIC..." style={iStyle} />
                  {showPatientSearch && patientResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 20, marginTop: '4px' }}>
                      {patientResults.slice(0, 6).map(p => (
                        <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); setShowPatientSearch(false) }}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface-2)'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{p.nic ?? 'No NIC'} · {p.phone ?? 'No phone'}</div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', background: p.consentFlag ? 'var(--success-bg)' : 'var(--warning-bg)', color: p.consentFlag ? 'var(--success)' : 'var(--warning)', border: `1px solid ${p.consentFlag ? 'var(--success-border)' : 'var(--warning-border)'}` }}>{p.consentFlag ? 'Consent' : 'No Consent'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right — Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', flex: 1, minHeight: '280px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Cart</h3>
                {cart.length > 0 && <span style={{ fontSize: '11px', fontWeight: '600', background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)', padding: '3px 10px', borderRadius: '20px' }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>}
              </div>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛒</div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>Cart is empty</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Search a medicine to add</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cart.map(item => (
                    <div key={item.medicineId} style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.sku} · {formatLKR(item.unitPrice)}</div>
                        </div>
                        <button onClick={() => updateQty(item.medicineId, 0)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', padding: '0 0 0 8px', lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => updateQty(item.medicineId, item.quantity - 1)} style={{ width: '28px', height: '28px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</button>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateQty(item.medicineId, item.quantity + 1)} disabled={item.quantity >= item.totalStock} style={{ width: '28px', height: '28px', background: item.quantity >= item.totalStock ? 'var(--bg-surface-3)' : 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', color: item.quantity >= item.totalStock ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: item.quantity >= item.totalStock ? 'not-allowed' : 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>+</button>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{formatLKR(item.quantity * item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Payment Method</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['CASH', 'CARD'] as const).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${paymentMethod === m ? 'var(--brand-primary)' : 'var(--border-default)'}`, background: paymentMethod === m ? 'var(--brand-primary-light)' : 'var(--bg-surface-2)', color: paymentMethod === m ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{m === 'CASH' ? '💵 Cash' : '💳 Card'}</button>
                ))}
              </div>
              {hasScheduledDrug && <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: 'var(--warning)', fontWeight: '500' }}>⚠ Scheduled medicine — doctor details required</div>}
              {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: 'var(--danger)' }}>⚠ {error}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>Total Amount</span>
                <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--success)' }}>{formatLKR(totalAmount)}</span>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0 || checkingOut} style={{ width: '100%', padding: '13px', background: cart.length === 0 ? 'var(--bg-surface-3)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: cart.length === 0 ? 'var(--text-tertiary)' : 'white', fontSize: '14px', fontWeight: '700', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: cart.length > 0 ? '0 2px 8px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.15s' }}>
                {checkingOut ? 'Processing...' : `Complete Sale · ${formatLKR(totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}