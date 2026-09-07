import { useState, useEffect } from 'react'
import {
  changePassword,
  getFonnteSetting,
  updateFonnteSetting,
  checkFonnteAccount
} from '../lib/api'
import toast from 'react-hot-toast'
import {
  KeyRound, MessageCircle, Loader2, Check, AlertCircle,
  CheckCircle2, RefreshCw, Shield, ArrowRight,
  Database, UserCheck, Info
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  // Password state
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [passSaving, setPassSaving] = useState(false)

  // Admin Fonnte Account Token state
  const [fonnteAccountToken, setFonnteAccountToken] = useState('')
  const [fonnteConfig, setFonnteConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(false)
  const [accountInfo, setAccountInfo] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadFonnteConfig()
    }
  }, [isAdmin])

  const loadFonnteConfig = async () => {
    try {
      setLoadingConfig(true)
      const res = await getFonnteSetting()
      setFonnteConfig(res.data)
    } catch {
      console.warn('Gagal memuat konfigurasi Fonnte.')
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirm) {
      toast.error('Konfirmasi password baru tidak cocok.')
      return
    }
    if (passForm.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter.')
      return
    }
    setPassSaving(true)
    try {
      await changePassword({ oldPassword: passForm.oldPassword, newPassword: passForm.newPassword })
      toast.success('Password berhasil diubah!')
      setPassForm({ oldPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengubah password.')
    } finally {
      setPassSaving(false)
    }
  }

  const handleSaveFonnteAccountToken = async () => {
    if (!fonnteAccountToken.trim()) {
      toast.error('Silakan masukkan Fonnte Account Token.')
      return
    }
    setSavingToken(true)
    try {
      const res = await updateFonnteSetting({ token: fonnteAccountToken.trim() })
      toast.success(res.data.message || 'Fonnte Account Token berhasil disimpan!')
      setFonnteAccountToken('')
      loadFonnteConfig()
      if (res.data.fonnteInfo) {
        setAccountInfo(res.data.fonnteInfo)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan Account Token.')
    } finally {
      setSavingToken(false)
    }
  }

  const handleCheckFonnteAccount = async () => {
    setCheckingAccount(true)
    setAccountInfo(null)
    try {
      const res = await checkFonnteAccount()
      setAccountInfo(res.data)
      toast.success('Status akun Fonnte berhasil diverifikasi!')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal mengecek status akun Fonnte.'
      setAccountInfo({ success: false, error: errMsg })
      toast.error(errMsg)
    } finally {
      setCheckingAccount(false)
    }
  }

  const inputCls = "w-full h-10 px-3 bg-secondary border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
  const labelCls = "block text-xs font-semibold text-foreground mb-1.5"

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pengaturan Akun & Sistem</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kelola profil pengguna, keamanan akun, dan integrasi WhatsApp
        </p>
      </div>

      {/* 1. Ringkasan Profil Pengguna */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 uppercase">
              {(user?.nama || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <span className="uppercase">{(user?.nama || user?.username || '').toUpperCase()}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  user?.role === 'ADMIN'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : user?.role === 'SURVEYOR'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}>
                  {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'SURVEYOR' ? 'Surveyor Bongkar' : 'Petugas Muat'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                Username: @{user?.username} {user?.kontakWa && `• WA: ${user.kontakWa}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ADMIN ONLY: Konfigurasi Fonnte Account Token Terpusat */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 shadow-xs">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Fonnte Master Account Token (Admin)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Pusat token Fonnte untuk pendaftaran & pengelolaan multi-device seluruh surveyor
                </p>
              </div>
            </div>
            <Link
              to="/kontak-wa"
              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Pusat WhatsApp</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Info status token tersimpan */}
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield size={14} className="text-primary" /> Status Konfigurasi Akun Fonnte:
              </span>
              {loadingConfig ? (
                <Loader2 size={13} className="animate-spin text-primary" />
              ) : fonnteConfig?.hasToken ? (
                <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 size={12} /> Token Terpasang ({fonnteConfig.source === 'database' ? 'Database' : '.env'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1">
                  <AlertCircle size={12} /> Belum Ada Token Akun
                </span>
              )}
            </div>

            {fonnteConfig?.hasToken && (
              <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2">
                <span>Token Aktif:</span>
                <span className="bg-card px-2 py-0.5 rounded border border-border text-foreground font-bold">
                  {fonnteConfig.maskedToken}
                </span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>Cara Kerja:</strong> Token ini adalah <em>Account Token</em> utama Anda dari <code>fonnte.com</code>. Setiap kali surveyor menautkan WhatsApp dari akun mereka, sistem akan otomatis mendaftarkan perangkat tersebut di bawah akun Fonnte Anda tanpa perlu setup manual.
            </p>
          </div>

          {/* Form Input / Update Account Token */}
          <div className="space-y-3 pt-1">
            <div>
              <label className={labelCls}>
                {fonnteConfig?.hasToken ? 'Perbarui Fonnte Account Token' : 'Masukkan Fonnte Account Token Baru'}
              </label>
              <input
                type="password"
                value={fonnteAccountToken}
                onChange={e => setFonnteAccountToken(e.target.value)}
                placeholder="Tempel Fonnte Account Token Anda di sini..."
                className={`${inputCls} font-mono`}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Dapatkan Account Token di{' '}
                <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary underline font-semibold">
                  fonnte.com
                </a>{' '}
                → Login Akun Admin → <strong>Account Settings / Profile</strong>.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveFonnteAccountToken}
                disabled={savingToken || !fonnteAccountToken.trim()}
                className="flex-1 h-10 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                {savingToken ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Simpan Token Akun ke Database</span>
              </button>

              <button
                type="button"
                onClick={handleCheckFonnteAccount}
                disabled={checkingAccount || (!fonnteConfig?.hasToken && !fonnteAccountToken.trim())}
                className="px-4 h-10 border border-border bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {checkingAccount ? <Loader2 size={14} className="animate-spin text-primary" /> : <RefreshCw size={13} />}
                <span>Cek Kuota & Device Fonnte</span>
              </button>
            </div>

            {/* Status Akun Fonnte Detail */}
            {accountInfo && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                accountInfo.success
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {accountInfo.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{accountInfo.success ? 'Akun Fonnte Aktif & Terverifikasi' : 'Pemeriksaan Akun Gagal'}</span>
                </div>
                {accountInfo.success && (
                  <div className="space-y-1.5 text-foreground/90 text-xs pt-1">
                    <div>Total Device Terdaftar di Fonnte: <strong>{accountInfo.totalDevices ?? accountInfo.devices?.length ?? 0} perangkat</strong></div>
                    {accountInfo.devices && accountInfo.devices.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
                        {accountInfo.devices.map((d, i) => (
                          <div key={i} className="p-2 bg-card rounded-lg border border-border flex items-center justify-between text-[11px]">
                            <span className="font-semibold">{d.name || d.device || `Perangkat #${i+1}`}</span>
                            <span className="font-mono text-muted-foreground">{d.device || d.token?.substring(0, 8) + '...'}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              d.status === 'connect' || d.status === 'connected' ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              {d.status || 'offline'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!accountInfo.success && (
                  <p className="text-[11px]">{accountInfo.error || 'Pastikan token akun benar dan kuota masih tersedia.'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Ganti Password Akun */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <KeyRound size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Ganti Password</h3>
            <p className="text-xs text-muted-foreground">Perbarui kata sandi untuk mengamankan akun Anda</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div>
            <label className={labelCls}>Password Lama</label>
            <input
              type="password"
              value={passForm.oldPassword}
              onChange={e => setPassForm(f => ({ ...f, oldPassword: e.target.value }))}
              required
              className={inputCls}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Password Baru</label>
              <input
                type="password"
                value={passForm.newPassword}
                onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                className={inputCls}
                placeholder="Min. 6 karakter"
              />
            </div>
            <div>
              <label className={labelCls}>Konfirmasi Password Baru</label>
              <input
                type="password"
                value={passForm.confirm}
                onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ulangi password baru"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={passSaving}
            className="w-full sm:w-auto px-6 h-10 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-opacity cursor-pointer"
          >
            {passSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan Password Baru
          </button>
        </form>
      </div>
    </div>
  )
}
