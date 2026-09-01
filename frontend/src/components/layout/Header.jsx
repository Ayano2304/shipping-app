import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Menu, Sun, Moon, User } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'

const getHeaderLabel = (pathname) => {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/pengiriman/baru') return 'Muatan Keberangkatan'
  if (pathname.includes('/kedatangan')) return 'Muatan Kedatangan'
  if (pathname.includes('/edit')) return 'Edit Keberangkatan'
  if (pathname.startsWith('/pengiriman/') && pathname.split('/').length === 3) return 'Detail Pengiriman'
  if (pathname.startsWith('/pengiriman')) return 'Riwayat Pengiriman'
  if (pathname.startsWith('/kapal')) return 'Master Kapal'
  if (pathname.startsWith('/users')) return 'Manajemen User'
  if (pathname.startsWith('/masterdata')) return 'Master Data'
  if (pathname.startsWith('/settings')) return 'Pengaturan'
  return 'CPO Tanker'
}

const formatRole = (role) => {
  if (role === 'ADMIN') return 'ADMINISTRATOR'
  if (role === 'PETUGAS') return 'PETUGAS OPERASIONAL'
  if (role === 'VIEWER') return 'VIEWER / AUDITOR'
  return role || 'PENGGUNA'
}

export default function Header({ onOpenSidebar }) {
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const label = getHeaderLabel(pathname)

  return (
    <header className="h-16 border-b border-border bg-card/75 backdrop-blur flex items-center justify-between px-4 md:px-6 shrink-0 transition-colors z-30">
      {/* Left side: Hamburger (mobile only) + Page Title aligned in the exact same flex row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Buka Menu"
          className="md:hidden w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm sm:text-base font-semibold text-foreground leading-none">{label}</h1>
      </div>

      {/* Right side: Notification + Theme Toggle + Static User Status Pill */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={(e) => toggleTheme(e)}
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          aria-label="Toggle Theme"
          className="relative w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground transition-all active:scale-90 shadow-xs overflow-hidden group cursor-pointer"
        >
          <Sun
            size={17}
            className={`absolute text-amber-400 transition-all duration-500 transform ${
              theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            }`}
          />
          <Moon
            size={17}
            className={`absolute text-indigo-600 transition-all duration-500 transform ${
              theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          />
        </button>

        {/* User Identity Pill (Static Active User Display) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border/80 bg-secondary/40 select-none shadow-xs">
          {/* Avatar with green online dot */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border/80 text-foreground shrink-0 shadow-inner">
            <User size={15} className="text-foreground/80" />
            {/* Online Green Dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card shadow-xs animate-pulse" />
          </div>

          {/* Name and Role Subtitle */}
          <div className="hidden sm:flex flex-col min-w-0 pr-1">
            <span className="font-semibold text-xs sm:text-sm text-foreground leading-tight truncate max-w-[150px]">
              {user?.nama || 'User'}
            </span>
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
              {formatRole(user?.role)}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
