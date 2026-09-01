import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getKontakWa, createKontakWa, updateKontakWa, deleteKontakWa } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import {
  Contact, Plus, Search, Pencil, Trash2, Loader2, Phone,
  Building2, Briefcase, MessageSquare, CheckCircle2, XCircle,
  X, AlertTriangle
} from 'lucide-react'

export default function KontakWaPage() {
  const { user } = useAuthStore()

  // Guard ADMIN only
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  const [kontakList, setKontakList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    nama: '',
    nomorWa: '',
    jabatan: '',
    instansi: '',
    catatan: '',
    aktif: true,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getKontakWa({ search })
      setKontakList(res.data)
    } catch (err) {
      toast.error('Gagal memuat daftar kontak WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search])

  const openAdd = () => {
    setEditId(null)
    setForm({
      nama: '',
      nomorWa: '',
      jabatan: '',
      instansi: '',
      catatan: '',
      aktif: true,
    })
    setModalOpen(true)
  }

  const openEdit = (k) => {
    setEditId(k.id)
    setForm({
      nama: k.nama,
      nomorWa: k.nomorWa,
      jabatan: k.jabatan || '',
      instansi: k.instansi || '',
      catatan: k.catatan || '',
      aktif: k.aktif,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama.trim() || !form.nomorWa.trim()) {
      toast.error('Nama dan nomor WhatsApp wajib diisi.')
      return
    }

    try {
      setSubmitting(true)
      if (editId) {
        await updateKontakWa(editId, form)
        toast.success('Kontak WhatsApp berhasil diperbarui!')
      } else {
        await createKontakWa(form)
        toast.success('Kontak WhatsApp baru berhasil ditambahkan!')
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan kontak WhatsApp.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      setSubmitting(true)
      await deleteKontakWa(confirmDelete.id)
      toast.success('Kontak berhasil dihapus!')
      setConfirmDelete(null)
      loadData()
    } catch (err) {
      toast.error('Gagal menghapus kontak.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAktif = async (k) => {
    try {
      await updateKontakWa(k.id, { aktif: !k.aktif })
      toast.success(`Kontak ${k.nama} ${!k.aktif ? 'diaktifkan' : 'dinonaktifkan'}.`)
      loadData()
    } catch (err) {
      toast.error('Gagal mengubah status kontak.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Kontak WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Daftar penerima laporan muatan kapal CPO via WhatsApp
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 self-start sm:self-auto"
        >
          <Plus size={16} /> Tambah Kontak
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 flex items-center gap-3 shadow-sm">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan nama, nomor WA, jabatan, atau instansi..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 bg-secondary rounded-md"
          >
            Reset
          </button>
        )}
      </div>

      {/* Contacts List / Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={30} className="animate-spin text-primary" />
          </div>
        ) : kontakList.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Contact size={36} className="mx-auto opacity-30" />
            <p className="text-sm font-medium">Belum ada kontak WhatsApp tersimpan.</p>
            <p className="text-xs">Klik tombol &ldquo;Tambah Kontak&rdquo; di atas untuk mendaftarkan kontak baru.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-medium text-muted-foreground">
                    <th className="text-left px-5 py-3">Nama Kontak</th>
                    <th className="text-left px-5 py-3">Nomor WhatsApp</th>
                    <th className="text-left px-5 py-3">Jabatan & Instansi</th>
                    <th className="text-left px-5 py-3">Catatan</th>
                    <th className="text-center px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {kontakList.map((k) => (
                    <tr key={k.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {k.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{k.nama}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-foreground">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Phone size={13} className="text-muted-foreground" /> {k.nomorWa}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        <div className="space-y-0.5">
                          {k.jabatan && <div className="text-foreground font-medium flex items-center gap-1"><Briefcase size={11} /> {k.jabatan}</div>}
                          {k.instansi && <div className="text-muted-foreground flex items-center gap-1"><Building2 size={11} /> {k.instansi}</div>}
                          {!k.jabatan && !k.instansi && <span className="italic">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                        {k.catatan || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => toggleAktif(k)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            k.aktif
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          }`}
                          title="Klik untuk mengubah status aktif"
                        >
                          {k.aktif ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {k.aktif ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(k)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Edit Kontak"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(k)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Hapus Kontak"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border/50">
              {kontakList.map((k) => (
                <div key={k.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {k.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{k.nama}</div>
                        {k.jabatan && <div className="text-xs text-muted-foreground">{k.jabatan} {k.instansi ? `• ${k.instansi}` : ''}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAktif(k)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        k.aktif
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                      }`}
                    >
                      {k.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="font-mono text-xs text-foreground font-medium inline-flex items-center gap-1.5">
                      <Phone size={12} className="text-muted-foreground" /> {k.nomorWa}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(k)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 bg-secondary/50"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(k)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 bg-secondary/50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
            >
              <X size={15} />
            </button>

            <h3 className="font-bold text-foreground text-base sm:text-lg mb-1">
              {editId ? 'Edit Kontak WhatsApp' : 'Tambah Kontak WhatsApp'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Nomor ini akan muncul pada pilihan penerima saat pengiriman laporan WhatsApp.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nama Lengkap / Instansi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Bpk. Budi Santoso"
                  className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nomorWa}
                  onChange={(e) => setForm({ ...form, nomorWa: e.target.value })}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bisa diawali <code className="bg-secondary px-1 py-0.5 rounded">08...</code> atau <code className="bg-secondary px-1 py-0.5 rounded">628...</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Jabatan / Peran</label>
                  <input
                    type="text"
                    value={form.jabatan}
                    onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                    placeholder="Contoh: Manager Operasional"
                    className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Instansi / Perusahaan</label>
                  <input
                    type="text"
                    value={form.instansi}
                    onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                    placeholder="Contoh: PT Sawit Jaya"
                    className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  placeholder="Catatan khusus terkait kontak ini (opsional)..."
                  className="w-full p-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="aktif-checkbox"
                  checked={form.aktif}
                  onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="aktif-checkbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Kontak Aktif (Tampilkan pada pilihan saat kirim laporan)
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                  {editId ? 'Simpan Perubahan' : 'Tambah Kontak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-card border border-border rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl animate-fade-in text-center">
            <div className="w-11 h-11 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-bold text-foreground text-base mb-1">Hapus Kontak WhatsApp?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Apakah Anda yakin ingin menghapus kontak <strong>{confirmDelete.nama}</strong> ({confirmDelete.nomorWa})?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
