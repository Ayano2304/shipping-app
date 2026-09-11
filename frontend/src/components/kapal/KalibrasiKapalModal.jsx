import { useState, useEffect } from 'react'
import { 
  X, Layers, TableProperties, Thermometer, Search, Plus, Pencil, Trash2, 
  Loader2, Check, AlertCircle, RefreshCw, Upload, Download, Ship
} from 'lucide-react'
import { 
  getSoundingTable, getDensityTable, getPalkaKapal, 
  createSounding, updateSounding, deleteSounding,
  createDensity, updateDensity, deleteDensity,
  createPalkaKapal, updatePalkaKapal, deletePalkaKapal,
  downloadKalibrasiTemplate
} from '../../lib/api'
import { formatAngka } from '../../lib/calc'
import toast from 'react-hot-toast'

export default function KalibrasiKapalModal({ kapal, onClose, onOpenUpload, onRefreshKapal }) {
  const [activeTab, setActiveTab] = useState('palka') // 'palka' | 'sounding' | 'density'
  
  // Palka state
  const [palkaList, setPalkaList] = useState([])
  const [loadingPalka, setLoadingPalka] = useState(false)
  const [modalPalka, setModalPalka] = useState(null) // null | { mode: 'add'|'edit', data? }
  const [palkaForm, setPalkaForm] = useState({ namaPalka: '', urutan: 1 })
  const [savingPalka, setSavingPalka] = useState(false)

  // Sounding state
  const [soundingData, setSoundingData] = useState([])
  const [soundingLoading, setSoundingLoading] = useState(false)
  const [soundingFilterPalka, setSoundingFilterPalka] = useState('ALL')
  const [soundingSearch, setSoundingSearch] = useState('')
  const [soundingPagination, setSoundingPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
  const [modalSounding, setModalSounding] = useState(null) // null | { mode: 'add'|'edit', data? }
  const [soundingForm, setSoundingForm] = useState({ namaPalka: '', tinggiCm: '', volumeLiter: '', bedaLiter: '' })
  const [savingSounding, setSavingSounding] = useState(false)

  // Density state
  const [densityData, setDensityData] = useState([])
  const [densityLoading, setDensityLoading] = useState(false)
  const [densitySearch, setDensitySearch] = useState('')
  const [modalDensity, setModalDensity] = useState(null) // null | { mode: 'add'|'edit', data? }
  const [densityForm, setDensityForm] = useState({ suhu: '', density: '' })
  const [savingDensity, setSavingDensity] = useState(false)

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { type: 'palka'|'sounding'|'density', id, title }

  // Load Palka
  const loadPalka = async () => {
    if (!kapal?.id) return
    setLoadingPalka(true)
    try {
      const res = await getPalkaKapal(kapal.id)
      setPalkaList(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat daftar kompartemen palka')
    } finally {
      setLoadingPalka(false)
    }
  }

  // Load Sounding
  const loadSounding = async (page = 1) => {
    if (!kapal?.id) return
    setSoundingLoading(true)
    try {
      const res = await getSoundingTable({
        kapalId: kapal.id,
        namaPalka: soundingFilterPalka,
        search: soundingSearch,
        page,
        limit: soundingPagination.limit
      })
      setSoundingData(res.data.data || [])
      setSoundingPagination(res.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 })
      if (res.data.palkaList?.length > 0 && palkaList.length === 0) {
        setPalkaList(res.data.palkaList)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat tabel sounding')
    } finally {
      setSoundingLoading(false)
    }
  }

  // Load Density
  const loadDensity = async () => {
    if (!kapal?.id) return
    setDensityLoading(true)
    try {
      const res = await getDensityTable({
        kapalId: kapal.id,
        search: densitySearch
      })
      setDensityData(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat tabel density')
    } finally {
      setDensityLoading(false)
    }
  }

  useEffect(() => {
    loadPalka()
  }, [kapal?.id])

  useEffect(() => {
    if (activeTab === 'sounding') {
      loadSounding(1)
    } else if (activeTab === 'density') {
      loadDensity()
    }
  }, [activeTab, soundingFilterPalka, soundingSearch, densitySearch])

  // ================= PALKA CRUD =================
  const openAddPalka = () => {
    const nextUrutan = (palkaList.length > 0 ? Math.max(...palkaList.map(p => p.urutan || 0)) : 0) + 1
    setPalkaForm({ namaPalka: '', urutan: nextUrutan })
    setModalPalka({ mode: 'add' })
  }

  const openEditPalka = (p) => {
    setPalkaForm({ namaPalka: p.namaPalka, urutan: p.urutan })
    setModalPalka({ mode: 'edit', data: p })
  }

  const handleSavePalka = async (e) => {
    e.preventDefault()
    if (!palkaForm.namaPalka.trim()) return toast.error('Nama palka wajib diisi')
    setSavingPalka(true)
    try {
      if (modalPalka.mode === 'add') {
        await createPalkaKapal(kapal.id, palkaForm)
        toast.success(`Palka ${palkaForm.namaPalka} berhasil ditambahkan!`)
      } else {
        await updatePalkaKapal(modalPalka.data.id, palkaForm)
        toast.success('Palka berhasil diperbarui!')
      }
      setModalPalka(null)
      loadPalka()
      if (onRefreshKapal) onRefreshKapal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan palka.')
    } finally {
      setSavingPalka(false)
    }
  }

  // ================= SOUNDING CRUD =================
  const openAddSounding = () => {
    const defaultPalka = soundingFilterPalka !== 'ALL' ? soundingFilterPalka : (palkaList[0]?.namaPalka || '')
    setSoundingForm({ namaPalka: defaultPalka, tinggiCm: '', volumeLiter: '', bedaLiter: '' })
    setModalSounding({ mode: 'add' })
  }

  const openEditSounding = (s) => {
    setSoundingForm({
      namaPalka: s.namaPalka || '',
      tinggiCm: s.tinggiCm,
      volumeLiter: s.volumeLiter,
      bedaLiter: s.bedaLiter !== null ? s.bedaLiter : ''
    })
    setModalSounding({ mode: 'edit', data: s })
  }

  const handleSaveSounding = async (e) => {
    e.preventDefault()
    if (!soundingForm.tinggiCm || !soundingForm.volumeLiter) {
      return toast.error('Tinggi (cm) dan Volume (liter) wajib diisi.')
    }
    setSavingSounding(true)
    try {
      const payload = {
        kapalId: kapal.id,
        namaPalka: soundingForm.namaPalka,
        tinggiCm: soundingForm.tinggiCm,
        volumeLiter: soundingForm.volumeLiter,
        bedaLiter: soundingForm.bedaLiter || null
      }
      if (modalSounding.mode === 'add') {
        await createSounding(payload)
        toast.success('Baris sounding berhasil ditambahkan!')
      } else {
        await updateSounding(modalSounding.data.id, payload)
        toast.success('Baris sounding berhasil diperbarui!')
      }
      setModalSounding(null)
      loadSounding(soundingPagination.page)
      if (onRefreshKapal) onRefreshKapal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan data sounding.')
    } finally {
      setSavingSounding(false)
    }
  }

  // ================= DENSITY CRUD =================
  const openAddDensity = () => {
    setDensityForm({ suhu: '', density: '' })
    setModalDensity({ mode: 'add' })
  }

  const openEditDensity = (d) => {
    setDensityForm({ suhu: d.suhu, density: d.density })
    setModalDensity({ mode: 'edit', data: d })
  }

  const handleSaveDensity = async (e) => {
    e.preventDefault()
    if (densityForm.suhu === '' || densityForm.density === '') {
      return toast.error('Suhu (°C) dan Density wajib diisi.')
    }
    setSavingDensity(true)
    try {
      const payload = {
        kapalId: kapal.id,
        suhu: densityForm.suhu,
        density: densityForm.density
      }
      if (modalDensity.mode === 'add') {
        await createDensity(payload)
        toast.success('Baris density berhasil ditambahkan!')
      } else {
        await updateDensity(modalDensity.data.id, payload)
        toast.success('Baris density berhasil diperbarui!')
      }
      setModalDensity(null)
      loadDensity()
      if (onRefreshKapal) onRefreshKapal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan data density.')
    } finally {
      setSavingDensity(false)
    }
  }

  // ================= DELETE HANDLER =================
  const handleExecuteDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.type === 'palka') {
        await deletePalkaKapal(confirmDelete.id)
        toast.success('Palka dan data sounding terkait berhasil dihapus!')
        loadPalka()
      } else if (confirmDelete.type === 'sounding') {
        await deleteSounding(confirmDelete.id)
        toast.success('Baris sounding berhasil dihapus!')
        loadSounding(soundingPagination.page)
      } else if (confirmDelete.type === 'density') {
        await deleteDensity(confirmDelete.id)
        toast.success('Baris density berhasil dihapus!')
        loadDensity()
      }
      setConfirmDelete(null)
      if (onRefreshKapal) onRefreshKapal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus data.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-card border border-border/80 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/80 bg-secondary/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Ship size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{kapal.namaKapal}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Kalibrasi Kapal
                </span>
                {kapal.kalibrasi?.isCalibrated ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Terkalibrasi
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Belum Dikalibrasi
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola spesifikasi palka tetap, tabel kalibrasi sounding volume per palka, dan density suhu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 sm:px-6 border-b border-border/80 bg-background/50 overflow-x-auto gap-2">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setActiveTab('palka')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'palka'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Layers size={15} />
              <span>Palka Tetap</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 text-inherit">
                {palkaList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sounding')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'sounding'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <TableProperties size={15} />
              <span>Tabel Sounding</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 text-inherit">
                {soundingPagination.total || kapal.kalibrasi?.soundingCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('density')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'density'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Thermometer size={15} />
              <span>Tabel Density</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 text-inherit">
                {densityData.length || kapal.kalibrasi?.densityCount || 0}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 py-2">
            <button
              onClick={() => onOpenUpload(kapal)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Upload File Excel Kalibrasi"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Upload Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ================= TAB 1: PALKA TETAP ================= */}
          {activeTab === 'palka' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/20 p-4 rounded-2xl border border-border/80">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Spesifikasi Kompartemen Palka Kapal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daftar palka ini akan secara otomatis terisi saat pengiriman dan dikunci dari manipulasi surveyor.
                  </p>
                </div>
                <button
                  onClick={openAddPalka}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  <span>Tambah Palka</span>
                </button>
              </div>

              {loadingPalka ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : palkaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 border border-dashed rounded-2xl">
                  <Layers size={32} className="opacity-30" />
                  <span className="text-xs font-medium">Belum ada kompartemen palka terdaftar untuk kapal ini.</span>
                  <span className="text-[11px] text-muted-foreground/80">Upload kalibrasi Excel atau tambahkan palka secara manual.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {palkaList.map((p, idx) => (
                    <div 
                      key={p.id}
                      className="bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {p.urutan || idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-foreground block truncate">
                            {p.namaPalka}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Urutan: {p.urutan || idx + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditPalka(p)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title="Edit nama/urutan palka"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'palka', id: p.id, title: `Palka "${p.namaPalka}"` })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Hapus palka"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: TABEL SOUNDING ================= */}
          {activeTab === 'sounding' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap flex-1">
                  {/* Filter Palka */}
                  <div className="w-full sm:w-48">
                    <select
                      value={soundingFilterPalka}
                      onChange={(e) => setSoundingFilterPalka(e.target.value)}
                      className="w-full h-9 px-3 bg-card border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="ALL">Semua Palka ({palkaList.length})</option>
                      {palkaList.map(pk => (
                        <option key={pk.id} value={pk.namaPalka}>
                          {pk.namaPalka}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Tinggi */}
                  <div className="relative w-full sm:w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={soundingSearch}
                      onChange={(e) => setSoundingSearch(e.target.value)}
                      placeholder="Cari tinggi (cm)..."
                      className="w-full h-9 pl-8 pr-3 bg-card border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <button
                  onClick={openAddSounding}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {/* Sounding Data Table */}
              <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                {soundingLoading ? (
                  <div className="flex items-center justify-center h-56">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : soundingData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                    <TableProperties size={32} className="opacity-30" />
                    <span className="text-xs font-medium">Tidak ada data sounding yang cocok.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/40 border-b border-border/80 text-muted-foreground">
                          <th className="text-left px-4 py-3 font-semibold">Palka</th>
                          <th className="text-right px-4 py-3 font-semibold">Tinggi (cm)</th>
                          <th className="text-right px-4 py-3 font-semibold">Volume (Liter)</th>
                          <th className="text-right px-4 py-3 font-semibold">Beda (Liter/cm)</th>
                          <th className="text-right px-4 py-3 font-semibold w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {soundingData.map((row) => (
                          <tr key={row.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-foreground">
                              {row.namaPalka || <span className="text-muted-foreground italic">Global</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                              {row.tinggiCm} cm
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                              {formatAngka(row.volumeLiter, 0)} L
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                              {row.bedaLiter !== null ? `${formatAngka(row.bedaLiter, 0)} L` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditSounding(row)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                  title="Edit Baris"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ 
                                    type: 'sounding', 
                                    id: row.id, 
                                    title: `Tinggi ${row.tinggiCm} cm (${row.namaPalka || 'Global'})` 
                                  })}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Hapus Baris"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sounding Pagination Bar */}
                {soundingPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/80 bg-secondary/20 text-xs">
                    <span className="text-muted-foreground font-mono">
                      Halaman {soundingPagination.page} dari {soundingPagination.totalPages} ({soundingPagination.total} baris)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadSounding(soundingPagination.page - 1)}
                        disabled={soundingPagination.page <= 1 || soundingLoading}
                        className="px-3 py-1 rounded-lg border border-border/80 bg-card hover:bg-secondary disabled:opacity-30 cursor-pointer font-semibold"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => loadSounding(soundingPagination.page + 1)}
                        disabled={soundingPagination.page >= soundingPagination.totalPages || soundingLoading}
                        className="px-3 py-1 rounded-lg border border-border/80 bg-card hover:bg-secondary disabled:opacity-30 cursor-pointer font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: TABEL DENSITY ================= */}
          {activeTab === 'density' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-56">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    value={densitySearch}
                    onChange={(e) => setDensitySearch(e.target.value)}
                    placeholder="Cari suhu (°C)..."
                    className="w-full h-9 pl-8 pr-3 bg-card border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <button
                  onClick={openAddDensity}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  <span>Tambah Suhu & Density</span>
                </button>
              </div>

              <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                {densityLoading ? (
                  <div className="flex items-center justify-center h-56">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : densityData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                    <Thermometer size={32} className="opacity-30" />
                    <span className="text-xs font-medium">Tidak ada data density.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-secondary/80 backdrop-blur-xs z-10 border-b border-border/80">
                        <tr className="text-muted-foreground">
                          <th className="text-left px-4 py-3 font-semibold">Suhu (°C)</th>
                          <th className="text-right px-4 py-3 font-semibold">Nilai Density (g/cm³)</th>
                          <th className="text-right px-4 py-3 font-semibold w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {densityData.map((row) => (
                          <tr key={row.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="px-4 py-2.5 font-bold font-mono text-foreground">
                              {row.suhu} °C
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {parseFloat(row.density).toFixed(4)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditDensity(row)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                  title="Edit Baris"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ 
                                    type: 'density', 
                                    id: row.id, 
                                    title: `Suhu ${row.suhu}°C (Density: ${parseFloat(row.density).toFixed(4)})` 
                                  })}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Hapus Baris"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 sm:px-6 py-3.5 border-t border-border/80 bg-secondary/20">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-secondary transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ================= SUB-MODAL: TAMBAH/EDIT PALKA ================= */}
      {modalPalka && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">
              {modalPalka.mode === 'add' ? 'Tambah Kompartemen Palka' : 'Edit Palka'}
            </h3>
            <form onSubmit={handleSavePalka} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nama Palka <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={palkaForm.namaPalka}
                  onChange={(e) => setPalkaForm(f => ({ ...f, namaPalka: e.target.value }))}
                  placeholder="Contoh: PALKA 1 P, PALKA 1 S..."
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Urutan Tampilan
                </label>
                <input
                  type="number"
                  value={palkaForm.urutan}
                  onChange={(e) => setPalkaForm(f => ({ ...f, urutan: e.target.value }))}
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPalka(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPalka}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingPalka && <Loader2 size={12} className="animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL: TAMBAH/EDIT SOUNDING ================= */}
      {modalSounding && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">
              {modalSounding.mode === 'add' ? 'Tambah Baris Sounding' : 'Edit Baris Sounding'}
            </h3>
            <form onSubmit={handleSaveSounding} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Kompartemen Palka
                </label>
                <select
                  value={soundingForm.namaPalka}
                  onChange={(e) => setSoundingForm(f => ({ ...f, namaPalka: e.target.value }))}
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Global (Tanpa Palka)</option>
                  {palkaList.map(pk => (
                    <option key={pk.id} value={pk.namaPalka}>{pk.namaPalka}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Tinggi (cm) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={soundingForm.tinggiCm}
                  onChange={(e) => setSoundingForm(f => ({ ...f, tinggiCm: e.target.value }))}
                  placeholder="Contoh: 150"
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Volume (Liter) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={soundingForm.volumeLiter}
                  onChange={(e) => setSoundingForm(f => ({ ...f, volumeLiter: e.target.value }))}
                  placeholder="Contoh: 60450"
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Beda (Liter/cm)
                </label>
                <input
                  type="number"
                  step="any"
                  value={soundingForm.bedaLiter}
                  onChange={(e) => setSoundingForm(f => ({ ...f, bedaLiter: e.target.value }))}
                  placeholder="Contoh: 403"
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSounding(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSounding}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSounding && <Loader2 size={12} className="animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL: TAMBAH/EDIT DENSITY ================= */}
      {modalDensity && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">
              {modalDensity.mode === 'add' ? 'Tambah Data Density' : 'Edit Data Density'}
            </h3>
            <form onSubmit={handleSaveDensity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Suhu (°C) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={densityForm.suhu}
                  onChange={(e) => setDensityForm(f => ({ ...f, suhu: e.target.value }))}
                  placeholder="Contoh: 28"
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Density (g/cm³) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={densityForm.density}
                  onChange={(e) => setDensityForm(f => ({ ...f, density: e.target.value }))}
                  placeholder="Contoh: 0.9047"
                  className="w-full h-9 px-3 bg-secondary/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalDensity(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingDensity}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingDensity && <Loader2 size={12} className="animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE DIALOG ================= */}
      {confirmDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 text-red-500">
              <Trash2 size={16} />
              Konfirmasi Hapus
            </h3>
            <p className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus <strong>{confirmDelete.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
