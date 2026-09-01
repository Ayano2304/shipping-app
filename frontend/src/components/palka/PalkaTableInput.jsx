import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Loader2, Sparkles, Layers } from 'lucide-react'
import { hitungBeratPalka, formatAngka } from '../../lib/calc'
import { cn } from '../../lib/utils'
import { lookupVolume, lookupDensity } from '../../lib/api'
import toast from 'react-hot-toast'

const defaultRow = (urutan) => ({
  _id: Math.random().toString(36).slice(2) + Date.now(),
  namaPalka: `Palka ${urutan}`,
  tinggiCm: '',
  point: '',
  suhu: '',
  faktorKoreksi: '1.000000',
  volumeLiter: '',
  density: '',
})

export default function PalkaTableInput({ value = [], onChange, label, tipe, kapalId }) {
  const [lookupLoading, setLookupLoading] = useState({})
  const [justAddedId, setJustAddedId] = useState(null)
  const debounceTimers = useRef({})

  useEffect(() => {
    if (value.length === 0) onChange([defaultRow(1)])
  }, [])

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer))
    }
  }, [])

  const update = (idx, field, val) => {
    const next = value.map((row, i) => i === idx ? { ...row, [field]: val } : row)
    onChange(next)
  }

  const performLookup = async (idx, updated) => {
    if (!updated.tinggiCm || updated.point === '' || !updated.suhu || !kapalId) {
      return
    }

    setLookupLoading(prev => ({ ...prev, [idx]: true }))
    try {
      const [volRes, denRes] = await Promise.all([
        lookupVolume({ tinggi: updated.tinggiCm, point: updated.point, kapalId }),
        lookupDensity({ suhu: updated.suhu, kapalId }),
      ])
      const finalUpdated = {
        ...updated,
        volumeLiter: volRes.data.volume,
        volumeBase: volRes.data.volumeBase,
        bedaLiter: volRes.data.bedaLiter,
        density: denRes.data.density
      }
      const finalNext = value.map((r, i) => i === idx ? finalUpdated : r)
      onChange(finalNext)
    } catch (err) {
      console.error('Lookup error:', err)
    } finally {
      setLookupLoading(prev => ({ ...prev, [idx]: false }))
    }
  }

  const handleInput = (idx, field, val) => {
    const row = value[idx]
    const updated = { ...row, [field]: val }
    const next = value.map((r, i) => i === idx ? updated : r)
    onChange(next)

    if (debounceTimers.current[idx]) {
      clearTimeout(debounceTimers.current[idx])
    }

    debounceTimers.current[idx] = setTimeout(() => {
      performLookup(idx, updated)
    }, 1500)
  }

  const addRow = () => {
    const newRow = defaultRow(value.length + 1)
    onChange([...value, newRow])
    setJustAddedId(newRow._id)

    // Interactive toast feedback
    toast.success(`${newRow.namaPalka} berhasil ditambahkan!`, {
      id: `add-palka-${newRow._id}`,
      duration: 2000,
      icon: '✨',
    })

    // Smooth auto-scroll & focus to the newly created palka
    setTimeout(() => {
      const el = document.getElementById(`palka-card-${newRow._id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = el.querySelector('input')
        if (input) input.focus()
      }
    }, 100)

    // Remove glow after animation completes
    setTimeout(() => {
      setJustAddedId(null)
    }, 2500)
  }

  const removeRow = (idx) => { 
    if (value.length <= 1) return
    const rowToRemove = value[idx]
    if (debounceTimers.current[idx]) {
      clearTimeout(debounceTimers.current[idx])
    }
    onChange(value.filter((_, i) => i !== idx)) 
    toast(`${rowToRemove?.namaPalka || `Palka ${idx + 1}`} dihapus`, {
      icon: '🗑️',
      duration: 1800,
    })
  }
  
  const total = value.reduce((sum, row) => {
    return sum + hitungBeratPalka(row.volumeLiter, row.point, row.density, row.faktorKoreksi, row.volumeBase, row.bedaLiter)
  }, 0)
  
  const inputCls = 'w-full h-9 sm:h-10 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs sm:text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
  
  return (
    <div className="space-y-4">
      {/* Header bar with Clean Compact Button */}
      <div className="flex items-center justify-between gap-3 bg-secondary/30 px-4 py-3 rounded-2xl border border-border/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{label}</h3>
            <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
              {value.length} Palka
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
            {tipe === 'KEBERANGKATAN' ? 'SFAL (Sounding Muatan Asal)' : 'SFBD (Sounding Muatan Bongkar)'}
          </p>
        </div>

        {/* Compact Add Button */}
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 select-none"
          title="Tambah Baris Palka"
        >
          <Plus size={15} />
          <span>Tambah Palka</span>
        </button>
      </div>

      {/* Palka Cards List */}
      <div className="space-y-3 sm:space-y-4">
        {value.map((row, idx) => {
          const isLoading = lookupLoading[idx]
          const isNewlyAdded = row._id === justAddedId
          const berat = hitungBeratPalka(row.volumeLiter, row.point, row.density, row.faktorKoreksi, row.volumeBase, row.bedaLiter)
          const hasData = row.tinggiCm && row.suhu && row.volumeLiter && row.density

          return (
            <div
              key={row._id}
              id={`palka-card-${row._id}`}
              className={cn(
                "relative bg-card border rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all duration-300 shadow-xs",
                isNewlyAdded
                  ? "border-primary ring-2 ring-primary/40 shadow-lg scale-[1.01] bg-primary/[0.02]"
                  : "border-border/80 hover:border-primary/40"
              )}
            >
              {isNewlyAdded && (
                <div className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-bounce">
                  <Sparkles size={11} /> Baru Ditambahkan
                </div>
              )}

              {/* Card Top: Palka Name & Delete */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={cn(
                    "flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs sm:text-sm transition-colors",
                    isNewlyAdded ? "bg-primary text-primary-foreground animate-pulse" : "bg-primary/10 text-primary"
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={row.namaPalka}
                      onChange={(e) => update(idx, 'namaPalka', e.target.value)}
                      placeholder="Nama Palka"
                      className="w-full h-8 sm:h-9 px-2.5 bg-secondary/50 border border-border/70 rounded-xl text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={value.length <= 1}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 active:scale-90 disabled:opacity-20 transition-all ml-2 cursor-pointer"
                  title="Hapus palka ini"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Input Fields Grid (2 Columns on Mobile & Desktop) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Tinggi (cm) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={row.tinggiCm}
                    onChange={(e) => handleInput(idx, 'tinggiCm', e.target.value)}
                    placeholder="150 - 270"
                    min="150"
                    max="270"
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Point <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={row.point}
                    onChange={(e) => handleInput(idx, 'point', e.target.value)}
                    placeholder="0.00 - 0.99"
                    step="0.01"
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Suhu (°C) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={row.suhu}
                    onChange={(e) => handleInput(idx, 'suhu', e.target.value)}
                    placeholder="25 - 74"
                    min="25"
                    max="74"
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Faktor Koreksi
                  </label>
                  <input
                    type="number"
                    value={row.faktorKoreksi}
                    onChange={(e) => update(idx, 'faktorKoreksi', e.target.value)}
                    placeholder="1.000000"
                    step="0.000001"
                    min="0"
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground bg-secondary/30 rounded-xl animate-pulse">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Mengambil data kalibrasi kapal & menghitung...</span>
                </div>
              )}

              {/* Summary Results Row */}
              {!isLoading && (
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border/60">
                  <div className="bg-secondary/40 rounded-xl p-2 sm:p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Volume</p>
                    <p className="text-xs sm:text-sm font-mono font-semibold text-foreground truncate">
                      {row.volumeLiter ? `${formatAngka(row.volumeLiter, 0)} L` : '—'}
                    </p>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-2 sm:p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Density</p>
                    <p className="text-xs sm:text-sm font-mono font-semibold text-foreground truncate">
                      {row.density ? formatAngka(row.density, 4) : '—'}
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-xl p-2 sm:p-2.5 text-center border border-primary/20">
                    <p className="text-[10px] text-primary font-bold mb-0.5">Berat</p>
                    <p className={cn('text-xs sm:text-sm font-mono font-bold truncate', hasData ? 'text-primary' : 'text-muted-foreground')}>
                      {hasData ? `${formatAngka(berat, 0)} KG` : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Total Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">Total Berat Palka</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{value.length} palka terdaftar</p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-primary">{formatAngka(total, 0)}</span>
            <span className="text-xs font-bold text-primary">KG</span>
          </div>
        </div>
      </div>
    </div>
  )
}
