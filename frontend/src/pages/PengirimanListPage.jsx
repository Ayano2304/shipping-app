import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPengiriman, getKapal, deletePengiriman } from '../lib/api'
import { formatAngka, formatTanggal } from '../lib/calc'
import { downloadBlob } from '../lib/utils'
import toast from 'react-hot-toast'
import {
  Plus, Search, Download, Eye, Pencil, Trash2, Loader2,
  Ship, Anchor, CheckCircle2, Clock, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CustomSelect from '../components/ui/CustomSelect'

export const StatusBadge = ({ status }) => {
  if (status === 'SELESAI') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 shadow-xs">
        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
        <span>Selesai</span>
      </span>
    )
  }
  if (status === 'DALAM_PERJALANAN') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 shadow-xs">
        <Ship size={12} className="animate-pulse text-blue-600" />
        <span>Sedang Berlayar</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shadow-xs">
      <Clock size={12} />
      <span>Draft</span>
    </span>
  )
}

export default function PengirimanListPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [kapalList, setKapalList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'DALAM_PERJALANAN' | 'SELESAI' | 'DRAFT'
  const [filters, setFilters] = useState({ search: '', kapalId: '', page: 1 })
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { id, namaKapal }

  // Count per status for quick tabs
  const [berlayarCount, setBerlayarCount] = useState(0)

  const canCreate = ['ADMIN', 'PETUGAS'].includes(user?.role)

  const loadData = async () => {
    setLoading(true)
    try {
      const params = { limit: 15, ...filters }
      if (activeTab !== 'ALL') {
        params.status = activeTab
      }
      if (!params.kapalId) delete params.kapalId
      if (!params.search) delete params.search
      const res = await getPengiriman(params)
      setData(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load count of ships in transit
  const loadInTransitCount = async () => {
    try {
      const res = await getPengiriman({ status: 'DALAM_PERJALANAN', limit: 1 })
      setBerlayarCount(res.data.total || 0)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    getKapal().then(r => setKapalList(r.data)).catch(console.error)
    loadInTransitCount()
  }, [])

  useEffect(() => {
    loadData()
  }, [filters, activeTab])

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    try {
      await deletePengiriman(confirmDelete.id)
      toast.success(`Pengiriman kapal ${confirmDelete.namaKapal} berhasil dihapus.`)
      loadData()
      loadInTransitCount()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus pengiriman.')
    } finally {
      setConfirmDelete(null)
    }
  }

  const inputCls = "h-10 px-3.5 bg-secondary border border-border/80 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Riwayat Pengiriman & Logistik
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {total} data pengiriman kapal ditemukan dalam sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {canCreate && (
            <Link
              to="/pengiriman/baru"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
            >
              <Plus size={16} /> <span>Muatan Baru (Loading)</span>
            </Link>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-border/80 overflow-x-auto pb-px">
        {[
          { key: 'ALL', label: 'Semua Pengiriman' },
          { key: 'DALAM_PERJALANAN', label: 'Sedang Berlayar', count: berlayarCount, highlight: true },
          { key: 'SELESAI', label: 'Selesai (Discharged)' },
          { key: 'DRAFT', label: 'Draft' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setFilters(f => ({ ...f, page: 1 }))
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.key
                ? 'text-primary border-primary bg-primary/5 rounded-t-xl'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                tab.highlight
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-secondary text-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Search & Ship Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card border border-border/80 rounded-2xl p-3.5 shadow-xs items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nomor B/L atau nama kapal..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            className={`${inputCls} pl-10 w-full font-medium`}
          />
        </div>
        <div className="w-full sm:w-56">
          <CustomSelect
            value={filters.kapalId}
            onChange={(val) => setFilters(f => ({ ...f, kapalId: val, page: 1 }))}
            options={[
              { value: '', label: 'Semua Kapal' },
              ...kapalList.map(k => ({ value: k.id, label: k.namaKapal, icon: Ship }))
            ]}
            placeholder="Semua Kapal"
            icon={Ship}
            searchable={kapalList.length > 5}
          />
        </div>
      </div>

      {/* Table / Card List */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
            <Loader2 size={30} className="animate-spin text-primary" />
            <span className="text-xs">Memuat data pengiriman...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Ship size={42} className="opacity-30" />
            <span className="text-sm font-semibold text-foreground">Tidak ada data pengiriman pada filter ini.</span>
            {canCreate && (
              <Link to="/pengiriman/baru" className="text-primary text-xs font-semibold hover:underline mt-1">
                + Buat pengiriman baru (Loading)
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground font-semibold text-xs">
                    <th className="text-left px-5 py-3.5 whitespace-nowrap">Kapal</th>
                    <th className="text-left px-4 py-3.5 whitespace-nowrap">Nomor B/L</th>
                    <th className="text-left px-4 py-3.5 whitespace-nowrap">Tgl Berangkat</th>
                    <th className="text-left px-4 py-3.5 whitespace-nowrap">Nilai B/L</th>
                    <th className="text-center px-4 py-3.5 whitespace-nowrap">Status</th>
                    <th className="text-right px-5 py-3.5 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.map(p => (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{p.kapal?.namaKapal}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">diinput oleh {p.createdBy?.nama || 'Petugas'}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground font-medium">{p.nomorBl || '—'}</td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap font-medium">{formatTanggal(p.tanggalBerangkat)}</td>
                      <td className="px-4 py-3.5 font-mono text-foreground font-semibold whitespace-nowrap">
                        {p.nilaiBl ? `${formatAngka(p.nilaiBl, 0)} ${p.satuanBl || 'KG'}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Tombol INPUT KEDATANGAN (Hanya jika kapal sedang berlayar) */}
                          {p.status === 'DALAM_PERJALANAN' && ['ADMIN', 'SURVEYOR'].includes(user?.role) && (
                            <button
                              onClick={() => navigate(`/pengiriman/${p.id}/kedatangan`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                              title="Input Sounding Kedatangan"
                            >
                              <Anchor size={13} />
                              <span>Kedatangan</span>
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/pengiriman/${p.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground transition-all shadow-xs"
                            title="Detail Pengiriman"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {(p.status !== 'SELESAI' || user?.role === 'ADMIN') && ['ADMIN', 'PETUGAS'].includes(user?.role) && (user?.role === 'ADMIN' || user?.id === p.createdById) && (
                            <button
                              onClick={() => navigate(`/pengiriman/${p.id}/edit`)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border/80 bg-secondary/50 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-all shadow-xs"
                              title="Edit Data"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={() => setConfirmDelete({ id: p.id, namaKapal: p.kapal?.namaKapal })}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border/80 bg-secondary/50 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all shadow-xs"
                              title="Hapus Pengiriman"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border/50">
              {data.map(p => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-sm">{p.kapal?.namaKapal}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">B/L: {p.nomorBl || '—'} • oleh {p.createdBy?.nama || 'Petugas'}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 bg-secondary/40 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span>Tgl Berangkat:</span>
                      <span className="font-medium text-foreground">{formatTanggal(p.tanggalBerangkat)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nilai B/L:</span>
                      <span className="font-mono font-bold text-foreground">{p.nilaiBl ? `${formatAngka(p.nilaiBl, 0)} ${p.satuanBl || 'KG'}` : '—'}</span>
                    </div>
                  </div>

                  {/* Action buttons for mobile */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div>
                      {p.status === 'DALAM_PERJALANAN' && ['ADMIN', 'SURVEYOR'].includes(user?.role) && (
                        <button
                          onClick={() => navigate(`/pengiriman/${p.id}/kedatangan`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold shadow-sm"
                        >
                          <Anchor size={13} /> <span>Kedatangan</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/pengiriman/${p.id}`)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary text-foreground"><Eye size={14} /></button>
                      {(p.status !== 'SELESAI' || user?.role === 'ADMIN') && ['ADMIN', 'PETUGAS'].includes(user?.role) && (user?.role === 'ADMIN' || user?.id === p.createdById) && (
                        <button onClick={() => navigate(`/pengiriman/${p.id}/edit`)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary text-amber-500"><Pencil size={14} /></button>
                      )}
                      {user?.role === 'ADMIN' && (
                        <button onClick={() => setConfirmDelete({ id: p.id, namaKapal: p.kapal?.namaKapal })} className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary text-red-500"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground font-medium">
          <span>Halaman {filters.page} dari {Math.ceil(total / 15)}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))}
              disabled={filters.page <= 1}
              className="px-3.5 py-1.5 border border-border bg-card rounded-xl hover:bg-secondary disabled:opacity-30 transition-colors shadow-xs"
            >
              ← Sblm
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              disabled={filters.page >= Math.ceil(total / 15)}
              className="px-3.5 py-1.5 border border-border bg-card rounded-xl hover:bg-secondary disabled:opacity-30 transition-colors shadow-xs"
            >
              Brkt →
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Pengiriman?"
        message={`Pengiriman kapal "${confirmDelete?.namaKapal}" akan dihapus beserta semua data palka. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
