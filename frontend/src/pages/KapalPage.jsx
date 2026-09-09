import { useEffect, useState } from 'react'
import { getKapal, createKapal, updateKapal, deleteKapal, importExcel, downloadKalibrasiTemplate } from '../lib/api'
import toast from 'react-hot-toast'
import { 
  Ship, Plus, Pencil, Trash2, Loader2, X, Check, Upload, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Truck, Calendar, ChevronRight, MoreVertical 
} from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function KapalPage() {
  const { user } = useAuthStore()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode: 'add'|'edit', data? }
  const [uploadModal, setUploadModal] = useState(null) // null | { kapal }
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [form, setForm] = useState({ namaKapal: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { id, nama, pengirimanCount }

  const load = () => {
    setLoading(true)
    getKapal().then(r => setList(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const openAdd = () => { setForm({ namaKapal: '' }); setError(''); setModal({ mode: 'add' }) }
  const openEdit = (k) => { setForm({ namaKapal: k.namaKapal }); setError(''); setModal({ mode: 'edit', data: k }) }
  const closeModal = () => { setModal(null); setError('') }

  const openUpload = (k) => {
    setUploadModal({ kapal: k })
    setSelectedFile(null)
    setError('')
  }
  const closeUpload = () => {
    setUploadModal(null)
    setSelectedFile(null)
    setError('')
  }

  const handleSave = async () => {
    if (!form.namaKapal.trim()) return setError('Nama kapal wajib diisi.')
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await createKapal(form)
        toast.success('Kapal berhasil ditambahkan!')
      } else {
        await updateKapal(modal.data.id, form)
        toast.success('Data kapal berhasil diperbarui!')
      }
      closeModal()
      load()
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan.'
      setError(msg)
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleUploadKalibrasi = async () => {
    if (!selectedFile) {
      return setError('Silakan pilih file Excel kalibrasi terlebih dahulu.')
    }
    if (!uploadModal?.kapal) return

    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('kapalId', uploadModal.kapal.id)

      const res = await importExcel(formData)
      toast.success(res.data?.message || 'Kalibrasi kapal berhasil diimpor!')
      closeUpload()
      load()
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal mengimpor kalibrasi kapal.'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const res = await downloadKalibrasiTemplate()
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Template_Kalibrasi_Kapal.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Template Excel berhasil diunduh!')
    } catch (err) {
      toast.error('Gagal mengunduh template Excel.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    if (confirmDelete.pengirimanCount > 0) {
      toast.error(`Tidak dapat menghapus kapal yang memiliki ${confirmDelete.pengirimanCount} riwayat pengiriman.`)
      setConfirmDelete(null)
      return
    }

    try {
      await deleteKapal(confirmDelete.id)
      toast.success(`Kapal "${confirmDelete.nama}" berhasil dihapus.`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus kapal.')
    } finally {
      setConfirmDelete(null)
    }
  }

  // Statistik untuk Summary Card Bawah
  const totalKapal = list.length
  const terkalibrasiCount = list.filter(k => k.kalibrasi?.isCalibrated).length
  const persenTerkalibrasi = totalKapal > 0 ? Math.round((terkalibrasiCount / totalKapal) * 100) : 0
  const totalPengiriman = list.reduce((sum, k) => sum + (k._count?.pengiriman || 0), 0)

  const terdaftarTerbaru = list.length > 0
    ? [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null

  const terdaftarTerbaruTgl = terdaftarTerbaru
    ? new Date(terdaftarTerbaru.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '—'
  const terdaftarTerbaruNama = terdaftarTerbaru?.namaKapal || '—'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Master Kapal</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola armada kapal dan spesifikasi data kalibrasi (Sounding & Density)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border/80 bg-card text-foreground rounded-xl text-xs sm:text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Download Template Excel Kalibrasi"
          >
            {downloadingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Template Excel</span>
          </button>
          <button 
            onClick={openAdd} 
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={16} /> <span>Tambah Kapal</span>
          </button>
        </div>
      </div>

      {/* Main Table Container / Mobile Card List */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={30} className="animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Ship size={40} className="opacity-30" />
            <span className="text-sm font-medium">Belum ada kapal terdaftar. Silakan tambahkan kapal baru.</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/30">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground">Nama Kapal</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground">Status Kalibrasi</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground">Pengiriman</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {list.map(k => {
                    const pengirimanCount = k._count?.pengiriman ?? 0
                    const kal = k.kalibrasi || {}
                    const isCalibrated = kal.isCalibrated

                    return (
                      <tr key={k.id} className="hover:bg-secondary/15 transition-colors">
                        {/* Nama Kapal */}
                        <td className="px-6 py-5 align-top">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                              <Ship size={22} />
                            </div>
                            <div>
                              <span className="font-bold text-foreground text-base block">{k.namaKapal}</span>
                              <span className="text-xs text-muted-foreground mt-0.5 block">
                                Terdaftar: {new Date(k.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mt-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                                ARMADA AKTIF
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Kalibrasi */}
                        <td className="px-6 py-5 align-top">
                          {isCalibrated ? (
                            <div className="space-y-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Check size={13} className="stroke-[3]" />
                                Terkalibrasi
                              </span>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Sounding: <span className="font-bold text-foreground">{kal.soundingCount} baris</span> ({kal.minTinggi}–{kal.maxTinggi} cm)</div>
                                <div>Density: <span className="font-bold text-foreground">{kal.densityCount} baris</span> ({kal.minSuhu}–{kal.maxSuhu} °C)</div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <AlertCircle size={13} />
                                Belum Dikalibrasi
                              </span>
                              <div className="text-xs text-muted-foreground">
                                Data sounding & density belum diisi
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Pengiriman */}
                        <td className="px-6 py-5 align-top">
                          <div className="space-y-1.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <Truck size={14} />
                            </div>
                            <span className="text-sm font-bold text-foreground block">
                              {pengirimanCount} pengiriman
                            </span>
                            <Link
                              to={`/pengiriman?kapalId=${k.id}`}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                            >
                              Lihat riwayat <ChevronRight size={13} />
                            </Link>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-5 align-top text-right">
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => openUpload(k)}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
                              title="Upload file kalibrasi Excel untuk kapal ini"
                            >
                              <Upload size={14} />
                              <span>Upload Kalibrasi</span>
                            </button>
                            <button
                              onClick={() => openEdit(k)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-xs active:scale-95"
                              title="Edit nama kapal"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })}
                              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border/80 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shadow-xs active:scale-95"
                              title={pengirimanCount > 0 ? "Kapal memiliki data pengiriman" : "Hapus kapal"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border/60">
              {list.map(k => {
                const pengirimanCount = k._count?.pengiriman ?? 0
                const kal = k.kalibrasi || {}
                const isCalibrated = kal.isCalibrated

                return (
                  <div key={k.id} className="p-4 space-y-3.5">
                    {/* Header Card: Icon, Title, Date, Badge, More */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                          <Ship size={22} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-base truncate">{k.namaKapal}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Terdaftar: {new Date(k.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mt-1.5">
                            ARMADA AKTIF
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(k)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg"
                        title="Edit kapal"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Status Kalibrasi */}
                    <div className="space-y-2 pt-1">
                      <div>
                        {isCalibrated ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check size={12} className="stroke-[3]" />
                            Terkalibrasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertCircle size={12} />
                            Belum Dikalibrasi
                          </span>
                        )}
                      </div>
                      {isCalibrated ? (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Sounding: <span className="font-bold text-foreground">{kal.soundingCount} baris</span> ({kal.minTinggi}–{kal.maxTinggi} cm)</div>
                          <div>Density: <span className="font-bold text-foreground">{kal.densityCount} baris</span> ({kal.minSuhu}–{kal.maxSuhu} °C)</div>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-500">
                          Data sounding & density belum diisi
                        </div>
                      )}
                    </div>

                    {/* Row Pengiriman */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>{pengirimanCount} pengiriman</span>
                      </div>
                      <Link
                        to={`/pengiriman?kapalId=${k.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Lihat riwayat <ChevronRight size={12} />
                      </Link>
                    </div>

                    {/* Upload Kalibrasi Button */}
                    <button
                      onClick={() => openUpload(k)}
                      className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-95"
                    >
                      <Upload size={14} />
                      <span>Upload Kalibrasi</span>
                    </button>

                    {/* Edit & Hapus Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(k)}
                        className="flex-1 py-2 border border-border/80 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })}
                        className="flex-1 py-2 border border-border/80 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Summary Cards (Desktop & Mobile) */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        {/* Desktop View */}
        <div className="hidden md:grid md:grid-cols-4 gap-6 divide-x divide-border/60">
          {/* 1. Total Kapal */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Ship size={22} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground block">Total Kapal</span>
              <span className="text-2xl font-bold text-foreground font-mono block leading-tight">{totalKapal}</span>
              <span className="text-[11px] text-muted-foreground">Kapal terdaftar</span>
            </div>
          </div>

          {/* 2. Terkalibrasi */}
          <div className="flex items-center gap-4 pl-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground block">Terkalibrasi</span>
              <span className="text-2xl font-bold text-foreground font-mono block leading-tight">{terkalibrasiCount}</span>
              <span className="text-[11px] text-muted-foreground">{persenTerkalibrasi}% dari total kapal</span>
            </div>
          </div>

          {/* 3. Total Pengiriman */}
          <div className="flex items-center gap-4 pl-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Truck size={22} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground block">Total Pengiriman</span>
              <span className="text-2xl font-bold text-foreground font-mono block leading-tight">{totalPengiriman}</span>
              <span className="text-[11px] text-muted-foreground">Seluruh kapal</span>
            </div>
          </div>

          {/* 4. Terdaftar Terbaru */}
          <div className="flex items-center gap-4 pl-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Calendar size={22} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground block">Terdaftar Terbaru</span>
              <span className="text-lg font-bold text-foreground font-mono block leading-tight">{terdaftarTerbaruTgl}</span>
              <span className="text-[11px] text-muted-foreground truncate block max-w-[120px]">{terdaftarTerbaruNama}</span>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-4 gap-2 md:hidden text-center divide-x divide-border/60">
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Ship size={16} />
            </div>
            <span className="text-base font-bold text-foreground font-mono block">{totalKapal}</span>
            <span className="text-[10px] text-muted-foreground font-medium block">Total Kapal</span>
          </div>

          <div className="space-y-1 pl-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-base font-bold text-foreground font-mono block">{terkalibrasiCount}</span>
            <span className="text-[10px] text-muted-foreground font-medium block">Terkalibrasi</span>
          </div>

          <div className="space-y-1 pl-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
              <Truck size={16} />
            </div>
            <span className="text-base font-bold text-foreground font-mono block">{totalPengiriman}</span>
            <span className="text-[10px] text-muted-foreground font-medium block">Pengiriman</span>
          </div>

          <div className="space-y-1 pl-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Calendar size={16} />
            </div>
            <span className="text-xs font-bold text-foreground font-mono block leading-tight">{terdaftarTerbaruTgl}</span>
            <span className="text-[10px] text-muted-foreground font-medium block truncate">Terdaftar Terbaru</span>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.pengirimanCount > 0 ? "Tidak Dapat Dihapus" : "Hapus Kapal?"}
        message={
          confirmDelete?.pengirimanCount > 0
            ? `Kapal "${confirmDelete?.nama}" masih memiliki ${confirmDelete.pengirimanCount} riwayat data pengiriman. Silakan hapus data pengiriman terkait terlebih dahulu sebelum menghapus kapal ini.`
            : `Kapal "${confirmDelete?.nama}" beserta seluruh data kalibrasinya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText={confirmDelete?.pengirimanCount > 0 ? "Mengerti" : "Hapus"}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">{modal.mode === 'add' ? 'Tambah Kapal' : 'Edit Kapal'}</h3>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"><X size={15} /></button>
            </div>
            {error && <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nama Kapal</label>
            <input
              type="text"
              value={form.namaKapal}
              onChange={e => setForm({ namaKapal: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="contoh: HK III, HK IV, TK. SAMUDRA 01"
              autoFocus
              className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary mb-4"
            />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Kalibrasi Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeUpload} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-foreground">Upload Kalibrasi Kapal</h3>
                <p className="text-xs text-muted-foreground">
                  Kapal: <span className="font-semibold text-primary">{uploadModal.kapal?.namaKapal}</span>
                </p>
              </div>
              <button onClick={closeUpload} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"><X size={15} /></button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-2 bg-secondary/30 p-3 rounded-xl border border-border/60">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <FileSpreadsheet size={15} className="text-primary" />
                Format File Excel (.xlsx / .xls):
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Sheet <span className="font-mono text-foreground font-semibold">"Sounding"</span>: Kolom Tinggi (cm) & Volume (Liter).</li>
                <li>Sheet <span className="font-mono text-foreground font-semibold">"Density"</span>: Kolom Temp (°C) & Density.</li>
              </ul>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} /> Unduh contoh template kalibrasi
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">
                Pilih File Excel Kalibrasi
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setSelectedFile(file || null)
                  setError('')
                }}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer border border-border rounded-xl p-1.5 bg-secondary/20"
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-500 font-medium">
                  File dipilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={closeUpload} 
                disabled={uploading}
                className="flex-1 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleUploadKalibrasi} 
                disabled={uploading || !selectedFile} 
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? 'Mengimpor...' : 'Impor Kalibrasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
