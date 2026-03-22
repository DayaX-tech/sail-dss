import React, { useEffect, useState, useCallback } from 'react'
import { fetchDashboard } from '../services/api'
import { KPICard, AlertBadge, ProgressBar, LoadingSpinner, ErrorState } from '../components/UIKit'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { Train, Package, AlertTriangle, Zap, TrendingUp, Activity, Target, Clock } from 'lucide-react'

const COLORS = ['#FF7A00', '#1565a0', '#34c759', '#ff2d55', '#ffcc02', '#7ec8e3']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
        <div className="text-gray-300 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</div>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchDashboard()
      setData(d)
    } catch (e) {
      setError('Failed to connect to DSS backend. Ensure FastAPI is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }, [refreshKey])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <LoadingSpinner text="Fetching operational data..." />
  if (error) return <ErrorState message={error} onRetry={load} />

  const kpis = data.kpis || {}
  
  const utilizationData = (data.utilization_trend_7days || []).map((v, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), utilization: v }
  })

  const wagonPieData = Object.entries(data.wagon_status_distribution || {}).map(([k, v]) => ({ name: k, value: v }))

  const productData = Object.entries(data.product_pending_tons || {}).map(([k, v]) => ({
    product: k.split(' ').map(w => w[0]).join(''), fullName: k, tons: Math.round(v)
  }))

  const hourlyData = (data.hourly_loading_activity || []).map((v, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`, wagons: v
  }))

  const destData = Object.entries(data.destination_demand || {}).slice(0, 8).map(([k, v]) => ({
    dest: k.substring(0, 6), fullDest: k, tons: Math.round(v)
  }))

  return (
    <div className="space-y-5">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Command Center Dashboard</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">
            Real-time operational overview • Last updated: {new Date(data.timestamp || Date.now()).toLocaleTimeString()}
          </p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2 text-sm">
          <Activity size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Pending Orders" value={kpis.pending_orders} icon={Package} accent="orange" trend={-5} trendLabel="vs yesterday" />
        <KPICard label="Available Wagons" value={kpis.available_wagons} icon={Train} accent="green" trend={3} />
        <KPICard label="High Risk Orders" value={kpis.high_risk_orders} icon={AlertTriangle} accent="red" />
        <KPICard label="Avg Utilization" value={kpis.avg_utilization_pct} unit="%" icon={Target} accent="blue" trend={2} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Orders" value={kpis.total_orders} icon={Package} accent="blue" />
        <KPICard label="Rakes Dispatched Today" value={kpis.today_dispatched_rakes || 0} icon={Zap} accent="orange" />
        <KPICard label="Penalty Avoided Today" value={kpis.penalties_avoided_today >= 100000 ? `₹${(kpis.penalties_avoided_today/100000).toFixed(1)}L` : `₹${Math.round((kpis.penalties_avoided_today||0)/1000)}K`} icon={TrendingUp} accent="green" />
        <KPICard label="Inventory (Tons)" value={Math.round(kpis.total_inventory_tons)} icon={Activity} accent="blue" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Utilization Trend */}
        <div className="col-span-2 card p-5">
          <div className="section-title">7-Day Wagon Utilization Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={utilizationData}>
              <defs>
                <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis domain={[60, 100]} tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="utilization" name="Utilization %" stroke="#FF7A00" fill="url(#utilGrad)" strokeWidth={2} dot={{ fill: '#FF7A00', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Wagon Status Pie */}
        <div className="card p-5">
          <div className="section-title">Wagon Fleet Status</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={wagonPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                {wagonPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {wagonPieData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs font-mono text-gray-400 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Product Pending */}
        <div className="card p-5">
          <div className="section-title">Pending Dispatch by Product (Tons)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis dataKey="product" type="category" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tons" name="Tons Pending" radius={[0, 4, 4, 0]}>
                {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Destination Demand */}
        <div className="card p-5">
          <div className="section-title">Top Destination Demand (Tons)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={destData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="dest" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tons" name="Tons" fill="#1565a0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="card p-5">
        <div className="section-title">Hourly Loading Activity (Wagons/Hour)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
            <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'JetBrains Mono' }} interval={2} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="wagons" name="Wagons Loaded" fill="#FF7A00" radius={[2, 2, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      <div className="card p-5">
        <div className="section-title flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          Active System Alerts
        </div>
        <div className="space-y-2">
          {(data.alerts || []).map((alert, i) => (
            <AlertBadge key={i} level={alert.level} message={alert.message} timestamp={alert.timestamp} />
          ))}
        </div>
      </div>
    </div>
  )
}
