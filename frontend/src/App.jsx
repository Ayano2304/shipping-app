import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PengirimanListPage from './pages/PengirimanListPage'
import PengirimanFormPage from './pages/PengirimanFormPage'
import PengirimanDetailPage from './pages/PengirimanDetailPage'
import PengirimanKedatanganPage from './pages/PengirimanKedatanganPage'
import KapalPage from './pages/KapalPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import MasterDataPage from './pages/MasterDataPage'
import KontakWaPage from './pages/KontakWaPage'

export default function App() {
  const { token } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: '!bg-card !text-foreground !border !border-border !rounded-xl !shadow-lg !text-sm',
          success: {
            iconTheme: { primary: '#22c55e', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pengiriman" element={<PengirimanListPage />} />
          <Route path="/pengiriman/baru" element={<PengirimanFormPage />} />
          <Route path="/pengiriman/:id/edit" element={<PengirimanFormPage />} />
          <Route path="/pengiriman/:id/kedatangan" element={<PengirimanKedatanganPage />} />
          <Route path="/pengiriman/:id" element={<PengirimanDetailPage />} />
          <Route path="/kapal" element={<KapalPage />} />
          <Route path="/kontak-wa" element={<KontakWaPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/masterdata" element={<MasterDataPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
