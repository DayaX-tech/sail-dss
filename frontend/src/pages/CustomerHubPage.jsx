import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '../components/UIKit'
import { Mail, Send, Search, CheckCircle, Clock, AlertTriangle, Package, MapPin } from 'lucide-react'
import axios from 'axios'
import { fetchOrders } from '../services/api'

const BASE = 'https://sail-dss-backend.onrender.com'

export default function CustomerHubPage() {
  const [tab, setTab]         = useState('dispatch')
  const [orders, setOrders]   = useState([])
  const [dispatchLog, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [trackId, setTrackId] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [form, setForm] = useState({
    order_id:'', customer_name:'', customer_email:'',
    product_type:'', quantity_tons:'', destination:'',
    rake_id:'', total_wagons:8, freight_cost:0,
  })
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Load orders and dispatch log separately so one failure doesn't blank the page
    fetchOrders({ status:'PENDING', limit:100 })
      .then(od => setOrders(od?.orders || []))
      .catch(() => setOrders([]))

    axios.get(`${BASE}/dispatch/log`)
      .then(dl => setLog(dl.data?.dispatches || []))
      .catch(() => setLog([]))
      .finally(() => setLoading(false))
  }, [])

  const fillFromOrder = (o) => {
    setForm(p => ({
      ...p,
      order_id:       String(o.order_id),
      customer_name:  o.customer_name || o.customer_id || '',
      customer_email: o.customer_email || '',
      product_type:   o.product_type || o.product_code || '',
      quantity_tons:  String(Math.round(o.quantity_tons || 0)),
      destination:    o.destination || '',
      rake_id:        `RK-${String(Date.now()).slice(-4)}`,
    }))
  }

  const sendDispatch = async () => {
    if (!form.order_id || !form.customer_email) return alert('Fill Order ID and Customer Email')
    setSending(true)
    try {
      const r = await axios.post(`${BASE}/dispatch/confirm`, {
        ...form,
        quantity_tons: +form.quantity_tons,
        total_wagons:  +form.total_wagons,
        freight_cost:  +form.freight_cost,
      })
      setResult(r.data)
      const dl = await axios.get(`${BASE}/dispatch/log`)
      setLog(dl.data?.dispatches || [])
    } catch(e) {
      setResult({ error: e.message })
    } finally { setSending(false) }
  }

  const trackOrder = async () => {
    if (!trackId) return
    setTracking(true)
    try {
      const r = await axios.get(`${BASE}/track/${trackId}`)
      setTrackResult(r.data)
    } catch { setTrackResult({ found:false }) }
    setTracking(false)
  }

  const STAGE_STEPS = ['Order Received', 'Rake Formed', 'Dispatched', 'In Transit', 'Near Destination', 'Arrived']

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Customer Communications Hub</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">Dispatch confirmation emails · e-RR PDF generation · Order tracking portal</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { k:'dispatch', label:'📧 Send Dispatch Email' },
          { k:'track',    label:'🔍 Order Tracking' },
          { k:'log',      label:`📋 Dispatch Log (${dispatchLog.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
            style={{ background:tab===t.k?'rgba(255,122,0,0.2)':'rgba(11,60,93,0.3)', border:`1px solid ${tab===t.k?'#FF7A00':'#0B3C5D'}`, color:tab===t.k?'#FF7A00':'#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dispatch Tab */}
      {tab === 'dispatch' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Order picker */}
          <div className="card p-4">
            <div className="text-xs font-mono text-gray-500 uppercase mb-3">Select Pending Order</div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight:400 }}>
              {loading ? <LoadingSpinner text="Loading..."/> : orders.map((o,i) => (
                <div key={i} onClick={() => fillFromOrder(o)}
                  className="p-2 rounded-lg cursor-pointer hover:bg-steel-700/30 transition-colors"
                  style={{ background: form.order_id===String(o.order_id)?'rgba(255,122,0,0.12)':'rgba(11,60,93,0.15)',
                    border:`1px solid ${form.order_id===String(o.order_id)?'rgba(255,122,0,0.4)':'rgba(11,60,93,0.2)'}` }}>
                  <div className="flex justify-between">
                    <span className="font-mono text-orange-400 text-xs font-bold">{o.order_id}</span>
                    <span className="text-xs" style={{ color:(o.risk_score||0)>=0.7?'#ff2d55':'#34c759' }}>{(o.risk_score||0)>=0.7?'HIGH RISK':'OK'}</span>
                  </div>
                  <div className="text-gray-300 text-xs mt-1">{o.product_type} → {o.destination}</div>
                  <div className="text-gray-500 text-xs">{Math.round(o.quantity_tons||0)}T · ₹{(o.penalty_cost||0).toLocaleString('en-IN')}/day</div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="col-span-2 card p-5">
            <div className="text-xs font-mono text-gray-500 uppercase mb-4">Dispatch Confirmation Details</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label:'Order ID',        key:'order_id',       type:'text' },
                { label:'Customer Email',  key:'customer_email', type:'email', ph:'customer@company.com' },
                { label:'Customer Name',   key:'customer_name',  type:'text' },
                { label:'Product Code',    key:'product_type',   type:'text' },
                { label:'Quantity (Tons)', key:'quantity_tons',  type:'number' },
                { label:'Destination',     key:'destination',    type:'text' },
                { label:'Rake ID',         key:'rake_id',        type:'text' },
                { label:'Total Wagons',    key:'total_wagons',   type:'number' },
                { label:'Freight Cost (₹)',key:'freight_cost',   type:'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-mono text-gray-400 mb-1 uppercase">{f.label}</label>
                  <input type={f.type} value={form[f.key]} placeholder={f.ph||''}
                    onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none"/>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg mb-4 text-xs font-mono" style={{ background:'rgba(21,101,160,0.1)', border:'1px solid rgba(21,101,160,0.2)' }}>
              <div className="text-blue-300 font-bold mb-1">📧 What this sends:</div>
              <div className="text-gray-400">1. Dispatch confirmation email with e-RR PDF attached</div>
              <div className="text-gray-400">2. PDF includes: rake ID, wagon list, ETA, freight cost, SAIL letterhead</div>
              <div className="text-gray-400">3. Tracking link included in email</div>
              {!process.env.REACT_APP_HAS_EMAIL && <div className="text-yellow-400 mt-1">⚠️ Add GMAIL_USER + GMAIL_APP_PASSWORD to .env for live email</div>}
            </div>

            <button onClick={sendDispatch} disabled={sending} className="btn-primary flex items-center gap-2">
              {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={16}/>}
              {sending ? 'Sending...' : 'Send Dispatch Confirmation + e-RR PDF'}
            </button>

            {result && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="mt-4 p-3 rounded-lg text-xs font-mono"
                style={{ background: result.error?'rgba(255,45,85,0.08)':'rgba(52,199,89,0.08)',
                  border:`1px solid ${result.error?'rgba(255,45,85,0.25)':'rgba(52,199,89,0.25)'}` }}>
                {result.error
                  ? <span className="text-red-400">❌ {result.error}</span>
                  : <>
                    <div className="text-green-400 font-bold mb-1">✅ Dispatch logged successfully</div>
                    <div className="text-gray-400">Email status: <span className={result.email_result?.status==='sent'?'text-green-400':'text-yellow-400'}>{result.email_result?.status}</span></div>
                    {result.email_result?.status==='mock' && <div className="text-yellow-400 mt-1">Add GMAIL_USER + GMAIL_APP_PASSWORD to .env to send real emails</div>}
                  </>
                }
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Track Tab */}
      {tab === 'track' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-mono text-gray-500 uppercase mb-3">Track Order by ID</div>
            <div className="flex gap-3">
              <input value={trackId} onChange={e=>setTrackId(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&trackOrder()}
                placeholder="Enter Order ID e.g. ORD-00001"
                className="flex-1 bg-steel-700/50 border border-steel-600 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-200 outline-none"/>
              <button onClick={trackOrder} disabled={tracking} className="btn-primary flex items-center gap-2">
                {tracking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Search size={16}/>}
                Track
              </button>
            </div>
          </div>

          {trackResult && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              className="card p-6" style={{ border: trackResult.found?'1px solid rgba(52,199,89,0.3)':'1px solid rgba(255,45,85,0.3)' }}>
              {!trackResult.found
                ? <div className="text-center text-red-400 font-mono">❌ Order not found</div>
                : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-display font-black text-xl text-white">Order {trackResult.order_id}</div>
                      <div className="text-gray-400 text-sm font-mono mt-1">{trackResult.destination} · {trackResult.transit_status}</div>
                    </div>
                    <div className="text-xs font-mono px-4 py-2 rounded-full"
                      style={{ background:'rgba(52,199,89,0.12)', color:'#34c759', border:'1px solid rgba(52,199,89,0.3)' }}>
                      {trackResult.transit_status}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
                      <span>Bokaro Steel Plant</span>
                      <span>{trackResult.destination}</span>
                    </div>
                    <div className="h-2 bg-steel-700 rounded-full overflow-hidden">
                      <motion.div animate={{ width:`${trackResult.progress_pct||5}%` }} transition={{ duration:1 }}
                        className="h-full rounded-full" style={{ background:'linear-gradient(90deg,#FF7A00,#34c759)' }}/>
                    </div>
                    <div className="text-center text-xs font-mono text-orange-400 mt-1">{trackResult.progress_pct||5}% of journey complete</div>
                  </div>

                  {/* Stage steps */}
                  <div className="flex items-center justify-between">
                    {STAGE_STEPS.map((stage, i) => {
                      const prog = trackResult.progress_pct || 5
                      const stagePct = (i / (STAGE_STEPS.length-1)) * 100
                      const done = prog >= stagePct
                      return (
                        <div key={i} className="flex flex-col items-center text-center" style={{ flex:1 }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1"
                            style={{ background:done?'#34c759':'rgba(11,60,93,0.5)', color:done?'#000':'#4da6d9', border:`1px solid ${done?'#34c759':'#0B3C5D'}` }}>
                            {done ? '✓' : i+1}
                          </div>
                          <div className="text-gray-500 font-mono" style={{ fontSize:9 }}>{stage}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      { l:'Rake ID',      v:trackResult.rake_id||'—',     c:'#FF7A00' },
                      { l:'ETA',          v:trackResult.eta||'—',         c:'#34c759' },
                      { l:'Email Sent',   v:trackResult.email_sent?'Yes':'No', c:trackResult.email_sent?'#34c759':'#ff2d55' },
                    ].map((k,i)=>(
                      <div key={i} className="card p-3 text-center">
                        <div className="font-display font-bold text-sm" style={{color:k.c}}>{k.v}</div>
                        <div className="text-gray-500 text-xs font-mono mt-1">{k.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Log Tab */}
      {tab === 'log' && (
        <div className="overflow-x-auto">
          {dispatchLog.length === 0
            ? <div className="card p-10 text-center text-gray-500 font-mono">No dispatches logged yet. Use the Send tab.</div>
            : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-700/50">
                  {['ORDER','CUSTOMER','DESTINATION','RAKE','DISPATCHED','ETA','EMAIL'].map(h=>(
                    <th key={h} className="text-left py-2 px-3 font-mono text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatchLog.map((d,i)=>(
                  <motion.tr key={i} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.02 }}
                    className="border-b border-steel-700/20 hover:bg-steel-700/10">
                    <td className="py-2 px-3 font-mono text-orange-400 font-bold">{d.order_id}</td>
                    <td className="py-2 px-3 text-gray-300 truncate max-w-28">{d.customer_name}</td>
                    <td className="py-2 px-3 text-gray-300">{d.destination}</td>
                    <td className="py-2 px-3 font-mono text-blue-300">{d.rake_id}</td>
                    <td className="py-2 px-3 text-gray-400 text-xs">{new Date(d.dispatched_at).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-green-400 font-mono">{d.eta}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-xs"
                        style={{ background:d.email_status==='sent'?'rgba(52,199,89,0.12)':'rgba(255,204,2,0.12)',
                          color:d.email_status==='sent'?'#34c759':'#ffcc02',
                          border:`1px solid ${d.email_status==='sent'?'rgba(52,199,89,0.3)':'rgba(255,204,2,0.3)'}` }}>
                        {d.email_status==='sent'?'✅ SENT':'📋 MOCK'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
