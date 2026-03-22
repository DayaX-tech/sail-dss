import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '../components/UIKit'
import { ClipboardList, Plus, CheckCircle, AlertTriangle, Moon, Sun, Sunset } from 'lucide-react'
import axios from 'axios'

const BASE = ''
const SHIFTS = ['Morning (06:00–14:00)', 'Afternoon (14:00–22:00)', 'Night (22:00–06:00)']
const SHIFT_COLORS = { 'Morning (06:00–14:00)':'#FF7A00', 'Afternoon (14:00–22:00)':'#1565a0', 'Night (22:00–06:00)':'#7ec8e3' }
const SHIFT_ICONS  = { 'Morning (06:00–14:00)': Sun, 'Afternoon (14:00–22:00)': Sunset, 'Night (22:00–06:00)': Moon }

const today = new Date().toISOString().slice(0,10)
const hr = new Date().getHours()
const currentShift = hr < 14 ? SHIFTS[0] : hr < 22 ? SHIFTS[1] : SHIFTS[2]

export default function ShiftHandoverPage() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    shift: currentShift, officer: '', date: today,
    rakes_done: '', tons_loaded: '', issues: '',
    pending_for_next: '', weather_note: '',
  })

  const load = () => {
    axios.get(`${BASE}/shift-logs`).then(r => setLogs(r.data?.logs || [])).catch(()=>setLogs([])).finally(()=>setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.officer || !form.rakes_done) return alert('Fill Officer Name and Rakes Done')
    setSaving(true)
    await axios.post(`${BASE}/shift-logs`, { ...form, rakes_done: +form.rakes_done, tons_loaded: +form.tons_loaded })
    setSaving(false)
    setShowForm(false)
    load()
    setForm({ shift: currentShift, officer:'', date:today, rakes_done:'', tons_loaded:'', issues:'', pending_for_next:'', weather_note:'' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Shift Handover Board</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Log shift completion · Pass critical info to next shift · No missed orders</p>
        </div>
        <button onClick={() => setShowForm(s=>!s)} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Log Handover
        </button>
      </div>

      {/* Current shift banner */}
      <div className="card p-4 flex items-center gap-4" style={{ border:'1px solid rgba(255,122,0,0.3)', background:'rgba(255,122,0,0.05)' }}>
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <ClipboardList size={20} className="text-orange-400"/>
        </div>
        <div>
          <div className="font-display font-bold text-white">Current Shift: {currentShift}</div>
          <div className="text-gray-400 text-xs font-mono">{today} · Log your handover before shift ends</div>
        </div>
        <div className="ml-auto">
          <motion.div animate={{ opacity:[1,0.4,1] }} transition={{ duration:2, repeat:Infinity }}
            className="text-xs font-mono px-3 py-1 rounded-full" style={{ background:'rgba(52,199,89,0.12)', color:'#34c759', border:'1px solid rgba(52,199,89,0.3)' }}>
            ● ACTIVE SHIFT
          </motion.div>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="card p-5" style={{ border:'1px solid rgba(255,122,0,0.25)', overflow:'hidden' }}>
            <div className="section-title mb-4">New Shift Handover Log</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {[
                { label:'Shift', key:'shift', type:'select', opts: SHIFTS },
                { label:'Officer Name', key:'officer', type:'text', ph:'AGM / JM name' },
                { label:'Date', key:'date', type:'date' },
                { label:'Rakes Dispatched', key:'rakes_done', type:'number', ph:'e.g. 8' },
                { label:'Total Tons Loaded', key:'tons_loaded', type:'number', ph:'e.g. 4200' },
                { label:'Weather Note', key:'weather_note', type:'text', ph:'e.g. Light rain at 10am' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">{f.label}</label>
                  {f.type === 'select'
                    ? <select value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                        className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    : <input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                        placeholder={f.ph||''} className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none"/>
                  }
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Issues Faced This Shift</label>
                <textarea rows={3} value={form.issues} onChange={e=>setForm(p=>({...p,issues:e.target.value}))}
                  placeholder="e.g. SID-3 crane broke down at 11am. WGN-0234 stuck at SID-2..."
                  className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none resize-none"/>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Pending for Next Shift</label>
                <textarea rows={3} value={form.pending_for_next} onChange={e=>setForm(p=>({...p,pending_for_next:e.target.value}))}
                  placeholder="e.g. ORD-00234 Tata Motors 200T HR-COIL — loading 50% done. Continue on SID-1..."
                  className="w-full bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none resize-none"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <CheckCircle size={16}/>}
                {saving ? 'Saving...' : 'Submit Handover Log'}
              </button>
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-mono text-gray-400 hover:text-white transition-colors" style={{ background:'rgba(11,60,93,0.3)', border:'1px solid #0B3C5D' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log list */}
      {loading ? <LoadingSpinner text="Loading shift logs..."/> : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-600"/>
          <div className="text-gray-400 font-mono">No handover logs yet. Log your first shift above.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => {
            const sc = SHIFT_COLORS[log.shift] || '#FF7A00'
            const Icon = SHIFT_ICONS[log.shift] || ClipboardList
            return (
              <motion.div key={i} initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}
                className="card p-5" style={{ border:`1px solid ${sc}25` }}>
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:`${sc}18`, border:`1px solid ${sc}30` }}>
                      <Icon size={16} style={{ color:sc }}/>
                    </div>
                    <div>
                      <div className="font-display font-bold text-white text-sm">{log.shift}</div>
                      <div className="text-gray-500 text-xs font-mono">{log.date} · <span style={{color:sc}}>{log.officer}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <div className="text-center"><div className="font-bold text-orange-400 text-lg">{log.rakes_done}</div><div className="text-gray-500">Rakes</div></div>
                    <div className="text-center"><div className="font-bold text-green-400 text-lg">{Number(log.tons_loaded).toLocaleString('en-IN')}</div><div className="text-gray-500">Tons</div></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {log.weather_note && (
                    <div className="p-2 rounded-lg text-xs" style={{ background:'rgba(126,200,227,0.08)', border:'1px solid rgba(126,200,227,0.15)' }}>
                      <div className="text-blue-300 font-mono font-bold mb-1">🌤️ Weather</div>
                      <div className="text-gray-400">{log.weather_note}</div>
                    </div>
                  )}
                  {log.issues && (
                    <div className="p-2 rounded-lg text-xs" style={{ background:'rgba(255,45,85,0.06)', border:'1px solid rgba(255,45,85,0.15)' }}>
                      <div className="text-red-400 font-mono font-bold mb-1">⚠️ Issues</div>
                      <div className="text-gray-400">{log.issues}</div>
                    </div>
                  )}
                  {log.pending_for_next && (
                    <div className="p-2 rounded-lg text-xs" style={{ background:'rgba(255,204,2,0.06)', border:'1px solid rgba(255,204,2,0.15)' }}>
                      <div className="text-yellow-400 font-mono font-bold mb-1">📋 Pending for Next Shift</div>
                      <div className="text-gray-400">{log.pending_for_next}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
