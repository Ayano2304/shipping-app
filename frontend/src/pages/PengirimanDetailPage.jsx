import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getPengirimanById, exportPDF, kirimWA,
  getKontakWa, getWATemplates, createWATemplate, deleteWATemplate
} from '../lib/api'
import { formatAngka, formatTanggal, toKg, hitungR1, hitungR2, hitungR3 } from '../lib/calc'
import { downloadBlob } from '../lib/utils'
import CustomSelect from '../components/ui/CustomSelect'
import toast from 'react-hot-toast'
import {
  ArrowLeft, FileText, MessageCircle, Pencil, Loader2,
  Anchor, Ship, Info, Contact, Phone, Scale, TrendingUp,
  TrendingDown, Thermometer, CheckCircle2,
  Bookmark, Sparkles, Plus, RotateCcw, Trash2, Clock, X
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const Table = ({ title, palka }) => {
  const total = palka.reduce((s, p) => s + (parseFloat(p.beratHasil) || 0), 0)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h4 className="font-bold text-sm sm:text-base text-foreground">{title}</h4>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-primary font-bold text-xs">
          {palka.length} Palka
        </span>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border/80 bg-background/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/40 border-b border-border/80 text-xs font-semibold text-muted-foreground">
              <th className="text-left px-5 py-3.5 whitespace-nowrap">Nama Palka</th>
              <th className="text-left px-4 py-3.5 whitespace-nowrap">Tinggi (cm)</th>
              <th className="text-left px-4 py-3.5 whitespace-nowrap">Point</th>
              <th className="text-left px-4 py-3.5 whitespace-nowrap">Suhu (°C)</th>
              <th className="text-left px-4 py-3.5 whitespace-nowrap">Volume (L)</th>
              <th className="text-left px-4 py-3.5 whitespace-nowrap">Density</th>
              <th className="text-right px-5 py-3.5 whitespace-nowrap">Berat (KG)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {palka.map((p, idx) => (
              <tr key={p.id || idx} className="hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {idx + 1}
                    </span>
                    <span>{p.namaPalka}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{p.tinggiCm || '—'}</td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{p.point !== null && p.point !== undefined ? p.point : '0'}</td>
                <td className="px-4 py-3.5 text-muted-foreground font-mono">
                  {p.suhu ? (
                    <span className="inline-flex items-center gap-1">
                      <Thermometer size={14} className="text-blue-500" />
                      <span>{p.suhu}°C</span>
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatAngka(p.volumeLiter, 0)}</td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatAngka(p.density, 4)}</td>
                <td className="px-5 py-3.5 font-mono font-bold text-primary text-right text-base">
                  {formatAngka(p.beratHasil, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="md:hidden space-y-2.5">
        {palka.map((p, idx) => (
          <div key={p.id || idx} className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-xs text-foreground">{p.namaPalka}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Palka #{idx + 1}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-secondary/40 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground block">Tinggi / Point</span>
                <span className="font-mono text-foreground font-medium">{p.tinggiCm || '—'} cm {p.point ? `(+${p.point})` : ''}</span>
              </div>
              <div className="bg-secondary/40 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground block">Suhu</span>
                <span className="font-mono text-foreground font-medium">{p.suhu ? `${p.suhu}°C` : '—'}</span>
              </div>
              <div className="bg-secondary/40 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground block">Volume</span>
                <span className="font-mono text-foreground font-medium">{formatAngka(p.volumeLiter, 0)} L</span>
              </div>
              <div className="bg-secondary/40 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground block">Density</span>
                <span className="font-mono text-foreground font-medium">{formatAngka(p.density, 4)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
              <span className="text-muted-foreground text-[11px]">Berat Palka:</span>
              <span className="font-mono font-bold text-primary text-sm">{formatAngka(p.beratHasil, 0)} KG</span>
            </div>
          </div>
        ))}

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <span className="text-xs font-bold text-foreground">TOTAL BERAT</span>
          <span className="font-mono font-bold text-base text-primary">{formatAngka(total, 0)} KG</span>
        </div>
      </div>
    </div>
  )
}

export default function PengirimanDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)

  // WhatsApp Modal State
  const [waModal, setWaModal] = useState(false)
  const [waTarget, setWaTarget] = useState('')
  const [savedContacts, setSavedContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [attachPdf, setAttachPdf] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [waSending, setWaSending] = useState(false)

  // WhatsApp Template & Custom Message State
  const [waTemplates, setWaTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [pesanTeks, setPesanTeks] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false)
  const [newTemplateTitle, setNewTemplateTitle] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [activeTab, setActiveTab] = useState('berangkat')

  useEffect(() => {
    getPengirimanById(id).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const isBerlayar = data?.status === 'DALAM_PERJALANAN'
  const isSelesai = data?.status === 'SELESAI'

  const blKg = data ? toKg(data.nilaiBl, data.satuanBl) : 0
  const palkaBerangkat = data ? data.dataPalka.filter(p => p.tipe === 'KEBERANGKATAN') : []
  const palkaDatang = data ? data.dataPalka.filter(p => p.tipe === 'KEDATANGAN') : []
  const totalBerangkat = palkaBerangkat.reduce((s, p) => s + (parseFloat(p.beratHasil) || 0), 0)
  const totalDatang = palkaDatang.reduce((s, p) => s + (parseFloat(p.beratHasil) || 0), 0)

  // Status tiba: Harus SELESAI dan memiliki tonase kedatangan yang valid
  const isArrived = isSelesai && totalDatang > 0

  const diffR1 = totalBerangkat - blKg
  const r1Pct = hitungR1(totalBerangkat, blKg)

  const diffR2 = isArrived ? (totalDatang - totalBerangkat) : null
  const r2Pct = isArrived ? hitungR2(totalDatang, totalBerangkat) : null

  const diffR3 = isArrived ? (totalDatang - blKg) : null
  const r3Pct = isArrived ? hitungR3(totalDatang, blKg) : null

  // Dictionary Variabel Dinamis untuk Template WhatsApp
  const buildVariables = () => {
    if (!data) return {}
    const getCleanReportUrl = () => {
      if (data.reportUrl) return data.reportUrl
      const apiBase = import.meta.env.VITE_API_URL || `${window.location.origin}/api`
      const rootBackendUrl = apiBase.replace(/\/api\/?$/, '')
      if (data.reportSlug) return `${rootBackendUrl}/report/${data.reportSlug}`
      const kapalSlug = (data.kapal?.namaKapal || 'KAPAL').trim().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toUpperCase()
      return `${rootBackendUrl}/report/${kapalSlug}-${data.id}`
    }
    const pdfUrl = getCleanReportUrl()
    return {
      namaKapal: data.kapal?.namaKapal || '—',
      nomorBl: data.nomorBl || '—',
      blKg: formatAngka(blKg),
      sfal: formatAngka(totalBerangkat),
      sfbd: isArrived ? formatAngka(totalDatang) : 'Menunggu Tiba',
      r1Diff: diffR1 > 0 ? `+${formatAngka(diffR1)}` : formatAngka(diffR1),
      r1Pct: `${r1Pct > 0 ? '+' : ''}${r1Pct.toFixed(2)}%`,
      r2Diff: isArrived ? (diffR2 > 0 ? `+${formatAngka(diffR2)}` : formatAngka(diffR2)) : 'Menunggu Tiba',
      r2Pct: isArrived ? `${r2Pct > 0 ? '+' : ''}${r2Pct.toFixed(2)}%` : 'Menunggu Tiba',
      r3Diff: isArrived ? (diffR3 > 0 ? `+${formatAngka(diffR3)}` : formatAngka(diffR3)) : 'Menunggu Tiba',
      r3Pct: isArrived ? `${r3Pct > 0 ? '+' : ''}${r3Pct.toFixed(2)}%` : 'Menunggu Tiba',
      tglBerangkat: formatTanggal(data.tanggalBerangkat),
      tglTiba: data.tanggalSampai ? formatTanggal(data.tanggalSampai) : '—',
      petugasMuat: data.createdBy?.nama || '—',
      petugasBongkar: data.dischargedBy?.nama || '—',
      linkPdf: `*DOKUMEN LAPORAN RESMI (PDF)*\nUnduh/Buka Dokumen:\n${pdfUrl}`
    }
  }

  const interpolateTemplate = (templateStr) => {
    if (!templateStr) return ''
    const vars = buildVariables()
    let out = templateStr
    Object.keys(vars).forEach(k => {
      out = out.replaceAll(`{${k}}`, vars[k] ?? '')
    })
    return out
  }

  // Load Contacts and Templates on Modal Open
  useEffect(() => {
    if (waModal) {
      setLoadingContacts(true)
      getKontakWa({ aktifOnly: 'true' })
        .then(res => {
          setSavedContacts(res.data || [])
          if (res.data?.length > 0 && !waTarget) {
            setSelectedContactId(res.data[0].id.toString())
            setWaTarget(res.data[0].nomorWa)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingContacts(false))

      setLoadingTemplates(true)
      getWATemplates()
        .then(res => {
          const list = res.data || []
          setWaTemplates(list)
          if (list.length > 0 && !pesanTeks) {
            setSelectedTemplateId(list[0].id.toString())
            setPesanTeks(interpolateTemplate(list[0].isi))
          }
        })
        .catch(console.error)
        .finally(() => setLoadingTemplates(false))
    }
  }, [waModal])

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const found = waTemplates.find(t => t.id === parseInt(templateId))
    if (found) {
      setPesanTeks(interpolateTemplate(found.isi))
    }
  }

  const handleInsertVariable = (varKey) => {
    const vars = buildVariables()
    const val = vars[varKey] || `{${varKey}}`
    setPesanTeks(prev => `${prev ? `${prev} ` : ''}${val}`)
  }

  const handleSaveAsNewTemplate = async () => {
    if (!newTemplateTitle.trim()) {
      toast.error('Nama template wajib diisi.')
      return
    }
    if (!pesanTeks.trim()) {
      toast.error('Isi pesan tidak boleh kosong.')
      return
    }

    setSavingTemplate(true)
    try {
      const res = await createWATemplate({
        nama: newTemplateTitle.trim(),
        isi: pesanTeks.trim()
      })
      toast.success('Template baru berhasil disimpan!')
      const created = res.data.data
      setWaTemplates(prev => [created, ...prev])
      setSelectedTemplateId(created.id.toString())
      setShowSaveTemplateInput(false)
      setNewTemplateTitle('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan template baru.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (templateId, templateName, e) => {
    e.stopPropagation()
    if (!window.confirm(`Hapus template "${templateName}"?`)) return
    try {
      await deleteWATemplate(templateId)
      toast.success('Template berhasil dihapus.')
      const nextList = waTemplates.filter(t => t.id !== templateId)
      setWaTemplates(nextList)
      if (selectedTemplateId === templateId.toString()) {
        if (nextList.length > 0) {
          setSelectedTemplateId(nextList[0].id.toString())
          setPesanTeks(interpolateTemplate(nextList[0].isi))
        } else {
          setSelectedTemplateId('')
        }
      }
    } catch (err) {
      toast.error('Gagal menghapus template.')
    }
  }

  const handleExportPDF = async () => {
    setExportingPdf(true)
    try {
      const res = await exportPDF(id)
      const fname = `Laporan_CPO_${data.kapal.namaKapal.replace(/\s/g, '_')}_${data.nomorBl || id}.pdf`
      downloadBlob(res.data, fname)
      toast.success('File PDF berhasil diunduh!')
    } catch {
      toast.error('Gagal mengekspor file PDF.')
    } finally { setExportingPdf(false) }
  }

  const handleKirimWA = async () => {
    if (!waTarget) {
      toast.error('Nomor tujuan WhatsApp harus diisi.')
      return
    }
    if (!pesanTeks.trim()) {
      toast.error('Isi pesan teks tidak boleh kosong.')
      return
    }

    const token = localStorage.getItem('fonnte_token')
    setWaSending(true)
    try {
      const res = await kirimWA(id, {
        tujuanWa: waTarget,
        attachPdf,
        pesanCustom: pesanTeks,
        fonnteToken: token || undefined
      })
      toast.success(res.data.message || 'Laporan berhasil dikirim via WhatsApp!')
      setWaModal(false)
      setWaTarget('')
      setSelectedContactId('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim laporan WhatsApp.')
    } finally { setWaSending(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-primary" /></div>
  if (!data) return <div className="text-center text-muted-foreground py-20">Pengiriman tidak ditemukan.</div>

  const isCreator = user?.id === data.createdById
  const hasKedatanganPalka = palkaDatang.length > 0
  const canInputKedatangan = (isBerlayar || (!hasKedatanganPalka && isSelesai) || user?.role === 'ADMIN') && (['ADMIN', 'PETUGAS', 'SURVEYOR'].includes(user?.role) && (!isCreator || user?.role === 'ADMIN'))

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 1. Header Card */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Ship Icon + Title + Status + Subtitle */}
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/pengiriman"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors shrink-0"
            title="Kembali"
          >
            <ArrowLeft size={16} />
          </Link>
          
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
            <Ship size={30} className="sm:size-8" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                {data.kapal?.namaKapal}
              </h2>
              {data.status === 'SELESAI' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Selesai</span>
                </span>
              ) : data.status === 'DALAM_PERJALANAN' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>Sedang Berlayar</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Draft</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              B/L: {data.nomorBl || '—'} • {formatTanggal(data.tanggalBerangkat)}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canInputKedatangan && (
            <Link
              to={`/pengiriman/${id}/kedatangan`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Anchor size={15} />
              <span>{hasKedatanganPalka ? 'Edit Kedatangan' : 'Input Kedatangan'}</span>
            </Link>
          )}

          {(!isSelesai || user?.role === 'ADMIN') && ['ADMIN', 'PETUGAS', 'SURVEYOR'].includes(user?.role) && (
            <Link
              to={`/pengiriman/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <Pencil size={14} />
              <span>Edit Data</span>
            </Link>
          )}

          {isSelesai && (
            <>
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Unduh Laporan PDF"
              >
                {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={16} className="text-red-500" />}
                <span>PDF</span>
              </button>

              {['ADMIN', 'PETUGAS', 'SURVEYOR'].includes(user?.role) && (
                <button
                  onClick={() => setWaModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Kirim WA</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Top 3 Metric Cards (SFAL, SFBD, B/L) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: SFAL */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-l-4 border-l-blue-600">
          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
              <Scale size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">SFAL (Total Muat)</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                  {formatAngka(totalBerangkat)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-blue-600">KG</span>
              </div>
            </div>
          </div>
          {/* Subtle Decorative Wave Line */}
          <div className="absolute -bottom-1 left-0 right-0 h-9 opacity-35 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full text-blue-500 fill-none stroke-current stroke-[2.5]">
              <path d="M0,100 C150,150 220,40 350,100 C440,140 500,80 500,80" />
            </svg>
          </div>
        </div>

        {/* Card 2: SFBD */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-l-4 border-l-purple-600">
          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
              <Ship size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">SFBD (Total Bongkar)</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                  {isSelesai ? formatAngka(totalDatang) : 'Menunggu Tiba'}
                </span>
                {isSelesai && <span className="text-[10px] sm:text-xs font-bold text-purple-600">KG</span>}
              </div>
            </div>
          </div>
          {/* Subtle Decorative Wave Line */}
          <div className="absolute -bottom-1 left-0 right-0 h-9 opacity-35 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full text-purple-500 fill-none stroke-current stroke-[2.5]">
              <path d="M0,80 C120,140 250,50 380,110 C460,150 500,70 500,70" />
            </svg>
          </div>
        </div>

        {/* Card 3: B/L (Kontrak) */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <FileText size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">B/L (Kontrak)</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                  {formatAngka(blKg)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-600">KG</span>
              </div>
            </div>
          </div>
          {/* Subtle Decorative Wave Line */}
          <div className="absolute -bottom-1 left-0 right-0 h-9 opacity-35 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full text-amber-500 fill-none stroke-current stroke-[2.5]">
              <path d="M0,110 C140,60 260,140 370,80 C440,50 500,100 500,100" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Bottom 3 Ratio Cards (R1, R2, R3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* R1: SFAL vs B/L */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between border-b-2 border-b-rose-200/60 dark:border-b-rose-900/40">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${
              diffR1 >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-500'
            }`}>
              {diffR1 >= 0 ? <TrendingUp size={18} className="sm:w-5 sm:h-5" /> : <TrendingDown size={18} className="sm:w-5 sm:h-5" />}
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">R1: SFAL vs B/L</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-base sm:text-lg font-extrabold font-mono ${diffR1 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {diffR1 > 0 ? `+${formatAngka(diffR1)}` : formatAngka(diffR1)}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold ${diffR1 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>KG</span>
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold ${
            diffR1 >= 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
          }`}>
            {r1Pct > 0 ? `+${r1Pct.toFixed(2)}%` : `${r1Pct.toFixed(2)}%`}
          </span>
        </div>

        {/* R2: Susut Pelayaran */}
        <div className={`bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between border-b-2 ${
          isArrived
            ? diffR2 >= 0 ? 'border-b-emerald-200/60 dark:border-b-emerald-900/40' : 'border-b-rose-200/60 dark:border-b-rose-900/40'
            : 'border-b-slate-200/60 dark:border-b-slate-800/40'
        }`}>
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${
              isArrived
                ? diffR2 >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-500'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {isArrived ? (diffR2 >= 0 ? <TrendingUp size={18} className="sm:w-5 sm:h-5" /> : <TrendingDown size={18} className="sm:w-5 sm:h-5" />) : <Clock size={18} className="sm:w-[19px] sm:h-[19px]" />}
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">R2: Susut Pelayaran</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                {isArrived ? (
                  <>
                    <span className={`text-base sm:text-lg font-extrabold font-mono ${diffR2 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {diffR2 > 0 ? `+${formatAngka(diffR2)}` : formatAngka(diffR2)}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold ${diffR2 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>KG</span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-muted-foreground">Menunggu Tiba</span>
                )}
              </div>
            </div>
          </div>
          {isArrived ? (
            <span className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold ${
              diffR2 >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {r2Pct > 0 ? `+${r2Pct.toFixed(2)}%` : `${r2Pct.toFixed(2)}%`}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-secondary text-muted-foreground border border-border/80">
              Pending
            </span>
          )}
        </div>

        {/* R3: SFBD vs B/L */}
        <div className={`bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between border-b-2 ${
          isArrived
            ? diffR3 >= 0 ? 'border-b-emerald-200/60 dark:border-b-emerald-900/40' : 'border-b-rose-200/60 dark:border-b-rose-900/40'
            : 'border-b-slate-200/60 dark:border-b-slate-800/40'
        }`}>
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${
              isArrived
                ? diffR3 >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-500'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {isArrived ? (diffR3 >= 0 ? <TrendingUp size={18} className="sm:w-5 sm:h-5" /> : <TrendingDown size={18} className="sm:w-5 sm:h-5" />) : <Clock size={18} className="sm:w-[19px] sm:h-[19px]" />}
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold block">R3: SFBD vs B/L</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                {isArrived ? (
                  <>
                    <span className={`text-base sm:text-lg font-extrabold font-mono ${diffR3 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {diffR3 > 0 ? `+${formatAngka(diffR3)}` : formatAngka(diffR3)}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold ${diffR3 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>KG</span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-muted-foreground">Menunggu Tiba</span>
                )}
              </div>
            </div>
          </div>
          {isArrived ? (
            <span className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold ${
              diffR3 >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {r3Pct > 0 ? `+${r3Pct.toFixed(2)}%` : `${r3Pct.toFixed(2)}%`}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-secondary text-muted-foreground border border-border/80">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* 4. Sounding Tabs & Content Card */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Tab Buttons */}
        <div className="grid grid-cols-2 border-b border-border/80 bg-secondary/30">
          <button
            onClick={() => setActiveTab('berangkat')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              activeTab === 'berangkat'
                ? 'text-primary border-primary bg-card shadow-xs'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Ship size={16} />
            <span>Keberangkatan (Asal)</span>
          </button>
          <button
            onClick={() => setActiveTab('datang')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              activeTab === 'datang'
                ? 'text-primary border-primary bg-card shadow-xs'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Ship size={16} />
            <span>Kedatangan (Tujuan)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6">
          {activeTab === 'berangkat' ? (
            palkaBerangkat.length > 0 ? (
              <Table title="Data Palka Keberangkatan" palka={palkaBerangkat} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada data palka keberangkatan.</p>
            )
          ) : (
            palkaDatang.length > 0 ? (
              <Table title="Data Palka Kedatangan" palka={palkaDatang} />
            ) : (
              <div className="text-center py-10 space-y-3">
                <Anchor size={36} className="mx-auto text-muted-foreground/40" />
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  Data sounding kedatangan belum diisi karena kapal masih dalam pelayaran ke pelabuhan tujuan.
                </p>
                {canInputKedatangan ? (
                  <Link
                    to={`/pengiriman/${id}/kedatangan`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
                  >
                    <Anchor size={15} /> <span>Input Sounding Kedatangan</span>
                  </Link>
                ) : isCreator && user?.role === 'PETUGAS' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <Info size={14} /> Menunggu input sounding kedatangan oleh Petugas Pelabuhan Tujuan
                  </div>
                ) : null}
              </div>
            )
          )}
        </div>
      </div>

      {/* 5. Info Meta Footer */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-xs">
        <div>
          <span className="text-muted-foreground block text-[11px] font-medium">Petugas Muat (SFAL)</span>
          <span className="text-foreground font-semibold block mt-1 truncate">{data.createdBy?.nama || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px] font-medium">Petugas Bongkar (SFBD)</span>
          <span className="text-foreground font-semibold block mt-1 truncate">{data.dischargedBy?.nama || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px] font-medium">Tgl Berangkat</span>
          <span className="text-foreground font-semibold block mt-1">{formatTanggal(data.tanggalBerangkat)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px] font-medium">Tgl Tiba</span>
          <span className="text-foreground font-semibold block mt-1">{data.tanggalSampai ? formatTanggal(data.tanggalSampai) : '—'}</span>
        </div>
      </div>

      {/* 6. Modal Kirim WhatsApp dengan Dukungan Template & Tulis Pesan Manual */}
      {waModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setWaModal(false); setWaTarget(''); setSelectedContactId('') }} />
          <div className="relative bg-card border border-border rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-fade-in space-y-3.5 sm:space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-green-500/15 text-green-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate">Kirim Laporan via WhatsApp</h3>
                  <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">Sesuaikan teks pesan secara manual atau gunakan template pesan tersimpan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setWaModal(false); setWaTarget(''); setSelectedContactId('') }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 ml-2 cursor-pointer"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Section 1: Pilihan Kontak & Nomor WA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-secondary/30 p-3.5 rounded-xl border border-border/80">
              {/* Kontak Tersimpan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold flex items-center gap-1.5 ${
                    Boolean(waTarget && !selectedContactId) ? 'text-muted-foreground opacity-60' : 'text-foreground'
                  }`}>
                    <Contact size={13} className="text-primary" /> Kontak Penerima:
                  </label>
                  {Boolean(waTarget && !selectedContactId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setWaTarget('')
                        setSelectedContactId('')
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Batal Manual
                    </button>
                  )}
                </div>

                {loadingContacts ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 size={13} className="animate-spin text-primary" /> Memuat kontak...
                  </div>
                ) : (
                  <CustomSelect
                    value={selectedContactId}
                    onChange={(cid) => {
                      setSelectedContactId(cid)
                      if (cid) {
                        const found = savedContacts.find(c => c.id === parseInt(cid))
                        if (found) setWaTarget(found.nomorWa)
                      } else {
                        setWaTarget('')
                      }
                    }}
                    options={savedContacts.map(c => ({
                      value: c.id.toString(),
                      label: c.nama,
                      icon: Contact,
                    }))}
                    placeholder="-- Pilih Kontak Tersimpan --"
                    icon={Contact}
                    disabled={Boolean(waTarget && !selectedContactId)}
                    searchable={savedContacts.length > 5}
                  />
                )}
              </div>

              {/* Nomor Tujuan Input Manual */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold flex items-center gap-1 ${
                    Boolean(selectedContactId) ? 'text-muted-foreground opacity-75' : 'text-foreground'
                  }`}>
                    <Phone size={12} className="text-muted-foreground" /> Nomor Tujuan WhatsApp:
                  </label>
                  {Boolean(selectedContactId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContactId('')
                        setWaTarget('')
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Ketik Mandiri
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  disabled={Boolean(selectedContactId)}
                  value={waTarget}
                  onChange={e => {
                    setWaTarget(e.target.value)
                    setSelectedContactId('')
                  }}
                  placeholder={Boolean(selectedContactId) ? 'Menggunakan kontak tersimpan' : '08123456789 atau 62812...'}
                  className={`w-full h-10 px-3 border rounded-xl text-xs sm:text-sm font-mono transition-colors ${
                    Boolean(selectedContactId)
                      ? 'bg-muted/40 border-border/70 text-muted-foreground cursor-not-allowed opacity-75 select-none'
                      : 'bg-card border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'
                  }`}
                />
              </div>
            </div>

            {/* Section 2: Pilihan Template Pesan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Bookmark size={13} className="text-primary" /> Pilih Template Teks Pesan:
                </label>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateInput(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                >
                  <Plus size={12} /> {showSaveTemplateInput ? 'Batal Simpan' : 'Simpan Teks Sebagai Template Baru'}
                </button>
              </div>

              {/* Dropdown Template */}
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={selectedTemplateId}
                    onChange={(val) => handleSelectTemplate(val)}
                    options={waTemplates.map(t => ({
                      value: t.id.toString(),
                      label: t.nama,
                    }))}
                    placeholder="-- Pilih Template Pesan --"
                    searchable={waTemplates.length > 5}
                  />
                </div>

                {selectedTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = waTemplates.find(t => t.id === parseInt(selectedTemplateId))
                      if (found) setPesanTeks(interpolateTemplate(found.isi))
                    }}
                    className="px-3.5 h-10 rounded-xl border border-border/80 bg-secondary/70 hover:bg-secondary text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer active:scale-95"
                    title="Reset teks ke format template asli"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>

              {/* Inline Form: Simpan Teks sebagai Template Baru */}
              {showSaveTemplateInput && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 animate-fade-in">
                  <div className="text-xs font-semibold text-foreground">Beri Nama Template Baru:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTemplateTitle}
                      onChange={e => setNewTemplateTitle(e.target.value)}
                      placeholder="Contoh: Format Singkat ke Manager, Laporan Khusus..."
                      className="flex-1 h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAsNewTemplate}
                      disabled={savingTemplate || !newTemplateTitle.trim()}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1"
                    >
                      {savingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Bookmark size={13} />}
                      <span>Simpan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Smart Placeholder / Variabel Dinamis Cepat */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>Sisipkan Variabel Data Kapal Cepat:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'namaKapal', label: '+ Kapal' },
                  { key: 'nomorBl', label: '+ No. B/L' },
                  { key: 'blKg', label: '+ Nilai B/L' },
                  { key: 'sfal', label: '+ SFAL (Muat)' },
                  { key: 'sfbd', label: '+ SFBD (Bongkar)' },
                  { key: 'r1Pct', label: '+ R1 %' },
                  { key: 'r2Pct', label: '+ R2 %' },
                  { key: 'r3Pct', label: '+ R3 %' },
                  { key: 'petugasMuat', label: '+ Petugas Muat' },
                  { key: 'linkPdf', label: '+ Link PDF' },
                ].map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertVariable(v.key)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary hover:bg-primary/15 text-foreground hover:text-primary border border-border/70 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Editor Teks Manual (Textarea) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Isi Pesan WhatsApp (Bebas Diedit):
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {pesanTeks.length} karakter
                </span>
              </div>
              <textarea
                rows={7}
                value={pesanTeks}
                onChange={e => setPesanTeks(e.target.value)}
                placeholder="Tulis pesan WhatsApp manual di sini..."
                className="w-full p-3 bg-card border border-border rounded-xl text-xs sm:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed transition-colors shadow-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Gunakan <code className="bg-secondary px-1 py-0.5 rounded font-mono">*teks tebal*</code> atau <code className="bg-secondary px-1 py-0.5 rounded font-mono">_teks miring_</code> untuk format WhatsApp.
              </p>
            </div>

            {/* Attach PDF Toggle Option */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="attach-pdf-checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
              />
              <label htmlFor="attach-pdf-checkbox" className="text-xs text-foreground cursor-pointer select-none">
                <span className="font-semibold block">Sertakan Lampiran File Dokumen PDF Resmi</span>
                <span className="text-muted-foreground text-[11px] block mt-0.5">
                  Lampirkan dokumen PDF resmi yang otomatis terkirim bersamaan dengan pesan di atas.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => { setWaModal(false); setWaTarget(''); setSelectedContactId('') }}
                className="px-4 py-2.5 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleKirimWA}
                disabled={waSending || !waTarget || !pesanTeks.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-green-600/20 transition-all cursor-pointer active:scale-95"
              >
                {waSending ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={15} />}
                <span>{waSending ? 'Mengirim...' : 'Kirim via WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
