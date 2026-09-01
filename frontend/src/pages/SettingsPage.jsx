import { useState } from 'react'
import { changePassword, checkWAStatus } from '../lib/api'
import toast from 'react-hot-toast'
import { KeyRound, MessageCircle, Loader2, Check, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [passSaving, setPassSaving] = useState(false)

  const [fonnteToken, setFonnteToken] = useState(localStorage.getItem('fonnte_token') || '')
  const [tokenSaved, setTokenSaved] = useState(false)

  // Status state
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)

  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirm) {
      toast.error('Konfirmasi password tidak cocok.')
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

  const saveFonnteToken = () => {
    localStorage.setItem('fonnte_token', fonnteToken.trim())
    setTokenSaved(true)
    toast.success('Token Fonnte berhasil disimpan!')
    setTimeout(() => setTokenSaved(false), 2000)
  }

  const handleCheckStatus = async () => {
    if (!fonnteToken.trim()) {
      toast.error('Silakan masukkan API Token Fonnte terlebih dahulu.')
      return
    }
    setCheckingStatus(true)
    setDeviceInfo(null)
    try {
      const res = await checkWAStatus({ fonnteToken: fonnteToken.trim() })
      setDeviceInfo(res.data)
      toast.success('Device Fonnte terhubung!')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal mengecek status device.'
      setDeviceInfo({ success: false, error: errMsg })
      toast.error(errMsg)
    } finally {
      setCheckingStatus(false)
    }
  }

  const inputCls = "w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pengaturan</h2>
        <p className="text-sm text-muted-foreground">Konfigurasi akun dan integrasi sistem</p>
      </div>

      {/* Ganti Password */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <KeyRound size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ganti Password</h3>
            <p className="text-xs text-muted-foreground">Ubah password akun Anda</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
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
          <button
            type="submit"
            disabled={passSaving}
            className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-opacity"
          >
            {passSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan Password
          </button>
        </form>
      </div>

      {/* Fonnte WA Config */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Konfigurasi WhatsApp (Fonnte)</h3>
            <p className="text-xs text-muted-foreground">Token digunakan untuk kirim laporan via WhatsApp</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Fonnte API Token</label>
            <input
              type="text"
              value={fonnteToken}
              onChange={e => setFonnteToken(e.target.value)}
              placeholder="Masukkan API Token dari Fonnte"
              className={`${inputCls} font-mono`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Dapatkan token di{' '}
              <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                fonnte.com
              </a>{' '}
              → Login → <strong>Device</strong> / <strong>API</strong>.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveFonnteToken}
              className={`flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm ${
                tokenSaved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {tokenSaved ? (
                <>
                  <Check size={14} /> Tersimpan!
                </>
              ) : (
                'Simpan Token'
              )}
            </button>
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checkingStatus || !fonnteToken}
              className="px-4 h-10 border border-border bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {checkingStatus ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Cek Status Device</span>
            </button>
          </div>

          {/* Device status feedback */}
          {deviceInfo && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-1.5 animate-fade-in ${
                deviceInfo.success
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {deviceInfo.success ? (
                  <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                )}
                <span>{deviceInfo.message || deviceInfo.error}</span>
              </div>
              {deviceInfo.success && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-foreground/80">
                  <div>
                    <strong>Nama Device:</strong> {deviceInfo.name}
                  </div>
                  <div>
                    <strong>Nomor:</strong> {deviceInfo.device}
                  </div>
                  <div>
                    <strong>Status:</strong> <span className="capitalize">{deviceInfo.deviceStatus}</span>
                  </div>
                  <div>
                    <strong>Kedaluwarsa:</strong> {deviceInfo.expired}
                  </div>
                </div>
              )}
              {!deviceInfo.success && (
                <div className="text-xs text-muted-foreground pt-1">
                  Pastikan Anda sudah scan QR WhatsApp di dashboard{' '}
                  <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary underline">
                    fonnte.com
                  </a>{' '}
                  dan token valid.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
