import React, { useState } from 'react'
import { generatePlan } from '../services/api'
import { LoadingSpinner, ProgressBar, KPICard } from '../components/UIKit'
import { Zap, Play, Train, Package, TrendingUp, CheckCircle, AlertCircle, Target } from 'lucide-react'

const PRODUCTS = ['Hot Rolled Coils', 'Cold Rolled Sheets', 'Plates', 'Billets', 'Pig Iron', 'Structural Steel', 'Finished Bundles']
const DESTINATIONS = ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Visakhapatnam', 'Raipur']

export default function RakePlanner() {
  const [config, setConfig] = useState({ algorithm: 'both', max_wagons: 50, product_filter: '', destination_filter: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('milp')

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await generatePlan({
        algorithm: config.algorithm,
        max_wagons: config.max_wagons,
        product_filter: config.product_filter || null,
        destination_filter: config.destination_filter || null,
        rake_id: `RK-${Date.now().toString().slice(-4)}`
      })
      setResult(d)
    } catch (e) {
      setError('Plan generation failed. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  const activePlan = result?.[selectedPlan]
  const summary = activePlan?.summary || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Rake Planner Workspace</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">AI-optimized railway rake formation with constraint validation</p>
        </div>
      </div>

      {/* Config Panel */}
      <div className="card p-5">
        <div className="section-title">Plan Configuration</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Algorithm</label>
            <select value={config.algorithm} onChange={e => setConfig(c => ({ ...c, algorithm: e.target.value }))}
              className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
              <option value="both">Both (Compare)</option>
              <option value="greedy">Greedy Heuristic</option>
              <option value="milp">MILP Optimization</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Max Wagons</label>
            <input type="number" value={config.max_wagons} onChange={e => setConfig(c => ({ ...c, max_wagons: +e.target.value }))}
              min={10} max={58} className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Product Filter</label>
            <select value={config.product_filter} onChange={e => setConfig(c => ({ ...c, product_filter: e.target.value }))}
              className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
              <option value="">All Products</option>
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Destination</label>
            <select value={config.destination_filter} onChange={e => setConfig(c => ({ ...c, destination_filter: e.target.value }))}
              className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
              <option value="">All Destinations</option>
              {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={16} />}
          {loading ? 'Generating Optimal Plan...' : 'Generate Rake Formation Plan'}
        </button>
      </div>

      {loading && (
        <div className="card p-8">
          <LoadingSpinner text="Running AI optimization engine..." />
          <div className="text-center mt-4 space-y-2">
            {['Preprocessing orders...', 'Validating compatibility...', 'Running optimizer...', 'Computing savings...'].map((step, i) => (
              <div key={i} className="flex items-center justify-center gap-2 text-sm font-mono text-gray-400">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="card p-4 border border-red-700/50 bg-red-900/10 text-red-400 font-mono text-sm">{error}</div>}

      {result && !loading && (
        <>
          {/* Plan Selector */}
          {result.greedy && result.milp && (
            <div className="flex gap-2">
              {['greedy', 'milp'].map(algo => (
                <button key={algo} onClick={() => setSelectedPlan(algo)}
                  className={`px-6 py-2.5 rounded-lg font-display font-semibold text-sm transition-all ${selectedPlan === algo
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-steel-700 text-gray-300 hover:bg-steel-600'}`}>
                  {algo === 'greedy' ? '⚡ Greedy Heuristic' : '🎯 MILP Optimization'}
                </button>
              ))}
            </div>
          )}

          {/* Summary KPIs */}
          {activePlan && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Wagons Assigned" value={summary.total_wagons} icon={Train} accent="blue" />
              <KPICard label="Avg Utilization" value={summary.avg_utilization_pct} unit="%" icon={Target} accent={summary.avg_utilization_pct >= 80 ? 'green' : 'orange'} />
              <KPICard label="Confidence Score" value={summary.confidence_score} unit="%" icon={CheckCircle} accent="green" />
              <KPICard label="Net Savings" value={`₹${Math.abs(Math.round((summary.net_savings || 0) / 1000))}K`} icon={TrendingUp} accent={summary.net_savings > 0 ? 'green' : 'red'} />
            </div>
          )}

          {/* Cost Breakdown */}
          {activePlan && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Financial Summary</div>
                <div className="space-y-3">
                  {[
                    { label: 'Freight Cost', value: summary.total_freight_cost, color: 'text-red-400' },
                    { label: 'Penalty Avoided', value: summary.total_penalty_avoided, color: 'text-green-400' },
                    { label: 'Net Position', value: summary.net_savings, color: summary.net_savings > 0 ? 'text-green-400' : 'text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">{label}</span>
                      <span className={`font-mono font-bold ${color}`}>₹{Math.abs(value || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="border-t border-steel-700 pt-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-mono text-gray-400">Runtime</span>
                      <span className="text-xs font-mono text-gray-300">{summary.runtime_ms}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Load Statistics</div>
                <div className="space-y-3">
                  {[
                    { label: 'Total Loaded', value: `${summary.total_loaded_tons?.toFixed(1)}T` },
                    { label: 'Total Capacity', value: `${summary.total_capacity_tons?.toFixed(1)}T` },
                    { label: 'Orders Covered', value: summary.orders_covered },
                    { label: 'Algorithm', value: activePlan.algorithm?.split(' ')[0] },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">{label}</span>
                      <span className="font-mono text-sm text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Utilization Gauge</div>
                <div className="flex flex-col items-center justify-center h-24">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#0B3C5D" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#FF7A00" strokeWidth="10"
                        strokeDasharray={`${(summary.avg_utilization_pct || 0) * 2.51} 251`}
                        strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-xl font-bold text-white">{summary.avg_utilization_pct?.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-400 mt-1">Fleet Utilization</div>
                </div>
              </div>
            </div>
          )}

          {/* Wagon Assignments Table */}
          {activePlan?.wagon_assignments && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-steel-700/50 flex items-center justify-between">
                <div className="font-display font-semibold text-white">Wagon Assignment Plan — {activePlan.rake_id}</div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-xs font-mono text-green-400">All Compatibility Validated</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead className="border-b border-steel-700">
                    <tr>
                      {['Wagon ID', 'Type', 'Order ID', 'Product', 'Destination', 'Loaded (T)', 'Capacity (T)', 'Unused (T)', 'Utilization', 'Freight Cost', 'Penalty Avoided'].map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePlan.wagon_assignments.slice(0, 60).map((a, i) => (
                      <tr key={i} className="hover:bg-steel-700/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-orange-400">{a.wagon_id}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-300">{a.wagon_type}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{a.order_id}</td>
                        <td className="px-4 py-2.5 text-xs">{a.product_type}</td>
                        <td className="px-4 py-2.5 text-xs">{a.destination}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-green-300">{a.loaded_tons}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{a.capacity_tons}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-yellow-400">{a.unused_capacity}</td>
                        <td className="px-4 py-2.5 min-w-28">
                          <ProgressBar value={a.utilization_pct} max={100} color={a.utilization_pct >= 80 ? 'green' : a.utilization_pct >= 60 ? 'orange' : 'red'} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-red-300">₹{a.freight_cost?.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-green-300">
                          {a.penalty_avoided > 0 ? `₹${a.penalty_avoided.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-steel-700/50 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  Showing {Math.min(60, activePlan.wagon_assignments.length)} of {activePlan.wagon_assignments.length} wagon assignments
                </span>
                <button className="btn-primary text-sm flex items-center gap-2">
                  <CheckCircle size={14} /> Approve & Dispatch
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
