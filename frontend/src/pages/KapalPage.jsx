import { useEffect, useState } from 'react'
import { getKapal, createKapal, updateKapal, deleteKapal, importExcel, downloadKalibrasiTemplate } from '../lib/api'
import toast from 'react-hot-toast'
import { Ship, Plus, Pencil, Trash2, Loader2, X, Check, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Navigate } from 'react-router-dom'
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Master Kapal</h2>
          <p className="text-sm text-muted-foreground">
            Kelola armada kapal dan spesifikasi data kalibrasi (Sounding & Density)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="flex items-center gap-2 px-3.5 py-2 border border-border bg-secondary/50 text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition cursor-pointer"
            title="Download Template Excel Kalibrasi"
          >
            {downloadingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">Template Excel</span>
          </button>
          <button 
            onClick={openAdd} 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Plus size={15} /> <span>Tambah Kapal</span>
          </button>
        </div>
      </div>

      {/* Desktop table / Mobile card list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={28} className="animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
            <Ship size={36} className="opacity-30" />
            <span className="text-sm">Belum ada kapal. Tambahkan sekarang.</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Nama Kapal</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status Kalibrasi</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Pengiriman</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(k => {
                    const pengirimanCount = k._count?.pengiriman ?? 0
                    const kal = k.kalibrasi || {}
                    const isCalibrated = kal.isCalibrated

                    return (
                      <tr key={k.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Ship size={16} className="text-primary" />
                            </div>
                            <div>
                              <span className="font-semibold text-foreground text-sm block">{k.namaKapal}</span>
                              <span className="text-xs text-muted-foreground">
                                Terdaftar: {new Date(k.createdAt).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {isCalibrated ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <CheckCircle2 size={12} />
                                Terkalibrasi
                              </span>
                              <div className="text-[11px] text-muted-foreground space-y-0.5">
                                <div>Sounding: <span className="font-mono font-medium text-foreground">{kal.soundingCount} baris</span> ({kal.minTinggi}–{kal.maxTinggi} cm)</div>
                                <div>Density: <span className="font-mono font-medium text-foreground">{kal.densityCount} baris</span> ({kal.minSuhu}–{kal.maxSuhu} °C)</div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <AlertCircle size={12} />
                                Belum Dikalibrasi
                              </span>
                              <div className="text-[11px] text-muted-foreground">
                                Belum ada data sounding & density
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-sm">
                          <span className="font-mono font-medium text-foreground">{pengirimanCount}</span> pengiriman
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openUpload(k)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                              title="Upload file kalibrasi Excel untuk kapal ini"
                            >
                              <Upload size={13} />
                              <span>Upload Kalibrasi</span>
                            </button>
                            <button
                              onClick={() => openEdit(k)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Edit nama kapal"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            <div className="md:hidden divide-y divide-border/50">
              {list.map(k => {
                const pengirimanCount = k._count?.pengiriman ?? 0
                const kal = k.kalibrasi || {}
                const isCalibrated = kal.isCalibrated

                return (
                  <div key={k.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Ship size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">{k.namaKapal}</div>
                          <div className="text-xs text-muted-foreground">
                            {pengirimanCount} pengiriman • {new Date(k.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(k)} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="bg-secondary/30 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Status Kalibrasi</span>
                        {isCalibrated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={11} /> Terkalibrasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <AlertCircle size={11} /> Belum Kalibrasi
                          </span>
                        )}
                      </div>
                      {isCalibrated ? (
                        <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                          <div>Sounding: <span className="font-mono text-foreground font-semibold">{kal.soundingCount} baris</span> ({kal.minTinggi}–{kal.maxTinggi} cm)</div>
                          <div>Density: <span className="font-mono text-foreground font-semibold">{kal.densityCount} baris</span> ({kal.minSuhu}–{kal.maxSuhu} °C)</div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-500/90 pt-1 border-t border-border/50">
                          Data sounding & density belum diisi. Silakan upload file Excel kalibrasi.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openUpload(k)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <Upload size={13} />
                      <span>Upload Kalibrasi Excel</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
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
              placeholder="contoh: HK III, TK. SAMUDRA 01"
              autoFocus
              className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary mb-4"
            />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm">
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
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
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
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer border border-border rounded-xl p-1.5 bg-secondary/20"
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
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
