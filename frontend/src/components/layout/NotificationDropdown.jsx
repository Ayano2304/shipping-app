import { useState, useEffect, useRef } from 'react'
import { Bell, Ship, CheckCircle2, FilePlus, Info, Loader2 } from 'lucide-react'
import { getNotifikasi, markAllNotifikasiRead } from '../../lib/api'
import toast from 'react-hot-toast'

// Helper format relative time in Indonesian
const formatWaktuLalu = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'Baru saja'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} jam lalu`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} hari lalu`

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifikasiList, setNotifikasiList] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const isFirstLoad = useRef(true)
  const prevLatestId = useRef(null)

  const fetchNotifikasi = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const res = await getNotifikasi()
      const list = res.data?.data || []
      const unread = res.data?.unreadCount || 0

      setNotifikasiList(list)
      setUnreadCount(unread)

      // Cek apakah ada notifikasi baru sejak polling sebelumnya untuk trigger toast
      if (list.length > 0) {
        const latestId = list[0].id
        if (!isFirstLoad.current && prevLatestId.current && latestId > prevLatestId.current) {
          const newest = list[0]
          // Tampilkan live toast notification murni informatif
          toast(
            () => (
              <div className="flex items-start gap-2.5 py-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  {newest.tipe === 'KAPAL_BERANGKAT' ? (
                    <Ship size={17} />
                  ) : newest.tipe === 'KAPAL_TIBA' ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <FilePlus size={17} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">{newest.judul}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{newest.pesan}</div>
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-right',
              style: {
                borderRadius: '1rem',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              },
            }
          )
        }
        prevLatestId.current = latestId
      }
      isFirstLoad.current = false
    } catch (err) {
      console.error('Error fetching notifikasi:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  // Initial fetch & interval polling every 20 seconds
  useEffect(() => {
    fetchNotifikasi()
    const interval = setInterval(() => {
      fetchNotifikasi(true)
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Saat dropdown dibuka, otomatis tandai semua notifikasi milik user ini sebagai telah dibaca
  const handleToggleOpen = () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (nextOpen) {
      fetchNotifikasi(true)
      if (unreadCount > 0) {
        markAllNotifikasiRead()
          .then(() => {
            setNotifikasiList((prev) => prev.map((n) => ({ ...n, isRead: true })))
            setUnreadCount(0)
          })
          .catch((err) => console.error('Error marking all read:', err))
      }
    }
  }

  const getNotifIcon = (tipe) => {
    switch (tipe) {
      case 'KAPAL_BERANGKAT':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 shadow-xs">
            <Ship size={16} />
          </div>
        )
      case 'KAPAL_TIBA':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={16} />
          </div>
        )
      case 'PENGIRIMAN_BARU':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 shadow-xs">
            <FilePlus size={16} />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Info size={16} />
          </div>
        )
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        title="Notifikasi Sistem"
        aria-label="Buka Notifikasi"
        className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/30 bg-secondary'
            : 'border-border bg-card hover:bg-secondary text-foreground'
        }`}
      >
        <Bell
          size={17}
          className={`transition-colors ${
            unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute inset-x-3.5 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-border/60 max-w-sm sm:max-w-none mx-auto sm:mx-0">
          {/* Header (Info only, no action buttons) */}
          <div className="p-3.5 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {notifikasiList.length > 0 && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {notifikasiList.length} riwayat
              </span>
            )}
          </div>

          {/* List of notifications (Clean notification cards, no action buttons) */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span>Memuat notifikasi...</span>
              </div>
            ) : notifikasiList.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground/60">
                  <Bell size={18} />
                </div>
                <div className="font-semibold text-foreground">Belum ada notifikasi</div>
                <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                  Notifikasi saat ada data baru atau kapal diberangkatkan akan muncul di sini.
                </p>
              </div>
            ) : (
              notifikasiList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-start gap-3 transition-colors bg-card hover:bg-secondary/30"
                >
                  {/* Icon */}
                  {getNotifIcon(item.tipe)}

                  {/* Content (Title, message, time) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {item.judul}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {formatWaktuLalu(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.pesan}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
