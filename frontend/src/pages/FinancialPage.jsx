import React, { useEffect, useState } from 'react'
import { LoadingSpinner, KPICard } from '../components/UIKit'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { TrendingUp, AlertTriangle, DollarSign, Activity } from 'lucide-react'
import axios from 'axios'

const BASE = ''
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      {label && <div className="text-gray-300 mb-1">{label}</div>}
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</div>)}
    </div>
  )
}

export default function FinancialPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    axios.get(`${BASE}/financial`).then(r => setData(r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading financial data..." />
  if (!data)   return <div className="card p-8 text-center text-gray-400 font-mono">Failed to load financial data</div>

  const hist     = data.historical_30days || []
  const routes   = data.route_cost_analysis || []
  const products = data.product_summary || []
  const demurrage= data.demurrage_detail || []

  const fmtRs = n => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`

  const TABS = ['overview','demurrage','routes','products']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Financial Control Center</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Real penalty exposure · Demurrage tracking · Route cost analysis — all from live data</p>
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
              style={{ background: tab===t ? 'rgba(255,122,0,0.2)' : 'rgba(11,60,93,0.3)', border: `1px solid ${tab===t ? '#FF7A00' : '#0B3C5D'}`, color: tab===t ? '#FF7A00' : '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Penalty Exposure Today" value={fmtRs(data.total_penalty_exposure||0)} icon={AlertTriangle} accent="red" />
        <KPICard label="Critical Penalty (<2d)" value={fmtRs(data.critical_penalty_today||0)} icon={AlertTriangle} accent="orange" />
        <KPICard label="Demurrage Accrued" value={fmtRs(data.total_demurrage_accrued||0)} icon={DollarSign} accent="yellow" />
        <KPICard label="30-Day Net Savings" value={fmtRs(data.total_savings_30d||0)} icon={TrendingUp} accent="green" />
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {/* 30-day trend */}
          <div className="card p-5">
            <div className="section-title">30-Day Penalty Avoided vs Freight Cost (Real Data)</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hist}>
                <defs>
                  <linearGradient id="penGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34c759" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34c759" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="frGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff2d55" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D"/>
                <XAxis dataKey="date" tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={d=>d?.slice(5)}/>
                <YAxis tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`}/>
                <Tooltip content={<CT/>}/>
                <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }}/>
                <Area type="monotone" dataKey="penalties_avoided" name="Penalty Avoided" stroke="#34c759" fill="url(#penGrad)" strokeWidth={2}/>
                <Area type="monotone" dataKey="freight_cost"      name="Freight Cost"    stroke="#ff2d55" fill="url(#frGrad)"  strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="section-title">Daily Rakes Dispatched (30 days)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={hist.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D"/>
                  <XAxis dataKey="date" tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={d=>d?.slice(5)}/>
                  <YAxis tick={{ fill:'#9ca3af', fontSize:9 }}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="rakes_dispatched" name="Rakes" fill="#FF7A00" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <div className="section-title">Avg Utilization Trend</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={hist.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D"/>
                  <XAxis dataKey="date" tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={d=>d?.slice(5)}/>
                  <YAxis domain={[60,100]} tick={{ fill:'#9ca3af', fontSize:9 }}/>
                  <Tooltip content={<CT/>}/>
                  <Line type="monotone" dataKey="avg_utilization" name="Utilization %" stroke="#1565a0" strokeWidth={2} dot={{ r:3, fill:'#1565a0' }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'demurrage' && (
        <div className="space-y-4">
          <div className="card p-4" style={{ background:'rgba(255,45,85,0.05)', border:'1px solid rgba(255,45,85,0.2)' }}>
            <div className="text-xs font-mono text-red-400 font-bold mb-1">⚠️ DEMURRAGE ALERT</div>
            <div className="text-sm text-gray-300">Indian Railways charges <strong className="text-orange-400">₹8,000/wagon/day</strong> after 48 hrs free time. {data.critical_wagons_count} wagons are currently in critical demurrage zone.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-700/50">
                  {['WAGON ID','TYPE','LOCATION','HOURS SITTING','FREE HRS LEFT','DEMURRAGE','STATUS','ACTION'].map(h=>(
                    <th key={h} className="text-left py-2 px-3 font-mono text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demurrage.map((d,i)=>{
                  const sc = d.status==='CRITICAL'?'#ff2d55':d.status==='WARNING'?'#ffcc02':'#34c759'
                  return (
                    <tr key={i} className="border-b border-steel-700/20 hover:bg-steel-700/10">
                      <td className="py-2 px-3 font-mono text-orange-400">{d.wagon_id}</td>
                      <td className="py-2 px-3 font-mono text-blue-300">{d.wagon_type}</td>
                      <td className="py-2 px-3 text-gray-300 text-xs">{d.location}</td>
                      <td className="py-2 px-3 font-mono" style={{color:sc}}>{d.hours_sitting}h</td>
                      <td className="py-2 px-3 font-mono text-gray-400">{d.free_hours_left}h</td>
                      <td className="py-2 px-3 font-mono" style={{color:d.demurrage_cost>0?'#ff2d55':'#34c759'}}>
                        {d.demurrage_cost>0?`₹${d.demurrage_cost.toLocaleString('en-IN')}`:'Free'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded font-mono text-xs" style={{background:`${sc}15`,color:sc,border:`1px solid ${sc}30`}}>{d.status}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs max-w-32 truncate">{d.action_needed}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'routes' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="section-title">Freight Cost by Destination (Real from routes.csv)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={routes.sort((a,b)=>b.freight_cost_per_ton-a.freight_cost_per_ton).slice(0,15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D" horizontal={false}/>
                <XAxis type="number" tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/>
                <YAxis dataKey="destination" type="category" tick={{ fill:'#9ca3af', fontSize:9 }} width={70}/>
                <Tooltip content={<CT/>} formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'']}/>
                <Bar dataKey="freight_cost_per_ton" name="₹/ton" radius={[0,3,3,0]}>
                  {routes.map((_,i)=><Cell key={i} fill={['#FF7A00','#1565a0','#34c759','#ff2d55','#ffcc02'][i%5]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-700/50">
                  {['DESTINATION','DISTANCE (KM)','FREIGHT ₹/TON','ZONE','TRANSIT DAYS'].map(h=>(
                    <th key={h} className="text-left py-2 px-3 font-mono text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routes.map((r,i)=>(
                  <tr key={i} className="border-b border-steel-700/20 hover:bg-steel-700/10">
                    <td className="py-2 px-3 text-orange-400 font-mono font-bold">{r.destination}</td>
                    <td className="py-2 px-3 text-gray-300 font-mono">{r.distance_km}</td>
                    <td className="py-2 px-3 text-green-400 font-mono">₹{r.freight_cost_per_ton?.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-blue-300 text-xs">{r.zone}</td>
                    <td className="py-2 px-3 text-gray-400 font-mono">{Math.max(1,Math.round(r.distance_km/350))}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="section-title">Penalty Exposure by Product (Real from orders.csv)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0B3C5D"/>
                <XAxis dataKey="product" tick={{ fill:'#9ca3af', fontSize:9 }}/>
                <YAxis tick={{ fill:'#9ca3af', fontSize:9 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={<CT/>}/>
                <Bar dataKey="penalty_per_day" name="Penalty/Day" fill="#ff2d55" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-700/50">
                  {['PRODUCT','PENDING ORDERS','TOTAL QTY (T)','PENALTY/DAY'].map(h=>(
                    <th key={h} className="text-left py-2 px-3 font-mono text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p,i)=>(
                  <tr key={i} className="border-b border-steel-700/20 hover:bg-steel-700/10">
                    <td className="py-2 px-3 font-mono text-orange-400 font-bold">{p.product}</td>
                    <td className="py-2 px-3 text-gray-300 font-mono">{p.orders}</td>
                    <td className="py-2 px-3 text-blue-300 font-mono">{p.total_qty_tons?.toLocaleString('en-IN')}T</td>
                    <td className="py-2 px-3 font-mono text-red-400">₹{p.penalty_per_day?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
