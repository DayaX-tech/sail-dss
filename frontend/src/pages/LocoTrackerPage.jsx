import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '../components/UIKit'
import { Activity } from 'lucide-react'
import axios from 'axios'
const BASE = ''
const STATUS_C = { Available:'#34c759', 'On Duty':'#FF7A00', Maintenance:'#ff2d55' }

export default function LocoTrackerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')

  const load = () => axios.get(`${BASE}/locos`).then(r=>setData(r.data)).catch(()=>setData({locos:[],available:0,on_duty:0,maintenance:0})).finally(()=>setLoading(false))
  useEffect(()=>{ load() },[])

  const update = async (loco, newStatus, rake='') => {
    await axios.post(`${BASE}/locos/update`, { loco_id:loco.loco_id, status:newStatus, assigned_rake:rake||null })
    setEditing(null); load()
  }

  if (loading) return <LoadingSpinner text="Loading loco fleet..."/>
  const locos = (data?.locos||[]).filter(l=>!filter||l.status===filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Locomotive Tracker</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">Real-time loco availability · Rake assignments · Fuel status</p>
        </div>
        <div className="flex gap-2">
          {['','Available','On Duty','Maintenance'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{ background:filter===s?`${STATUS_C[s]||'#FF7A00'}20`:'rgba(11,60,93,0.3)',
                border:`1px solid ${filter===s?STATUS_C[s]||'#FF7A00':'#0B3C5D'}`,
                color:filter===s?STATUS_C[s]||'#FF7A00':'#6b7280' }}>
              {s||'All'} {s&&`(${(data?.locos||[]).filter(l=>l.status===s).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Available',data?.available,'#34c759'],['On Duty',data?.on_duty,'#FF7A00'],['Maintenance',data?.maintenance,'#ff2d55']].map(([l,v,c])=>(
          <div key={l} className="card p-4 text-center">
            <div className="font-display font-bold text-3xl" style={{color:c}}>{v}</div>
            <div className="text-gray-500 text-xs font-mono mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {locos.map((loco,i)=>{
          const sc = STATUS_C[loco.status]||'#9ca3af'
          return (
            <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
              className="card p-4" style={{border:`1px solid ${sc}25`}}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:`${sc}18`,border:`1px solid ${sc}30`}}>
                    <Activity size={14} style={{color:sc}}/>
                  </div>
                  <div>
                    <div className="font-mono font-bold text-white text-sm">{loco.loco_id}</div>
                    <div className="text-gray-500 text-xs">{loco.loco_type}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{background:`${sc}15`,color:sc,border:`1px solid ${sc}30`}}>{loco.status}</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-300">{loco.current_location}</span></div>
                {loco.assigned_rake&&<div className="flex justify-between"><span className="text-gray-500">Rake</span><span className="text-orange-400">{loco.assigned_rake}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Driver</span><span className="text-gray-300">{loco.driver_name}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Fuel</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-steel-700 rounded"><div className="h-full rounded" style={{width:`${loco.fuel_pct}%`,background:loco.fuel_pct>50?'#34c759':loco.fuel_pct>25?'#ffcc02':'#ff2d55'}}/></div>
                    <span style={{color:loco.fuel_pct>50?'#34c759':loco.fuel_pct>25?'#ffcc02':'#ff2d55'}}>{loco.fuel_pct}%</span>
                  </div>
                </div>
              </div>
              {editing===loco.loco_id ? (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {['Available','On Duty','Maintenance'].map(s=>(
                    <button key={s} onClick={()=>update(loco,s)} className="text-xs px-2 py-1 rounded font-mono transition-all"
                      style={{background:`${STATUS_C[s]}15`,color:STATUS_C[s],border:`1px solid ${STATUS_C[s]}30`}}>
                      → {s}
                    </button>
                  ))}
                  <button onClick={()=>setEditing(null)} className="text-xs px-2 py-1 rounded font-mono text-gray-500 hover:text-white" style={{border:'1px solid #0B3C5D'}}>Cancel</button>
                </div>
              ) : (
                <button onClick={()=>setEditing(loco.loco_id)} className="mt-3 w-full text-xs py-1.5 rounded font-mono text-gray-400 hover:text-white transition-colors" style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>
                  Update Status
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
