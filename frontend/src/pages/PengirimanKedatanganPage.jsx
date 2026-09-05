import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPengirimanById, updatePengiriman, savePalkaBatch } from '../lib/api'
import { formatAngka, formatTanggal, toKg } from '../lib/calc'
import { useAuthStore } from '../store/authStore'
import PalkaTableInput from '../components/palka/PalkaTableInput'
import SummaryCard from '../components/pengiriman/SummaryCard'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'
import { Loader2, ArrowLeft, CheckCircle2, Ship, Calendar, ClipboardCheck, Info } from 'lucide-react'

const defaultRow = (name, urutan) => ({
  _id: Math.random().toString(36).slice(2),
  namaPalka: name || `Palka ${urutan}`,
  volumeLiter: '',
  density: '',
  faktorKoreksi: '1.000000',
  tinggiCm: '',
  point: '',
  suhu: '',
})

export default function PengirimanKedatanganPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tanggalSampai, setTanggalSampai] = useState(new Date().toISOString().slice(0, 10))
  const [palkaDatang, setPalkaDatang] = useState([])

  useEffect(() => {
    getPengirimanById(id)
      .then(res => {
        const d = res.data
        const datangPalkaList = d.dataPalka ? d.dataPalka.filter(p => p.tipe === 'KEDATANGAN') : []
        if (d.status === 'SELESAI' && datangPalkaList.length > 0 && user?.role !== 'ADMIN') {
          toast.error('Pengiriman ini telah selesai dan dikunci.')
          navigate(`/pengiriman/${id}`, { replace: true })
          return
        }
        if (user && !['ADMIN', 'SURVEYOR'].includes(user?.role)) {
          toast.error('Sebagai Petugas Muat, Anda tidak berwenang menginput data kedatangan. Halaman ini khusus untuk Surveyor Bongkar atau Admin.')
          navigate(`/pengiriman/${id}`, { replace: true })
          return
        }
        setData(d)
        if (d.tanggalSampai) {
          setTanggalSampai(d.tanggalSampai.slice(0, 10))
        }

        const datangExisting = d.dataPalka
          .filter(p => p.tipe === 'KEDATANGAN')
          .map(p => ({
            _id: p.id,
            namaPalka: p.namaPalka,
            volumeLiter: p.volumeLiter || '',
            density: p.density || '',
            faktorKoreksi: p.faktorKoreksi || '1.000000',
            tinggiCm: p.tinggiCm || '',
            point: p.point !== null && p.point !== undefined ? p.point : '',
            suhu: p.suhu || '',
          }))

        if (datangExisting.length > 0) {
          setPalkaDatang(datangExisting)
        } else {
          // Inisialisasi otomatis palka kedatangan sesuai nama palka keberangkatan
          const berangkatPalka = d.dataPalka.filter(p => p.tipe === 'KEBERANGKATAN')
          if (berangkatPalka.length > 0) {
            setPalkaDatang(berangkatPalka.map((p, idx) => defaultRow(p.namaPalka, idx + 1)))
          } else {
            setPalkaDatang([defaultRow('Palka 1', 1)])
          }
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Gagal memuat data pengiriman.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tanggalSampai) {
      toast.error('Tanggal kedatangan wajib diisi.')
      return
    }

    const hasValidPalka = palkaDatang.some(p => p.tinggiCm && p.suhu)
    if (!hasValidPalka) {
      toast.error('Harap isi data sounding palka kedatangan.')
      return
    }

    setSaving(true)
    try {
      // 1. Simpan palka kedatangan terlebih dahulu
      await savePalkaBatch({
        pengirimanId: id,
        tipe: 'KEDATANGAN',
        palkaList: palkaDatang.map(p => ({
          namaPalka: p.namaPalka,
          volumeLiter: p.volumeLiter || null,
          density: p.density || null,
          faktorKoreksi: p.faktorKoreksi || 1.0,
          tinggiCm: p.tinggiCm || null,
          point: p.point !== '' && p.point !== null && p.point !== undefined ? p.point : null,
          suhu: p.suhu || null,
        })),
      })

      // 2. Setelah palka sukses tersimpan, baru update status pengiriman ke SELESAI
      await updatePengiriman(id, {
        tanggalSampai: tanggalSampai,
        status: 'SELESAI',
      })

      toast.success('Data kedatangan berhasil disimpan! Pengiriman selesai.')
      navigate(`/pengiriman/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan data kedatangan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-20">Data pengiriman tidak ditemukan.</div>
  }

  const palkaBerangkat = data.dataPalka.filter(p => p.tipe === 'KEBERANGKATAN')
  const totalBerangkatKg = palkaBerangkat.reduce((s, p) => s + (parseFloat(p.beratHasil) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/pengiriman" className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Tahap 2: Pelabuhan Tujuan (Discharge)
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">
            Input Muatan Kedatangan — {data.kapal?.namaKapal}
          </h2>
          <p className="text-sm text-muted-foreground">
            Lakukan sounding saat kapal tiba di pelabuhan bongkar untuk menyelesaikan perhitungan susut.
          </p>
        </div>
      </div>

      {/* Info Kapal & Data Keberangkatan (Read-Only Reference) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Info size={16} className="text-primary" />
            Data Referensi Keberangkatan (Asal)
          </h3>
          <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-md font-mono">
            Terkunci (Read-Only)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-muted-foreground block mb-1">Nama Kapal</span>
            <span className="font-semibold text-foreground text-sm">{data.kapal?.namaKapal}</span>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-muted-foreground block mb-1">Nomor B/L</span>
            <span className="font-mono font-semibold text-foreground text-sm">{data.nomorBl || '—'}</span>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-muted-foreground block mb-1">Nilai B/L</span>
            <span className="font-mono font-semibold text-foreground text-sm">
              {data.nilaiBl ? `${formatAngka(data.nilaiBl, 0)} ${data.satuanBl || 'KG'}` : '—'}
            </span>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <span className="text-muted-foreground block mb-1">Tgl Keberangkatan</span>
            <span className="font-semibold text-foreground text-sm">{formatTanggal(data.tanggalBerangkat)}</span>
          </div>
        </div>

        {/* Tabel Ringkas Palka Keberangkatan */}
        {palkaBerangkat.length > 0 && (
          <div className="mt-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Palka Asal</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tinggi (cm)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Point</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Suhu (°C)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Volume (L)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Density</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Berat Muat (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {palkaBerangkat.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium text-foreground">{p.namaPalka}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.tinggiCm || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.point !== null ? p.point : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.suhu ? `${p.suhu}°C` : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.volumeLiter ? formatAngka(p.volumeLiter, 0) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.density ? formatAngka(p.density, 4) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">{formatAngka(p.beratHasil, 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 border-t-2 border-border font-bold">
                    <td colSpan={6} className="px-3 py-2.5 text-muted-foreground">TOTAL MUATAN ASAL</td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400 text-sm">{formatAngka(totalBerangkatKg, 0)} KG</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-2">
              {palkaBerangkat.map((p, idx) => (
                <div key={p.id || idx} className="bg-secondary/20 border border-border/70 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                    <span className="font-semibold text-foreground">{p.namaPalka}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatAngka(p.beratHasil, 0)} KG</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div className="bg-card p-1.5 rounded border border-border/40">
                      <span className="text-muted-foreground block text-[9px]">Tinggi</span>
                      <span className="font-mono">{p.tinggiCm || '—'} cm</span>
                    </div>
                    <div className="bg-card p-1.5 rounded border border-border/40">
                      <span className="text-muted-foreground block text-[9px]">Point</span>
                      <span className="font-mono">{p.point !== null ? p.point : '0'}</span>
                    </div>
                    <div className="bg-card p-1.5 rounded border border-border/40">
                      <span className="text-muted-foreground block text-[9px]">Suhu</span>
                      <span className="font-mono">{p.suhu ? `${p.suhu}°C` : '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">TOTAL MUATAN ASAL</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatAngka(totalBerangkatKg, 0)} KG</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Tanggal Kedatangan */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-3 flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Waktu Kedatangan Kapal
          </h3>
          <div className="w-full sm:max-w-[240px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Tanggal Tiba / Discharge <span className="text-red-400">*</span>
            </label>
            <DatePicker
              value={tanggalSampai}
              onChange={setTanggalSampai}
              placeholder="Pilih tanggal..."
            />
          </div>
        </div>

        {/* Tabel Sounding Kedatangan */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <PalkaTableInput
            label="Data Sounding Palka (SFBD)"
            tipe="KEDATANGAN"
            value={palkaDatang}
            onChange={setPalkaDatang}
            kapalId={data.kapalId}
          />
        </div>

        {/* Live Comparison Summary */}
        <SummaryCard
          palkaBerangkat={palkaBerangkat.map(p => ({
            volumeLiter: p.volumeLiter,
            point: p.point,
            density: p.density,
            faktorKoreksi: p.faktorKoreksi,
          }))}
          palkaDatang={palkaDatang}
          nilaiBl={data.nilaiBl}
          satuanBl={data.satuanBl}
        />

        {/* Submit */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 pb-6">
          <Link to="/pengiriman" className="w-full sm:w-auto px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary text-center transition-colors">
            Kembali
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-600/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
            {saving ? 'Menyimpan & Menghitung...' : 'Simpan & Selesaikan Pengiriman'}
          </button>
        </div>
      </form>
    </div>
  )
}
