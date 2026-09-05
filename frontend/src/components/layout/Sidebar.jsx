import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Ship, ClipboardList, Users, Settings,
  LogOut, Anchor, X, ChevronRight, Contact
} from 'lucide-react'
import { cn } from '../../lib/utils'

const getNavItems = (role) => {
  return [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pengiriman', label: 'Riwayat Pengiriman', icon: ClipboardList },
    ...(role === 'ADMIN' ? [
      { to: '/kapal', label: 'Master Kapal', icon: Ship },
      { to: '/kontak-wa', label: 'Kontak WhatsApp', icon: Contact },
      { to: '/users', label: 'Manajemen User', icon: Users },
      { to: '/settings', label: 'Pengaturan', icon: Settings },
    ] : []),
  ]
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Berhasil keluar. Sampai jumpa!')
    navigate('/login')
  }

  const filtered = getNavItems(user?.role)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Mobile Close Button */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Anchor size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground leading-none">CPO Tanker</div>
            <div className="text-xs text-muted-foreground mt-0.5">Sistem Muatan</div>
          </div>
        </div>
        {/* Close button - visible only on mobile */}
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Tutup Menu"
          aria-label="Tutup Menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 pb-4 border-t border-border pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {user?.nama?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user?.nama}</div>
            <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'SURVEYOR' ? 'Surveyor Bongkar' : 'Petugas Muat'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 w-full transition-colors cursor-pointer"
        >
          <LogOut size={17} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay + sidebar with slide-in animation */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 transition-all duration-300',
          open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
        {/* Sidebar panel */}
        <aside
          className={cn(
            'relative z-10 w-64 h-full bg-card border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarContent />
        </aside>
      </div>
    </>
  )
}
