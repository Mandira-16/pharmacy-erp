'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'

interface Patient { id: string; name: string; nic: string | null; phone: string | null; email: string | null; consentFlag: boolean; age?: number; patientId?: string }
interface HistoryRecord { id: string; date: string; medicineName: string; quantity: number | null; doctorName: string | null; doctorSlmc: string | null; notes: string | null }
interface PatientDetail { patient: Patient; history: HistoryRecord[] }

export default function PatientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/patients').then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); setPatients(d.patients ?? []) }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [status])

  const selectPatient = async (patient: Patient) => {
    if (!patient.consentFlag) { setSelected({ patient, history: [] }); return }
    try {
      const res = await fetch(`/api/patients/${patient.id}`)
      const data = await res.json()
      setSelected({ patient, history: data.history ?? [] })
    } catch { setSelected({ patient, history: [] }) }
  }

  const filtered = patients.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.nic ?? '').includes(search))

  if (status === 'loading' || loading) return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /><span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading records...</span></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Patient Records</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>PDPA-compliant medication history · Consent-controlled access</p>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: 'var(--info)', fontWeight: '500' }}>
          🔒 Access controlled by Sri Lankan PDPA digital consent flag — patient data is only visible when consent has been granted
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Patient list */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or NIC..." style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              {filtered.map(p => (
                <div key={p.id} onClick={() => selectPatient(p)}
                  style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', background: selected?.patient.id === p.id ? 'var(--brand-primary-light)' : 'transparent', borderLeft: selected?.patient.id === p.id ? '3px solid var(--brand-primary)' : '3px solid transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (selected?.patient.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface-2)' }}
                  onMouseLeave={e => { if (selected?.patient.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `hsl(${p.name.charCodeAt(0) * 10}, 60%, ${selected?.patient.id === p.id ? '45%' : '55%'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{p.name[0]}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: selected?.patient.id === p.id ? 'var(--brand-primary)' : 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{p.nic ? `NIC: ${p.nic}` : `ID: ${p.id.slice(-6)}`}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', background: p.consentFlag ? 'var(--success-bg)' : 'var(--danger-bg)', color: p.consentFlag ? 'var(--success)' : 'var(--danger)', border: `1px solid ${p.consentFlag ? 'var(--success-border)' : 'var(--danger-border)'}`, flexShrink: 0 }}>{p.consentFlag ? 'Granted' : 'Not Given'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {!selected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>♡</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select a patient</p>
                <p style={{ fontSize: '12px' }}>Click a patient from the list to view their records</p>
              </div>
            ) : !selected.patient.consentFlag ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Access Restricted</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', lineHeight: '1.6', marginBottom: '20px' }}>{selected.patient.name} has not granted consent for their medication history to be viewed.</p>
                <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '12px 20px', fontSize: '12px', color: 'var(--warning)', fontWeight: '500' }}>PDPA Consent Required · Sri Lanka Data Protection Act</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `hsl(${selected.patient.name.charCodeAt(0) * 10}, 60%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: 'white' }}>{selected.patient.name[0]}</div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{selected.patient.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {selected.patient.nic && <span>NIC: {selected.patient.nic} · </span>}
                        {selected.patient.phone && <span>📞 {selected.patient.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>✓ Consent Granted</span>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Medication History</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>{selected.history.length} records found</p>
                  {selected.history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No medication history recorded</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: 'var(--bg-surface-2)' }}>{['Date', 'Medicine', 'Qty', 'Doctor', 'Notes'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' as const, borderBottom: '1px solid var(--border-default)' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {selected.history.map((rec, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(rec.date).toLocaleDateString('en-LK')}</td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{rec.medicineName}</td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{rec.quantity ?? '—'}</td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{rec.doctorName ? `Dr. ${rec.doctorName}${rec.doctorSlmc ? ` (${rec.doctorSlmc})` : ''}` : '—'}</td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>{rec.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}