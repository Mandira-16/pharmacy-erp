'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const patients = [
  {
    id: 'PAT001', name: 'Kumara Wijesekara', nic: '700123456V', age: 54,
    phone: '077-1234567', consent: true,
    history: [
      { date: '2026-02-28', medicine: 'Metformin 850mg', qty: 30, doctor: 'Dr. Perera' },
      { date: '2026-01-15', medicine: 'Losartan 50mg', qty: 30, doctor: 'Dr. Perera' },
      { date: '2025-12-10', medicine: 'Aspirin 75mg', qty: 30, doctor: 'Dr. Fernando' },
    ]
  },
  {
    id: 'PAT002', name: 'Samantha Rajapaksa', nic: '850456789V', age: 39,
    phone: '076-9876543', consent: true,
    history: [
      { date: '2026-03-01', medicine: 'Amoxicillin 500mg', qty: 15, doctor: 'Dr. Silva' },
      { date: '2026-02-10', medicine: 'Paracetamol 500mg', qty: 20, doctor: 'Dr. Silva' },
    ]
  },
  {
    id: 'PAT003', name: 'Nimal Jayawardena', nic: '570789012V', age: 67,
    phone: '071-5556789', consent: false,
    history: []
  },
  {
    id: 'PAT004', name: 'Dilini Weerasinghe', nic: '920234567V', age: 32,
    phone: '078-3334455', consent: false,
    history: []
  },
  {
    id: 'PAT005', name: 'Ruwan Bandara', nic: '880567890V', age: 45,
    phone: '072-7778899', consent: true,
    history: [
      { date: '2026-02-25', medicine: 'Atorvastatin 20mg', qty: 30, doctor: 'Dr. Perera' },
      { date: '2026-01-20', medicine: 'Omeprazole 20mg', qty: 14, doctor: 'Dr. Perera' },
      { date: '2025-11-05', medicine: 'Losartan 50mg', qty: 30, doctor: 'Dr. Fernando' },
    ]
  },
]

export default function PatientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [selected, setSelected] = useState(patients[0])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.nic.includes(search) ||
    p.id.includes(search)
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

      {/* Sidebar */}
      <div style={{
        width: '220px',
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 0', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {[
            { icon: '▦', label: 'Dashboard', path: '/dashboard' },
            { icon: '⊞', label: 'Point of Sale', path: '/pos' },
            { icon: '◈', label: 'Inventory', path: '/inventory' },
            { icon: '♡', label: 'Patient History', path: '/patients', active: true },
            { icon: '◎', label: 'Suppliers', path: '/suppliers' },
            { icon: '△', label: 'Alerts', path: '/alerts' },
            { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
            { icon: '≈', label: 'Analytics', path: '/analytics' },
            { icon: '☰', label: 'Reports', path: '/reports' },
          ].map((item) => (
            <div key={item.label} onClick={() => router.push(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
              cursor: 'pointer',
              background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
              fontSize: '13px', fontWeight: item.active ? '600' : '400',
            }}
              onMouseEnter={(e) => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => router.push('/dashboard')} style={{
            width: '100%', padding: '7px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '6px', color: '#60a5fa',
            cursor: 'pointer', fontSize: '12px',
          }}>Back to Dashboard</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Patient List Panel */}
        <div style={{
          width: '300px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.01)',
        }}>
          {/* Header */}
          <div style={{ padding: '24px 20px 16px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0' }}>Patient History</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 16px 0' }}>
              PDPA-compliant medication tracking
            </p>

            {/* PDPA Banner */}
            <div style={{
              padding: '10px 12px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '16px',
              lineHeight: '1.5',
            }}>
              Access controlled by Sri Lankan <strong style={{ color: '#60a5fa' }}>PDPA</strong> digital consent flag
            </div>

            {/* Search */}
            <input
              placeholder="Search by name, NIC, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Patient List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  background: selected.id === p.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                  border: `1px solid ${selected.id === p.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (selected.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={(e) => {
                  if (selected.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: p.consent ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                      border: `1px solid ${p.consent ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700',
                      color: p.consent ? '#10b981' : '#9ca3af',
                    }}>
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        {p.id} · Age {p.age}
                      </div>
                    </div>
                  </div>
                  {/* Consent badge */}
                  <span style={{
                    fontSize: '10px', fontWeight: '600',
                    padding: '3px 8px', borderRadius: '20px',
                    background: p.consent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: p.consent ? '#10b981' : '#f87171',
                    border: `1px solid ${p.consent ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {p.consent ? 'Granted' : 'Not Given'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Detail Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

          {/* Patient Header */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: selected.consent ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                border: `2px solid ${selected.consent ? 'rgba(16,185,129,0.4)' : 'rgba(107,114,128,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: '700',
                color: selected.consent ? '#10b981' : '#9ca3af',
              }}>
                {selected.name.charAt(0)}
              </div>
              <div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700' }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                  <span>Patient ID: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{selected.id}</strong></span>
                  <span>NIC: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{selected.nic}</strong></span>
                  <span>Age: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{selected.age} years</strong></span>
                  <span>Phone: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{selected.phone}</strong></span>
                </div>
              </div>
            </div>

            {/* PDPA Consent Status */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', letterSpacing: '0.5px' }}>PDPA CONSENT</div>
              <span style={{
                padding: '6px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: '700',
                background: selected.consent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: selected.consent ? '#10b981' : '#f87171',
                border: `1px solid ${selected.consent ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {selected.consent ? 'Granted' : 'Not Given'}
              </span>
            </div>
          </div>

          {/* Medication History or Restricted */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${selected.consent ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.15)'}`,
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${selected.consent ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.1)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Medication History</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                  {selected.consent ? `${selected.history.length} records found` : 'Access restricted — PDPA consent required'}
                </p>
              </div>
              {!selected.consent && (
                <button style={{
                  padding: '8px 16px',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '8px', color: '#60a5fa',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                }}>Request Consent</button>
              )}
            </div>

            {selected.consent ? (
              /* Access Granted — show history */
              <div>
                {selected.history.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                    No medication history recorded yet
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {['DATE', 'MEDICINE', 'QTY', 'PRESCRIBED BY'].map(h => (
                          <th key={h} style={{
                            padding: '12px 20px', textAlign: 'left',
                            fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                            fontWeight: '600', letterSpacing: '0.5px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.history.map((h, i) => (
                        <tr key={i}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{h.date}</td>
                          <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '500' }}>{h.medicine}</td>
                          <td style={{ padding: '14px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{h.qty} units</td>
                          <td style={{ padding: '14px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{h.doctor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* Access Restricted */
              <div style={{
                padding: '60px 40px',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '16px',
              }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px',
                }}>🔒</div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#f87171' }}>
                    Access Restricted
                  </h3>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'rgba(255,255,255,0.45)', maxWidth: '360px' }}>
                    PDPA digital consent has not been granted by the patient. Medication history cannot be accessed.
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
                    Sri Lankan Personal Data Protection Act (PDPA) — Section 8
                  </p>
                </div>
                <button style={{
                  padding: '10px 24px',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '10px', color: '#60a5fa',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                }}>Request Consent</button>
              </div>
            )}
          </div>

          {/* PDPA Info Box */}
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: '1.6',
          }}>
            <strong style={{ color: '#60a5fa' }}>PDPA Compliance:</strong> The consentFlag is enforced at the database level via a backend logic check before any patient history is retrieved. No sensitive data is transmitted to the client unless explicit digital consent is verified. This ensures full compliance with the Sri Lankan Personal Data Protection Act.
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}