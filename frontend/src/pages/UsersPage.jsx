import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api'
import { getRoleBadge } from '../lib/utils'
import toast from 'react-hot-toast'
import { Users, Plus, Pencil, Trash2, Loader2, X, Check, Shield, UserCheck, Eye, HardHat } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CustomSelect from '../components/ui/CustomSelect'

const defaultForm = { nama: '', username: '', password: '', role: 'PETUGAS', kontakWa: '' }

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { id, nama }

  const load = () => {
    setLoading(true)
    getUsers().then(r => setList(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Guard setelah semua hooks (Rules of Hooks)
  if (me?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const openAdd = () => { setForm(defaultForm); setError(''); setModal({ mode: 'add' }) }
  const openEdit = (u) => { setForm({ nama: u.nama, username: u.username, password: '', role: u.role, kontakWa: u.kontakWa || '' }); setError(''); setModal({ mode: 'edit', data: u }) }
  const closeModal = () => { setModal(null); setError('') }

  const handleSave = async () => {
    if (!form.nama || !form.username || (!modal?.data && !form.password)) {
      const msg = 'Nama, username, dan password wajib diisi.'
      setError(msg)
      toast.error(msg)
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (modal.mode === 'edit' && !payload.password) delete payload.password
      if (modal.mode === 'add') {
        await createUser(payload)
        toast.success(`User "${form.nama}" berhasil ditambahkan!`)
      } else {
        await updateUser(modal.data.id, payload)
        toast.success(`Data user "${form.nama}" berhasil diperbarui!`)
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
    try {
      await deleteUser(confirmDelete.id)
      toast.success(`User "${confirmDelete.nama}" berhasil dihapus.`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus user.')
    } finally {
      setConfirmDelete(null)
    }
  }

  const inputCls = "w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1"

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Manajemen User</h2>
          <p className="text-sm text-muted-foreground">{list.length} user terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
          <Plus size={15} /> <span className="hidden xs:inline">Tambah User</span><span className="xs:hidden">Tambah</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={28} className="animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {['Nama', 'Username', 'Role', 'Kontak WA', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                            {u.nama.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{u.nama}</span>
                          {u.id === me?.id && <span className="text-xs text-primary">(Saya)</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{u.username}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getRoleBadge(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{u.kontakWa || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(u)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmDelete({ id: u.id, nama: u.nama })} disabled={u.id === me?.id} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border/50">
              {list.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {u.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{u.nama}</span>
                      {u.id === me?.id && <span className="text-xs text-primary">(Saya)</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getRoleBadge(u.role)}`}>{u.role}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{u.username}{u.kontakWa ? ` • ${u.kontakWa}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEdit(u)} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmDelete({ id: u.id, nama: u.nama })} disabled={u.id === me?.id} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus User?"
        message={`User "${confirmDelete?.nama}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{modal.mode === 'add' ? 'Tambah User' : 'Edit User'}</h3>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"><X size={15} /></button>
            </div>
            {error && <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
            <div className="space-y-3">
              <div><label className={labelCls}>Nama Lengkap</label><input type="text" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap" className={inputCls} /></div>
              <div><label className={labelCls}>Username</label><input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" className={inputCls} /></div>
              <div><label className={labelCls}>Password {modal.mode === 'edit' && <span className="text-muted-foreground">(kosongkan jika tidak diubah)</span>}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modal.mode === 'edit' ? '••••••••' : 'Minimal 6 karakter'} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Role / Hak Akses</label>
                <CustomSelect
                  value={form.role}
                  onChange={(val) => setForm(f => ({ ...f, role: val }))}
                  options={[
                    { value: 'ADMIN', label: 'Administrator (Akses Penuh)', icon: Shield },
                    { value: 'PETUGAS', label: 'Petugas Sounding (Muat & Bongkar)', icon: HardHat },
                    { value: 'SURVEYOR', label: 'Surveyor Muatan (Sounding)', icon: UserCheck },
                    { value: 'VIEWER', label: 'Viewer / Auditor (Pemantau)', icon: Eye },
                  ]}
                  placeholder="-- Pilih Role User --"
                />
              </div>
              <div><label className={labelCls}>Kontak WA (opsional)</label><input type="text" value={form.kontakWa} onChange={e => setForm(f => ({ ...f, kontakWa: e.target.value }))} placeholder="628123456789" className={inputCls} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
