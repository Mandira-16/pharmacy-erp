'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  TrendingUp,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/pos' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Users, label: 'Patient Records', path: '/patients' },
  { icon: Truck, label: 'Suppliers', path: '/suppliers' },
  { icon: TrendingUp, label: 'Demand Forecast', path: '/forecasting' },
  { icon: Bell, label: 'Smart Alerts', path: '/dss' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export default function Sidebar({ theme, onThemeToggle }: SidebarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const role = (session?.user as any)?.role ?? ''
  const name = session?.user?.name ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const width = collapsed ? '64px' : '230px'

  return (
    <aside style={{
      width,
      minWidth: width,
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
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '10px',
        minHeight: '64px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '800', color: 'white',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}>+</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>Ceylon Pharmacy</div>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '500', whiteSpace: 'nowrap' }}>Colombo · Est. 1987</div>
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '800', color: 'white',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>+</div>
        )}

        {!collapsed && (
          <button onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button onClick={() => setCollapsed(false)}
            style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-tertiary)', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px 8px', whiteSpace: 'nowrap' }}>
            Main Menu
          </div>
        )}

        {navItems.map(item => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
          const Icon = item.icon

          const btn = (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: collapsed ? '10px' : '9px 12px',
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
                borderLeft: collapsed ? 'none' : isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
                borderRight: collapsed && isActive ? '3px solid var(--brand-primary)' : collapsed ? '3px solid transparent' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
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
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          }

          return btn
        })}
      </nav>

      <Separator />

      {/* Bottom section */}
      <div style={{ padding: collapsed ? '8px' : '12px 10px' }}>

        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onThemeToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)' }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}><p>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</p></TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={onThemeToggle} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        {/* User info */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', cursor: 'default' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>{initials}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p style={{ fontWeight: '600' }}>{name}</p>
              <p style={{ fontSize: '11px', opacity: 0.7 }}>{role}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{role}</div>
            </div>
            <Badge variant="outline" style={{ fontSize: '9px', padding: '1px 6px', flexShrink: 0 }}>{role}</Badge>
          </div>
        )}

        {/* Sign out */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <LogOut size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}><p>Sign Out</p></TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        )}
      </div>
    </aside>
  )
}