import { useEffect, useState } from 'react'
import { getKapal, createKapal, updateKapal, deleteKapal } from '../lib/api'
import toast from 'react-hot-toast'
import { Ship, Plus, Pencil, Trash2, Loader2, X, Check, AlertTriangle } from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function KapalPage() {
  const { user } = useAuthStore()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode: 'add'|'edit', data? }
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
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Master Kapal</h2>
          <p className="text-sm text-muted-foreground">{list.length} kapal terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 cursor-pointer">
          <Plus size={15} /> <span className="hidden xs:inline">Tambah Kapal</span><span className="xs:hidden">Tambah</span>
        </button>
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
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Nama Kapal</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Total Pengiriman</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Terdaftar</th>
                    <th className="px-5 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(k => {
                    const pengirimanCount = k._count?.pengiriman ?? 0
                    return (
                      <tr key={k.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Ship size={15} className="text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{k.namaKapal}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{pengirimanCount} pengiriman</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {new Date(k.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(k)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Edit nama kapal"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title={pengirimanCount > 0 ? "Kapal memiliki data pengiriman" : "Hapus kapal"}
                            >
                              <Trash2 size={13} />
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
            <div className="sm:hidden divide-y divide-border/50">
              {list.map(k => {
                const pengirimanCount = k._count?.pengiriman ?? 0
                return (
                  <div key={k.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Ship size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{k.namaKapal}</div>
                      <div className="text-xs text-muted-foreground">
                        {pengirimanCount} pengiriman • {new Date(k.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openEdit(k)} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDelete({ id: k.id, nama: k.namaKapal, pengirimanCount })} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                    </div>
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
              placeholder="contoh: HK III"
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
    </div>
  )
}
