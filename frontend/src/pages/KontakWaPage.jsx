import { useEffect, useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import {
  getKontakWa, createKontakWa, updateKontakWa, deleteKontakWa,
  getDevicesWA, addDeviceWAAuto, addDeviceWAManual, getDeviceWAQr,
  checkDeviceWAStatus, disconnectDeviceWA, setDefaultDeviceWA, toggleDeviceIzinKirim, deleteDeviceWA, testDeviceWA,
  getBlacklistWA, addBlacklistWA, deleteBlacklistWA,
  getMyDeviceWA, requestMyDeviceWAQr, checkMyDeviceWAStatus, disconnectMyDeviceWA, testMyDeviceWA,
  ajukanSinkronisasiWA, getPengajuanAktivasiWA, approvePengajuanAktivasiWA, rejectPengajuanAktivasiWA,
  getWATemplates, createWATemplate, updateWATemplate, deleteWATemplate,
  getUsers
} from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import {
  Contact, Plus, Search, Pencil, Trash2, Loader2, Phone,
  Building2, Briefcase, MessageSquare, CheckCircle2, XCircle,
  X, AlertTriangle, QrCode, RefreshCw, Send, Smartphone, Star,
  UserCheck, Shield, Bookmark, Sparkles, Copy, Check, Lock, Hash,
  Ban, ShieldAlert, ShieldOff, Clock, Info, CheckCircle,
  User, Bot, Key, MoreVertical, ChevronDown, ChevronRight, ShieldCheck, RotateCw
} from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

function RobotMascot() {
  return (
    <div className="relative flex items-center justify-center select-none shrink-0 py-1">
      {/* Background Dot Matrix */}
      <div className="absolute left-1 top-4 grid grid-cols-4 gap-2 opacity-30 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        ))}
      </div>

      {/* Halo & 3D Robot Mascot */}
      <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-emerald-100/50 dark:bg-emerald-950/25 flex items-center justify-center relative">
        <svg
          viewBox="0 0 160 160"
          className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-sm overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="robotHeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="robotGreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
            <linearGradient id="robotShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="robotShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity="0.1" />
            </filter>
            <filter id="shieldGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#059669" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Top Antenna */}
          <rect x="78" y="24" width="4" height="12" rx="2" fill="#94A3B8" />
          <circle cx="80" cy="20" r="6.5" fill="url(#robotGreenGrad)" />

          {/* Left Ear */}
          <rect x="35" y="55" width="9" height="24" rx="4.5" fill="url(#robotGreenGrad)" />
          {/* Right Ear */}
          <rect x="116" y="55" width="9" height="24" rx="4.5" fill="url(#robotGreenGrad)" />

          {/* Robot Head */}
          <rect
            x="41"
            y="34"
            width="78"
            height="68"
            rx="28"
            fill="url(#robotHeadGrad)"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            filter="url(#robotShadow)"
          />

          {/* Visor Screen */}
          <rect
            x="50"
            y="49"
            width="60"
            height="36"
            rx="15"
            fill="#0F172A"
          />

          {/* Visor Reflection */}
          <path
            d="M58 53 Q80 48 102 53"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />

          {/* Glowing Eyes */}
          <rect x="62" y="62" width="11" height="7" rx="3.5" fill="#22C55E" />
          <rect x="87" y="62" width="11" height="7" rx="3.5" fill="#22C55E" />

          {/* Big Green Shield Checkmark Badge */}
          <g filter="url(#shieldGlow)">
            <circle cx="120" cy="100" r="23" fill="url(#robotShieldGrad)" stroke="#FFFFFF" strokeWidth="3" />
            <path
              d="M111 100 L117 106 L129 93"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    </div>
  )
}

export default function KontakWaPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  // Active Tab:
  // Admin: 'pengirim' | 'penerima' | 'template'
  // Non-Admin: 'penerima' | 'my-device' | 'template'
  const [activeTab, setActiveTab] = useState(isAdmin ? 'pengirim' : 'penerima')

  useEffect(() => {
    if (isAdmin && activeTab === 'penerima') {
      setActiveTab('pengirim')
    }
  }, [isAdmin])

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

  // ─── BLACKLIST WHATSAPP STATE (ADMIN VIEW) ───
  const [blacklistList, setBlacklistList] = useState([])
  const [loadingBlacklist, setLoadingBlacklist] = useState(false)
  const [modalBlacklistOpen, setModalBlacklistOpen] = useState(false)
  const [formBlacklist, setFormBlacklist] = useState({ nomorWa: '', alasan: '' })
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false)
  const [confirmDeleteBlacklist, setConfirmDeleteBlacklist] = useState(null)
  const [confirmBlacklistDevice, setConfirmBlacklistDevice] = useState(null)

  // ─── PENGAJUAN AKTIVASI WHATSAPP STATE (ADMIN VIEW) ───
  const [pengajuanList, setPengajuanList] = useState([])
  const [loadingPengajuan, setLoadingPengajuan] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const [rejectModal, setRejectModal] = useState({ open: false, device: null, alasan: '', loading: false })

  // ─── TAB 2B: WHATSAPP SAYA (NON-ADMIN / SURVEYOR VIEW) STATE ───
  const [myDevice, setMyDevice] = useState(null)
  const [loadingMyDevice, setLoadingMyDevice] = useState(true)
  const [connectingMyDevice, setConnectingMyDevice] = useState(false)
  const [submittingPengajuan, setSubmittingPengajuan] = useState(false)
  const [showEditPhone, setShowEditPhone] = useState(false)
  const [inputPhone, setInputPhone] = useState(user?.kontakWa || '')
  
  // QR & Pairing Code Modal State
  const [connectMethod, setConnectMethod] = useState('code') // 'code' | 'qr'
  const [qrModal, setQrModal] = useState({
    open: false,
    device: null,
    type: 'code',
    qrUrl: null,
    code: null,
    loading: false,
    isMyDevice: false,
    copied: false
  })
  const qrPollRef = useRef(null)

  // Test Message Modal State
  const [testModal, setTestModal] = useState({ open: false, device: null, target: '', loading: false })
  const [confirmDeleteDevice, setConfirmDeleteDevice] = useState(null)
  const [confirmResetDevice, setConfirmResetDevice] = useState(null)
  const [copiedTokenId, setCopiedTokenId] = useState(null)
  const [cardMenuOpenId, setCardMenuOpenId] = useState(null)

  const handleCopyToken = (dev) => {
    if (!dev?.token) {
      toast.error('Token tidak tersedia.')
      return
    }
    navigator.clipboard.writeText(dev.token)
    setCopiedTokenId(dev.id)
    toast.success('Device Token berhasil disalin!')
    setTimeout(() => {
      setCopiedTokenId(prev => (prev === dev.id ? null : prev))
    }, 2000)
  }

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

  const loadPengajuan = async () => {
    if (!isAdmin) return
    try {
      setLoadingPengajuan(true)
      const res = await getPengajuanAktivasiWA()
      setPengajuanList(res.data || [])
    } catch (err) {
      console.warn('Gagal memuat pengajuan aktivasi WA:', err)
    } finally {
      setLoadingPengajuan(false)
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
      if (isAdmin) loadPengajuan()
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
      const dev = res.data?.device || null
      setMyDevice(dev)
      if (dev?.nomorWa && !inputPhone) {
        setInputPhone(dev.nomorWa.replace(/\D/g, ''))
      }
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

  const loadBlacklist = async () => {
    if (!isAdmin) return
    try {
      setLoadingBlacklist(true)
      const res = await getBlacklistWA()
      setBlacklistList(res.data || [])
    } catch {
      // silent
    } finally {
      setLoadingBlacklist(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadDevices()
      loadBlacklist()
      loadPengajuan()
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

  // Surveyor: Simpan & Ajukan Sinkronisasi WhatsApp ke Administrator
  const handleAjukanSinkronisasi = async (e) => {
    if (e) e.preventDefault()
    const cleanPhone = (inputPhone || '').replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 9) {
      toast.error('Silakan masukkan nomor WhatsApp yang valid (minimal 9 digit).')
      return
    }

    try {
      setSubmittingPengajuan(true)
      const res = await ajukanSinkronisasiWA({ nomorWa: cleanPhone })
      toast.success(res.data?.message || 'Nomor berhasil disimpan dan diajukan ke Administrator!')
      setMyDevice(res.data?.device)
      setShowEditPhone(false)
      loadMyDevice()
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal mengajukan sinkronisasi WhatsApp.'
      toast.error(msg)
    } finally {
      setSubmittingPengajuan(false)
    }
  }

  // Admin: Setujui Pengajuan Aktivasi WhatsApp (Setelah Upgrade Paket di Fonnte)
  const handleApprovePengajuan = async (device) => {
    try {
      setApprovingId(device.id)
      const res = await approvePengajuanAktivasiWA(device.id)
      toast.success(res.data?.message || 'Pengajuan aktivasi berhasil disetujui! Notifikasi telah dikirim ke Surveyor.')
      await Promise.all([loadPengajuan(), loadDevices()])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyetujui pengajuan.')
    } finally {
      setApprovingId(null)
    }
  }

  // Admin: Tolak Pengajuan Aktivasi WhatsApp
  const handleRejectPengajuan = async () => {
    if (!rejectModal.device) return
    try {
      setRejectModal(prev => ({ ...prev, loading: true }))
      const res = await rejectPengajuanAktivasiWA(rejectModal.device.id, { alasan: rejectModal.alasan })
      toast.success(res.data?.message || 'Pengajuan aktivasi berhasil ditolak.')
      setRejectModal({ open: false, device: null, alasan: '', loading: false })
      await Promise.all([loadPengajuan(), loadDevices()])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menolak pengajuan.')
      setRejectModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConnectMyDevice = async (phoneArg, typeArg) => {
    const target = phoneArg !== undefined ? phoneArg : inputPhone
    const method = typeArg || connectMethod || 'code'
    if (!target || !target.trim() || target.trim().replace(/\D/g, '').length < 9) {
      toast.error('Silakan masukkan nomor WhatsApp Anda terlebih dahulu (min 9 digit).')
      return
    }

    setConnectingMyDevice(true)
    setQrModal({
      open: true,
      device: { nama: `WA - ${user?.nama || 'Saya'}`, nomorWa: target.trim() },
      type: method,
      qrUrl: null,
      code: null,
      loading: true,
      isMyDevice: true,
      copied: false
    })
    if (qrPollRef.current) clearInterval(qrPollRef.current)

    try {
      const res = await requestMyDeviceWAQr({ nomorWa: target.trim(), type: method })
      if (res.data?.alreadyConnected) {
        toast.success('WhatsApp Anda sudah terhubung! 🎉')
        setQrModal({ open: false, device: null, type: 'code', qrUrl: null, code: null, loading: false, isMyDevice: false, copied: false })
        loadMyDevice()
        return
      }
      setQrModal(prev => ({
        ...prev,
        type: res.data.type || method,
        qrUrl: res.data.url,
        code: res.data.code,
        loading: false
      }))

      // Polling cek status tiap 3 detik
      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await checkMyDeviceWAStatus()
          if (statusRes.data?.connected) {
            clearInterval(qrPollRef.current)
            toast.success('WhatsApp Anda Berhasil Terhubung! 🎉')
            setQrModal({ open: false, device: null, type: 'code', qrUrl: null, code: null, loading: false, isMyDevice: false, copied: false })
            loadMyDevice()
          }
        } catch {
          // Silent polling
        }
      }, 3000)
    } catch (err) {
      setQrModal({ open: false, device: null, type: 'code', qrUrl: null, code: null, loading: false, isMyDevice: false, copied: false })
      toast.error(err.response?.data?.error || 'Gagal menghasilkan kode / QR dari Fonnte.')
    } finally {
      setConnectingMyDevice(false)
    }
  }

  const handleConnectMyDeviceQr = (phoneArg) => handleConnectMyDevice(phoneArg, 'qr')

  const handleCopyPairingCode = () => {
    if (!qrModal.code) return
    navigator.clipboard.writeText(qrModal.code)
    setQrModal(prev => ({ ...prev, copied: true }))
    toast.success('Kode pairing WhatsApp berhasil disalin!')
    setTimeout(() => {
      setQrModal(prev => ({ ...prev, copied: false }))
    }, 2500)
  }

  const handleSwitchConnectMethod = (newMethod) => {
    if (qrModal.loading) return
    if (qrModal.isMyDevice || !isAdmin) {
      handleConnectMyDevice(inputPhone, newMethod)
    } else if (qrModal.device) {
      handleOpenQr(qrModal.device, newMethod)
    }
  }

  const handleDisconnectMyDevice = async () => {
    try {
      await disconnectMyDeviceWA()
      toast.success('WhatsApp berhasil diputuskan.')
      setMyDevice(null)
      setShowEditPhone(false)
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

  const handleOpenQr = async (device, typeArg = 'code') => {
    setQrModal({
      open: true,
      device,
      type: typeArg,
      qrUrl: null,
      code: null,
      loading: true,
      isMyDevice: false,
      copied: false
    })
    if (qrPollRef.current) clearInterval(qrPollRef.current)

    try {
      const res = await getDeviceWAQr(device.id, { type: typeArg })
      setQrModal(prev => ({
        ...prev,
        type: res.data.type || typeArg,
        qrUrl: res.data.url,
        code: res.data.code,
        loading: false
      }))

      // Mulai polling cek status tiap 3 detik
      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await checkDeviceWAStatus(device.id)
          if (statusRes.data?.isConnected) {
            clearInterval(qrPollRef.current)
            toast.success(`Perangkat ${device.nama} Berhasil Terhubung! 🎉`)
            setQrModal({ open: false, device: null, type: 'code', qrUrl: null, code: null, loading: false, isMyDevice: false, copied: false })
            loadDevices()
          }
        } catch {
          // Silent polling error
        }
      }, 3000)
    } catch (err) {
      setQrModal(prev => ({ ...prev, loading: false }))
      toast.error(err.response?.data?.error || 'Gagal menghasilkan kode / QR dari Fonnte.')
    }
  }

  const handleCloseQrModal = () => {
    if (qrPollRef.current) clearInterval(qrPollRef.current)
    const wasMyDevice = qrModal.isMyDevice
    setQrModal({ open: false, device: null, type: 'code', qrUrl: null, code: null, loading: false, isMyDevice: false, copied: false })
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

  const handleToggleIzinKirim = async (device) => {
    try {
      const res = await toggleDeviceIzinKirim(device.id)
      toast.success(res.data?.message || 'Status izin kirim berhasil diperbarui!')
      loadDevices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengubah status izin kirim.')
    }
  }

  const handleAddBlacklist = async (e) => {
    e?.preventDefault()
    if (!formBlacklist.nomorWa.trim()) {
      toast.error('Nomor WhatsApp wajib diisi.')
      return
    }

    try {
      setSubmittingBlacklist(true)
      const res = await addBlacklistWA(formBlacklist)
      toast.success(res.data?.message || 'Nomor berhasil dimasukkan ke daftar blokir!')
      setFormBlacklist({ nomorWa: '', alasan: '' })
      loadBlacklist()
      loadDevices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memblokir nomor.')
    } finally {
      setSubmittingBlacklist(false)
    }
  }

  const handleDeleteBlacklist = async () => {
    if (!confirmDeleteBlacklist) return
    try {
      await deleteBlacklistWA(confirmDeleteBlacklist.id)
      toast.success('Nomor berhasil dihapus dari daftar blokir.')
      setConfirmDeleteBlacklist(null)
      loadBlacklist()
    } catch {
      toast.error('Gagal menghapus nomor dari daftar blokir.')
    }
  }

  const handleQuickBlacklist = async () => {
    if (!confirmBlacklistDevice) return
    try {
      await addBlacklistWA({
        nomorWa: confirmBlacklistDevice.nomorWa,
        alasan: `Diblokir Admin dari akun "${confirmBlacklistDevice.nama}"`
      })
      toast.success(`Nomor ${confirmBlacklistDevice.nomorWa} berhasil diblokir dan koneksinya diputus.`)
      setConfirmBlacklistDevice(null)
      loadBlacklist()
      loadDevices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memblokir nomor perangkat.')
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

  // Filter akun WhatsApp pengirim yang aktif saja
  const activeDevices = devicesList.filter(d => d.status === 'connected' || d.status === 'connect')

  // Akses halaman hanya untuk ADMIN dan SURVEYOR
  if (user && user.role !== 'ADMIN' && user.role !== 'SURVEYOR') {
    return <Navigate to="/dashboard" replace />
  }

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
                  : 'Kelola Kontak Pribadi Anda & Tautkan Whatsapp Secara Mandiri'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-secondary/80 border border-border rounded-2xl shrink-0 self-start sm:self-auto shadow-xs overflow-x-auto max-w-full scrollbar-none">
          {isAdmin ? (
            <button
              onClick={() => setActiveTab('pengirim')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'pengirim'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone size={14} className={activeTab === 'pengirim' ? 'text-primary' : ''} />
              <span>Akun Pengirim</span>
              {pengajuanList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse" title={`${pengajuanList.length} Pengajuan Aktivasi Baru`}>
                  {pengajuanList.length} Baru
                </span>
              )}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeDevices.length > 0
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {activeDevices.length}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('my-device')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
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
                  : myDevice?.statusAktivasi === 'MENUNGGU_AKTIVASI'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : myDevice?.statusAktivasi === 'DISETUJUI'
                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {myDevice?.status === 'connected'
                  ? 'Aktif'
                  : myDevice?.statusAktivasi === 'MENUNGGU_AKTIVASI'
                  ? 'Menunggu'
                  : myDevice?.statusAktivasi === 'DISETUJUI'
                  ? 'Siap Scan'
                  : 'Belum Konek'}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('penerima')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
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
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => {
                  loadDevices()
                  loadPengajuan()
                }}
                disabled={loadingDevices || loadingPengajuan}
                className="px-3.5 h-9 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh Daftar & Status Pengajuan"
              >
                <RefreshCw size={13} className={loadingDevices || loadingPengajuan ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  loadBlacklist()
                  setModalBlacklistOpen(true)
                }}
                className="px-3.5 h-9 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Kelola Daftar Nomor yang Diblokir (Blacklist)"
              >
                <Shield size={14} />
                <span>Daftar Blokir</span>
                {blacklistList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {blacklistList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Section Pengajuan Aktivasi WhatsApp Surveyor (Pending Fonnte Package Upgrade) */}
          {pengajuanList.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Pengajuan Aktivasi WhatsApp Surveyor</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                        {pengajuanList.length} Menunggu Aktivasi Paket
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Surveyor telah mendaftarkan nomor mereka. Silakan beli/upgrade paket di dashboard Fonnte agar tidak terbentur limitasi Free, lalu klik <strong>Setujui</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards for each pending submission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {pengajuanList.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-card border border-amber-500/30 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <UserCheck size={14} className="text-amber-500" />
                          <span>{item.user?.nama || item.user?.username || 'Surveyor'}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(@{item.user?.username})</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-primary mt-1">
                          +{item.nomorWa ? item.nomorWa.replace(/\D/g, '') : '-'}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Device Fonnte: <span className="font-semibold text-foreground">{item.nama}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold shrink-0">
                        Menunggu Paket
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] text-muted-foreground space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Info size={12} className="text-blue-500" /> Langkah Admin di Fonnte:
                      </div>
                      <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                        <li>Buka dashboard <strong>fonnte.com</strong> → menu Device List.</li>
                        <li>Cari perangkat <strong>"{item.nama}"</strong>.</li>
                        <li>Beli / aktifkan paket reguler/pro untuk slot perangkat tersebut.</li>
                        <li>Setelah paket aktif, klik tombol persetujuan di bawah ini.</li>
                      </ol>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprovePengajuan(item)}
                        disabled={approvingId === item.id}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        {approvingId === item.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        <span>Setujui & Beritahu Surveyor (Paket Sudah Dibeli)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectModal({ open: true, device: item, alasan: '', loading: false })}
                        className="px-3 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Active Devices Only */}
          {loadingDevices ? (
            <div className="flex flex-col items-center justify-center h-48 bg-card border border-border rounded-2xl">
              <Loader2 size={28} className="animate-spin text-primary mb-2" />
              <div className="text-xs text-muted-foreground">Memuat data perangkat WhatsApp...</div>
            </div>
          ) : activeDevices.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-3">
                <Smartphone size={24} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Tidak Ada Akun WhatsApp Pengirim yang Aktif</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Hanya akun WhatsApp yang sedang aktif dan terhubung yang ditampilkan di sini. Ketika Surveyor mengajukan nomor dan Anda menyetujuinya, surveyor dapat menghubungkan WhatsApp dan akun aktif akan otomatis muncul.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeDevices.map((dev) => {
                const rawPhone = dev.nomorWa ? String(dev.nomorWa) : ''
                const phoneDisplay = rawPhone
                  ? (rawPhone.startsWith('+') ? rawPhone : `+${rawPhone.replace(/\D/g, '')}`)
                  : '-'
                const maskedToken = dev.token
                  ? `${String(dev.token).slice(0, 8)} •••••••••`
                  : '••••••••••••••••'

                return (
                  <div
                    key={dev.id}
                    className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-xs hover:shadow-sm transition-all relative"
                  >
                    {/* 1. Header Section */}
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        {/* Circular WhatsApp Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 shadow-2xs">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-xs">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-white">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </div>
                        </div>

                        {/* Name, Phone, and Badges */}
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                            {dev.nama}
                          </h3>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 font-mono">
                            {phoneDisplay}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                              <CheckCircle2 size={13} />
                              <span>Terhubung</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground text-xs font-semibold">
                              <span>{dev.izinKirim !== false ? 'Bot Aktif' : 'Bot Nonaktif'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3-Dots Menu Button */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setCardMenuOpenId(cardMenuOpenId === dev.id ? null : dev.id)}
                          className="w-10 h-10 rounded-2xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Menu Perangkat"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {cardMenuOpenId === dev.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setCardMenuOpenId(null)} />
                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-30 py-1.5 text-xs animate-fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setCardMenuOpenId(null)
                                  handleSetDefaultDevice(dev)
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-secondary text-foreground font-medium cursor-pointer"
                              >
                                <Star size={14} className={dev.isDefault ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'} />
                                <span>{dev.isDefault ? 'Pengirim Default (Aktif)' : 'Jadikan Default'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCardMenuOpenId(null)
                                  handleCopyToken(dev)
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-secondary text-foreground font-medium cursor-pointer"
                              >
                                <Copy size={14} className="text-muted-foreground" />
                                <span>Salin Token Device</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCardMenuOpenId(null)
                                  setConfirmResetDevice(dev)
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-secondary text-foreground font-medium cursor-pointer"
                              >
                                <RotateCw size={14} className="text-muted-foreground" />
                                <span>Reset Token / Putus</span>
                              </button>
                              {dev.nomorWa && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardMenuOpenId(null)
                                    setConfirmBlacklistDevice(dev)
                                  }}
                                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-secondary text-foreground font-medium cursor-pointer"
                                >
                                  <Ban size={14} className="text-muted-foreground" />
                                  <span>Blokir Nomor</span>
                                </button>
                              )}
                              <div className="border-t border-border my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setCardMenuOpenId(null)
                                  setConfirmDeleteDevice(dev)
                                }}
                                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-red-500/10 text-red-600 dark:text-red-400 font-medium cursor-pointer"
                              >
                                <Trash2 size={14} />
                                <span>Hapus Perangkat</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. Inner Details Box (Petugas, Status Bot, Device Token, and Mascot) */}
                    <div className="mt-5 sm:mt-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-secondary/30 dark:bg-slate-900/30 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
                      {/* Left Details Rows */}
                      <div className="w-full flex-1 space-y-3.5 sm:space-y-4">
                        {/* Row 1: Petugas */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Ditautkan ke Petugas</div>
                            <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                              {dev.user ? `${dev.user.nama} (${dev.user.role})` : 'Semua Petugas (Umum)'}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Status Pengiriman Bot */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Bot size={18} />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Status Pengiriman Bot</div>
                            <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold mt-0.5 ${
                              dev.izinKirim !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                                dev.izinKirim !== false ? 'bg-emerald-500' : 'bg-red-500'
                              }`} />
                              <span>{dev.izinKirim !== false ? 'Diizinkan' : 'Ditangguhkan'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Device Token */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Key size={18} />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Device Token</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-wider">
                                {maskedToken}
                              </span>
                              {dev.token && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyToken(dev)}
                                  className="p-1 px-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                  title="Salin Device Token"
                                >
                                  {copiedTokenId === dev.id ? (
                                    <>
                                      <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span className="text-[10px] font-medium hidden sm:inline">Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right / Centered Mascot Illustration */}
                      <div className="shrink-0 w-full md:w-auto flex justify-center pt-2 md:pt-0">
                        <RobotMascot />
                      </div>
                    </div>

                    {/* 3. Action Bar - DESKTOP VIEW */}
                    <div className="hidden sm:flex items-center justify-between gap-4 mt-6">
                      {/* Izin Kirim Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleIzinKirim(dev)}
                        className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                          dev.izinKirim !== false
                            ? 'bg-[#00C261] hover:bg-[#00B057] text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        title="Klik untuk mengubah status izin kirim"
                      >
                        {dev.izinKirim !== false ? (
                          <>
                            <ShieldCheck size={16} />
                            <span>Izin Kirim: Aktif</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={16} />
                            <span>Izin Kirim: Ditangguhkan</span>
                          </>
                        )}
                        <ChevronDown size={15} />
                      </button>

                      {/* 4 Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Favorit */}
                        <button
                          type="button"
                          onClick={() => handleSetDefaultDevice(dev)}
                          className={`min-w-[62px] px-3.5 py-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                            dev.isDefault
                              ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/25 text-amber-500'
                              : 'border-border bg-card hover:bg-secondary text-slate-600 dark:text-slate-400'
                          }`}
                          title={dev.isDefault ? 'Pengirim Default Aktif' : 'Jadikan Pengirim Default'}
                        >
                          <Star size={16} className={dev.isDefault ? 'fill-amber-400 text-amber-500' : ''} />
                          <span className="text-[10px] font-medium">Favorit</span>
                        </button>

                        {/* Blokir */}
                        <button
                          type="button"
                          onClick={() => setConfirmBlacklistDevice(dev)}
                          disabled={!dev.nomorWa}
                          className="min-w-[62px] px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-secondary text-slate-600 dark:text-slate-400 shadow-2xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                          title="Blokir Nomor WhatsApp Ini"
                        >
                          <Ban size={16} />
                          <span className="text-[10px] font-medium">Blokir</span>
                        </button>

                        {/* Reset Token */}
                        <button
                          type="button"
                          onClick={() => setConfirmResetDevice(dev)}
                          className="min-w-[62px] px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-secondary text-slate-600 dark:text-slate-400 shadow-2xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                          title="Reset Token / Putuskan Koneksi"
                        >
                          <RotateCw size={16} />
                          <span className="text-[10px] font-medium whitespace-nowrap">Reset Token</span>
                        </button>

                        {/* Hapus */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDevice(dev)}
                          className="min-w-[62px] px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-red-500/10 text-red-500 hover:border-red-500/30 shadow-2xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                          title="Hapus Perangkat Ini"
                        >
                          <Trash2 size={16} />
                          <span className="text-[10px] font-medium text-red-500">Hapus</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. Action Bar - MOBILE VIEW */}
                    <div className="block sm:hidden mt-5 space-y-3">
                      {/* Mobile Primary Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleIzinKirim(dev)}
                        className={`w-full px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-between shadow-xs transition-all cursor-pointer ${
                          dev.izinKirim !== false
                            ? 'bg-[#00C261] hover:bg-[#00B057] text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {dev.izinKirim !== false ? (
                            <>
                              <ShieldCheck size={18} />
                              <span>Izin Kirim: Aktif</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert size={18} />
                              <span>Izin Kirim: Ditangguhkan</span>
                            </>
                          )}
                        </div>
                        <ChevronDown size={18} />
                      </button>

                      {/* Mobile List Group Menu */}
                      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-2xs">
                        {/* Row 1: Favorit */}
                        <button
                          type="button"
                          onClick={() => handleSetDefaultDevice(dev)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-secondary/60 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 text-foreground font-semibold text-xs">
                            <Star size={16} className={dev.isDefault ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'} />
                            <span>{dev.isDefault ? 'Favorit (Default)' : 'Favorit'}</span>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </button>

                        {/* Row 2: Blokir */}
                        <button
                          type="button"
                          onClick={() => setConfirmBlacklistDevice(dev)}
                          disabled={!dev.nomorWa}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-secondary/60 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <div className="flex items-center gap-3 text-foreground font-semibold text-xs">
                            <Ban size={16} className="text-muted-foreground" />
                            <span>Blokir</span>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </button>

                        {/* Row 3: Reset Token */}
                        <button
                          type="button"
                          onClick={() => setConfirmResetDevice(dev)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-secondary/60 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 text-foreground font-semibold text-xs">
                            <RotateCw size={16} className="text-muted-foreground" />
                            <span>Reset Token</span>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </button>

                        {/* Row 4: Hapus */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDevice(dev)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-semibold text-xs">
                            <Trash2 size={16} className="text-red-500" />
                            <span>Hapus</span>
                          </div>
                          <ChevronRight size={16} className="text-red-400" />
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
                        Nomor: +{myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '-'}
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

                {myDevice.izinKirim === false ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                      <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Izin Pengiriman Ditangguhkan oleh Administrator</span>
                    </div>
                    <p className="leading-relaxed">
                      WhatsApp Anda terhubung ke server, namun saat ini Administrator menangguhkan izin pengiriman laporan untuk akun Anda. Anda belum dapat mengirim laporan via bot sampai Administrator mengaktifkannya kembali.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-green-500" /> Siap Mengirim Laporan:
                    </div>
                    <p>
                      Setiap kali Anda menekan tombol <strong>Kirim via Bot Server</strong> di halaman pengiriman, laporan & PDF akan terkirim langsung dari nomor WhatsApp Anda.
                    </p>
                  </div>
                )}
              </div>
            ) : myDevice?.statusAktivasi === 'MENUNGGU_AKTIVASI' && !showEditPhone ? (
              <div className="space-y-4 animate-fade-in">
                {/* Banner Status Menunggu Aktivasi Paket Admin */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Clock size={22} className="animate-pulse" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span>Pengajuan Aktivasi Paket Sedang Diproses</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            ⏳ Menunggu Administrator
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-primary mt-0.5">
                          Nomor WhatsApp: +{myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '-'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={loadMyDevice}
                      disabled={loadingMyDevice}
                      className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
                      title="Periksa Pembaruan Status"
                    >
                      <RefreshCw size={14} className={loadingMyDevice ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 text-xs text-muted-foreground space-y-2">
                    <p className="leading-relaxed">
                      Nomor WhatsApp Anda telah diajukan ke server sistem. Karena batasan kuota server Fonnte (maksimal 1 perangkat aktif pada paket Free), <strong>Administrator sedang mengaktifkan/membeli paket slot perangkat Anda</strong> di dashboard Fonnte.
                    </p>
                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border flex items-center gap-2 text-foreground font-medium text-[11px]">
                      <Info size={14} className="text-blue-500 shrink-0" />
                      <span>Anda akan menerima <strong>notifikasi lonceng otomatis</strong> segera setelah Administrator menyetujui, dan tombol pairing (Kode / Scan QR) akan langsung terbuka.</span>
                    </div>
                  </div>

                  {/* Indikator Alur 3 Langkah */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">Langkah 1: Selesai</div>
                        <div className="text-[10px] opacity-80">Nomor tersimpan & terdaftar</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center gap-2 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30">
                      <Clock size={16} className="shrink-0 animate-pulse" />
                      <div>
                        <div className="font-bold text-[11px]">Langkah 2: Proses</div>
                        <div className="text-[10px] opacity-80">Aktivasi paket Fonnte oleh Admin</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center gap-2 text-muted-foreground">
                      <Lock size={16} className="shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">Langkah 3: Menunggu</div>
                        <div className="text-[10px]">Tautkan Kode / Scan QR</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-amber-500/20 text-xs">
                    <span className="text-[11px] text-muted-foreground">Perlu mengganti nomor?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputPhone(myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '')
                        setShowEditPhone(true)
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Ubah Nomor Pengajuan
                    </button>
                  </div>
                </div>
              </div>
            ) : myDevice?.statusAktivasi === 'DITOLAK' && !showEditPhone ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Pengajuan Aktivasi WhatsApp Ditolak</div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                        Alasan: {myDevice.catatanAdmin || 'Pengajuan tidak disetujui oleh Administrator.'}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInputPhone(myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '')
                        setShowEditPhone(true)
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Ajukan Ulang Nomor WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ) : !myDevice || !myDevice.statusAktivasi || showEditPhone ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-secondary/60 border border-border flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">
                      {showEditPhone ? 'Ubah Nomor WhatsApp Pengajuan' : 'Daftarkan Nomor WhatsApp Anda'}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Karena akun WhatsApp pengirim menggunakan server Fonnte, sistem akan mendaftarkan slot nomor Anda terlebih dahulu. Administrator akan mengaktifkan paket Fonnte untuk perangkat Anda, kemudian Anda dapat menghubungkannya via Kode Pairing atau Scan QR tanpa kendala limitasi akun Free.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAjukanSinkronisasi} className="p-4 sm:p-5 rounded-xl border border-dashed border-border bg-card space-y-4">
                  {/* Input Nomor HP */}
                  <div className="space-y-1.5 bg-secondary/40 p-3.5 rounded-xl border border-border">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone size={13} className="text-primary" /> Nomor WhatsApp HP Anda <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="Contoh: 08960536022 atau 62896..."
                      className="w-full max-w-sm h-10 px-3.5 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs transition-colors"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Format nomor otomatis disesuaikan (08... atau 628...). Pastikan nomor ini aktif di aplikasi WhatsApp HP Anda.
                    </p>
                  </div>

                  {/* Panduan Alur Pengajuan */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1.5">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Info size={14} className="text-primary" />
                      <span>Alur Aktivasi WhatsApp Surveyor:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Ketik nomor WhatsApp Anda lalu klik tombol <strong>"Simpan & Ajukan Sinkronisasi WhatsApp"</strong>.</li>
                      <li>Administrator menerima notifikasi dan akan mengaktifkan/membeli paket perangkat di Fonnte.</li>
                      <li>Begitu disetujui, Anda menerima notifikasi dan form untuk memasukkan Kode Pairing / Scan QR akan otomatis terbuka.</li>
                    </ol>
                  </div>

                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="submit"
                      disabled={submittingPengajuan}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      {submittingPengajuan ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span>Simpan & Ajukan Sinkronisasi WhatsApp</span>
                    </button>
                    {showEditPhone && myDevice && (
                      <button
                        type="button"
                        onClick={() => setShowEditPhone(false)}
                        className="px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Banner Status Disetujui Admin */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 flex-wrap">
                      <span>🎉 Paket WhatsApp Telah Diaktifkan oleh Administrator!</span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      Nomor WhatsApp Anda (<strong>+{myDevice.nomorWa ? myDevice.nomorWa.replace(/\D/g, '') : '-'}</strong>) siap dihubungkan. Silakan pilih metode di bawah untuk menyelesaikan proses pairing.
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl border border-dashed border-border bg-card space-y-4">
                  {/* Pilihan Metode: Kode vs QR */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      Pilih Cara Menghubungkan WhatsApp:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConnectMethod('code')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          connectMethod === 'code'
                            ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/40'
                            : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/70'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${connectMethod === 'code' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Hash size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>Tautkan dengan Kode</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              Rekomendasi HP
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            Gunakan kode 8-digit langsung di WhatsApp tanpa perlu scan kamera.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConnectMethod('qr')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          connectMethod === 'qr'
                            ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/40'
                            : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/70'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${connectMethod === 'qr' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <QrCode size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>Scan Barcode QR</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                              Laptop / PC
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            Scan barcode QR di layar laptop menggunakan kamera WhatsApp di HP.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Input Nomor HP */}
                  <div className="space-y-1.5 bg-secondary/40 p-3.5 rounded-xl border border-border">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone size={13} className="text-primary" /> Nomor WhatsApp HP Anda <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="Contoh: 08960536022 atau 62896..."
                      className="w-full max-w-sm h-10 px-3.5 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs transition-colors"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Nomor ini telah didaftarkan dan disetujui Administrator untuk slot perangkat Fonnte Anda.
                    </p>
                  </div>

                  {/* Panduan Langkah Sesuai Metode */}
                  {connectMethod === 'code' ? (
                    <div className="space-y-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/60">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                        <Smartphone size={14} className="text-primary" />
                        <span>Langkah Tautkan dengan Kode di WhatsApp HP:</span>
                      </div>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
                        <li>Pastikan nomor WhatsApp Anda sudah sesuai di atas, lalu klik <strong>"Dapatkan Kode Pairing (HP)"</strong>.</li>
                        <li>Buka aplikasi WhatsApp di HP Anda → Menu titik tiga / Pengaturan.</li>
                        <li>Pilih <strong>Perangkat Tertaut</strong> → Ketuk <strong>Tautkan Perangkat</strong>.</li>
                        <li>Ketuk pilihan <strong>"Tautkan dengan nomor telepon saja"</strong> (Link with phone number instead) di bagian paling bawah layar HP.</li>
                        <li>Ketik 8 digit kode yang muncul di layar ini ke WhatsApp Anda.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/60">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                        <QrCode size={14} className="text-primary" />
                        <span>Langkah Scan Barcode QR di Laptop:</span>
                      </div>
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
                        <li>Pastikan nomor WhatsApp Anda sudah sesuai di atas, lalu klik <strong>"Generate & Scan Barcode QR"</strong>.</li>
                        <li>Buka aplikasi WhatsApp di HP Anda → Menu titik tiga / Pengaturan.</li>
                        <li>Pilih <strong>Perangkat Tertaut</strong> → Ketuk <strong>Tautkan Perangkat</strong>.</li>
                        <li>Arahkan kamera WhatsApp HP Anda ke Barcode QR yang muncul di layar ini.</li>
                      </ol>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleConnectMyDevice(inputPhone, connectMethod)}
                      disabled={connectingMyDevice}
                      className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      {connectingMyDevice ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : connectMethod === 'code' ? (
                        <Hash size={15} />
                      ) : (
                        <QrCode size={15} />
                      )}
                      <span>
                        {connectMethod === 'code' ? 'Dapatkan Kode Pairing (HP)' : 'Generate & Scan Barcode QR'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditPhone(true)}
                      className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
                    >
                      Ajukan Nomor Baru
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
            <div className="space-y-3">
              {/* Mobile Card List (Screen < md) */}
              <div className="block md:hidden space-y-3">
                {kontakList.map((k) => {
                  const canEdit = isAdmin || k.userId === user?.id
                  const cleanPhone = k.nomorWa ? k.nomorWa.replace(/\D/g, '') : ''
                  const waLink = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`

                  return (
                    <div key={k.id} className="p-4 bg-card border border-border rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {k.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground">{k.nama}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
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
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                k.aktif
                                  ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {k.aktif ? 'Aktif' : 'Non-aktif'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => openEditKontak(k)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                title="Edit Kontak"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteKontak(k)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Hapus Kontak"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1 bg-secondary/60 px-2 py-1 rounded-lg">
                              <Lock size={10} /> Kantor
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="grid grid-cols-1 gap-1.5 text-xs pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">WhatsApp:</span>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-primary font-semibold hover:underline flex items-center gap-1"
                          >
                            <Phone size={12} />
                            <span>{k.nomorWa}</span>
                          </a>
                        </div>
                        {(k.jabatan || k.instansi) && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Jabatan / Instansi:</span>
                            <span className="text-foreground font-medium text-right">
                              {[k.jabatan, k.instansi].filter(Boolean).join(' - ') || '-'}
                            </span>
                          </div>
                        )}
                        {k.catatan && (
                          <div className="flex items-start justify-between gap-2 text-muted-foreground">
                            <span className="shrink-0">Catatan:</span>
                            <span className="italic text-right text-[11px]">{k.catatan}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View (Screen >= md) */}
              <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
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
      {/* MODAL: TAUTKAN WHATSAPP (KODE PAIRING ATAU SCAN QR)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 text-center max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="text-left">
                <h3 className="text-sm sm:text-base font-bold text-foreground">Tautkan Akun WhatsApp</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                  {qrModal.device?.nama || 'WhatsApp'}
                </p>
              </div>
              <button
                onClick={handleCloseQrModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Switcher Mode Tab */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/80 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleSwitchConnectMethod('code')}
                disabled={qrModal.loading}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  qrModal.type === 'code'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Hash size={14} className={qrModal.type === 'code' ? 'text-primary' : ''} />
                <span>Kode Pairing</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold hidden xs:inline">
                  HP
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchConnectMethod('qr')}
                disabled={qrModal.loading}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  qrModal.type === 'qr'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode size={14} className={qrModal.type === 'qr' ? 'text-primary' : ''} />
                <span>Scan Barcode QR</span>
              </button>
            </div>

            {/* Modal Body: Loading State */}
            {qrModal.loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-12 bg-secondary/30 rounded-2xl border border-border">
                <Loader2 size={36} className="animate-spin text-primary" />
                <div className="text-xs font-semibold text-foreground">
                  Menghubungi server Fonnte...
                </div>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  {qrModal.type === 'code' ? 'Meminta kode 8-digit pairing...' : 'Membuat gambar barcode QR...'}
                </p>
              </div>
            ) : qrModal.type === 'code' ? (
              /* TAB KODE PAIRING */
              <div className="space-y-3.5">
                <div className="p-4 sm:p-5 bg-secondary/50 border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Kode Pairing WhatsApp Anda
                  </span>

                  {qrModal.code ? (
                    <div className="flex flex-col items-center gap-2.5 w-full">
                      <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-primary bg-card px-4 sm:px-6 py-2.5 rounded-2xl border border-border shadow-xs select-all">
                        {qrModal.code}
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyPairingCode}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
                          qrModal.copied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {qrModal.copied ? (
                          <>
                            <Check size={14} />
                            <span>Tersalin ke Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Salin Kode Pairing</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-3">
                      Kode belum tersedia. Klik "Segarkan" di bawah.
                    </div>
                  )}

                  {/* Polling Liveness Indicator */}
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground pt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Menunggu konfirmasi tautan dari WhatsApp HP Anda...</span>
                  </div>
                </div>

                {/* Langkah Penggunaan Kode di HP */}
                <div className="text-left bg-muted/40 p-3.5 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Smartphone size={13} className="text-primary" />
                    <span>Langkah Memasukkan Kode di WhatsApp HP:</span>
                  </p>
                  <ol className="list-decimal list-inside pl-1 space-y-1">
                    <li>Buka aplikasi <strong>WhatsApp</strong> di HP Anda.</li>
                    <li>Ketuk titik tiga / Pengaturan → <strong>Perangkat Tertaut</strong>.</li>
                    <li>Ketuk tombol <strong>Tautkan Perangkat</strong>.</li>
                    <li>Ketuk opsi <strong>"Tautkan dengan nomor telepon saja"</strong> <em>(Link with phone number instead)</em> di paling bawah layar HP.</li>
                    <li>Masukkan 8 digit kode di atas ke layar WhatsApp Anda.</li>
                  </ol>
                </div>
              </div>
            ) : (
              /* TAB BARCODE QR */
              <div className="space-y-3.5">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner min-h-[240px]">
                  {qrModal.qrUrl ? (
                    <div className="space-y-2">
                      <img
                        src={qrModal.qrUrl.startsWith('data:') ? qrModal.qrUrl : `data:image/png;base64,${qrModal.qrUrl}`}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 object-contain rounded-lg mx-auto"
                      />
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-neutral-600">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Memantau scan barcode otomatis...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-neutral-500 text-xs">
                      Gagal memuat QR Code. Silakan klik tombol Segarkan di bawah.
                    </div>
                  )}
                </div>

                {/* Langkah Scan QR di HP */}
                <div className="text-left bg-muted/40 p-3.5 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <QrCode size={13} className="text-primary" />
                    <span>Langkah Scan QR di HP:</span>
                  </p>
                  <ol className="list-decimal list-inside pl-1 space-y-1">
                    <li>Buka WhatsApp di HP Anda.</li>
                    <li>Pilih menu <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong>.</li>
                    <li>Arahkan kamera HP ke Barcode QR di atas.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (qrModal.isMyDevice || !isAdmin) {
                    handleConnectMyDevice(inputPhone, qrModal.type)
                  } else {
                    handleOpenQr(qrModal.device, qrModal.type)
                  }
                }}
                disabled={qrModal.loading}
                className="flex-1 h-11 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <RefreshCw size={14} className={qrModal.loading ? 'animate-spin' : ''} />
                <span>Segarkan {qrModal.type === 'code' ? 'Kode' : 'QR'}</span>
              </button>
              <button
                type="button"
                onClick={handleCloseQrModal}
                className="flex-1 h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-98"
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DAFTAR BLOKIR NOMOR WHATSAPP (BLACKLIST - ADMIN ONLY)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalBlacklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Daftar Blokir Nomor WhatsApp (Blacklist)</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Nomor di daftar ini tidak dapat dihubungkan ke sistem dan koneksinya akan diputus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBlacklistOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Tambah Blacklist */}
            <form onSubmit={handleAddBlacklist} className="p-3.5 bg-secondary/50 rounded-xl border border-border space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Ban size={14} className="text-red-500" />
                <span>Blokir Nomor WhatsApp Baru</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formBlacklist.nomorWa}
                    onChange={e => setFormBlacklist(f => ({ ...f, nomorWa: e.target.value }))}
                    placeholder="Contoh: 08960536022..."
                    className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Alasan Pemblokiran
                  </label>
                  <input
                    type="text"
                    value={formBlacklist.alasan}
                    onChange={e => setFormBlacklist(f => ({ ...f, alasan: e.target.value }))}
                    placeholder="Contoh: Nomor tidak resmi, spam..."
                    className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingBlacklist || !formBlacklist.nomorWa.trim()}
                  className="px-4 h-9 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {submittingBlacklist ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  <span>Tambahkan ke Blacklist</span>
                </button>
              </div>
            </form>

            {/* List of Blacklisted Numbers */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
              <div className="text-xs font-bold text-foreground flex items-center justify-between pb-1">
                <span>Daftar Nomor yang Sedang Diblokir ({blacklistList.length}):</span>
                <button
                  type="button"
                  onClick={loadBlacklist}
                  disabled={loadingBlacklist}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className={loadingBlacklist ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingBlacklist ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={22} className="animate-spin text-primary mb-1.5" />
                  <span className="text-xs text-muted-foreground">Memuat daftar blokir...</span>
                </div>
              ) : blacklistList.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl p-4">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-2">
                    <Shield size={18} />
                  </div>
                  <div className="text-xs font-bold text-foreground">Tidak Ada Nomor dalam Daftar Blokir</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Semua nomor dapat ditautkan ke akun surveyor selama kuota Fonnte tersedia.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-card">
                  {blacklistList.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/40 transition-colors">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground flex items-center gap-2">
                          <span className="font-mono">+{item.nomorWa}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold">
                            DIBLOKIR
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {item.alasan || 'Diblokir oleh Administrator'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBlacklist(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-red-500/15 hover:text-red-600 hover:border-red-500/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        title="Buka Blokir (Hapus dari Blacklist)"
                      >
                        Buka Blokir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setModalBlacklistOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tolak Pengajuan Aktivasi WA (Khusus Admin) */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span>Tolak Pengajuan Aktivasi WhatsApp</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, device: null, alasan: '', loading: false })}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anda akan menolak pengajuan aktivasi perangkat <strong className="text-foreground">{rejectModal.device?.nama}</strong> (+{rejectModal.device?.nomorWa}). Surveyor terkait akan menerima notifikasi penolakan ini beserta alasannya.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Alasan Penolakan:</label>
                <textarea
                  value={rejectModal.alasan}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, alasan: e.target.value }))}
                  placeholder="Contoh: Slot paket belum tersedia / Nomor tidak terdaftar sebagai surveyor resmi..."
                  rows={3}
                  className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, device: null, alasan: '', loading: false })}
                className="px-4 py-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectPengajuan}
                disabled={rejectModal.loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {rejectModal.loading && <Loader2 size={13} className="animate-spin" />}
                <span>Tolak Pengajuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Blacklist Device Quick Action */}
      <ConfirmDialog
        open={Boolean(confirmBlacklistDevice)}
        onClose={() => setConfirmBlacklistDevice(null)}
        onConfirm={handleQuickBlacklist}
        title="Blokir Nomor WhatsApp Pengirim (Blacklist)"
        message={`Apakah Anda yakin ingin memblokir nomor +${confirmBlacklistDevice?.nomorWa?.replace(/\D/g, '')} (${confirmBlacklistDevice?.nama})? Koneksi WhatsApp perangkat ini akan langsung diputuskan dan nomor tersebut tidak dapat ditautkan lagi ke sistem.`}
        confirmText="Ya, Blokir Nomor Ini"
        variant="danger"
      />

      {/* Confirm Reset Token / Putuskan Perangkat */}
      <ConfirmDialog
        open={Boolean(confirmResetDevice)}
        onClose={() => setConfirmResetDevice(null)}
        onConfirm={() => {
          if (confirmResetDevice) {
            handleDisconnectDevice(confirmResetDevice)
            setConfirmResetDevice(null)
          }
        }}
        title="Reset Token & Putuskan Perangkat"
        message={`Apakah Anda yakin ingin mereset token dan memutuskan sesi WhatsApp untuk perangkat "${confirmResetDevice?.nama}"? Anda harus menautkan ulang WhatsApp setelahnya.`}
        confirmText="Ya, Reset Token"
        variant="warning"
      />

      {/* Confirm Unblock Blacklist */}
      <ConfirmDialog
        open={Boolean(confirmDeleteBlacklist)}
        onClose={() => setConfirmDeleteBlacklist(null)}
        onConfirm={handleDeleteBlacklist}
        title="Buka Blokir Nomor WhatsApp"
        message={`Apakah Anda yakin ingin menghapus nomor +${confirmDeleteBlacklist?.nomorWa} dari daftar blokir? Setelah dibuka, nomor ini dapat kembali ditautkan oleh surveyor.`}
        confirmText="Buka Blokir"
        variant="warning"
      />

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
