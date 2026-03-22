import axios from 'axios'

// Use relative URL — Vite proxy forwards to http://localhost:8000
const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

export const fetchDashboard    = () => api.get('/dashboard').then(r => r.data)
export const fetchOrders       = (params = {}) => api.get('/orders', { params }).then(r => r.data)
export const fetchWagons       = (params = {}) => api.get('/wagons', { params }).then(r => r.data)
export const fetchInventory    = () => api.get('/inventory').then(r => r.data)
export const fetchAnalytics    = () => api.get('/analytics').then(r => r.data)
export const fetchCompatibility= () => api.get('/compatibility').then(r => r.data)
export const fetchRakes        = () => api.get('/rakes').then(r => r.data)
export const fetchLoadingPoints= () => api.get('/loading-points').then(r => r.data)
export const fetchRoutes       = () => api.get('/routes').then(r => r.data)
export const fetchSimulation   = () => api.get('/simulation').then(r => r.data)
export const generatePlan      = (payload) => api.post('/generate-plan', payload).then(r => r.data)
export const fetchExplanation  = (algorithm = 'milp') => api.get('/plan-explanation', { params: { algorithm } }).then(r => r.data)
export const fetchDatasetInfo  = () => api.get('/dataset-info').then(r => r.data)

export default api
