import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Ship, ClipboardList, Users, Settings,
  LogOut, Anchor, X, ChevronRight, MessageSquare
} from 'lucide-react'
import { cn } from '../../lib/utils'

function WhatsAppIcon({ size = 17, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="currentColor"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  )
}

const getNavItems = (role) => {
  return [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pengiriman', label: 'Riwayat Pengiriman', icon: ClipboardList },
    ...(role === 'ADMIN' ? [
      { to: '/kapal', label: 'Master Kapal', icon: Ship },
      { to: '/kontak-wa', label: 'Pusat WhatsApp', icon: WhatsAppIcon },
      { to: '/users', label: 'Manajemen User', icon: Users },
      { to: '/settings', label: 'Pengaturan', icon: Settings },
    ] : role === 'SURVEYOR' ? [
      { to: '/kontak-wa', label: 'Konfigurasi WhatsApp & Kontak', icon: WhatsAppIcon },
      { to: '/settings', label: 'Pengaturan', icon: Settings },
    ] : [
      { to: '/settings', label: 'Pengaturan', icon: Settings },
    ]),
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
            <div className="text-sm font-medium text-foreground truncate uppercase">{(user?.nama || user?.username || '').toUpperCase()}</div>
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
          'md:hidden fixed inset-0 z-50 transition-all duration-300 overflow-hidden',
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
