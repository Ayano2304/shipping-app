import { useLocation } from 'react-router-dom'
import { useThemeStore } from '../../store/themeStore'
import { Menu, Sun, Moon } from 'lucide-react'
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
  if (pathname.startsWith('/kontak-wa')) return 'Buku Kontak & WA'
  if (pathname.startsWith('/settings')) return 'Pengaturan'
  return 'CPO Tanker'
}

export default function Header({ onOpenSidebar }) {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useThemeStore()

  const label = getHeaderLabel(pathname)

  return (
    <header className="h-16 border-b border-border bg-card/75 backdrop-blur flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 transition-colors z-30 w-full max-w-full overflow-hidden">
      {/* Left side: Normal Hamburger Menu Icon (mobile only) + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Buka Menu"
          className="md:hidden p-2 -ml-1 text-foreground hover:bg-secondary rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-sm sm:text-base font-bold text-foreground leading-none truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">
          {label}
        </h1>
      </div>

      {/* Right side: Notification + Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={(e) => toggleTheme(e)}
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          aria-label="Toggle Theme"
          className="relative w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground transition-all active:scale-90 shadow-xs overflow-hidden group cursor-pointer shrink-0"
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
      </div>
    </header>
  )
}
