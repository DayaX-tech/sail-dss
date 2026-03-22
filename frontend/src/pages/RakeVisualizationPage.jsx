import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { fetchOrders, fetchWagons } from '../services/api'

const BASE = ''

// ── Constants ────────────────────────────────────────────────────────────────
const WAGONS_PER_RAKE = 58
const WAGON_CAPACITY  = { BCNA:58, BRN:55, BOXN:60, BCN:45, BOST:52, BTPN:50 }
const PRODUCT_COMPAT  = {
  'HR-COIL':['BCNA','BOST'], 'CR-SHEET':['BCNA','BOST','BTPN'],
  'PLATE-H':['BRN','BOST'],  'PLATE-M':['BRN','BOST'],
  'SLAB-A':['BRN','BOST'],   'SLAB-B':['BRN','BOST'],
  'BILLET-S':['BOXN','BCN','BRN'], 'BILLET-H':['BOXN','BCN','BRN'],
  'TMT-12':['BCN','BOXN'],   'TMT-16':['BCN','BOXN'], 'TMT-20':['BCN','BOXN'],
  'WIRE-ROD':['BCNA','BTPN'],'STRUCT-A':['BRN','BCN','BOXN'],'PIG-IRON':['BOXN','BCN'],
}
const CORRIDORS = {
  Eastern:['Dhanbad','Howrah','Kolkata','Durgapur','Asansol','Patna','Varanasi','Allahabad','Lucknow','Kanpur'],
  SouthEastern:['Jamshedpur','Rourkela','Bhilai','Raipur','Visakhapatnam','Vijayawada','Chennai','Coimbatore','Madurai'],
  Central:['Ranchi','Nagpur','Bhopal','Jabalpur','Delhi','Jaipur','Kota','Agra','Gwalior','Meerut','Faridabad','Ludhiana'],
  Western:['Vadodara','Surat','Ahmedabad','Rajkot','Pune','Nashik','Mumbai','Jodhpur'],
  Hyderabad:['Hyderabad'],
}
const CITY_CORRIDOR = {}
Object.entries(CORRIDORS).forEach(([c,cities])=>cities.forEach(city=>{CITY_CORRIDOR[city]=c}))

const CORRIDOR_COLORS = {
  Eastern:'#3B8BD4', SouthEastern:'#1D9E75',
  Central:'#BA7517', Western:'#9F4AB7', Hyderabad:'#D85A30'
}
const ORDER_COLORS = [
  '#FF7A00','#1565a0','#9F4AB7','#D85A30','#1D9E75',
  '#BA7517','#ff2d55','#4da6d9','#34c759','#ffcc02',
]

const fmtRs = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${n}`
const safe  = (v,d=0) => isNaN(+v)||v==null?d:+v

function getPrimaryWagonType(product) {
  const types = PRODUCT_COMPAT[product]
  return types?types[0]:'BOXN'
}

function getCorridorColor(dest) {
  const corr = CITY_CORRIDOR[dest]
  return CORRIDOR_COLORS[corr]||'#6b7280'
}

// ── Wagon SVG component ───────────────────────────────────────────────────────
function WagonSVG({ state, fillPct, color, small, onClick, isSelected, isHovered }) {
  const w = small ? 28 : 48
  const h = small ? 18 : 30
  const wheelR = small ? 3 : 4.5
  const bodyH  = small ? 10 : 16
  const bodyY  = small ? 4  : 7

  const fillColor = state === 'empty'    ? 'rgba(11,60,93,0.4)'
                  : state === 'urgent'   ? color
                  : state === 'backfill' ? color
                  : 'rgba(11,60,93,0.4)'
  const strokeColor = isSelected ? '#ffffff'
                    : isHovered  ? 'rgba(255,255,255,0.5)'
                    : state === 'empty' ? 'rgba(21,101,160,0.3)' : color

  return (
    <svg width={w} height={h+wheelR*2} viewBox={`0 0 ${w} ${h+wheelR*2}`}
      onClick={onClick} style={{cursor:'pointer',transition:'transform 0.1s',
        transform: isSelected?'scale(1.15)':isHovered?'scale(1.05)':'scale(1)'}}>
      {/* Body */}
      <rect x={2} y={bodyY} width={w-4} height={bodyH} rx={2}
        fill={fillColor} stroke={strokeColor} strokeWidth={isSelected?1.5:0.8} opacity={0.9}/>
      {/* Fill level inside */}
      {state !== 'empty' && fillPct < 100 && (
        <rect x={3} y={bodyY+1} width={Math.max(0,(w-6)*fillPct/100)} height={bodyH-2} rx={1}
          fill={color} opacity={0.6}/>
      )}
      {/* Roof line */}
      <rect x={2} y={bodyY} width={w-4} height={2} rx={1} fill={color} opacity={state==='empty'?0.15:0.4}/>
      {/* Wheels */}
      <circle cx={wheelR+3} cy={bodyY+bodyH+wheelR} r={wheelR} fill="#1a2744" stroke="rgba(77,166,217,0.4)" strokeWidth={0.5}/>
      <circle cx={w-wheelR-3} cy={bodyY+bodyH+wheelR} r={wheelR} fill="#1a2744" stroke="rgba(77,166,217,0.4)" strokeWidth={0.5}/>
      {/* Coupler */}
      <rect x={0} y={bodyY+bodyH/2-1} width={2} height={2} fill="rgba(77,166,217,0.4)"/>
      <rect x={w-2} y={bodyY+bodyH/2-1} width={2} height={2} fill="rgba(77,166,217,0.4)"/>
    </svg>
  )
}

// ── Locomotive SVG ────────────────────────────────────────────────────────────
function LocoSVG({ small }) {
  const w = small ? 42 : 72
  const h = small ? 18 : 30
  const bodyH = small ? 12 : 20
  const bodyY = small ? 2  : 4
  const wheelR = small ? 3 : 5
  return (
    <svg width={w} height={h+wheelR*2} viewBox={`0 0 ${w} ${h+wheelR*2}`}>
      <rect x={2} y={bodyY} width={w-4} height={bodyH} rx={3} fill="#FF7A00" opacity={0.95}/>
      <rect x={4} y={bodyY+2} width={small?14:22} height={small?6:10} rx={2} fill="#cc5500"/>
      <rect x={small?20:36} y={bodyY+3} width={small?6:10} height={small?4:7} rx={1} fill="#cc5500"/>
      <rect x={w-4} y={bodyY+bodyH/2-1} width={2} height={2} fill="rgba(255,122,0,0.6)"/>
      <circle cx={wheelR+3} cy={bodyY+bodyH+wheelR} r={wheelR} fill="#1a2744" stroke="#FF7A00" strokeWidth={0.8}/>
      <circle cx={w-wheelR-3} cy={bodyY+bodyH+wheelR} r={wheelR} fill="#1a2744" stroke="#FF7A00" strokeWidth={0.8}/>
    </svg>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RakeVisualizationPage() {
  const [orders,    setOrders]    = useState([])
  const [wagons,    setWagons]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [rakeType,  setRakeType]  = useState('BRN')
  const [wagonStates, setWagonStates] = useState([]) // array of {state, fillPct, color, orderId, product, customer, destination, loadedTons, capacity, ordersOnWagon}
  const [selectedWagon, setSelectedWagon] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState([]) // order IDs selected by officer
  const [suggestions, setSuggestions] = useState([])
  const [optimizing, setOptimizing] = useState(false)
  const [hoveredWagon, setHoveredWagon] = useState(null)
  const [filter, setFilter] = useState('CRITICAL')
  const [orderColorMap, setOrderColorMap] = useState({})
  const [alerts, setAlerts] = useState([])

  // Load data
  useEffect(() => {
    Promise.all([
      fetchOrders({ status:'PENDING', limit:300 }),
      fetchWagons({ limit:500 }),
    ]).then(([od, wd]) => {
      setOrders(od?.orders || [])
      setWagons((wd?.wagons || []).filter(w =>
        (w.availability_status||w.wagon_status||'').toLowerCase()==='available'
      ))
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [])

  // Init wagon states when rake type changes
  useEffect(() => {
    const cap = WAGON_CAPACITY[rakeType] || 55
    setWagonStates(Array.from({length:WAGONS_PER_RAKE},(_,i)=>({
      state:'empty', fillPct:0, color:'#6b7280',
      orderId:null, product:null, customer:null,
      destination:null, loadedTons:0, capacity:cap,
      ordersOnWagon:[], wagonId:`WGN-${String(i+1).padStart(4,'0')}`,
    })))
    setSelectedOrders([])
    setSelectedWagon(null)
    setSuggestions([])
    setAlerts([])
    setOrderColorMap({})
  }, [rakeType])

  // Filtered orders by tab
  const cap = WAGON_CAPACITY[rakeType] || 55
  const urgentOrders = orders.filter(o => {
    const compat = PRODUCT_COMPAT[o.product_type]||[]
    const match = compat.includes(rakeType) || compat.some(t=>t===rakeType)
    return match
  }).sort((a,b)=>safe(b.penalty_cost)-safe(a.penalty_cost))

  const criticalOrders = urgentOrders.filter(o=>safe(o.deadline_days)<=1)
  const highOrders     = urgentOrders.filter(o=>safe(o.deadline_days)<=3&&safe(o.deadline_days)>1)
  const allCompatOrders= urgentOrders

  const shownOrders = filter==='CRITICAL'?criticalOrders:filter==='HIGH'?highOrders:allCompatOrders

  // Allocate order to wagons
  const allocateOrder = useCallback((order) => {
    if (selectedOrders.includes(order.order_id)) return
    const color = ORDER_COLORS[Object.keys(orderColorMap).length % ORDER_COLORS.length]
    const newColorMap = {...orderColorMap, [order.order_id]: color}
    setOrderColorMap(newColorMap)

    const qtyNeeded = safe(order.quantity_tons, 50)
    let remaining = qtyNeeded

    setWagonStates(prev => {
      const next = [...prev]
      for (let i=0; i<next.length && remaining>0; i++) {
        const w = next[i]
        if (w.state !== 'empty') continue
        const load = Math.min(remaining, w.capacity)
        const fill = Math.round(load/w.capacity*100)
        next[i] = {
          ...w, state:'urgent', fillPct:fill, color,
          orderId:order.order_id, product:order.product_type,
          customer:order.customer_name||order.customer_id||'',
          destination:order.destination, loadedTons:round1(load),
          ordersOnWagon:[{
            orderId:order.order_id, product:order.product_type,
            customer:order.customer_name||order.customer_id||'',
            destination:order.destination, loadedTons:round1(load),
            penalty:safe(order.penalty_cost),
            deadlineDays:safe(order.deadline_days),
            color, type:'URGENT',
          }],
        }
        remaining -= load
      }
      return next
    })

    setSelectedOrders(prev=>[...prev, order.order_id])
    generateSuggestions(order.destination, order.product_type, newColorMap)
    updateAlerts()
  }, [selectedOrders, orderColorMap, orders])

  const round1 = n => Math.round(n*10)/10

  const generateSuggestions = (mainDest, mainProduct, colorMap) => {
    const mainCorr = CITY_CORRIDOR[mainDest]
    const sugg = orders.filter(o =>
      !Object.keys(colorMap).includes(o.order_id) &&
      CITY_CORRIDOR[o.destination]===mainCorr &&
      o.product_type===mainProduct &&
      safe(o.quantity_tons) > 0
    ).sort((a,b)=>safe(b.penalty_cost)-safe(a.penalty_cost)).slice(0,5)
    setSuggestions(sugg)
  }

  const updateAlerts = () => {
    setWagonStates(prev => {
      const newAlerts = []
      const underUtil = prev.filter(w=>w.state!=='empty'&&w.fillPct<90)
      if (underUtil.length>0) newAlerts.push({type:'warning',msg:`${underUtil.length} wagons below 90% utilization — backfill recommended`})
      const empty = prev.filter(w=>w.state==='empty').length
      if (empty>40) newAlerts.push({type:'info',msg:`${empty} wagons still empty — select more orders or use Auto-Fill`})
      setAlerts(newAlerts)
      return prev
    })
  }

  // Backfill one suggestion
  const backfillOrder = useCallback((order) => {
    const color = ORDER_COLORS[(Object.keys(orderColorMap).length+2) % ORDER_COLORS.length]
    const newColorMap = {...orderColorMap, [order.order_id]: color}
    setOrderColorMap(newColorMap)
    const qtyNeeded = safe(order.quantity_tons, 50)
    let remaining = qtyNeeded

    setWagonStates(prev => {
      const next = [...prev]
      // Try to fill partially empty wagons first
      for (let i=0; i<next.length && remaining>0; i++) {
        const w = next[i]
        const currentLoad = w.ordersOnWagon?.reduce((s,o)=>s+o.loadedTons,0)||w.loadedTons
        const space = w.capacity - currentLoad
        if (w.state!=='empty'&&space>=2&&w.product===order.product_type) {
          const load = Math.min(remaining, space)
          const newOrders = [...(w.ordersOnWagon||[]), {
            orderId:order.order_id, product:order.product_type,
            customer:order.customer_name||order.customer_id||'',
            destination:order.destination, loadedTons:round1(load),
            penalty:safe(order.penalty_cost), deadlineDays:safe(order.deadline_days),
            color, type:'BACKFILL',
          }]
          const totalLoad = newOrders.reduce((s,o)=>s+o.loadedTons,0)
          next[i] = {...w, fillPct:Math.round(totalLoad/w.capacity*100), ordersOnWagon:newOrders}
          remaining -= load
        }
      }
      // Then fill empty wagons
      for (let i=0; i<next.length && remaining>0; i++) {
        const w = next[i]
        if (w.state!=='empty') continue
        const load = Math.min(remaining, w.capacity)
        next[i] = {
          ...w, state:'backfill', fillPct:Math.round(load/w.capacity*100), color,
          orderId:order.order_id, product:order.product_type,
          customer:order.customer_name||order.customer_id||'',
          destination:order.destination, loadedTons:round1(load),
          ordersOnWagon:[{
            orderId:order.order_id, product:order.product_type,
            customer:order.customer_name||order.customer_id||'',
            destination:order.destination, loadedTons:round1(load),
            penalty:safe(order.penalty_cost), deadlineDays:safe(order.deadline_days),
            color, type:'BACKFILL',
          }],
        }
        remaining -= load
      }
      return next
    })
    setSelectedOrders(prev=>[...prev, order.order_id])
    setSuggestions(prev=>prev.filter(s=>s.order_id!==order.order_id))
  }, [orderColorMap, orders])

  // Auto-fill
  const autoFill = async () => {
    setOptimizing(true)
    try {
      const ids = shownOrders.slice(0,8).map(o=>String(o.order_id))
      const r = await axios.post(`${BASE}/dispatch-plan`, {selected_order_ids:ids, algorithm:'milp'})
      const plans = r.data?.rake_plans||[]
      // Find plan matching current rake type
      const plan = plans.find(p=>p.wagon_type===rakeType) || plans[0]
      if (!plan) { setOptimizing(false); return }

      const assignments = plan.wagon_assignments||[]
      const newColorMap = {}
      assignments.forEach(a=>{
        if (!newColorMap[a.order_id])
          newColorMap[a.order_id] = ORDER_COLORS[Object.keys(newColorMap).length%ORDER_COLORS.length]
      })
      setOrderColorMap(newColorMap)

      setWagonStates(prev => {
        const next = [...prev]
        let wIdx = 0
        assignments.forEach(a => {
          if (wIdx >= next.length) return
          const color = newColorMap[a.order_id]||'#FF7A00'
          const cap2   = next[wIdx].capacity
          const load   = Math.min(safe(a.loaded_tons), cap2)
          next[wIdx] = {
            ...next[wIdx],
            state: a.fill_type==='URGENT'?'urgent':'backfill',
            fillPct: Math.round(load/cap2*100),
            color, orderId:a.order_id,
            product:a.product_type, customer:a.customer_name,
            destination:a.destination, loadedTons:round1(load),
            ordersOnWagon:[{
              orderId:a.order_id, product:a.product_type,
              customer:a.customer_name, destination:a.destination,
              loadedTons:round1(load), penalty:0,
              deadlineDays:0, color, type:a.fill_type||'URGENT',
            }],
          }
          wIdx++
        })
        return next
      })
      setSelectedOrders(assignments.map(a=>a.order_id))
      setSuggestions(plan.suggestions||[])
    } catch(e){ console.error(e) }
    setOptimizing(false)
  }

  // Reset
  const resetRake = () => {
    const cap2 = WAGON_CAPACITY[rakeType]||55
    setWagonStates(Array.from({length:WAGONS_PER_RAKE},(_,i)=>({
      state:'empty', fillPct:0, color:'#6b7280',
      orderId:null, product:null, customer:null,
      destination:null, loadedTons:0, capacity:cap2,
      ordersOnWagon:[], wagonId:`WGN-${String(i+1).padStart(4,'0')}`,
    })))
    setSelectedOrders([])
    setSelectedWagon(null)
    setSuggestions([])
    setAlerts([])
    setOrderColorMap({})
  }

  // Stats
  const filledWagons  = wagonStates.filter(w=>w.state!=='empty')
  const emptyWagons   = wagonStates.filter(w=>w.state==='empty')
  const urgentWagons  = wagonStates.filter(w=>w.state==='urgent')
  const backfillWagons= wagonStates.filter(w=>w.state==='backfill')
  const totalLoaded   = wagonStates.reduce((s,w)=>s+w.loadedTons,0)
  const totalCap      = wagonStates.reduce((s,w)=>s+w.capacity,0)
  const rakeUtil      = totalCap>0?Math.round(totalLoaded/totalCap*100):0
  const underUtil     = filledWagons.filter(w=>w.fillPct<90)

  const selectedWagonData = selectedWagon !== null ? wagonStates[selectedWagon] : null

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center font-mono text-gray-400">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        Loading rake visualization...
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Rake Visualization — Visual Dispatch Board</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">
            Click orders to allocate wagons · Click wagons to inspect · Auto-fill runs MILP optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Wagon type selector */}
          <div className="font-mono text-xs text-gray-500 mr-1">RAKE TYPE:</div>
          {Object.keys(WAGON_CAPACITY).map(t=>(
            <button key={t} onClick={()=>setRakeType(t)}
              className="px-3 py-1.5 rounded font-mono text-xs transition-all font-bold"
              style={{background:rakeType===t?'rgba(255,122,0,0.2)':'rgba(11,60,93,0.3)',
                border:`1px solid ${rakeType===t?'#FF7A00':'#0B3C5D'}`,
                color:rakeType===t?'#FF7A00':'#6b7280'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((a,i)=>(
        <motion.div key={i} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-xs"
          style={{background:a.type==='warning'?'rgba(255,204,2,0.08)':'rgba(21,101,160,0.08)',
            border:`1px solid ${a.type==='warning'?'rgba(255,204,2,0.3)':'rgba(21,101,160,0.3)'}`,
            color:a.type==='warning'?'#ffcc02':'#4da6d9'}}>
          {a.type==='warning'?'⚠️':'ℹ️'} {a.msg}
        </motion.div>
      ))}

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* LEFT: Order list */}
        <div className="space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {[
              {k:'CRITICAL',l:`🔴 Critical (${criticalOrders.length})`,c:'#ff2d55'},
              {k:'HIGH',l:`🟠 High (${highOrders.length})`,c:'#FF7A00'},
              {k:'ALL',l:`All (${allCompatOrders.length})`,c:'#4da6d9'},
            ].map(f=>(
              <button key={f.k} onClick={()=>setFilter(f.k)}
                className="flex-1 py-1.5 rounded font-mono transition-all"
                style={{fontSize:10,background:filter===f.k?`${f.c}20`:'rgba(11,60,93,0.3)',
                  border:`1px solid ${filter===f.k?f.c:'#0B3C5D'}`,color:filter===f.k?f.c:'#6b7280'}}>
                {f.l}
              </button>
            ))}
          </div>

          <div className="font-mono text-xs text-gray-500 uppercase tracking-wider px-1">
            Compatible with {rakeType} wagons — click to allocate
          </div>

          <div className="space-y-1.5 overflow-y-auto" style={{maxHeight:520}}>
            {shownOrders.slice(0,30).map((o,i)=>{
              const isSelected = selectedOrders.includes(o.order_id)
              const color = orderColorMap[o.order_id]||'#6b7280'
              const deadline = safe(o.deadline_days)
              const dc = deadline<=1?'#ff2d55':deadline<=3?'#FF7A00':'#ffcc02'
              const wagonsNeeded = Math.ceil(safe(o.quantity_tons)/( WAGON_CAPACITY[rakeType]||55))
              return (
                <motion.div key={o.order_id}
                  initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.02}}
                  onClick={()=>!isSelected&&allocateOrder(o)}
                  className="p-2.5 rounded-lg transition-all"
                  style={{
                    background:isSelected?`${color}12`:'rgba(11,60,93,0.15)',
                    border:`1px solid ${isSelected?color+'50':'rgba(11,60,93,0.25)'}`,
                    cursor:isSelected?'default':'pointer',
                    opacity:isSelected?0.6:1,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>}
                      <span className="font-mono text-xs font-bold" style={{color:isSelected?color:'#FF7A00'}}>{o.order_id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs" style={{color:dc}}>
                        {deadline<=0?'TODAY!':deadline===1?'TOMORROW':`${deadline}d`}
                      </span>
                      {isSelected&&<span className="font-mono px-1.5 py-0.5 rounded" style={{fontSize:9,background:`${color}20`,color,border:`1px solid ${color}40`}}>LOADED</span>}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-yellow-400">{o.product_type}</div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400" style={{fontSize:10}}>{safe(o.quantity_tons).toFixed(0)}T · {wagonsNeeded} wagon{wagonsNeeded>1?'s':''}</span>
                    <span className="text-red-400 font-mono" style={{fontSize:10}}>{fmtRs(safe(o.penalty_cost))}/d</span>
                  </div>
                  <div className="text-gray-500 truncate" style={{fontSize:10}}>→ {o.destination}</div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CENTER: Rake visualization */}
        <div className="space-y-3">
          {/* Rake stats */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-xs font-bold text-white">
                RAKE RK-{String(Math.floor(Date.now()/1000)%999).padStart(3,'0')} · {rakeType} · {WAGONS_PER_RAKE} WAGONS
              </div>
              <div className="flex items-center gap-2">
                <div className="font-display font-black text-xl" style={{
                  color:rakeUtil>=90?'#34c759':rakeUtil>=70?'#ffcc02':'#ff6b35'}}>
                  {rakeUtil}%
                </div>
                <div className="font-mono text-xs text-gray-500">util</div>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="h-3 bg-steel-700 rounded-full overflow-hidden flex mb-2">
              <motion.div animate={{width:`${rakeUtil}%`}} transition={{duration:0.5}}
                style={{height:'100%',background:
                  rakeUtil>=90?'linear-gradient(90deg,#1565a0,#34c759)':
                  rakeUtil>=70?'linear-gradient(90deg,#FF7A00,#ffcc02)':
                  'linear-gradient(90deg,#cc2200,#ff6b35)',borderRadius:99}}/>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                {l:'Empty',    v:emptyWagons.length,    c:'#6b7280'},
                {l:'Urgent',   v:urgentWagons.length,   c:'#ff2d55'},
                {l:'Backfill', v:backfillWagons.length, c:'#34c759'},
                {l:'Loaded(T)',v:totalLoaded.toFixed(0), c:'#FF7A00'},
              ].map((k,i)=>(
                <div key={i}>
                  <div className="font-display font-bold text-sm" style={{color:k.c}}>{k.v}</div>
                  <div className="text-gray-600" style={{fontSize:9,fontFamily:'Rajdhani'}}>{k.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* THE RAKE — animated wagons */}
          <div className="card p-3" style={{background:'rgba(5,14,26,0.98)'}}>
            <div className="font-mono text-xs text-gray-600 uppercase tracking-widest mb-2 text-center">
              ← Locomotive · {WAGONS_PER_RAKE} Wagons →
            </div>

            {/* Locomotive + wagons in rows */}
            <div style={{overflowY:'auto',maxHeight:380}}>
              {Array.from({length:Math.ceil(WAGONS_PER_RAKE/10)},(_,rowIdx)=>{
                const startIdx = rowIdx * 10
                const rowWagons = wagonStates.slice(startIdx, startIdx+10)
                return (
                  <div key={rowIdx} style={{display:'flex',alignItems:'center',marginBottom:6,gap:2}}>
                    {/* Loco at start of first row */}
                    {rowIdx===0&&<LocoSVG/>}
                    {rowIdx===0&&<div style={{width:4}}/>}
                    {rowIdx>0&&<div style={{width:76}}/>}

                    {rowWagons.map((w,wIdx)=>{
                      const absIdx = startIdx + wIdx
                      const isUnder = w.state!=='empty'&&w.fillPct<90
                      return (
                        <motion.div key={absIdx}
                          initial={{scale:0.8,opacity:0}}
                          animate={{scale:1,opacity:1}}
                          transition={{delay:absIdx*0.005}}
                          onMouseEnter={()=>setHoveredWagon(absIdx)}
                          onMouseLeave={()=>setHoveredWagon(null)}
                          style={{position:'relative'}}>
                          <WagonSVG
                            state={w.state}
                            fillPct={w.fillPct}
                            color={w.color}
                            small={true}
                            onClick={()=>setSelectedWagon(selectedWagon===absIdx?null:absIdx)}
                            isSelected={selectedWagon===absIdx}
                            isHovered={hoveredWagon===absIdx}
                          />
                          {/* Wagon number */}
                          <div style={{fontSize:7,textAlign:'center',color:w.state==='empty'?'rgba(21,101,160,0.4)':w.color,
                            fontFamily:'Rajdhani',marginTop:-2,lineHeight:1}}>
                            {absIdx+1}
                          </div>
                          {/* Under-util warning dot */}
                          {isUnder&&(
                            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1,repeat:Infinity}}
                              style={{position:'absolute',top:2,right:2,width:4,height:4,borderRadius:'50%',background:'#ffcc02'}}/>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-steel-700/30">
              {[
                {c:'rgba(11,60,93,0.4)',l:'Empty wagon',b:'rgba(21,101,160,0.3)'},
                {c:'#ff2d55',l:'Urgent order',b:'#ff2d55'},
                {c:'#34c759',l:'Backfill order',b:'#34c759'},
              ].map((item,i)=>(
                <div key={i} className="flex items-center gap-1.5">
                  <div style={{width:14,height:9,background:item.c,border:`1px solid ${item.b}`,borderRadius:2}}/>
                  <span className="font-mono text-gray-500" style={{fontSize:9}}>{item.l}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <div style={{width:6,height:6,borderRadius:'50%',background:'#ffcc02'}}/>
                <span className="font-mono text-gray-500" style={{fontSize:9}}>&lt;90% util</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={autoFill} disabled={optimizing}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5">
              {optimizing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Optimizing...</>
                : <>⚡ Auto-Fill Rake (MILP)</>}
            </button>
            <button onClick={resetRake}
              className="px-4 py-2.5 rounded-lg font-mono text-xs text-gray-400 hover:text-white"
              style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>
              ↺ Reset
            </button>
          </div>
        </div>

        {/* RIGHT: Wagon detail + suggestions */}
        <div className="space-y-3">

          {/* Wagon detail panel */}
          <AnimatePresence mode="wait">
            {selectedWagonData ? (
              <motion.div key="detail" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}}
                className="card p-4" style={{border:`1px solid ${selectedWagonData.color}40`}}>
                <div className="flex items-center gap-2 mb-3">
                  <WagonSVG state={selectedWagonData.state} fillPct={selectedWagonData.fillPct}
                    color={selectedWagonData.color} small={false}/>
                  <div>
                    <div className="font-mono font-bold text-white">{selectedWagonData.wagonId}</div>
                    <div className="font-mono text-xs text-gray-400">{rakeType} · {selectedWagonData.capacity}T capacity</div>
                  </div>
                </div>

                {/* Capacity visual */}
                <div className="mb-3">
                  <div className="flex justify-between font-mono text-xs text-gray-500 mb-1">
                    <span>Fill level</span>
                    <span>{selectedWagonData.loadedTons}T / {selectedWagonData.capacity}T</span>
                  </div>
                  <div className="h-3 bg-steel-700 rounded-full overflow-hidden">
                    <motion.div animate={{width:`${selectedWagonData.fillPct}%`}} transition={{duration:0.4}}
                      style={{height:'100%',background:selectedWagonData.state==='empty'?'#6b7280':selectedWagonData.color,borderRadius:99}}/>
                  </div>
                  <div className="flex justify-between font-mono mt-1" style={{fontSize:10}}>
                    <span style={{color:selectedWagonData.fillPct>=90?'#34c759':'#ffcc02'}}>{selectedWagonData.fillPct}% filled</span>
                    <span className="text-gray-500">{(selectedWagonData.capacity-selectedWagonData.loadedTons).toFixed(1)}T free</span>
                  </div>
                </div>

                {/* Wagon details */}
                {selectedWagonData.state === 'empty' ? (
                  <div className="text-center py-4">
                    <div className="font-mono text-xs text-gray-500">Wagon is empty</div>
                    <div className="font-mono text-xs text-gray-600 mt-1">Select an order to allocate</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedWagonData.ordersOnWagon||[]).map((o,i)=>(
                      <div key={i} className="p-2 rounded-lg" style={{background:`${o.color}10`,border:`1px solid ${o.color}25`}}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs" style={{color:o.color}}>{o.orderId}</span>
                          <span className="font-mono px-1.5 py-0.5 rounded" style={{fontSize:9,
                            background:o.type==='URGENT'?'rgba(255,45,85,0.15)':'rgba(52,199,89,0.15)',
                            color:o.type==='URGENT'?'#ff6b35':'#34c759',
                            border:`1px solid ${o.type==='URGENT'?'rgba(255,45,85,0.3)':'rgba(52,199,89,0.3)'}`}}>
                            {o.type}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-yellow-400">{o.product}</div>
                        <div className="font-mono text-xs text-gray-400 mt-0.5">
                          {o.customer?.slice(0,22)} → {o.destination}
                        </div>
                        <div className="flex justify-between mt-1 font-mono" style={{fontSize:10}}>
                          <span className="text-green-400">{o.loadedTons}T loaded</span>
                          {o.penalty>0&&<span className="text-red-400">{fmtRs(o.penalty)}/day</span>}
                        </div>
                      </div>
                    ))}

                    {/* Bogie split */}
                    <div className="flex justify-between font-mono text-xs text-gray-500 pt-1">
                      <span>Bogie A: {(selectedWagonData.loadedTons*0.53).toFixed(1)}T</span>
                      <span>Bogie B: {(selectedWagonData.loadedTons*0.47).toFixed(1)}T</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="card p-6 text-center" style={{border:'1px dashed rgba(21,101,160,0.2)'}}>
                <div style={{fontSize:32,marginBottom:8}}>🚃</div>
                <div className="font-mono text-xs text-gray-500">Click any wagon above to inspect</div>
              </div>
            )}
          </AnimatePresence>

          {/* Backfill suggestions */}
          {suggestions.length > 0 && (
            <div className="card p-3" style={{border:'1px solid rgba(52,199,89,0.2)'}}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{fontSize:14}}>💡</span>
                <div className="font-mono text-xs font-bold text-green-400">
                  Backfill Suggestions — Same Corridor
                </div>
              </div>
              <div className="font-mono text-xs text-gray-500 mb-2">
                {emptyWagons.length} wagons still empty · These orders fit perfectly:
              </div>
              <div className="space-y-1.5">
                {suggestions.map((s,i)=>(
                  <motion.div key={s.order_id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                    className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-steel-700/20"
                    style={{background:'rgba(11,60,93,0.15)',border:'1px solid rgba(11,60,93,0.25)'}}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-orange-400 font-bold" style={{fontSize:10}}>{s.order_id}</span>
                        <span className="font-mono text-yellow-400" style={{fontSize:10}}>{s.product_type}</span>
                      </div>
                      <div className="font-mono text-gray-500 truncate" style={{fontSize:9}}>
                        {safe(s.quantity_tons).toFixed(0)}T · → {s.destination} · {fmtRs(safe(s.penalty_cost))}/d
                      </div>
                    </div>
                    <button onClick={()=>backfillOrder(s)}
                      className="ml-2 px-2 py-1 rounded font-mono flex-shrink-0"
                      style={{fontSize:10,background:'rgba(52,199,89,0.15)',border:'1px solid rgba(52,199,89,0.3)',color:'#34c759'}}>
                      + Add
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Under-utilized wagons alert */}
          {underUtil.length > 0 && (
            <div className="card p-3" style={{border:'1px solid rgba(255,204,2,0.25)',background:'rgba(255,204,2,0.04)'}}>
              <div className="font-mono text-xs font-bold text-yellow-400 mb-1.5">
                ⚠️ {underUtil.length} Underutilized Wagons (&lt;90%)
              </div>
              <div className="font-mono text-xs text-gray-500">
                Add backfill orders to maximize rake utilization and reduce per-ton freight cost.
              </div>
            </div>
          )}

          {/* Dispatch button */}
          {filledWagons.length > 0 && (
            <button className="w-full py-3 rounded-lg font-display font-bold text-sm text-white"
              style={{background:'linear-gradient(135deg,#1565a0,#34c759)',border:'1px solid rgba(52,199,89,0.4)'}}>
              🚂 Proceed to Loading ({filledWagons.length} wagons ready)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
