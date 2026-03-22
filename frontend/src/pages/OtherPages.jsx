import React, { useEffect, useState } from 'react'
import { fetchInventory, fetchLoadingPoints } from '../services/api'
import { LoadingSpinner, KPICard, ProgressBar, StatusDot } from '../components/UIKit'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Boxes, Clock, Gauge, Shield } from 'lucide-react'

const COLORS = ['#FF7A00', '#1565a0', '#34c759', '#ff2d55', '#ffcc02', '#7ec8e3', '#a855f7']

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      {label && <div className="text-gray-300 mb-1">{label}</div>}
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</div>)}
    </div>
  )
}

// ─── Inventory & Stockyard ───────────────────────────────────────────────────
export function InventoryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading inventory..." />

  const byProd = Object.entries(data?.by_product?.available_tons || {}).map(([k, v]) => ({ product: k.split(' ').map(w => w[0]).join(''), fullName: k, tons: Math.round(v) }))
  const bySY = Object.entries(data?.by_stockyard?.available_tons || {}).map(([k, v]) => ({ sy: k, tons: Math.round(v) }))
  const records = data?.records || []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Inventory & Stockyard Map</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">
          {Math.round(data?.total_available_tons || 0).toLocaleString()}T available • {Math.round(data?.total_reserved_tons || 0).toLocaleString()}T reserved
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="section-title">Inventory by Product (Tons)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byProd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="product" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip content={<CT />} />
              <Bar dataKey="tons" name="Available Tons" radius={[4, 4, 0, 0]}>
                {byProd.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="section-title">Inventory by Stockyard</div>
          <div className="space-y-3 mt-2">
            {bySY.map(({ sy, tons }, i) => {
              const maxTons = Math.max(...bySY.map(b => b.tons))
              return (
                <div key={sy}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{sy}</span>
                    <span className="font-mono text-sm text-white">{tons.toLocaleString()}T</span>
                  </div>
                  <div className="h-3 bg-steel-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(tons / maxTons) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-700/50">
          <div className="font-display font-semibold text-white">Detailed Inventory Records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="border-b border-steel-700">
              <tr>
                {['Stockyard', 'Product Type', 'Available (T)', 'Reserved (T)', 'Utilization'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 40).map((r, i) => {
                const total = r.available_tons + r.reserved_tons
                const reservedPct = total > 0 ? (r.reserved_tons / total) * 100 : 0
                return (
                  <tr key={i} className="hover:bg-steel-700/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-orange-400">{r.stockyard}</td>
                    <td className="px-4 py-2.5 text-sm">{r.product_type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-green-300">{Number(r.available_tons).toFixed(1)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-yellow-300">{Number(r.reserved_tons).toFixed(1)}</td>
                    <td className="px-4 py-2.5 min-w-32">
                      <ProgressBar value={reservedPct} max={100} color="orange" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Loading Point Scheduler ─────────────────────────────────────────────────
export function LoadingScheduler() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLoadingPoints().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading sidings data..." />

  const lps = data?.loading_points || []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Loading Point Scheduler</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">Siding capacity, queue management, and crane scheduling</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {lps.map((lp, i) => {
          const queuePct = (lp.current_queue / lp.capacity_wagons_per_day) * 100
          return (
            <div key={lp.siding_id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-lg font-bold text-white">{lp.siding_id}</div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={lp.status} />
                  <span className="font-mono text-xs text-gray-400">{lp.status}</span>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <ProgressBar value={lp.current_queue} max={lp.capacity_wagons_per_day} label="Queue Utilization" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center border-t border-steel-700/30 pt-3">
                <div>
                  <div className="font-display text-xl font-bold text-orange-400">{lp.capacity_wagons_per_day}</div>
                  <div className="font-mono text-xs text-gray-500">Wagons/Day</div>
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-blue-400">{lp.queue_time_hours}h</div>
                  <div className="font-mono text-xs text-gray-500">Queue Time</div>
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-green-400">{lp.crane_count}</div>
                  <div className="font-mono text-xs text-gray-500">Cranes</div>
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-yellow-400">{lp.shift_capacity}</div>
                  <div className="font-mono text-xs text-gray-500">Per Shift</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Wagon Space Utilization ─────────────────────────────────────────────────
export function UtilizationPage() {
  const data = [
    { type: 'BCNA', avgUtil: 82.4, count: 420, avgCap: 58 },
    { type: 'BRN', avgUtil: 76.1, count: 380, avgCap: 55 },
    { type: 'BOXN', avgUtil: 88.5, count: 510, avgCap: 60 },
    { type: 'BOST', avgUtil: 71.3, count: 290, avgCap: 52 },
    { type: 'BTPN', avgUtil: 79.8, count: 340, avgCap: 50 },
    { type: 'BCN', avgUtil: 68.2, count: 360, avgCap: 45 },
  ]

  const heatmapData = Array.from({ length: 6 }, (_, ri) =>
    Array.from({ length: 8 }, (_, ci) => ({
      row: ri, col: ci,
      util: Math.random() * 40 + 55,
      wagonId: `WGN-${ri * 8 + ci + 1}`
    }))
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Wagon Space Utilization Analyzer</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">Load distribution, bogie utilization, and space efficiency metrics</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {data.map(({ type, avgUtil, count, avgCap }) => (
          <div key={type} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-xl font-bold text-white">{type}</div>
              <div className={`font-display text-2xl font-bold ${avgUtil >= 80 ? 'text-green-400' : avgUtil >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{avgUtil}%</div>
            </div>
            <div className="h-3 bg-steel-700 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${avgUtil}%`, background: avgUtil >= 80 ? '#34c759' : avgUtil >= 70 ? '#FF7A00' : '#ff2d55' }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center border-t border-steel-700/30 pt-3">
              <div>
                <div className="font-mono text-lg font-bold text-blue-400">{count}</div>
                <div className="font-mono text-xs text-gray-500">Total Wagons</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-orange-400">{avgCap}T</div>
                <div className="font-mono text-xs text-gray-500">Avg Capacity</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <div className="section-title">Rake Utilization Heatmap (Sample Rake)</div>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {heatmapData.flat().map((cell, i) => (
              <div key={i} title={`${cell.wagonId}: ${cell.util.toFixed(1)}%`}
                className="h-12 rounded flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                style={{ background: `rgba(${cell.util >= 80 ? '52, 199, 89' : cell.util >= 65 ? '255, 122, 0' : '255, 45, 85'}, ${cell.util / 100})` }}>
                <span className="font-mono text-xs font-bold text-white">{cell.util.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center text-xs font-mono text-gray-400">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/60" />Low (&lt;65%)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500/60" />Medium (65-80%)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/60" />Good (&gt;80%)</div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="section-title">Utilization by Wagon Type</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
            <XAxis dataKey="type" tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <YAxis domain={[50, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip content={<CT />} />
            <Bar dataKey="avgUtil" name="Avg Utilization %" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.avgUtil >= 80 ? '#34c759' : entry.avgUtil >= 70 ? '#FF7A00' : '#ff2d55'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Admin Page ──────────────────────────────────────────────────────────────
export function AdminPage() {
  const systems = [
    { name: 'FastAPI Backend', status: 'ONLINE', latency: '12ms', port: 8000 },
    { name: 'Data Generator', status: 'ONLINE', latency: '—', port: null },
    { name: 'Preprocessing Engine', status: 'ONLINE', latency: '45ms', port: null },
    { name: 'MILP Optimizer', status: 'ONLINE', latency: '800ms', port: null },
    { name: 'Greedy Planner', status: 'ONLINE', latency: '15ms', port: null },
    { name: 'React Frontend', status: 'ONLINE', latency: '—', port: 3000 },
  ]

  const datasets = [
    { name: 'Orders', count: '20,000', size: '~8MB' },
    { name: 'Customers', count: '800', size: '~0.3MB' },
    { name: 'Wagons', count: '2,500', size: '~1MB' },
    { name: 'Rakes', count: '150', size: '~0.1MB' },
    { name: 'Inventory', count: '35 entries', size: '~0.02MB' },
    { name: 'Routes', count: '40 routes', size: '~0.02MB' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Admin & Data Monitoring</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">System health, data pipelines, and configuration</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="section-title">System Components</div>
          <div className="space-y-2">
            {systems.map(s => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-steel-700/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  {s.port && <span className="font-mono text-xs text-gray-500">:{s.port}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400">{s.latency}</span>
                  <span className="font-mono text-xs text-green-400">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title">Dataset Summary</div>
          <div className="space-y-2">
            {datasets.map(d => (
              <div key={d.name} className="flex items-center justify-between py-2 border-b border-steel-700/30">
                <span className="text-sm text-white">{d.name}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-orange-400">{d.count}</span>
                  <span className="font-mono text-xs text-gray-500">{d.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="section-title">Tech Stack Information</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">Backend</div>
            {['Python 3.11', 'FastAPI', 'Pandas + NumPy', 'OR-Tools (MILP)', 'Pydantic v2', 'Uvicorn'].map(t => (
              <div key={t} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-sm text-gray-300">{t}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">Frontend</div>
            {['React 18', 'Vite', 'Tailwind CSS', 'Recharts', 'Framer Motion', 'Lucide React', 'React Router v6'].map(t => (
              <div key={t} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-sm text-gray-300">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
