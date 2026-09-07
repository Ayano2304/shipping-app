import { useEffect, useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import {
  getKontakWa, createKontakWa, updateKontakWa, deleteKontakWa,
  getDevicesWA, addDeviceWAAuto, addDeviceWAManual, getDeviceWAQr,
  checkDeviceWAStatus, disconnectDeviceWA, setDefaultDeviceWA, deleteDeviceWA, testDeviceWA,
  getMyDeviceWA, requestMyDeviceWAQr, checkMyDeviceWAStatus, disconnectMyDeviceWA, testMyDeviceWA,
  getWATemplates, createWATemplate, updateWATemplate, deleteWATemplate,
  getUsers
} from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import {
  Contact, Plus, Search, Pencil, Trash2, Loader2, Phone,
  Building2, Briefcase, MessageSquare, CheckCircle2, XCircle,
  X, AlertTriangle, QrCode, RefreshCw, Send, Smartphone, Star,
  UserCheck, Shield, Bookmark, Sparkles, Copy, Check, Lock
} from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function KontakWaPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  // Akses halaman hanya untuk ADMIN dan SURVEYOR
  if (user && user.role !== 'ADMIN' && user.role !== 'SURVEYOR') {
    return <Navigate to="/dashboard" replace />
  }

  // Active Tab:
  // Admin: 'pengirim' | 'penerima' | 'template'
  // Non-Admin: 'penerima' | 'my-device' | 'template'
  const [activeTab, setActiveTab] = useState(isAdmin ? 'pengirim' : 'penerima')

  // ─── TAB 1: KONTAK PENERIMA STATE ───
  const [kontakList, setKontakList] = useState([])
  const [loadingKontak, setLoadingKontak] = useState(true)
  const [searchKontak, setSearchKontak] = useState('')
  const [kontakFilter, setKontakFilter] = useState('all') // 'all' | 'mine' | 'global'
  const [modalKontakOpen, setModalKontakOpen] = useState(false)
  const [editKontakId, setEditKontakId] = useState(null)
  const [confirmDeleteKontak, setConfirmDeleteKontak] = useState(null)
  const [submittingKontak, setSubmittingKontak] = useState(false)
  const [formKontak, setFormKontak] = useState({
    nama: '', nomorWa: '', jabatan: '', instansi: '', catatan: '', aktif: true, isGlobal: false
  })

  // ─── TAB 2A: AKUN PENGIRIM (DEVICES - ADMIN VIEW) STATE ───
  const [devicesList, setDevicesList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [modalAddDevice, setModalAddDevice] = useState(false)
  const [deviceAddMode, setDeviceAddMode] = useState('auto') // 'auto' | 'manual'
  const [submittingDevice, setSubmittingDevice] = useState(false)
  const [formDevice, setFormDevice] = useState({
    nama: '', device: '', token: '', userId: '', isDefault: false, accountToken: ''
  })

  // ─── TAB 2B: WHATSAPP SAYA (NON-ADMIN / SURVEYOR VIEW) STATE ───
  const [myDevice, setMyDevice] = useState(null)
  const [loadingMyDevice, setLoadingMyDevice] = useState(true)
  const [connectingMyDevice, setConnectingMyDevice] = useState(false)
  
  // QR Modal State
  const [qrModal, setQrModal] = useState({ open: false, device: null, qrUrl: null, loading: false })
  const qrPollRef = useRef(null)

  // Test Message Modal State
  const [testModal, setTestModal] = useState({ open: false, device: null, target: '', loading: false })
  const [confirmDeleteDevice, setConfirmDeleteDevice] = useState(null)

  // ─── TAB 3: TEMPLATE PESAN STATE ───
  const [templatesList, setTemplatesList] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [modalTemplateOpen, setModalTemplateOpen] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState(null)
  const [submittingTemplate, setSubmittingTemplate] = useState(false)
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(null)
  const [formTemplate, setFormTemplate] = useState({ nama: '', isi: '' })

  // ─── DATA LOADERS ───

  const loadKontak = async () => {
    try {
      setLoadingKontak(true)
      const res = await getKontakWa({ search: searchKontak })
      setKontakList(res.data || [])
    } catch {
      toast.error('Gagal memuat kontak penerima.')
    } finally {
      setLoadingKontak(false)
    }
  }

  const loadDevices = async () => {
    try {
      setLoadingDevices(true)
      const [devRes, userRes] = await Promise.all([
        getDevicesWA(),
        getUsers()
      ])
      setDevicesList(devRes.data || [])
      setUsersList(userRes.data || [])
    } catch {
      toast.error('Gagal memuat daftar perangkat WhatsApp.')
    } finally {
      setLoadingDevices(false)
    }
  }

  const loadMyDevice = async () => {
    try {
      setLoadingMyDevice(true)
      const res = await getMyDeviceWA()
      setMyDevice(res.data?.device || null)
    } catch {
      console.warn('Gagal memuat perangkat WhatsApp saya.')
    } finally {
      setLoadingMyDevice(false)
    }
  }

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const res = await getWATemplates()
      setTemplatesList(res.data || [])
    } catch {
      toast.error('Gagal memuat template pesan.')
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadDevices()
    } else {
      loadMyDevice()
    }
    loadKontak()
    loadTemplates()
  }, [isAdmin])

  useEffect(() => {
    loadKontak()
  }, [searchKontak])

  // Cleanup QR Polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
    }
  }, [])

  // ─── TAB 1 HANDLERS (KONTAK PENERIMA) ───

  const openAddKontak = () => {
    setEditKontakId(null)
    setFormKontak({ nama: '', nomorWa: '', jabatan: '', instansi: '', catatan: '', aktif: true, isGlobal: false })
    setModalKontakOpen(true)
  }

  const openEditKontak = (k) => {
    setEditKontakId(k.id)
    setFormKontak({
      nama: k.nama, nomorWa: k.nomorWa, jabatan: k.jabatan || '',
      instansi: k.instansi || '', catatan: k.catatan || '', aktif: k.aktif,
      isGlobal: Boolean(k.isGlobal)
    })
    setModalKontakOpen(true)
  }

  // ─── TAB 2B HANDLERS (WHATSAPP SAYA - NON-ADMIN) ───

  const handleConnectMyDeviceQr = async () => {
    setConnectingMyDevice(true)
    setQrModal({ open: true, device: { nama: `WA - ${user?.nama || 'Saya'}` }, qrUrl: null, loading: true, isMyDevice: true })
    if (qrPollRef.current) clearInterval(qrPollRef.current)

    try {
      const res = await requestMyDeviceWAQr()
      if (res.data?.alreadyConnected) {
        toast.success('WhatsApp Anda sudah terhubung! 🎉')
        setQrModal({ open: false, device: null, qrUrl: null, loading: false, isMyDevice: false })
        loadMyDevice()
        return
      }
      setQrModal(prev => ({ ...prev, qrUrl: res.data.url, loading: false }))

      // Polling cek status tiap 3 detik
      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await checkMyDeviceWAStatus()
          if (statusRes.data?.connected) {
            clearInterval(qrPollRef.current)
            toast.success('WhatsApp Anda Berhasil Terhubung! 🎉')
            setQrModal({ open: false, device: null, qrUrl: null, loading: false, isMyDevice: false })
            loadMyDevice()
          }
        } catch {
          // Silent polling
        }
      }, 3000)
    } catch (err) {
      setQrModal(prev => ({ ...prev, loading: false }))
      toast.error(err.response?.data?.error || 'Gagal mengambil QR Code dari Fonnte.')
    } finally {
      setConnectingMyDevice(false)
    }
  }

  const handleDisconnectMyDevice = async () => {
    try {
      await disconnectMyDeviceWA()
      toast.success('WhatsApp berhasil diputuskan.')
      loadMyDevice()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memutuskan WhatsApp.')
    }
  }

  const handleSubmitKontak = async (e) => {
    e.preventDefault()
    if (!formKontak.nama.trim() || !formKontak.nomorWa.trim()) {
      toast.error('Nama dan nomor WhatsApp wajib diisi.')
      return
    }
    try {
      setSubmittingKontak(true)
      if (editKontakId) {
        await updateKontakWa(editKontakId, formKontak)
        toast.success('Kontak WhatsApp berhasil diperbarui!')
      } else {
        await createKontakWa(formKontak)
        toast.success('Kontak WhatsApp baru berhasil ditambahkan!')
      }
      setModalKontakOpen(false)
      loadKontak()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan kontak.')
    } finally {
      setSubmittingKontak(false)
    }
  }

  const handleDeleteKontak = async () => {
    if (!confirmDeleteKontak) return
    try {
      await deleteKontakWa(confirmDeleteKontak.id)
      toast.success(`Kontak "${confirmDeleteKontak.nama}" berhasil dihapus.`)
      setConfirmDeleteKontak(null)
      loadKontak()
    } catch {
      toast.error('Gagal menghapus kontak.')
    }
  }

  // ─── TAB 2 HANDLERS (AKUN PENGIRIM / DEVICES) ───

  const handleAddDevice = async (e) => {
    e.preventDefault()
    if (!formDevice.nama.trim()) {
      toast.error('Nama label perangkat wajib diisi.')
      return
    }

    try {
      setSubmittingDevice(true)
      let res
      if (deviceAddMode === 'auto') {
        if (!formDevice.device.trim()) {
          toast.error('Nomor HP / identifier device wajib diisi.')
          return
        }
        res = await addDeviceWAAuto({
          nama: formDevice.nama,
          device: formDevice.device,
          userId: formDevice.userId || undefined,
          isDefault: formDevice.isDefault,
          accountToken: formDevice.accountToken || undefined
        })
        toast.success(res.data.message || 'Perangkat berhasil dibuat otomatis di Fonnte!')
      } else {
        if (!formDevice.token.trim()) {
          toast.error('Token Fonnte wajib diisi.')
          return
        }
        res = await addDeviceWAManual({
          nama: formDevice.nama,
          token: formDevice.token,
          userId: formDevice.userId || undefined,
          isDefault: formDevice.isDefault
        })
        toast.success(res.data.message || 'Perangkat berhasil ditambahkan!')
      }
      setModalAddDevice(false)
      setFormDevice({ nama: '', device: '', token: '', userId: '', isDefault: false, accountToken: '' })
      await loadDevices()

      // Langsung tawarkan buka QR Scanner jika baru dibuat
      if (res?.data?.device?.id) {
        handleOpenQr(res.data.device)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambahkan perangkat.')
    } finally {
      setSubmittingDevice(false)
    }
  }

  const handleOpenQr = async (device) => {
    setQrModal({ open: true, device, qrUrl: null, loading: true })
    if (qrPollRef.current) clearInterval(qrPollRef.current)

    try {
      const res = await getDeviceWAQr(device.id)
      setQrModal(prev => ({ ...prev, qrUrl: res.data.url, loading: false }))

      // Mulai polling cek status tiap 3 detik
      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await checkDeviceWAStatus(device.id)
          if (statusRes.data?.isConnected) {
            clearInterval(qrPollRef.current)
            toast.success(`Perangkat ${device.nama} Berhasil Terhubung! 🎉`)
            setQrModal({ open: false, device: null, qrUrl: null, loading: false })
            loadDevices()
          }
        } catch {
          // Silent polling error
        }
      }, 3000)
    } catch (err) {
      setQrModal(prev => ({ ...prev, loading: false }))
      toast.error(err.response?.data?.error || 'Gagal mengambil QR Code dari Fonnte.')
    }
  }

  const handleCloseQrModal = () => {
    if (qrPollRef.current) clearInterval(qrPollRef.current)
    const wasMyDevice = qrModal.isMyDevice
    setQrModal({ open: false, device: null, qrUrl: null, loading: false, isMyDevice: false })
    if (wasMyDevice || !isAdmin) {
      loadMyDevice()
    } else {
      loadDevices()
    }
  }

  const handleCheckDeviceStatus = async (device) => {
    try {
      const res = await checkDeviceWAStatus(device.id)
      if (res.data?.isConnected) {
        toast.success(`Perangkat ${device.nama} TERHUBUNG (${res.data?.device?.nomorWa || 'Aktif'})`)
      } else {
        toast.error(`Perangkat ${device.nama} TERPUTUS / Belum di-scan.`)
      }
      loadDevices()
    } catch {
      toast.error('Gagal mengecek status perangkat.')
    }
  }

  const handleDisconnectDevice = async (device) => {
    try {
      await disconnectDeviceWA(device.id)
      toast.success(`Perangkat ${device.nama} berhasil diputuskan.`)
      loadDevices()
    } catch {
      toast.error('Gagal memutuskan perangkat.')
    }
  }

  const handleSetDefaultDevice = async (device) => {
    try {
      await setDefaultDeviceWA(device.id)
      toast.success(`Perangkat ${device.nama} dijadikan pengirim default!`)
      loadDevices()
    } catch {
      toast.error('Gagal mengatur perangkat default.')
    }
  }

  const handleDeleteDevice = async () => {
    if (!confirmDeleteDevice) return
    try {
      await deleteDeviceWA(confirmDeleteDevice.id)
      toast.success(`Perangkat ${confirmDeleteDevice.nama} berhasil dihapus.`)
      setConfirmDeleteDevice(null)
      loadDevices()
    } catch {
      toast.error('Gagal menghapus perangkat.')
    }
  }

  const handleSendTestMessage = async (e) => {
    e.preventDefault()
    if (!testModal.target.trim()) {
      toast.error('Nomor WhatsApp tujuan tes wajib diisi.')
      return
    }

    try {
      setTestModal(prev => ({ ...prev, loading: true }))
      const res = await testDeviceWA(testModal.device.id, { tujuanWa: testModal.target })
      toast.success(res.data?.message || 'Pesan tes berhasil dikirim!')
      setTestModal({ open: false, device: null, target: '', loading: false })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim pesan tes.')
      setTestModal(prev => ({ ...prev, loading: false }))
    }
  }

  // ─── TAB 3 HANDLERS (TEMPLATE PESAN) ───

  const openAddTemplate = () => {
    setEditTemplateId(null)
    setFormTemplate({ nama: '', isi: '' })
    setModalTemplateOpen(true)
  }

  const openEditTemplate = (t) => {
    setEditTemplateId(t.id)
    setFormTemplate({ nama: t.nama, isi: t.isi })
    setModalTemplateOpen(true)
  }

  const handleSubmitTemplate = async (e) => {
    e.preventDefault()
    if (!formTemplate.nama.trim() || !formTemplate.isi.trim()) {
      toast.error('Nama dan isi template wajib diisi.')
      return
    }

    try {
      setSubmittingTemplate(true)
      if (editTemplateId) {
        await updateWATemplate(editTemplateId, formTemplate)
        toast.success('Template pesan berhasil diperbarui!')
      } else {
        await createWATemplate(formTemplate)
        toast.success('Template pesan baru berhasil ditambahkan!')
      }
      setModalTemplateOpen(false)
      loadTemplates()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan template.')
    } finally {
      setSubmittingTemplate(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!confirmDeleteTemplate) return
    try {
      await deleteWATemplate(confirmDeleteTemplate.id)
      toast.success('Template pesan berhasil dihapus.')
      setConfirmDeleteTemplate(null)
      loadTemplates()
    } catch {
      toast.error('Gagal menghapus template.')
    }
  }

  const insertVariableToTemplate = (tag) => {
    setFormTemplate(prev => ({ ...prev, isi: prev.isi + tag }))
  }

  const inputCls = "w-full h-10 px-3 bg-secondary border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
  const labelCls = "block text-xs font-semibold text-foreground mb-1.5"

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 shadow-xs">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isAdmin ? 'Pusat WhatsApp (Admin)' : 'Buku Kontak & WhatsApp Saya'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin 
                  ? 'Manajemen Multi-Device Fonnte, Kontak Penerima & Template Laporan'
                  : 'Kelola kontak pribadi relasi Anda & tautkan WhatsApp mandiri'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-secondary/80 border border-border rounded-2xl shrink-0 self-start sm:self-auto shadow-xs">
          {isAdmin ? (
            <button
              onClick={() => setActiveTab('pengirim')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'pengirim'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone size={14} className={activeTab === 'pengirim' ? 'text-primary' : ''} />
              <span>Akun Pengirim</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                devicesList.some(d => d.status === 'connected')
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {devicesList.length}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('my-device')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'my-device'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone size={14} className={activeTab === 'my-device' ? 'text-primary' : ''} />
              <span>WhatsApp Saya</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                myDevice?.status === 'connected'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                {myDevice?.status === 'connected' ? 'Aktif' : 'Offline'}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('penerima')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'penerima'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Contact size={14} className={activeTab === 'penerima' ? 'text-primary' : ''} />
            <span>{isAdmin ? 'Kontak Penerima' : 'Buku Kontak Saya'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
              {kontakList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'template'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark size={14} className={activeTab === 'template' ? 'text-primary' : ''} />
            <span>Template Pesan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
              {templatesList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: AKUN PENGIRIM (MULTI-DEVICE FONNTE & SCAN QR)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'pengirim' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Bar Pengirim */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Smartphone size={16} className="text-primary" />
                <span>Perangkat WhatsApp Pengirim Laporan</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hubungkan nomor WhatsApp Admin atau Surveyor untuk mengirim notifikasi sounding & broadcast secara otomatis.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={loadDevices}
                disabled={loadingDevices}
                className="px-3 h-9 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh Daftar & Status"
              >
                <RefreshCw size={13} className={loadingDevices ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => {
                  setFormDevice({ nama: '', device: '', token: '', userId: '', isDefault: devicesList.length === 0, accountToken: '' })
                  setModalAddDevice(true)
                }}
                className="flex-1 sm:flex-none px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={15} />
                <span>Tambah WhatsApp Baru</span>
              </button>
            </div>
          </div>

          {/* List of Devices */}
          {loadingDevices ? (
            <div className="flex flex-col items-center justify-center h-48 bg-card border border-border rounded-2xl">
              <Loader2 size={28} className="animate-spin text-primary mb-2" />
              <div className="text-xs text-muted-foreground">Memuat data perangkat WhatsApp...</div>
            </div>
          ) : devicesList.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                <Smartphone size={24} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Belum Ada Perangkat WhatsApp Terdaftar</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Tambahkan akun WhatsApp pertama Anda sekarang. Anda bisa menghubungkan nomor Admin atau nomor Surveyor via Fonnte tanpa perlu membuka dashboard Fonnte.
              </p>
              <button
                onClick={() => setModalAddDevice(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Tambah WhatsApp Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devicesList.map((dev) => {
                const isConnected = dev.status === 'connected' || dev.status === 'connect'
                return (
                  <div
                    key={dev.id}
                    className={`bg-card border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                      dev.isDefault
                        ? 'border-primary/50 shadow-primary/5'
                        : 'border-border/80'
                    }`}
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            isConnected
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            <Smartphone size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-foreground leading-tight">
                                {dev.nama}
                              </h3>
                              {dev.isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/20">
                                  <Star size={10} className="fill-primary" /> Pengirim Default
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-0.5">
                              {dev.nomorWa ? `+${dev.nomorWa.replace(/\D/g, '')}` : 'Nomor belum tersinkron'}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                          isConnected
                            ? 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30'
                            : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                        }`}>
                          {isConnected ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{isConnected ? 'Terhubung' : 'Terputus'}</span>
                        </span>
                      </div>

                      {/* Detail Info User Binding */}
                      <div className="bg-secondary/60 rounded-xl p-3 text-xs space-y-1.5 border border-border/50 mb-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Ditautkan ke Petugas:</span>
                          <span className="font-semibold text-foreground">
                            {dev.user ? `${dev.user.nama} (${dev.user.role})` : 'Semua Petugas (Umum)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Device Token:</span>
                          <span className="font-mono text-[11px] text-foreground/80">
                            {dev.token ? `${dev.token.slice(0, 8)}••••••••` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenQr(dev)}
                          className="px-3 h-8.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                          title="Scan QR Code WhatsApp"
                        >
                          <QrCode size={13} />
                          <span>Scan QR</span>
                        </button>
                        <button
                          onClick={() => handleCheckDeviceStatus(dev)}
                          className="px-2.5 h-8.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cek Status Koneksi Real-time"
                        >
                          <RefreshCw size={12} />
                          <span className="hidden sm:inline">Cek</span>
                        </button>
                        <button
                          onClick={() => setTestModal({ open: true, device: dev, target: '', loading: false })}
                          className="px-2.5 h-8.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Kirim Pesan Tes"
                        >
                          <Send size={12} />
                          <span className="hidden sm:inline">Tes</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {!dev.isDefault && (
                          <button
                            onClick={() => handleSetDefaultDevice(dev)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Jadikan Pengirim Default"
                          >
                            <Star size={15} />
                          </button>
                        )}
                        {isConnected && (
                          <button
                            onClick={() => handleDisconnectDevice(dev)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Putuskan Koneksi (Disconnect)"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDeleteDevice(dev)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Hapus Perangkat"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2B: WHATSAPP SAYA (SELF-SERVICE QR KHUSUS NON-ADMIN)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'my-device' && (
        <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Koneksi WhatsApp Saya</h2>
                  <p className="text-xs text-muted-foreground">
                    Tautkan akun WhatsApp HP Anda untuk mengirim laporan perhitungan CPO secara otomatis
                  </p>
                </div>
              </div>
              <button
                onClick={loadMyDevice}
                disabled={loadingMyDevice}
                className="p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw size={14} className={loadingMyDevice ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingMyDevice ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-primary mb-2" />
                <div className="text-xs text-muted-foreground">Memeriksa status WhatsApp Anda...</div>
              </div>
            ) : myDevice?.status === 'connected' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/25 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>WhatsApp Terhubung</span>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 font-bold text-[10px]">
                          🟢 ONLINE
                        </span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        Nomor: +{myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '-'} ({myDevice.nama})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectMyDevice()}
                    className="px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Putuskan Koneksi
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" /> Siap Mengirim Laporan:
                  </div>
                  <p>
                    Setiap kali Anda menekan tombol <strong>Kirim via Bot Server</strong> di halaman pengiriman, laporan & PDF akan terkirim langsung dari nomor WhatsApp Anda.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTestModal({ open: true, device: myDevice, target: user?.kontakWa || myDevice.nomorWa || '', loading: false })}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <Send size={13} />
                    <span>Tes Kirim Pesan Uji Coba</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary/60 border border-border flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>WhatsApp Belum Terhubung</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                        🔴 OFFLINE
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tautkan akun WhatsApp Anda sekarang agar laporan muatan CPO terkirim dari nomor WhatsApp Anda sendiri ke pihak kapal, agen, dan buyer.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-border bg-card space-y-3">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <QrCode size={15} className="text-primary" />
                    <span>Langkah Menghubungkan WhatsApp:</span>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside pl-1">
                    <li>Klik tombol hijau <strong>"Scan Barcode QR Sekarang"</strong> di bawah.</li>
                    <li>Buka aplikasi WhatsApp di HP Anda.</li>
                    <li>Buka menu <strong>Perangkat Tertaut (Linked Devices)</strong> → Ketuk <strong>Tautkan Perangkat</strong>.</li>
                    <li>Arahkan kamera HP Anda ke Barcode QR yang muncul di layar ini.</li>
                  </ol>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConnectMyDeviceQr}
                      disabled={connectingMyDevice}
                      className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      {connectingMyDevice ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={15} />}
                      <span>Scan Barcode QR Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: KONTAK PENERIMA LAPORAN (TARGET BROADCAST)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'penerima' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Bar Penerima */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Contact size={16} className="text-primary" />
                <span>{isAdmin ? 'Buku Kontak Penerima Laporan' : 'Buku Kontak Relasi Saya'}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAdmin 
                  ? 'Daftar stakeholder/buyer yang akan menerima broadcast laporan sounding resmi.'
                  : 'Kontak pribadi relasi bisnis Anda yang tersimpan aman untuk pengiriman laporan.'}
              </p>
            </div>
            <button
              onClick={openAddKontak}
              className="w-full sm:w-auto px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>{isAdmin ? 'Tambah Kontak' : 'Tambah Kontak Saya'}</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchKontak}
              onChange={(e) => setSearchKontak(e.target.value)}
              placeholder="Cari nama stakeholder, instansi, jabatan, atau nomor WhatsApp..."
              className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs transition-colors"
            />
          </div>

          {/* Table of Contacts */}
          {loadingKontak ? (
            <div className="flex flex-col items-center justify-center h-48 bg-card border border-border rounded-2xl">
              <Loader2 size={28} className="animate-spin text-primary mb-2" />
              <div className="text-xs text-muted-foreground">Memuat kontak penerima...</div>
            </div>
          ) : kontakList.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                <Contact size={24} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Tidak Ada Kontak Ditemukan</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                {searchKontak ? 'Tidak ada kontak yang cocok dengan kata kunci pencarian.' : 'Tambahkan nomor WhatsApp stakeholder atau relasi bisnis Anda untuk memudahkan kirim laporan.'}
              </p>
              {!searchKontak && (
                <button
                  onClick={openAddKontak}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Plus size={14} /> Tambah Kontak Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Nama Penerima</th>
                      <th className="px-4 py-3">Nomor WhatsApp</th>
                      <th className="px-4 py-3">Jabatan & Instansi</th>
                      <th className="px-4 py-3">Catatan</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {kontakList.map((k) => {
                      const canEdit = isAdmin || k.userId === user?.id
                      return (
                        <tr key={k.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {k.nama.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{k.nama}</span>
                                  {k.isGlobal ? (
                                    <span className="px-2 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                      🏢 Kantor
                                    </span>
                                  ) : k.userId === user?.id ? (
                                    <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                      👤 Pribadi
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold text-[10px]">
                                      👤 {k.user?.nama || 'Petugas'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="text-primary shrink-0" />
                              <span>{k.nomorWa}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-foreground font-medium">{k.jabatan || '-'}</div>
                            <div className="text-[11px] text-muted-foreground">{k.instansi || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                            {k.catatan || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              k.aktif
                                ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {k.aktif ? 'Aktif' : 'Non-aktif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit ? (
                                <>
                                  <button
                                    onClick={() => openEditKontak(k)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    title="Edit Kontak"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteKontak(k)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Hapus Kontak"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                                  <Lock size={11} /> Kontak Kantor
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: TEMPLATE PESAN LAPORAN                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'template' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bookmark size={16} className="text-primary" />
                <span>Template Format Pesan WhatsApp</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sesuaikan format pesan otomatis yang dikirim saat tombol Kirim Laporan Sounding ditekan.
              </p>
            </div>
            <button
              onClick={openAddTemplate}
              className="w-full sm:w-auto px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Tambah Template Baru</span>
            </button>
          </div>

          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center h-48 bg-card border border-border rounded-2xl">
              <Loader2 size={28} className="animate-spin text-primary mb-2" />
              <div className="text-xs text-muted-foreground">Memuat template...</div>
            </div>
          ) : templatesList.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl p-6">
              <Bookmark size={24} className="text-primary mx-auto mb-2" />
              <div className="text-sm font-bold text-foreground">Belum ada template pesan</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templatesList.map((tpl) => (
                <div key={tpl.id} className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Bookmark size={14} className="text-primary" />
                        <h4 className="text-xs font-bold text-foreground">{tpl.nama}</h4>
                        {tpl.isDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditTemplate(tpl)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit Template"
                        >
                          <Pencil size={13} />
                        </button>
                        {!tpl.isDefault && (
                          <button
                            onClick={() => setConfirmDeleteTemplate(tpl)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Hapus Template"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <pre className="text-[11px] font-mono p-3 bg-secondary/50 rounded-xl whitespace-pre-wrap text-foreground/90 max-h-48 overflow-y-auto leading-relaxed">
                      {tpl.isi}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TAMBAH AKUN WHATSAPP BARU (FONNTE AUTO / MANUAL)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalAddDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Tambah Akun WhatsApp Pengirim</h3>
                  <p className="text-[11px] text-muted-foreground">Fonnte Multi-Device Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setModalAddDevice(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-secondary rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeviceAddMode('auto')}
                className={`py-1.5 rounded-lg transition-all ${
                  deviceAddMode === 'auto'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⚡ Otomatis (API Fonnte)
              </button>
              <button
                type="button"
                onClick={() => setDeviceAddMode('manual')}
                className={`py-1.5 rounded-lg transition-all ${
                  deviceAddMode === 'manual'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔑 Input Token Manual
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3">
              <div>
                <label className={labelCls}>Nama / Label Perangkat <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formDevice.nama}
                  onChange={e => setFormDevice(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Contoh: WA Kantor Pusat, WA Surveyor Dumai"
                  className={inputCls}
                />
              </div>

              {deviceAddMode === 'auto' ? (
                <>
                  <div>
                    <label className={labelCls}>Nomor HP WhatsApp <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formDevice.device}
                      onChange={e => setFormDevice(f => ({ ...f, device: e.target.value }))}
                      placeholder="Contoh: 081234567890"
                      className={inputCls}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Sistem akan membuat device baru di Fonnte secara otomatis via API.
                    </p>
                  </div>

                  <div>
                    <label className={labelCls}>Account Token Fonnte (Opsional jika sudah di .env)</label>
                    <input
                      type="text"
                      value={formDevice.accountToken}
                      onChange={e => setFormDevice(f => ({ ...f, accountToken: e.target.value }))}
                      placeholder="Kosongkan jika sudah diatur di .env server"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelCls}>Fonnte Device Token <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formDevice.token}
                    onChange={e => setFormDevice(f => ({ ...f, token: e.target.value }))}
                    placeholder="Masukkan token dari menu Device di fonnte.com"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>Tautkan ke User Spesifik (Opsional)</label>
                <select
                  value={formDevice.userId}
                  onChange={e => setFormDevice(f => ({ ...f, userId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">-- Umum (Dapat digunakan oleh semua Petugas/Surveyor) --</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nama} ({u.username} - {u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formDevice.isDefault}
                  onChange={e => setFormDevice(f => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <label htmlFor="isDefault" className="text-xs font-semibold text-foreground cursor-pointer">
                  Jadikan sebagai akun pengirim default
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalAddDevice(false)}
                  className="flex-1 h-10 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingDevice}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  {submittingDevice ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Simpan & Scan QR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SCAN QR CODE WHATSAPP                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="text-left">
                <h3 className="text-sm font-bold text-foreground">Scan QR WhatsApp</h3>
                <p className="text-xs text-muted-foreground">{qrModal.device?.nama}</p>
              </div>
              <button
                onClick={handleCloseQrModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner min-h-[250px]">
              {qrModal.loading ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-10">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <span className="text-xs font-semibold text-neutral-600">Menghubungkan ke Fonnte...</span>
                </div>
              ) : qrModal.qrUrl ? (
                <div className="space-y-2">
                  <img
                    src={qrModal.qrUrl.startsWith('data:') ? qrModal.qrUrl : `data:image/png;base64,${qrModal.qrUrl}`}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain rounded-lg mx-auto"
                  />
                  <div className="text-[11px] font-semibold text-neutral-500">
                    Memantau koneksi otomatis... (polling)
                  </div>
                </div>
              ) : (
                <div className="py-8 text-neutral-500 text-xs">
                  Gagal memuat QR Code. Silakan klik tombol Segarkan di bawah.
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Langkah Scan di HP:</p>
              <p>1. Buka WhatsApp di HP Anda</p>
              <p>2. Pilih menu <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong></p>
              <p>3. Arahkan kamera HP ke QR Code di atas</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (qrModal.isMyDevice || !isAdmin) {
                    handleConnectMyDeviceQr()
                  } else {
                    handleOpenQr(qrModal.device)
                  }
                }}
                className="flex-1 h-9 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={qrModal.loading ? 'animate-spin' : ''} />
                <span>Segarkan QR</span>
              </button>
              <button
                type="button"
                onClick={handleCloseQrModal}
                className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TES KIRIM PESAN                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {testModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground">Kirim Pesan Tes</h3>
                <p className="text-[11px] text-muted-foreground">Dari: {testModal.device?.nama}</p>
              </div>
              <button
                onClick={() => setTestModal({ open: false, device: null, target: '', loading: false })}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-3">
              <div>
                <label className={labelCls}>Nomor WhatsApp Tujuan</label>
                <input
                  type="text"
                  required
                  value={testModal.target}
                  onChange={e => setTestModal(m => ({ ...m, target: e.target.value }))}
                  placeholder="Contoh: 081234567890"
                  className={inputCls}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModal({ open: false, device: null, target: '', loading: false })}
                  className="flex-1 h-9 rounded-xl border border-border bg-secondary text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={testModal.loading}
                  className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  {testModal.loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Kirim Tes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TAMBAH / EDIT KONTAK PENERIMA                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalKontakOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editKontakId ? 'Edit Kontak Penerima' : 'Tambah Kontak Penerima Baru'}
              </h3>
              <button
                onClick={() => setModalKontakOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitKontak} className="space-y-3">
              <div>
                <label className={labelCls}>Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formKontak.nama}
                  onChange={e => setFormKontak(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Contoh: Bpk. Hendra Gunawan"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Nomor WhatsApp <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formKontak.nomorWa}
                  onChange={e => setFormKontak(f => ({ ...f, nomorWa: e.target.value }))}
                  placeholder="Contoh: 08123456789 atau 62812..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Jabatan</label>
                  <input
                    type="text"
                    value={formKontak.jabatan}
                    onChange={e => setFormKontak(f => ({ ...f, jabatan: e.target.value }))}
                    placeholder="Contoh: Direktur Ops"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Instansi / Perusahaan</label>
                  <input
                    type="text"
                    value={formKontak.instansi}
                    onChange={e => setFormKontak(f => ({ ...f, instansi: e.target.value }))}
                    placeholder="Contoh: PT Sawit Jaya"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formKontak.catatan}
                  onChange={e => setFormKontak(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Catatan opsional..."
                  className="w-full p-2.5 bg-secondary border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Checkbox status hanya muncul saat edit kontak. Saat tambah kontak baru, otomatis aktif */}
              {editKontakId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="aktifKontak"
                    checked={formKontak.aktif}
                    onChange={e => setFormKontak(f => ({ ...f, aktif: e.target.checked }))}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="aktifKontak" className="text-xs font-semibold text-foreground cursor-pointer">
                    Kontak Aktif (Dapat dipilih untuk pengiriman laporan)
                  </label>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <input
                    type="checkbox"
                    id="isGlobalKontak"
                    checked={formKontak.isGlobal}
                    onChange={e => setFormKontak(f => ({ ...f, isGlobal: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded border-border"
                  />
                  <label htmlFor="isGlobalKontak" className="text-xs font-semibold text-foreground cursor-pointer">
                    🏢 Jadikan Kontak Umum Kantor (Tampil untuk semua surveyor)
                  </label>
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalKontakOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingKontak}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  {submittingKontak ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editKontakId ? 'Simpan Perubahan' : 'Tambah Kontak'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TAMBAH / EDIT TEMPLATE PESAN                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editTemplateId ? 'Edit Template Pesan' : 'Tambah Template Baru'}
              </h3>
              <button
                onClick={() => setModalTemplateOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitTemplate} className="space-y-3">
              <div>
                <label className={labelCls}>Nama Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formTemplate.nama}
                  onChange={e => setFormTemplate(t => ({ ...t, nama: e.target.value }))}
                  placeholder="Contoh: Format Ringkas Owner, Laporan Khusus Buyer"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Variabel Cepat (Klik untuk menyisipkan):</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    '{namaKapal}', '{nomorBl}', '{blKg}', '{sfal}', '{sfbd}',
                    '{r1Diff}', '{r1Pct}', '{r2Diff}', '{r2Pct}', '{r3Diff}', '{r3Pct}',
                    '{petugasMuat}', '{petugasBongkar}', '{linkPdf}'
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariableToTemplate(tag)}
                      className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-primary/15 text-foreground hover:text-primary text-[10px] font-mono border border-border transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <label className={labelCls}>Isi Pesan WhatsApp <span className="text-red-500">*</span></label>
                <textarea
                  rows={8}
                  required
                  value={formTemplate.isi}
                  onChange={e => setFormTemplate(t => ({ ...t, isi: e.target.value }))}
                  placeholder="Tulis susunan teks laporan WhatsApp..."
                  className="w-full p-3 bg-secondary border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalTemplateOpen(false)}
                  className="flex-1 h-9 rounded-xl border border-border bg-secondary text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTemplate}
                  className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                >
                  {submittingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Simpan Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialogs */}
      <ConfirmDialog
        open={Boolean(confirmDeleteDevice)}
        onClose={() => setConfirmDeleteDevice(null)}
        onConfirm={handleDeleteDevice}
        title="Hapus Perangkat WhatsApp"
        message={`Apakah Anda yakin ingin menghapus perangkat "${confirmDeleteDevice?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Perangkat"
        variant="danger"
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteKontak)}
        onClose={() => setConfirmDeleteKontak(null)}
        onConfirm={handleDeleteKontak}
        title="Hapus Kontak Penerima"
        message={`Apakah Anda yakin ingin menghapus kontak "${confirmDeleteKontak?.nama}"?`}
        confirmText="Hapus Kontak"
        variant="danger"
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteTemplate)}
        onClose={() => setConfirmDeleteTemplate(null)}
        onConfirm={handleDeleteTemplate}
        title="Hapus Template Pesan"
        message={`Apakah Anda yakin ingin menghapus template "${confirmDeleteTemplate?.nama}"?`}
        confirmText="Hapus Template"
        variant="danger"
      />
    </div>
  )
}
