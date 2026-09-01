import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Pilih --',
  icon: Icon,
  searchable = false,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen, searchable])

  // Exclude placeholder/dummy options (e.g. "-- Pilih ... --") from the opened dropdown list
  const validOptions = options.filter((opt) => {
    if (opt.isPlaceholder) return false
    const lbl = String(opt.label || '').trim()
    if (lbl.startsWith('--') && lbl.endsWith('--')) return false
    if (opt.value === '' && lbl.startsWith('--')) return false
    return true
  })

  const filteredOptions = validOptions.filter((opt) =>
    (opt.label || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (optValue) => {
    onChange(optValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3.5 bg-secondary/70 border rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all duration-150 ${
          isOpen
            ? 'border-primary ring-2 ring-primary/30 bg-card shadow-xs'
            : 'border-border/80 hover:border-border hover:bg-secondary'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          {Icon && (
            <Icon
              size={16}
              className={`shrink-0 transition-colors ${
                selectedOption ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
          )}
          <span
            className={`truncate ${
              selectedOption
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground font-medium'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-xl shadow-xl overflow-hidden animate-fade-in origin-top divide-y divide-border/40">
          {/* Optional Search */}
          {(searchable || options.length > 6) && (
            <div className="p-2.5 bg-secondary/40 flex items-center gap-2 border-b border-border/50">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Tidak ada pilihan ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between gap-2 text-left transition-all duration-100 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-foreground hover:bg-secondary/80 hover:text-foreground active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && <opt.icon size={15} className={`shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check size={15} className="shrink-0 text-current font-bold" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
