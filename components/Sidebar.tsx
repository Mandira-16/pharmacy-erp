'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  TrendingUp, Bell, BarChart3, ChevronLeft, ChevronRight,
  LogOut, Moon, Sun,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'] },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'] },
  { href: '/patients', label: 'Patient Records', icon: Users, roles: ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'] },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'] },
  { href: '/forecasting', label: 'Demand Forecast', icon: TrendingUp, roles: ['ADMIN', 'PHARMACIST', 'OWNER'] },
  { href: '/dss', label: 'Smart Alerts', icon: Bell, roles: ['ADMIN', 'PHARMACIST', 'OWNER'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'PHARMACIST', 'OWNER'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)

  const userRole = (session?.user as any)?.role ?? 'ASSISTANT'
  const navItems = allNavItems.filter(item => item.roles.includes(userRole))

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark') }
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const userName = session?.user?.name ?? 'User'
  const userEmail = session?.user?.email ?? ''
  const initials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin', PHARMACIST: 'Pharmacist', OWNER: 'Owner', ASSISTANT: 'Assistant'
  }

  return (
    <aside style={{
      width: collapsed ? '64px' : '232px', minHeight: '100vh', background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease', position: 'sticky', top: 0, flexShrink: 0, zIndex: 10,
    }}>
      {/* Header */}
      <div style={{ padding: collapsed ? '16px 0' : '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: '64px' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--brand-primary), #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white', flexShrink: 0 }}>+</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Ceylon Pharmacy</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>COLOMBO · EST. 1987</div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      {!collapsed && <div style={{ padding: '12px 12px 4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Main Menu</div>}
      <nav style={{ flex: 1, padding: collapsed ? '8px 0' : '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return collapsed ? (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', margin: '0 8px', borderRadius: '8px', background: active ? 'var(--brand-primary-light)' : 'transparent', color: active ? 'var(--brand-primary)' : 'var(--text-secondary)', transition: 'all 0.15s', textDecoration: 'none' }}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right"><p>{label}</p></TooltipContent>
            </Tooltip>
          ) : (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', background: active ? 'var(--brand-primary-light)' : 'transparent', color: active ? 'var(--brand-primary)' : 'var(--text-secondary)', borderLeft: active ? '3px solid var(--brand-primary)' : '3px solid transparent', fontSize: '13px', fontWeight: active ? '600' : '500', transition: 'all 0.15s', textDecoration: 'none' }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '8px 0' : '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', margin: '0 8px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>{dark ? 'Light Mode' : 'Dark Mode'}</p></TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'inherit', width: '100%' }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        )}

        {/* User */}
        {!collapsed && (
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{initials}</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{roleLabel[userRole] ?? userRole}</div>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}

        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', margin: '0 8px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                <LogOut size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Sign Out</p></TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  )
}