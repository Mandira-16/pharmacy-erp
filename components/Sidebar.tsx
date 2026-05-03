'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const navItems = [
  { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
  { icon: '◈', label: 'Point of Sale', path: '/pos' },
  { icon: '▦', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export default function Sidebar({ theme, onThemeToggle }: SidebarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const role = (session?.user as any)?.role ?? ''
  const name = session?.user?.name ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
      zIndex: 10,
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '800', color: 'white',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>+</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>SmartERP</div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '500' }}>Pharmacy</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Main Menu
        </div>
        {navItems.map(item => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '2px',
                border: 'none',
                background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                borderLeft: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sidebar-hover)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)',
            color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500',
            cursor: 'pointer', marginBottom: '10px', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)' }}
        >
          <span style={{ fontSize: '14px' }}>{theme === 'dark' ? '☀' : '◑'}</span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-2)', marginBottom: '8px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{role}</div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)', fontSize: '12px', fontWeight: '500',
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          ↪ Sign Out
        </button>
      </div>
    </aside>
  )
}