import React, { useEffect, useState } from 'react'
import { fetchWagons } from '../services/api'
import { LoadingSpinner, ErrorState, StatusDot, KPICard } from '../components/UIKit'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Train, Filter } from 'lucide-react'

const COLORS = { BCNA: '#FF7A00', BRN: '#1565a0', BOXN: '#34c759', BOST: '#ff2d55', BTPN: '#ffcc02', BCN: '#7ec8e3' }
const STATUS_COLORS = { AVAILABLE: '#34c759', IN_USE: '#1565a0', MAINTENANCE: '#ffcc02', TRANSIT: '#FF7A00' }

export default function WagonMonitor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const d = await fetchWagons({ status: statusFilter || undefined, wagon_type: typeFilter || undefined, limit: 200 })
      setData(d)
    } catch (e) { setError('Failed to load wagon data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter, typeFilter])

  if (loading) return <LoadingSpinner text="Loading wagon fleet..." />
  if (error) return <ErrorState message={error} onRetry={load} />

  const statusDist = Object.entries(data.status_distribution || {}).map(([k, v]) => ({ name: k, value: v, fill: STATUS_COLORS[k] || '#9ca3af' }))
  const typeDist = Object.entries(data.type_distribution || {}).map(([k, v]) => ({ name: k, value: v, fill: COLORS[k] || '#9ca3af' }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Wagon Availability Monitor</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">{data.total} wagons in fleet • Real-time status tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(data.status_distribution || {}).map(([status, count]) => (
          <KPICard key={status} label={status.replace('_', ' ')} value={count} icon={Train}
            accent={status === 'AVAILABLE' ? 'green' : status === 'MAINTENANCE' ? 'yellow' : 'blue'} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="section-title">Status Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <Tooltip contentStyle={{ background: '#0a1929', border: '1px solid #0B3C5D', borderRadius: 8 }} />
              <Bar dataKey="value" name="Wagons" radius={[4, 4, 0, 0]}>
                {statusDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="section-title">Wagon Type Availability</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <Tooltip contentStyle={{ background: '#0a1929', border: '1px solid #0B3C5D', borderRadius: 8 }} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {typeDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
          <option value="">All Statuses</option>
          {['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'TRANSIT'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
          <option value="">All Types</option>
          {['BCNA', 'BRN', 'BOXN', 'BOST', 'BTPN', 'BCN'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm"><Filter size={14} /> Apply</button>
      </div>

      {/* Wagon Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="border-b border-steel-700">
              <tr>
                {['Wagon ID', 'Type', 'Capacity (T)', 'Status', 'Location', 'Condition', 'Age (yrs)'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.wagons || []).slice(0, 80).map(w => (
                <tr key={w.wagon_id} className="hover:bg-steel-700/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-orange-400">{w.wagon_id}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                      style={{ background: (COLORS[w.wagon_type] || '#9ca3af') + '22', color: COLORS[w.wagon_type] || '#9ca3af', border: `1px solid ${COLORS[w.wagon_type] || '#9ca3af'}44` }}>
                      {w.wagon_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{Number(w.capacity_tons).toFixed(1)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={w.availability_status} />
                      <span className="text-xs font-mono">{w.availability_status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{w.location}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-steel-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${w.condition_score}%`,
                          background: w.condition_score > 80 ? '#34c759' : w.condition_score > 60 ? '#FF7A00' : '#ff2d55'
                        }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400">{Number(w.condition_score).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{Number(w.age_years).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-steel-700/50">
          <span className="text-xs font-mono text-gray-400">Showing {Math.min(80, data.wagons?.length || 0)} of {data.total} wagons</span>
        </div>
      </div>
    </div>
  )
}
