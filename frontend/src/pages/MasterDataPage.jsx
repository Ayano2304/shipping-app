import { useState, useEffect } from 'react'
import { Upload, Database, Loader2, Ship } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSoundingTable, getDensityTable, getFaktorKoreksiTable, importExcel, getKapal } from '../lib/api'
import CustomSelect from '../components/ui/CustomSelect'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function MasterDataPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('sounding')
  const [soundingData, setSoundingData] = useState([])
  const [densityData, setDensityData] = useState([])
  const [faktorKoreksiData, setFaktorKoreksiData] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [kapalList, setKapalList] = useState([])
  const [selectedKapalId, setSelectedKapalId] = useState('')

  useEffect(() => {
    getKapal().then(r => setKapalList(r.data)).catch(console.error)
  }, [])

  useEffect(() => {
    loadData()
  }, [activeTab, selectedKapalId])

  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'sounding') {
        const res = await getSoundingTable({ limit: 500, kapalId: selectedKapalId })
        setSoundingData(res.data.data)
      } else if (activeTab === 'density') {
        const res = await getDensityTable({ kapalId: selectedKapalId })
        setDensityData(res.data)
      } else if (activeTab === 'faktor-koreksi') {
        const res = await getFaktorKoreksiTable()
        setFaktorKoreksiData(res.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedKapalId) {
        formData.append('kapalId', selectedKapalId)
      }

      const res = await importExcel(formData)
      const imported = res.data.imported
      toast.success(`Import berhasil! ${JSON.stringify(imported)}`)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Gagal mengimpor file Excel.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const tabs = [
    { key: 'sounding', label: 'Sounding Table' },
    { key: 'density', label: 'Density Table' },
    { key: 'faktor-koreksi', label: 'Faktor Koreksi' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data sounding, density, dan faktor koreksi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(activeTab === 'sounding' || activeTab === 'density') && (
            <div className="w-full sm:w-56">
              <CustomSelect
                value={selectedKapalId}
                onChange={(val) => setSelectedKapalId(val)}
                options={[
                  { value: '', label: 'Semua Kapal' },
                  ...kapalList.map(k => ({ value: k.id, label: k.namaKapal }))
                ]}
                placeholder="Semua Kapal"
                icon={Ship}
                searchable={kapalList.length > 5}
              />
            </div>
          )}
          <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-colors w-full sm:w-auto shadow-xs active:scale-95 ${
            uploading
              ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}>
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span className="text-sm font-medium">
              {uploading ? 'Mengunggah...' : 'Import Data Excel'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Sounding Table */}
          {activeTab === 'sounding' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nama Palka</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tinggi (cm)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Volume (L)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Beda (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {soundingData.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-2.5">{row.namaPalka}</td>
                      <td className="px-4 py-2.5">{row.tinggiCm}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{parseFloat(row.volumeLiter).toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {row.bedaLiter ? parseFloat(row.bedaLiter).toFixed(4) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {soundingData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Belum ada data. Import Excel untuk memulai.</p>
                </div>
              )}
            </div>
          )}

          {/* Density Table */}
          {activeTab === 'density' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Suhu (°C)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Density</th>
                  </tr>
                </thead>
                <tbody>
                  {densityData.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-2.5">{row.suhu}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{parseFloat(row.density).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {densityData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Belum ada data. Import Excel untuk memulai.</p>
                </div>
              )}
            </div>
          )}

          {/* Faktor Koreksi Table */}
          {activeTab === 'faktor-koreksi' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Suhu (°C)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Faktor Koreksi</th>
                  </tr>
                </thead>
                <tbody>
                  {faktorKoreksiData.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-2.5">{row.suhu}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{parseFloat(row.faktorKoreksi).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {faktorKoreksiData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Belum ada data. Import Excel untuk memulai.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
