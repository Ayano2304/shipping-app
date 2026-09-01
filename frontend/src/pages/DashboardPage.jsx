import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardStats, getTrenSusut, getSusutPerKapal } from '../lib/api'
import { formatAngka } from '../lib/calc'
import { useAuthStore } from '../store/authStore'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Ship, Package, CheckCircle, TrendingDown, Plus, Loader2,
  Anchor, Calendar, ArrowRight, Eye, Weight, ShieldCheck, Activity,
  FileSpreadsheet
} from 'lucide-react'

/* ── Stat Card ── */
const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4 animate-fade-in min-w-0 shadow-xs">
    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color} shadow-xs`}>
      <Icon size={18} className="text-white sm:w-6 sm:h-6" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-base xs:text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate font-mono" title={String(value)}>
        {value}
      </div>
      <div className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 font-medium leading-snug truncate">{label}</div>
      {sub && <div className="text-[10px] sm:text-xs text-primary mt-0.5 sm:mt-1 font-semibold truncate">{sub}</div>}
    </div>
  </div>
)

/* ── Chart Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
      <div className="font-semibold text-foreground">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}%
        </div>
      ))}
    </div>
  )
}

/* ── Status Badge ── */
export const StatusBadge = ({ status }) => {
  const map = {
    DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600',
    DALAM_PERJALANAN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    SELESAI: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  }
  const labels = { DRAFT: 'Draft', DALAM_PERJALANAN: 'Sedang Berlayar', SELESAI: 'Selesai' }
  return (
    <span className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${map[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [tren, setTren] = useState([])
  const [perKapal, setPerKapal] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const isViewer = user?.role === 'VIEWER'
  const canCreate = ['ADMIN', 'PETUGAS', 'SURVEYOR'].includes(user?.role)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, k] = await Promise.all([
          getDashboardStats(),
          getTrenSusut(12),
          getSusutPerKapal(),
        ])
        setStats(s.data)
        setTren(t.data.map(d => ({
          ...d,
          tanggalLabel: new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        })))
        setPerKapal(k.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  )

  const kapalBerlayar = stats?.kapalBerlayarDetail || []
  const recentPengiriman = stats?.recentPengiriman || []
  const totalTonaseKg = stats?.totalTonaseMuat || 0
  const totalTonaseMt = totalTonaseKg > 0 ? (totalTonaseKg / 1000).toFixed(2) : '0'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isViewer ? 'Monitoring & Dashboard Eksekutif' : 'Dashboard Operasional'}
            </h2>
            {isViewer && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Auditor / Viewer View</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isViewer
              ? 'Pantau pergerakan armada kapal CPO, distribusi muatan, dan rasio susut secara komprehensif.'
              : 'Ringkasan statistik dan aktivitas sounding muatan kapal CPO Tanker.'}
          </p>
        </div>

        {canCreate && (
          <Link
            to="/pengiriman/baru"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition shadow-md shadow-primary/20 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <Plus size={16} /> <span>Pengiriman Baru</span>
          </Link>
        )}

        {isViewer && (
          <Link
            to="/pengiriman"
            className="flex items-center gap-2 px-4 py-2.5 border border-border bg-secondary/60 hover:bg-secondary text-foreground rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto shrink-0"
          >
            <Ship size={15} /> <span>Lihat Semua Muatan</span>
          </Link>
        )}
      </div>

      {/* ═══════════ KAPAL SEDANG BERLAYAR WIDGET ═══════════ */}
      {kapalBerlayar.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">
                Armada Sedang Dalam Pelayaran
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                ({kapalBerlayar.length} kapal aktif)
              </span>
            </div>
            <Link to="/pengiriman" className="text-xs text-primary hover:underline font-semibold">
              Lihat Detail →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {kapalBerlayar.map(k => (
              <div
                key={k.id}
                className="bg-card border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-blue-500/60 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 text-blue-600">
                    <Ship size={22} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{k.namaKapal}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      B/L: <span className="font-mono text-foreground">{k.nomorBl || '—'}</span> • {k.jumlahPalka} palka
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar size={12} />
                        {k.hariLayar} hari berlayar
                      </span>
                      <span className="font-mono font-bold text-primary">
                        SFAL: {formatAngka(k.totalSfal)} KG
                      </span>
                    </div>
                  </div>
                </div>

                {isViewer ? (
                  <Link
                    to={`/pengiriman/${k.id}`}
                    className="w-full sm:w-auto text-center flex items-center justify-center gap-1.5 px-3.5 py-2 bg-secondary/80 hover:bg-secondary text-foreground rounded-xl text-xs font-semibold transition-colors border border-border/80 whitespace-nowrap"
                  >
                    <Eye size={13} /> <span>Lihat Rincian</span>
                  </Link>
                ) : (
                  ['ADMIN', 'PETUGAS', 'SURVEYOR'].includes(user?.role) && user?.id !== k.createdById ? (
                    <Link
                      to={`/pengiriman/${k.id}/kedatangan`}
                      className="w-full sm:w-auto text-center flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs whitespace-nowrap"
                    >
                      <Anchor size={13} /> <span>Input Kedatangan</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/pengiriman/${k.id}`}
                      className="w-full sm:w-auto text-center flex items-center justify-center gap-1.5 px-3.5 py-2 bg-secondary/80 hover:bg-secondary text-foreground rounded-xl text-xs font-semibold transition-colors border border-border/80 whitespace-nowrap"
                    >
                      <Eye size={13} /> <span>Lihat Detail</span>
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ STAT CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Total Tonase Muat"
          value={totalTonaseKg > 0 ? `${formatAngka(totalTonaseKg)}` : '0'}
          sub={`≈ ${formatAngka(totalTonaseMt)} MT (Akumulasi SFAL)`}
          icon={Weight}
          color="bg-blue-600"
        />
        <StatCard
          label="Sedang Berlayar"
          value={stats?.pengirimanBerlayar ?? 0}
          icon={Ship}
          color="bg-indigo-600"
          sub={stats?.pengirimanBerlayar > 0 ? `${stats.pengirimanBerlayar} Kapal Aktif di Laut` : 'Tidak ada kapal berlayar'}
        />
        <StatCard
          label="Selesai (Discharged)"
          value={stats?.pengirimanSelesai ?? 0}
          icon={CheckCircle}
          color="bg-emerald-600"
          sub={`dari ${stats?.totalPengiriman ?? 0} total pengiriman`}
        />
        <StatCard
          label="Rata-rata Susut R2"
          value={`${stats?.rataR2 ? Math.abs(parseFloat(stats.rataR2)).toFixed(2) : 0}%`}
          sub="Susut Pelayaran (SFBD vs SFAL)"
          icon={TrendingDown}
          color={Math.abs(parseFloat(stats?.rataR2)) > 0.5 ? 'bg-rose-500' : 'bg-amber-500'}
        />
      </div>

      {/* ═══════════ CHARTS ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Tren R2 */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">Tren Rasio Susut Pelayaran (R2)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Persentase deviasi muatan SFBD vs SFAL (%)</p>
            </div>
            <Activity size={18} className="text-muted-foreground/60" />
          </div>
          {tren.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingDown size={28} className="opacity-30" />
              <span className="text-xs">Belum ada data pengiriman selesai</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tren} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="tanggalLabel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="r2" name="R2 Susut" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3.5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Susut per Kapal */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">Efisiensi & Rata-rata Susut per Kapal</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Rata-rata R2 berdasarkan riwayat pengiriman (%)</p>
            </div>
            <Ship size={18} className="text-muted-foreground/60" />
          </div>
          {perKapal.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Ship size={28} className="opacity-30" />
              <span className="text-xs">Belum ada data kapal selesai</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perKapal} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="kapal" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rataSusut" name="R2 Rata-rata" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══════════ PENGIRIMAN TERBARU (EXECUTIVE MONITORING FEED) ═══════════ */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-secondary/30">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">Aktivitas Pengiriman Terkini</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ringkasan riwayat pengiriman kapal & muatan</p>
          </div>
          <Link
            to="/pengiriman"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Buka Semua Riwayat</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentPengiriman.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package size={36} className="opacity-30" />
            <span className="text-sm font-semibold text-foreground">Belum ada data pengiriman</span>
            <p className="text-xs text-muted-foreground">Data muatan kapal akan tampil di sini.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/20 text-muted-foreground font-semibold text-xs">
                    <th className="text-left px-5 py-3.5">Tanggal</th>
                    <th className="text-left px-5 py-3.5">Nama Kapal</th>
                    <th className="text-left px-5 py-3.5">No. B/L</th>
                    <th className="text-right px-5 py-3.5">SFAL (KG)</th>
                    <th className="text-right px-5 py-3.5">SFBD (KG)</th>
                    <th className="text-right px-5 py-3.5">R2 Susut (%)</th>
                    <th className="text-center px-5 py-3.5">Status</th>
                    <th className="text-right px-5 py-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentPengiriman.map(p => (
                    <tr
                      key={p.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(p.tanggalBerangkat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-bold">{p.namaKapal}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono">{p.nomorBl || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-foreground font-semibold">{formatAngka(p.totalSfal)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-foreground font-semibold">
                        {p.totalSfbd !== null ? formatAngka(p.totalSfbd) : <span className="text-muted-foreground italic text-xs font-normal">Menunggu tiba</span>}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-mono font-bold ${
                        p.r2 === null ? 'text-muted-foreground' :
                        Math.abs(p.r2) > 0.5 ? 'text-rose-500' :
                        Math.abs(p.r2) > 0.1 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {p.r2 !== null ? `${p.r2 > 0 ? '+' : ''}${p.r2.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/pengiriman/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold transition-all shadow-xs"
                          title="Lihat Detail & Laporan"
                        >
                          <Eye size={13} />
                          <span>Rincian</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border/50">
              {recentPengiriman.map(p => (
                <div
                  key={p.id}
                  className="p-4 space-y-2.5 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{p.namaKapal}</div>
                      <div className="text-xs text-muted-foreground font-mono">B/L: {p.nomorBl || '—'}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-secondary/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">SFAL</span>
                      <span className="font-mono text-foreground font-bold">{formatAngka(p.totalSfal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">SFBD</span>
                      <span className="font-mono text-foreground font-bold">{p.totalSfbd !== null ? formatAngka(p.totalSfbd) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">R2</span>
                      <span className={`font-mono font-bold ${
                        p.r2 === null ? 'text-muted-foreground' :
                        Math.abs(p.r2) > 0.5 ? 'text-rose-500' : 'text-emerald-500'
                      }`}>
                        {p.r2 !== null ? `${p.r2 > 0 ? '+' : ''}${p.r2.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link
                      to={`/pengiriman/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                    >
                      <span>Lihat Rincian & PDF</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
