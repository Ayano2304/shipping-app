import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  disabled = false,
  className = '',
  minDate,
  maxDate,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse initial date or default to current date
  const parseDate = (val) => {
    if (!val) return null
    if (val instanceof Date && !isNaN(val)) return val
    if (typeof val === 'string') {
      const parts = val.slice(0, 10).split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      }
    }
    return new Date(val)
  }

  const selectedDate = parseDate(value)
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date())

  // Sync view date with value changes
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate)
    }
  }, [value])

  // Click outside handler
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

  const formatDisplay = (d) => {
    if (!d) return ''
    const day = String(d.getDate()).padStart(2, '0')
    const month = MONTH_NAMES[d.getMonth()]
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
  }

  const toIsoString = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handleSelectDay = (dayDate) => {
    const iso = toIsoString(dayDate)
    onChange(iso)
    setIsOpen(false)
  }

  const handleSetToday = (e) => {
    e.stopPropagation()
    const today = new Date()
    onChange(toIsoString(today))
    setViewDate(today)
    setIsOpen(false)
  }

  // Generate matrix of days for the current view month
  const getCalendarDays = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startingDayIndex = firstDayOfMonth.getDay() // 0 for Sunday
    const daysInMonth = lastDayOfMonth.getDate()

    const days = []

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Next month filler days (fill up to 35 or 42 grid cells)
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }

    return days
  }

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  const isToday = (d) => isSameDay(d, new Date())

  const calendarDays = getCalendarDays()

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Shadcn Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 bg-secondary border rounded-lg text-sm text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/30 bg-card'
            : 'border-border hover:border-border/80 hover:bg-secondary/90'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <CalendarIcon
            size={16}
            className={`shrink-0 transition-colors ${
              selectedDate ? 'text-primary' : 'text-muted-foreground'
            }`}
          />
          <span
            className={`truncate text-sm ${
              selectedDate
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {selectedDate ? formatDisplay(selectedDate) : placeholder}
          </span>
        </div>
      </button>

      {/* Shadcn UI Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 bg-card border border-border rounded-2xl shadow-2xl p-3 w-[290px] sm:w-[310px] animate-fade-in select-none">
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="text-xs sm:text-sm font-bold text-foreground">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((name, idx) => (
              <div
                key={name}
                className={`text-[10px] font-semibold py-1 ${
                  idx === 0 ? 'text-red-500/80' : 'text-muted-foreground'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              const isSelected = selectedDate && isSameDay(item.date, selectedDate)
              const today = isToday(item.date)
              const isSunday = item.date.getDay() === 0

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.date)}
                  className={`h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all relative ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : !item.isCurrentMonth
                      ? 'text-muted-foreground/30 hover:bg-secondary/40 hover:text-muted-foreground'
                      : today
                      ? 'bg-secondary font-bold text-primary border border-primary/40 hover:bg-primary/20'
                      : isSunday
                      ? 'text-red-500 hover:bg-red-500/10'
                      : 'text-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {item.date.getDate()}
                  {today && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Footer Action */}
          <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[11px] font-semibold text-primary hover:underline px-1 py-0.5"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 bg-secondary/80 rounded-md border border-border/50"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
