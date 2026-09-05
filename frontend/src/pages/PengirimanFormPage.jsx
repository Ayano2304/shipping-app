import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getKapal, createPengiriman, updatePengiriman, getPengirimanById, savePalkaBatch } from '../lib/api'
import CustomSelect from '../components/ui/CustomSelect'
import DatePicker from '../components/ui/DatePicker'
import { hitungTotalBerat, formatAngka, toKg, formatRibuan, parseRibuan } from '../lib/calc'
import PalkaTableInput from '../components/palka/PalkaTableInput'
import toast from 'react-hot-toast'
import { Loader2, Save, ArrowLeft, Send, Ship } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const defaultRow = (n) => ({
  _id: Math.random().toString(36).slice(2),
  namaPalka: `Palka ${n}`,
  volumeLiter: '',
  density: '',
  faktorKoreksi: '1.000000',
  tinggiCm: '',
  point: '',
  suhu: '',
})

export default function PengirimanFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isEdit = Boolean(id)

  const [kapalList, setKapalList] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    kapalId: '',
    tanggalBerangkat: new Date().toISOString().slice(0, 10),
    nomorBl: '',
    nilaiBl: '',
    satuanBl: 'KG',
  })
  const [palkaBerangkat, setPalkaBerangkat] = useState([defaultRow(1)])

  useEffect(() => {
    if (user && !['ADMIN', 'PETUGAS'].includes(user?.role)) {
      toast.error('Sebagai Surveyor Bongkar, Anda tidak berwenang membuat atau mengedit data keberangkatan.')
      navigate('/pengiriman', { replace: true })
      return
    }
    getKapal().then(r => setKapalList(r.data)).catch(console.error)
    if (isEdit) {
      setLoading(true)
      getPengirimanById(id).then(r => {
        const d = r.data
        if (d.status === 'SELESAI' && user?.role !== 'ADMIN') {
          toast.error('Pengiriman yang sudah selesai tidak dapat diubah.')
          navigate(`/pengiriman/${id}`, { replace: true })
          return
        }
        setForm({
          kapalId: d.kapalId,
          tanggalBerangkat: d.tanggalBerangkat?.slice(0, 10) || '',
          nomorBl: d.nomorBl || '',
          nilaiBl: d.nilaiBl || '',
          satuanBl: d.satuanBl || 'MT',
        })
        const toFormRow = (p) => ({
          _id: p.id,
          namaPalka: p.namaPalka,
          volumeLiter: p.volumeLiter || '',
          density: p.density || '',
          faktorKoreksi: p.faktorKoreksi || '1.000000',
          tinggiCm: p.tinggiCm || '',
          point: p.point !== null && p.point !== undefined ? p.point : '',
          suhu: p.suhu || '',
        })
        const berangkat = d.dataPalka.filter(p => p.tipe === 'KEBERANGKATAN').map(toFormRow)
        if (berangkat.length) setPalkaBerangkat(berangkat)
      }).catch(console.error).finally(() => setLoading(false))
    }
  }, [id])

  const handleSave = async (targetStatus = 'DALAM_PERJALANAN') => {
    if (!form.kapalId) {
      toast.error('Pilih kapal terlebih dahulu.')
      return
    }

    // Validasi data sounding jika mau diberangkatkan
    if (targetStatus === 'DALAM_PERJALANAN') {
      const validPalka = palkaBerangkat.some(p => p.tinggiCm && p.suhu)
      if (!validPalka) {
        toast.error('Harap isi data sounding palka sebelum memberangkatkan kapal.')
        return
      }
    }

    setSaving(true)
    try {
      let pengirimanId
      const payload = {
        ...form,
        status: targetStatus,
      }

      if (isEdit) {
        await updatePengiriman(id, payload)
        pengirimanId = id
      } else {
        const res = await createPengiriman(payload)
        pengirimanId = res.data.id
      }

      // Simpan palka keberangkatan
      await savePalkaBatch({
        pengirimanId,
        tipe: 'KEBERANGKATAN',
        palkaList: palkaBerangkat.map(p => ({
          namaPalka: p.namaPalka,
          volumeLiter: p.volumeLiter || null,
          density: p.density || null,
          faktorKoreksi: p.faktorKoreksi || 1.0,
          tinggiCm: p.tinggiCm || null,
          point: p.point !== '' && p.point !== null && p.point !== undefined ? p.point : null,
          suhu: p.suhu || null,
        })),
      })

      if (targetStatus === 'DALAM_PERJALANAN') {
        toast.success('Data Muatan Berhasil Di Input (Status : Kapal Berlayar)')
      } else {
        toast.success('Draft keberangkatan berhasil disimpan!')
      }

      navigate(`/pengiriman/${pengirimanId}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5"

  const totalBerangkatKg = hitungTotalBerat(palkaBerangkat)
  const blKg = toKg(form.nilaiBl, form.satuanBl)
  const selisihBlAwal = blKg > 0 ? (totalBerangkatKg - blKg) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/pengiriman" className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Tahap 1: Pelabuhan Asal
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">
            {isEdit ? 'Edit Muatan Keberangkatan' : 'Input Muatan Keberangkatan (Loading)'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Isi data kapal, B/L, dan sounding palka di pelabuhan muat sebelum kapal diberangkatkan.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informasi Pengiriman & B/L */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-3 flex items-center gap-2">
            <Ship size={16} className="text-primary" />
            Informasi Kapal & Bill of Lading (B/L)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className={labelCls}>Kapal <span className="text-red-400">*</span></label>
              <CustomSelect
                value={form.kapalId}
                onChange={(val) => setForm(f => ({ ...f, kapalId: val }))}
                options={kapalList.map(k => ({ value: k.id, label: k.namaKapal }))}
                placeholder="-- Pilih Kapal --"
                icon={Ship}
                searchable={kapalList.length > 4}
              />
            </div>
            <div>
              <label className={labelCls}>Tanggal Keberangkatan <span className="text-red-400">*</span></label>
              <DatePicker
                value={form.tanggalBerangkat}
                onChange={(val) => setForm(f => ({ ...f, tanggalBerangkat: val }))}
                placeholder="Pilih tanggal keberangkatan..."
              />
            </div>
            <div>
              <label className={labelCls}>Nomor B/L</label>
              <input
                type="text"
                value={form.nomorBl}
                onChange={e => setForm(f => ({ ...f, nomorBl: e.target.value }))}
                placeholder="contoh: BL/2024/001"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nilai B/L (KG)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(form.nilaiBl)}
                  onChange={e => {
                    const raw = parseRibuan(e.target.value)
                    setForm(f => ({ ...f, nilaiBl: raw }))
                  }}
                  placeholder="contoh: 45.000"
                  className="w-full h-10 pl-3 pr-14 bg-secondary/50 border border-border/80 rounded-xl text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-lg pointer-events-none">
                  KG
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Sounding Keberangkatan */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <PalkaTableInput
            label="Data Sounding Palka (SFAL)"
            tipe="KEBERANGKATAN"
            value={palkaBerangkat}
            onChange={setPalkaBerangkat}
            kapalId={form.kapalId}
          />
        </div>

        {/* Ringkasan Awal Keberangkatan */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xs">
          <div className="bg-secondary/30 p-3 rounded-xl">
            <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">Total Sounding Asal</span>
            <span className="text-base sm:text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
              {formatAngka(totalBerangkatKg, 0)} KG
            </span>
          </div>
          <div className="bg-secondary/30 p-3 rounded-xl">
            <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">Nilai Bill of Lading (B/L)</span>
            <span className="text-base sm:text-lg font-mono font-extrabold text-foreground mt-0.5 block">
              {form.nilaiBl ? `${formatAngka(form.nilaiBl, 0)} KG` : '—'}
            </span>
          </div>
          <div className="bg-secondary/30 p-3 rounded-xl">
            <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">Selisih Sounding vs B/L</span>
            <span className={`text-base sm:text-lg font-mono font-extrabold mt-0.5 block ${selisihBlAwal === null ? 'text-muted-foreground' : selisihBlAwal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {selisihBlAwal !== null ? `${selisihBlAwal >= 0 ? '+' : ''}${formatAngka(selisihBlAwal, 0)} KG` : '—'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 pb-6">
          <Link to="/pengiriman" className="w-full sm:w-auto px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary text-center transition-colors">
            Batal
          </Link>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('DRAFT')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border bg-secondary/60 hover:bg-secondary text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={15} /> Simpan Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('DALAM_PERJALANAN')}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              {saving ? 'Memproses...' : 'Simpan & Berangkatkan Kapal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
