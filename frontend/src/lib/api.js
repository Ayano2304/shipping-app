import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inject token automatically
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  const fonnteToken = localStorage.getItem('fonnte_token')
  if (fonnteToken) config.headers['X-Fonnte-Token'] = fonnteToken
  return config
})

// Handle 401/403 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.post('/auth/change-password', data)

// Kapal
export const getKapal = () => api.get('/kapal')
export const createKapal = (data) => api.post('/kapal', data)
export const updateKapal = (id, data) => api.put(`/kapal/${id}`, data)
export const deleteKapal = (id) => api.delete(`/kapal/${id}`)

// Pengiriman
export const getPengiriman = (params) => api.get('/pengiriman', { params })
export const getPengirimanById = (id) => api.get(`/pengiriman/${id}`)
export const createPengiriman = (data) => api.post('/pengiriman', data)
export const updatePengiriman = (id, data) => api.put(`/pengiriman/${id}`, data)
export const deletePengiriman = (id) => api.delete(`/pengiriman/${id}`)

// Palka
export const savePalkaBatch = (data) => api.post('/palka/batch', data)
export const deletePalka = (id) => api.delete(`/palka/${id}`)

// Users
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats')
export const getTrenSusut = (bulan) => api.get('/dashboard/tren-susut', { params: { bulan } })
export const getSusutPerKapal = () => api.get('/dashboard/per-kapal')


// WhatsApp & Kontak
export const kirimWA = (pengirimanId, data) => api.post(`/whatsapp/kirim/${pengirimanId}`, data)
export const checkWAStatus = (data = {}) => api.post('/whatsapp/status', data)
export const testWA = (data) => api.post('/whatsapp/test', data)
export const getWATemplates = () => api.get('/whatsapp/templates')
export const createWATemplate = (data) => api.post('/whatsapp/templates', data)
export const updateWATemplate = (id, data) => api.put(`/whatsapp/templates/${id}`, data)
export const deleteWATemplate = (id) => api.delete(`/whatsapp/templates/${id}`)
export const getKontakWa = (params) => api.get('/kontak-wa', { params })
export const getKontakWaById = (id) => api.get(`/kontak-wa/${id}`)
export const createKontakWa = (data) => api.post('/kontak-wa', data)
export const updateKontakWa = (id, data) => api.put(`/kontak-wa/${id}`, data)
export const deleteKontakWa = (id) => api.delete(`/kontak-wa/${id}`)

// Lookup APIs
export const lookupVolume = (params) => api.get('/lookup/volume', { params })
export const lookupDensity = (params) => api.get('/lookup/density', { params })
export const getTinggiRange = (params) => api.get('/lookup/tinggi-range', { params })

// Master Data APIs
export const getSoundingTable = (params) => api.get('/masterdata/sounding', { params })
export const getDensityTable = (params) => api.get('/masterdata/density', { params })
export const getFaktorKoreksiTable = () => api.get('/masterdata/faktor-koreksi')
export const importExcel = (formData) => api.post('/masterdata/import-excel', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const importSoundingFromExcel = (formData) => api.post('/masterdata/import-sounding', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Notifikasi
export const getNotifikasi = () => api.get('/notifikasi')
export const markAllNotifikasiRead = () => api.put('/notifikasi/read-all')
export const markNotifikasiRead = (id) => api.put(`/notifikasi/${id}/read`)
export const deleteNotifikasi = (id) => api.delete(`/notifikasi/${id}`)

export const createSounding = (data) => api.post('/masterdata/sounding', data)
export const updateSounding = (id, data) => api.put(`/masterdata/sounding/${id}`, data)
export const deleteSounding = (id) => api.delete(`/masterdata/sounding/${id}`)
export const exportPDF = (id) => api.get(`/export/pengiriman/${id}/pdf`, { responseType: 'blob' })
