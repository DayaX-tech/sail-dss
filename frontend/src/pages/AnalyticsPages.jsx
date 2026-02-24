import React, { useEffect, useState } from 'react'
import { fetchAnalytics, fetchSimulation, generatePlan, fetchExplanation } from '../services/api'
import { LoadingSpinner, ErrorState, KPICard, ProgressBar } from '../components/UIKit'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, RadarChart as RC,
  Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { BarChart3, AlertTriangle, FlaskConical, History, TrendingUp, Activity, Lightbulb, GitCompare } from 'lucide-react'

const COLORS = ['#FF7A00', '#1565a0', '#34c759', '#ff2d55', '#ffcc02', '#7ec8e3']

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      {label && <div className="text-gray-300 mb-1">{label}</div>}
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</div>)}
    </div>
  )
}

// ─── Cost & Penalty Analytics ────────────────────────────────────────────────
export function CostAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading analytics..." />

  const hist = data?.historical_performance || []
  const prodPerf = data?.product_performance || []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Cost & Penalty Analytics</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">30-day financial performance and penalty risk analysis</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Total Penalty Exposure" value={`₹${Math.round((data?.total_penalty_exposure || 0) / 100000)}L`} icon={AlertTriangle} accent="red" />
        <KPICard label="Avg Urgency Score" value={((data?.avg_urgency_score || 0) * 100).toFixed(1)} unit="%" icon={Activity} accent="orange" />
        <KPICard label="Active Pending Orders" value={Object.values(data?.risk_distribution || {}).reduce((a, b) => a + b, 0)} icon={BarChart3} accent="blue" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="section-title">30-Day Cost vs Penalty Avoided</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hist.slice(-14)}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="penaltyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34c759" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="freight_cost" name="Freight Cost" stroke="#ff2d55" fill="url(#costGrad)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="penalties_avoided" name="Penalty Avoided" stroke="#34c759" fill="url(#penaltyGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="section-title">Risk Distribution (Pending Orders)</div>
          <div className="space-y-3 mt-4">
            {Object.entries(data?.risk_distribution || {}).map(([level, count], i) => (
              <div key={level}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-xs text-gray-400">{level}</span>
                  <span className="font-mono text-xs text-white">{count.toLocaleString()} orders</span>
                </div>
                <div className="h-3 bg-steel-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(count / (Object.values(data.risk_distribution).reduce((a, b) => a + b, 0))) * 100}%`, background: COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="section-title">Product Performance Analysis</div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="border-b border-steel-700">
              <tr>
                {['Product', 'Avg Utilization', 'Total Dispatched (T)', 'Avg Freight Cost'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {prodPerf.map(p => (
                <tr key={p.product} className="hover:bg-steel-700/20">
                  <td className="px-4 py-2.5 font-medium">{p.product}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-steel-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${p.avg_utilization}%` }} />
                      </div>
                      <span className="font-mono text-xs">{p.avg_utilization}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.total_dispatched_tons.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-red-300">₹{p.avg_freight_cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Risk Monitor ────────────────────────────────────────────────────────────
export function RiskMonitor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Analyzing risk exposure..." />

  const hist = data?.historical_performance || []
  const wagonUtil = Object.entries(data?.wagon_utilization_by_type || {}).map(([k, v]) => ({ type: k, util: v }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Dispatch Risk Monitor</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">Penalty risk exposure and operational risk scoring</p>
      </div>

      {/* Risk Gauge Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(data?.risk_distribution || {}).map(([level, count], i) => {
          const colors = { CRITICAL: 'red', HIGH: 'orange', MEDIUM: 'yellow', LOW: 'green' }
          return <KPICard key={level} label={`${level} Risk`} value={count} icon={AlertTriangle} accent={colors[level] || 'blue'} />
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="section-title">Wagon Utilization by Type</div>
          <div className="space-y-3">
            {wagonUtil.map(({ type, util }) => (
              <div key={type}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-sm text-white">{type}</span>
                  <span className={`font-mono text-sm ${util >= 80 ? 'text-green-400' : util >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{util}%</span>
                </div>
                <div className="h-3 bg-steel-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${util}%`, background: util >= 80 ? '#34c759' : util >= 60 ? '#FF7A00' : '#ff2d55' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title">Daily Dispatch Performance</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hist.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="rakes_dispatched" name="Rakes" stroke="#FF7A00" strokeWidth={2} dot={{ r: 3, fill: '#FF7A00' }} />
              <Line type="monotone" dataKey="avg_utilization" name="Utilization %" stroke="#34c759" strokeWidth={2} dot={{ r: 3, fill: '#34c759' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Digital Twin Simulation ─────────────────────────────────────────────────
export function SimulationPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSim = async () => {
    setLoading(true)
    fetchSimulation().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const scenarioColors = { Optimistic: '#34c759', 'Base Case': '#FF7A00', Pessimistic: '#ff2d55' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Digital Twin — Simulation Mode</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Next-day demand forecasting and scenario analysis</p>
        </div>
        <button onClick={runSim} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FlaskConical size={16} />}
          {loading ? 'Running Simulation...' : 'Run Digital Twin'}
        </button>
      </div>

      {!data && !loading && (
        <div className="card p-12 text-center">
          <FlaskConical size={48} className="text-orange-400 mx-auto mb-4 opacity-60" />
          <div className="font-display text-xl text-gray-300 mb-2">Digital Twin Ready</div>
          <div className="text-gray-500 text-sm font-mono mb-6">Run the simulation to forecast next-day operations and risk scenarios</div>
          <button onClick={runSim} className="btn-primary">Initialize Simulation</button>
        </div>
      )}

      {loading && <LoadingSpinner text="Running Monte Carlo simulation..." />}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Predicted Orders" value={data.predicted_orders} icon={Activity} accent="blue" />
            <KPICard label="Demand Forecast (T)" value={data.predicted_demand_tons?.toLocaleString()} icon={TrendingUp} accent="orange" />
            <KPICard label="Delay Probability" value={(data.delay_probability * 100).toFixed(0)} unit="%" icon={AlertTriangle} accent={data.delay_probability > 0.3 ? 'red' : 'yellow'} />
            <KPICard label="Simulation Confidence" value={(data.simulation_confidence * 100).toFixed(0)} unit="%" icon={Activity} accent="green" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(data.scenarios || []).map(s => (
              <div key={s.scenario} className="card p-5 text-center" style={{ borderColor: scenarioColors[s.scenario] + '44', boxShadow: `0 0 20px ${scenarioColors[s.scenario]}11` }}>
                <div className="font-display text-lg font-bold" style={{ color: scenarioColors[s.scenario] }}>{s.scenario}</div>
                <div className="font-display text-4xl font-bold text-white mt-3 mb-1">{s.rakes_needed}</div>
                <div className="font-mono text-xs text-gray-400 uppercase tracking-wider">Rakes Required</div>
                <div className="mt-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${s.penalty_risk === 'HIGH' ? 'badge-high' : s.penalty_risk === 'MEDIUM' ? 'badge-medium' : 'badge-low'}`}>
                    {s.penalty_risk} RISK
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <div className="section-title">Product Demand Forecast (Next Day)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(data.product_demand_forecast || {}).map(([k, v]) => ({ product: k.split(' ').map(w => w[0]).join(''), fullName: k, tons: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
                <XAxis dataKey="product" tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip content={<CT />} />
                <Bar dataKey="tons" name="Forecast (T)" radius={[4, 4, 0, 0]}>
                  {Object.keys(data.product_demand_forecast || {}).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <div className="section-title">Forecast Summary</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">Forecast Date</div>
                <div className="font-display text-xl text-white">{data.forecast_date}</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">Wagon Shortage Risk</div>
                <div className={`font-display text-xl font-bold ${data.wagon_shortage_risk === 'HIGH' ? 'text-red-400' : data.wagon_shortage_risk === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {data.wagon_shortage_risk}
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">Reserve Wagons</div>
                <div className="font-display text-xl text-orange-400">{data.recommended_wagon_reservation}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Algorithm Comparison ─────────────────────────────────────────────────────
export function ComparisonPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runComparison = async () => {
    setLoading(true)
    try {
      const d = await generatePlan({ algorithm: 'both', max_wagons: 50 })
      setResult(d)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const comp = result?.comparison || {}
  const metrics = comp.metrics || {}

  const radarData = ['avg_utilization_pct', 'confidence_score', 'orders_covered'].map(m => ({
    metric: m.replace(/_/g, ' ').replace('pct', '%').toUpperCase(),
    Greedy: metrics[m]?.[0] || 0,
    MILP: metrics[m]?.[1] || 0,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Optimization Plan Comparison</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Head-to-head comparison of Greedy vs MILP optimization</p>
        </div>
        <button onClick={runComparison} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <GitCompare size={16} />}
          {loading ? 'Comparing...' : 'Run Comparison'}
        </button>
      </div>

      {!result && !loading && (
        <div className="card p-12 text-center">
          <GitCompare size={48} className="text-orange-400 mx-auto mb-4 opacity-60" />
          <div className="font-display text-xl text-gray-300 mb-2">Algorithm Comparison</div>
          <div className="text-gray-500 text-sm font-mono mb-6">Compare Greedy Heuristic vs MILP Optimization side by side</div>
          <button onClick={runComparison} className="btn-primary">Start Comparison</button>
        </div>
      )}

      {loading && <LoadingSpinner text="Running parallel optimization algorithms..." />}

      {result && !loading && (
        <>
          {comp.winner && (
            <div className="card p-4 glowing-border text-center">
              <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">Algorithm Winner</div>
              <div className="font-display text-2xl font-bold text-orange-400">{comp.winner}</div>
              <div className="text-sm text-gray-400 mt-1">{comp.recommendation}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {['greedy', 'milp'].map((algo, ai) => {
              const plan = result[algo]?.summary || {}
              return (
                <div key={algo} className={`card p-5 ${comp.winner?.toLowerCase().includes(algo === 'milp' ? 'milp' : 'greedy') ? 'glowing-border' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-display text-lg font-bold text-white">
                      {algo === 'greedy' ? '⚡ Greedy Heuristic' : '🎯 MILP Optimization'}
                    </div>
                    {comp.winner?.toLowerCase().includes(algo === 'milp' ? 'milp' : 'greedy') && (
                      <span className="text-xs font-mono text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded">WINNER</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Wagons', plan.total_wagons],
                      ['Avg Utilization', `${plan.avg_utilization_pct}%`],
                      ['Freight Cost', `₹${(plan.total_freight_cost || 0).toLocaleString()}`],
                      ['Penalty Avoided', `₹${(plan.total_penalty_avoided || 0).toLocaleString()}`],
                      ['Net Savings', `₹${(plan.net_savings || 0).toLocaleString()}`],
                      ['Runtime', `${plan.runtime_ms}ms`],
                      ['Confidence', `${plan.confidence_score}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-center border-b border-steel-700/30 pb-1.5">
                        <span className="text-sm text-gray-400">{label}</span>
                        <span className="font-mono text-sm text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card p-5">
            <div className="section-title">Metric Comparison</div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(metrics).slice(0, 6).map(([metric, values]) => {
                const [gv, mv] = values
                const pct0 = Math.max(gv, mv) > 0 ? (gv / Math.max(gv, mv)) * 100 : 0
                const pct1 = Math.max(gv, mv) > 0 ? (mv / Math.max(gv, mv)) * 100 : 0
                return (
                  <div key={metric}>
                    <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">{metric.replace(/_/g, ' ')}</div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-yellow-400 font-mono">Greedy</span>
                          <span className="font-mono text-gray-300">{typeof gv === 'number' ? gv.toLocaleString() : gv}</span>
                        </div>
                        <div className="h-2 bg-steel-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${pct0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-orange-400 font-mono">MILP</span>
                          <span className="font-mono text-gray-300">{typeof mv === 'number' ? mv.toLocaleString() : mv}</span>
                        </div>
                        <div className="h-2 bg-steel-700 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct1}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── AI Explanation Center ────────────────────────────────────────────────────
export function ExplanationPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [algo, setAlgo] = useState('milp')

  const load = async () => {
    setLoading(true)
    fetchExplanation(algo).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const factorColors = { HIGH: '#FF7A00', MEDIUM: '#ffcc02', LOW: '#34c759' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">AI Decision Explanation Center</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Explainable AI — why the algorithm made each decision</p>
        </div>
        <div className="flex gap-2">
          <select value={algo} onChange={e => setAlgo(e.target.value)}
            className="bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
            <option value="milp">MILP Optimization</option>
            <option value="greedy">Greedy Heuristic</option>
          </select>
          <button onClick={load} disabled={loading} className="btn-primary flex items-center gap-2">
            <Lightbulb size={16} /> {loading ? 'Explaining...' : 'Explain Plan'}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner text="Generating AI explanation..." />}

      {data && !loading && (
        <>
          <div className="card p-5 glowing-border">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-lg font-bold text-white">{data.algorithm} — Decision Rationale</div>
              <div className={`px-3 py-1 rounded-lg text-sm font-mono font-bold ${data.recommendation === 'APPROVE' ? 'bg-green-900/30 text-green-400 border border-green-700/50' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50'}`}>
                {data.recommendation}
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="font-mono text-sm text-gray-400">Confidence Score</div>
              <div className="flex-1 h-3 bg-steel-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${data.confidence_score}%` }} />
              </div>
              <div className="font-mono font-bold text-orange-400">{data.confidence_score}%</div>
            </div>
            {data.warnings?.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-yellow-400 text-sm font-mono bg-yellow-900/10 border border-yellow-700/30 rounded px-3 py-2">
                <AlertTriangle size={14} /> {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(data.factors || []).map(f => (
              <div key={f.factor} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display text-base font-semibold text-white">{f.factor}</div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: factorColors[f.impact], borderColor: factorColors[f.impact] + '50', background: factorColors[f.impact] + '11' }}>
                    {f.impact} IMPACT
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-gray-400">Contribution Weight</span>
                    <span className="font-mono text-orange-400">{(f.contribution * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 bg-steel-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.contribution * 100}%`, background: factorColors[f.impact] }} />
                  </div>
                </div>
                <div className="text-sm text-gray-400 leading-relaxed">{f.description}</div>
              </div>
            ))}
          </div>

          {data.product_distribution && (
            <div className="card p-5">
              <div className="section-title">Product Distribution in Recommended Plan</div>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data.product_distribution).map(([prod, tons], i) => (
                  <div key={prod} className="text-center">
                    <div className="font-display text-2xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{Math.round(tons).toLocaleString()}T</div>
                    <div className="font-mono text-xs text-gray-400">{prod}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Historical Analytics ─────────────────────────────────────────────────────
export function HistoricalPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading historical data..." />

  const hist = data?.historical_performance || []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Historical Performance Analytics</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">30-day operational history and trend analysis</p>
      </div>

      <div className="card p-5">
        <div className="section-title">Rake Dispatches — 30 Day Trend</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hist}>
            <defs>
              <linearGradient id="rakesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={d => d?.slice(5)} interval={4} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip content={<CT />} />
            <Area type="monotone" dataKey="rakes_dispatched" name="Rakes Dispatched" stroke="#FF7A00" fill="url(#rakesGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="avg_utilization" name="Avg Utilization %" stroke="#1565a0" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5">
        <div className="section-title">Financial Performance Trend (₹ Millions)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hist.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={d => d?.slice(5)} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `₹${(v / 1000000).toFixed(1)}M`} />
            <Tooltip content={<CT />} formatter={(v) => [`₹${(v / 1000000).toFixed(2)}M`]} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
            <Bar dataKey="freight_cost" name="Freight Cost" fill="#ff2d55" radius={[2, 2, 0, 0]} opacity={0.8} />
            <Bar dataKey="penalties_avoided" name="Penalty Avoided" fill="#34c759" radius={[2, 2, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
