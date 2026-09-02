import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import toast from 'react-hot-toast'
import { Anchor, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const { setAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAElDaDEfccS-7If-'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (turnstileSiteKey && !captchaToken) {
      toast.error('Silakan selesaikan verifikasi keamanan (CAPTCHA) terlebih dahulu.')
      return
    }

    setLoading(true)
    try {
      const { data } = await login({
        ...form,
        captchaToken,
      })
      setAuth(data.token, data.user)
      toast.success(`Selamat datang, ${data.user.nama}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login gagal. Periksa username dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={(e) => toggleTheme(e)}
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          className="relative w-10 h-10 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center text-foreground transition-all shadow-sm active:scale-95 overflow-hidden group cursor-pointer"
        >
          <Sun
            size={18}
            className={`absolute text-amber-400 transition-all duration-500 transform ${
              theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            }`}
          />
          <Moon
            size={18}
            className={`absolute text-indigo-600 transition-all duration-500 transform ${
              theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          />
        </button>
      </div>

      {/* Background decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <Anchor size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CPO Tanker</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistem Perhitungan Muatan</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-5">Masuk ke Sistem</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Masukkan username"
                required
                className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Masukkan password"
                  required
                  className="w-full h-10 px-3 pr-10 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile CAPTCHA */}
            {turnstileSiteKey && (
              <div className="flex justify-center py-1">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken('')}
                  options={{
                    theme: theme === 'dark' ? 'dark' : 'light',
                    size: 'normal',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (turnstileSiteKey && !captchaToken)}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Masuk'}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Default: admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
