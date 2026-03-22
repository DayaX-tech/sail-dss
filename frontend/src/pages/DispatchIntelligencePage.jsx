/**
 * SAIL Bokaro — Dispatch Intelligence Board
 * 
 * Shows:
 * 1. Indian Railways wagon-product compatibility rules (visual)
 * 2. Penalty leaderboard — worst orders ranked by ₹/day
 * 3. Optimal MILP dispatch plan with full wagon visualization
 * 4. Per-rake fill visualization showing every wagon slot
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

const BASE = 'https://sail-dss-backend.onrender.com'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — Indian Railways Rules
// ─────────────────────────────────────────────────────────────────────────────
const WAGON_RULES = {
  BCNA: {
    full_name: 'BCNA — Covered Bogie Wagon',
    products:  ['HR-COIL', 'CR-SHEET', 'WIRE-ROD'],
    why:       'Fully sealed roof and side panels protect coils & sheets from rain, humidity and dust during long transit',
    wagons: 58, cap: 58, total: 3364,
    color: '#4da6d9',
    bg:    'rgba(77,166,217,0.06)',
    product_colors: { 'HR-COIL':'#4da6d9', 'CR-SHEET':'#1565a0', 'WIRE-ROD':'#74c0fc' },
  },
  BRN: {
    full_name: 'BRN — Bogie Rail Flat Wagon',
    products:  ['PLATE-H', 'PLATE-M', 'SLAB-A', 'SLAB-B', 'STRUCT-A'],
    why:       'Ultra-low flat platform with stanchion pockets. Heavy thick slabs & plates secured with chains — no cover needed',
    wagons: 40, cap: 55, total: 2200,
    color: '#34c759',
    bg:    'rgba(52,199,89,0.06)',
    product_colors: { 'PLATE-H':'#34c759','PLATE-M':'#0F9E45','SLAB-A':'#5DCAA5','SLAB-B':'#9FE1CB','STRUCT-A':'#1a7a3e' },
  },
  BOXN: {
    full_name: 'BOXN — Open Bogie High-Sided Wagon',
    products:  ['TMT-12', 'TMT-16', 'TMT-20', 'BILLET-S', 'BILLET-H', 'PIG-IRON'],
    why:       'Deep steel box with high walls (1.8m). TMT bars bundled upright, billets stacked flat — weight-optimised loading',
    wagons: 58, cap: 60, total: 3480,
    color: '#FF7A00',
    bg:    'rgba(255,122,0,0.06)',
    product_colors: { 'TMT-12':'#FF7A00','TMT-16':'#EF9F27','TMT-20':'#FA8C16','BILLET-S':'#ff6b35','BILLET-H':'#ff2d55','PIG-IRON':'#ffcc02' },
  },
}

const PRODUCT_TO_WAGON = {}
Object.entries(WAGON_RULES).forEach(([wt, r]) => r.products.forEach(p => { PRODUCT_TO_WAGON[p] = wt }))

const CORRIDORS = {
  Eastern:      ['Dhanbad','Howrah','Kolkata','Durgapur','Asansol','Patna','Varanasi','Allahabad','Lucknow','Kanpur'],
  SouthEastern: ['Jamshedpur','Rourkela','Bhilai','Raipur','Visakhapatnam','Vijayawada','Chennai','Coimbatore','Madurai'],
  Central:      ['Ranchi','Nagpur','Bhopal','Jabalpur','Delhi','Jaipur','Kota','Agra','Gwalior','Meerut','Faridabad','Ludhiana'],
  Western:      ['Vadodara','Surat','Ahmedabad','Rajkot','Pune','Nashik','Mumbai','Jodhpur'],
  Hyderabad:    ['Hyderabad'],
}
const CITY_CORR = {}
Object.entries(CORRIDORS).forEach(([c,cities]) => cities.forEach(city => { CITY_CORR[city] = c }))
const CORR_COL = { Eastern:'#3B8BD4', SouthEastern:'#1D9E75', Central:'#BA7517', Western:'#9F4AB7', Hyderabad:'#D85A30' }

const ORDER_PALETTE = ['#FF7A00','#4da6d9','#34c759','#9F4AB7','#D85A30','#ffcc02','#ff2d55','#1D9E75','#BA7517','#74c0fc']

const fmtRs  = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${Math.round(n)}`
const safe   = (v,d=0) => isNaN(+v)||v==null?d:+v

// ─────────────────────────────────────────────────────────────────────────────
// WAGON SVG — single wagon rendering
// ─────────────────────────────────────────────────────────────────────────────
function WagonSVG({ type, color, state, small }) {
  const w = small ? 24 : 36
  const h = small ? 15 : 22
  const wr = small ? 2.5 : 3.5
  const rule = WAGON_RULES[type] || WAGON_RULES.BOXN
  const bg   = state === 'empty' ? 'rgba(11,60,93,0.35)' : color
  const bd   = state === 'empty' ? 'rgba(21,101,217,0.2)' : `${color}AA`

  if (type === 'BRN') {
    // Flat wagon — thinner
    return (
      <svg width={w} height={h+wr*2} viewBox={`0 0 ${w} ${h+wr*2}`}>
        <rect x="1" y={h*0.6} width={w-2} height={h*0.4} rx="1" fill={bg} stroke={bd} strokeWidth="0.6"/>
        {state!=='empty'&&<rect x="1" y={h*0.6} width={w-2} height="2" rx="1" fill={color} opacity="0.4"/>}
        <rect x="0" y={h*0.7} width="1.5" height="2" fill={bd}/>
        <rect x={w-1.5} y={h*0.7} width="1.5" height="2" fill={bd}/>
        <circle cx={w*0.2} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
        <circle cx={w*0.8} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
      </svg>
    )
  }
  if (type === 'BCNA') {
    // Covered — with roof arch
    return (
      <svg width={w} height={h+wr*2} viewBox={`0 0 ${w} ${h+wr*2}`}>
        <rect x="1" y="3" width={w-2} height={h-3} rx="2" fill={bg} stroke={bd} strokeWidth="0.6"/>
        <path d={`M 1 5 Q ${w/2} 1 ${w-1} 5`} fill="none" stroke={state==='empty'?bd:color} strokeWidth="1"/>
        {state!=='empty'&&<rect x="1" y="3" width={w-2} height="2" rx="1" fill={color} opacity="0.4"/>}
        <rect x="0" y={h/2} width="1.5" height="2" fill={bd}/>
        <rect x={w-1.5} y={h/2} width="1.5" height="2" fill={bd}/>
        <circle cx={w*0.2} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
        <circle cx={w*0.8} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
      </svg>
    )
  }
  // BOXN — open high-sided
  return (
    <svg width={w} height={h+wr*2} viewBox={`0 0 ${w} ${h+wr*2}`}>
      <rect x="1" y="2" width={w-2} height={h-2} rx="2" fill={bg} stroke={bd} strokeWidth="0.6"/>
      {state!=='empty'&&<rect x="2" y="3" width={w-4} height="3" rx="1" fill={color} opacity="0.35"/>}
      <rect x="1" y="2" width={w-2} height="2.5" rx="1" fill={state==='empty'?bd:color} opacity={state==='empty'?0.15:0.4}/>
      <rect x="0" y={h/2} width="1.5" height="2" fill={bd}/>
      <rect x={w-1.5} y={h/2} width="1.5" height="2" fill={bd}/>
      <circle cx={w*0.2} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
      <circle cx={w*0.8} cy={h+wr} r={wr} fill="#0d1e30" stroke={rule.color} strokeWidth="0.5"/>
    </svg>
  )
}

function LocoSVG({ small }) {
  const w = small?36:52, h = small?15:22
  return (
    <svg width={w} height={h+8} viewBox={`0 0 ${w} ${h+8}`}>
      <rect x="1" y="2" width={w-2} height={h-2} rx="3" fill="#FF7A00" opacity="0.95"/>
      <rect x="3" y="4" width={w*0.35} height={h*0.6} rx="2" fill="#cc5500"/>
      <rect x={w*0.6} y="5" width={w*0.25} height={h*0.5} rx="1" fill="#cc5500"/>
      <rect x={w-2} y={h/2-1} width="1.5" height="2" fill="rgba(255,122,0,0.5)"/>
      <circle cx={w*0.18} cy={h+4} r="3.5" fill="#0d1e30" stroke="#FF7A00" strokeWidth="0.6"/>
      <circle cx={w*0.82} cy={h+4} r="3.5" fill="#0d1e30" stroke="#FF7A00" strokeWidth="0.6"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RAKE VISUALIZATION — full wagon grid for one rake plan
// ─────────────────────────────────────────────────────────────────────────────
function RakeVisual({ plan }) {
  const [hoveredWagon, setHoveredWagon] = useState(null)
  const [selectedWagon, setSelectedWagon] = useState(null)

  const rule       = WAGON_RULES[plan.wagon_type] || WAGON_RULES.BOXN
  const totalSlots = plan.wagons_in_rake || rule.wagons
  const assignments= plan.wagon_assignments || []

  // Map order_id → color
  const orderColorMap = {}
  let colorIdx = 0
  assignments.forEach(a => {
    if (!orderColorMap[a.order_id]) {
      orderColorMap[a.order_id] = ORDER_PALETTE[colorIdx % ORDER_PALETTE.length]
      colorIdx++
    }
  })

  // Build slot array
  const slots = []
  assignments.forEach(a => {
    slots.push({
      filled:    true,
      color:     orderColorMap[a.order_id],
      fillType:  a.fill_type || 'URGENT',
      orderId:   a.order_id,
      product:   a.product_type,
      dest:      a.destination,
      customer:  a.customer_name || '',
      tons:      a.loaded_tons,
      cap:       a.capacity_tons,
      util:      a.utilization_pct,
      bogieA:    a.bogie_a_tons,
      bogieB:    a.bogie_b_tons,
    })
  })
  while (slots.length < totalSlots) slots.push({ filled: false })

  // Rows of 15
  const PER_ROW = 15
  const rows = []
  for (let i = 0; i < slots.length; i += PER_ROW) rows.push(slots.slice(i, i + PER_ROW))

  // Order legend
  const orderLegend = {}
  assignments.forEach(a => {
    if (!orderLegend[a.order_id]) {
      orderLegend[a.order_id] = {
        color:   orderColorMap[a.order_id],
        product: a.product_type,
        dest:    a.destination,
        wagons:  0,
        tons:    0,
        type:    a.fill_type || 'URGENT',
      }
    }
    orderLegend[a.order_id].wagons++
    orderLegend[a.order_id].tons += a.loaded_tons
  })

  const selSlot = selectedWagon !== null ? slots[selectedWagon] : null

  return (
    <div className="space-y-3">
      {/* Utilization bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="font-mono text-xs text-gray-400">
            {plan.total_wagons_used}/{totalSlots} wagons · {plan.total_loaded_tons}T / {plan.rake_total_capacity}T
          </span>
          <span className="font-display font-black text-xl"
            style={{color: plan.rake_utilization_pct>=90?'#34c759':plan.rake_utilization_pct>=70?'#ffcc02':'#ff6b35'}}>
            {plan.rake_utilization_pct}%
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex" style={{background:'rgba(11,60,93,0.4)'}}>
          <motion.div animate={{width:`${plan.rake_utilization_pct}%`}} transition={{duration:0.8,ease:'easeOut'}}
            style={{height:'100%',borderRadius:99,
              background: plan.rake_utilization_pct>=90
                ? `linear-gradient(90deg,${rule.color},#34c759)`
                : plan.rake_utilization_pct>=70
                  ? 'linear-gradient(90deg,#FF7A00,#ffcc02)'
                  : 'linear-gradient(90deg,#cc2200,#ff6b35)'}}/>
          {plan.rake_utilization_pct < 100 && (
            <div style={{flex:1,background:'rgba(255,204,2,0.06)',borderLeft:'1.5px dashed rgba(255,204,2,0.25)',
              display:'flex',alignItems:'center',paddingLeft:5,fontSize:9,color:'rgba(255,204,2,0.5)',fontFamily:'Rajdhani'}}>
              {plan.unused_capacity_tons}T unused
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Wagon grid — 2/3 width */}
        <div className="col-span-2">
          <div style={{background:'rgba(3,10,20,0.95)',borderRadius:10,padding:'10px 12px'}}>
            <div className="font-mono text-center mb-2" style={{fontSize:9,color:'rgba(21,101,160,0.5)',letterSpacing:3}}>
              ← LOCO · {totalSlots} {plan.wagon_type} WAGONS →
            </div>
            {rows.map((row, ri) => (
              <div key={ri} style={{display:'flex',alignItems:'flex-end',gap:2,marginBottom:4}}>
                {ri===0 ? <LocoSVG small={true}/> : <div style={{width:38}}/>}
                {row.map((slot, wi) => {
                  const absIdx = ri * PER_ROW + wi
                  const isHov = hoveredWagon === absIdx
                  const isSel = selectedWagon === absIdx
                  const isUnder = slot.filled && slot.util < 90
                  return (
                    <div key={absIdx} style={{position:'relative',transform:isSel?'scale(1.2)':isHov?'scale(1.08)':'scale(1)',
                      transition:'transform 0.1s',cursor:'pointer',zIndex:isSel?10:1}}
                      onMouseEnter={()=>setHoveredWagon(absIdx)}
                      onMouseLeave={()=>setHoveredWagon(null)}
                      onClick={()=>setSelectedWagon(isSel?null:absIdx)}>
                      <WagonSVG type={plan.wagon_type} color={slot.color||rule.color}
                        state={slot.filled?'filled':'empty'} small={true}/>
                      <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',
                        fontSize:6,color:slot.filled?(isSel?'#fff':slot.color):'rgba(21,101,160,0.35)',
                        fontFamily:'Rajdhani',lineHeight:1,pointerEvents:'none'}}>
                        {absIdx+1}
                      </div>
                      {isUnder && (
                        <motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:1.2,repeat:Infinity}}
                          style={{position:'absolute',top:0,right:0,width:4,height:4,borderRadius:'50%',background:'#ffcc02'}}/>
                      )}
                      {isSel && (
                        <div style={{position:'absolute',inset:-2,border:'1.5px solid #fff',borderRadius:3,pointerEvents:'none'}}/>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 mt-1 border-t border-steel-700/20">
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:12,height:7,background:'rgba(11,60,93,0.35)',border:'1px solid rgba(21,101,217,0.2)',borderRadius:2}}/>
                <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>Empty</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:12,height:7,background:'#ff2d55',border:'1px solid #ff2d55',borderRadius:2}}/>
                <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>Urgent order</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:12,height:7,background:'#34c759',border:'1px solid #34c759',borderRadius:2}}/>
                <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>Backfill order</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#ffcc02'}}/>
                <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>&lt;90% util</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: wagon detail or order legend */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {selSlot && selSlot.filled ? (
              <motion.div key="detail" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                className="card p-3" style={{border:`1px solid ${selSlot.color}40`}}>
                <div className="flex items-center gap-2 mb-2">
                  <WagonSVG type={plan.wagon_type} color={selSlot.color} state="filled" small={false}/>
                  <div>
                    <div className="font-mono text-xs font-bold text-white">Wagon {slots.indexOf(selSlot)+1}</div>
                    <div className="font-mono text-gray-500" style={{fontSize:9}}>{plan.wagon_type} · {selSlot.cap}T</div>
                  </div>
                </div>
                <div className="h-2 bg-steel-700 rounded-full mb-2">
                  <div style={{width:`${selSlot.util}%`,height:'100%',borderRadius:99,
                    background:selSlot.util>=90?'#34c759':'#ffcc02'}}/>
                </div>
                <div className="space-y-1">
                  {[
                    {l:'Order',    v:selSlot.orderId, c:selSlot.color},
                    {l:'Product',  v:selSlot.product, c:'#ffcc02'},
                    {l:'Customer', v:(selSlot.customer||'').slice(0,18), c:'#e5e7eb'},
                    {l:'→ Dest',   v:selSlot.dest, c:'#9ca3af'},
                    {l:'Loaded',   v:`${selSlot.tons}T / ${selSlot.cap}T`, c:'#34c759'},
                    {l:'Fill',     v:`${selSlot.util}%`, c:selSlot.util>=90?'#34c759':'#ffcc02'},
                  ].map((r,i)=>(
                    <div key={i} className="flex justify-between font-mono" style={{fontSize:9}}>
                      <span className="text-gray-500">{r.l}</span>
                      <span className="font-bold" style={{color:r.c}}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-mono mt-2 pt-2 border-t border-steel-700/30" style={{fontSize:9}}>
                  <span className="text-gray-600">Bogie A: {selSlot.bogieA}T</span>
                  <span className="text-gray-600">Bogie B: {selSlot.bogieB}T</span>
                </div>
                <span className="mt-2 inline-block px-2 py-0.5 rounded font-mono" style={{fontSize:8,
                  background:selSlot.fillType==='URGENT'?'rgba(255,45,85,0.15)':'rgba(52,199,89,0.15)',
                  color:selSlot.fillType==='URGENT'?'#ff6b35':'#34c759',
                  border:`1px solid ${selSlot.fillType==='URGENT'?'rgba(255,45,85,0.3)':'rgba(52,199,89,0.3)'}`}}>
                  {selSlot.fillType}
                </span>
              </motion.div>
            ) : (
              <motion.div key="legend" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="card p-3" style={{border:`1px solid ${rule.color}20`}}>
                <div className="font-mono text-gray-500 uppercase tracking-wider mb-2" style={{fontSize:9}}>
                  Orders on this rake
                </div>
                <div className="space-y-1.5">
                  {Object.entries(orderLegend).map(([oid, info])=>(
                    <div key={oid} className="p-2 rounded" style={{background:`${info.color}08`,border:`1px solid ${info.color}20`}}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono font-bold" style={{fontSize:9,color:info.color}}>{oid}</span>
                        <span className="font-mono px-1 rounded" style={{fontSize:7,
                          background:info.type==='URGENT'?'rgba(255,45,85,0.15)':'rgba(52,199,89,0.15)',
                          color:info.type==='URGENT'?'#ff6b35':'#34c759'}}>
                          {info.type}
                        </span>
                      </div>
                      <div className="font-mono text-yellow-400" style={{fontSize:9}}>{info.product}</div>
                      <div className="flex justify-between font-mono text-gray-500" style={{fontSize:8}}>
                        <span>→ {info.dest}</span>
                        <span className="text-green-400">{info.wagons}w · {info.tons.toFixed(0)}T</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-gray-600 mt-2" style={{fontSize:8}}>
                  Click any wagon to inspect
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions */}
          {(plan.suggestions||[]).length > 0 && (
            <div className="card p-2.5" style={{border:'1px solid rgba(255,204,2,0.2)'}}>
              <div className="font-mono font-bold text-yellow-400 mb-1.5" style={{fontSize:9}}>
                💡 {plan.unused_capacity_tons}T free — add these:
              </div>
              {plan.suggestions.slice(0,3).map((s,i)=>(
                <div key={i} className="flex justify-between items-center mb-1 font-mono" style={{fontSize:8}}>
                  <span className="text-orange-400">{s.order_id}</span>
                  <span className="text-yellow-400">{s.product}</span>
                  <span className="text-green-400">{s.can_load_tons}T</span>
                  <span className="text-red-400">{fmtRs(s.penalty_per_day)}/d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchIntelligencePage() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [planning, setPlanning] = useState(false)
  const [plan,     setPlan]     = useState(null)
  const [tab,      setTab]      = useState('rules')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    axios.get(`${BASE}/orders?status=PENDING&limit=300`)
      .then(r => setOrders(r.data?.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Derived
  const byWagon = { BCNA:[], BRN:[], BOXN:[] }
  orders.forEach(o => {
    const wt = PRODUCT_TO_WAGON[o.product_type]
    if (wt && byWagon[wt]) byWagon[wt].push(o)
  })

  const sorted      = [...orders].sort((a,b) => safe(b.penalty_cost) - safe(a.penalty_cost))
  const expToday    = orders.filter(o => safe(o.deadline_days) <= 1)
  const exp48h      = orders.filter(o => safe(o.deadline_days) <= 2)
  const totalPenDay = orders.reduce((s,o) => s+safe(o.penalty_cost), 0)
  const todayPenDay = expToday.reduce((s,o) => s+safe(o.penalty_cost), 0)

  const runPlan = async () => {
    setPlanning(true)
    try {
      const urgent = [...orders]
        .sort((a,b) => safe(b.penalty_cost)/Math.max(safe(a.deadline_days),0.5) - safe(a.penalty_cost)/Math.max(safe(b.deadline_days),0.5))
        .slice(0, 10)
        .map(o => String(o.order_id))
      const r = await axios.post(`${BASE}/dispatch-plan`, { selected_order_ids: urgent, algorithm:'milp' })
      setPlan(r.data)
      setTab('plan')
      setExpanded(0)
    } catch(e) { console.error(e) }
    setPlanning(false)
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Dispatch Intelligence Board</h2>
          <p className="font-mono text-sm text-gray-400 mt-0.5">
            Wagon compatibility rules · Penalty leaderboard · Optimal rake plan
          </p>
        </div>
        <button onClick={runPlan} disabled={planning}
          className="btn-primary flex items-center gap-2 px-6 py-3">
          {planning
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Running MILP optimizer...</>
            : <>⚡ Generate Optimal Dispatch Plan</>}
        </button>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { l:'Total Penalty/Day', v:fmtRs(totalPenDay), c:'#ff2d55', sub:`${orders.length} pending orders` },
          { l:'Expiring TODAY',    v:expToday.length,     c:'#ff2d55', sub:fmtRs(todayPenDay)+' at risk today' },
          { l:'Due in 48 hrs',     v:exp48h.length,       c:'#ff6b35', sub:'Must dispatch tomorrow' },
          { l:'BCNA Orders',       v:byWagon.BCNA.length, c:'#4da6d9', sub:'Coils · Sheets · Wire' },
          { l:'BRN + BOXN Orders', v:byWagon.BRN.length+byWagon.BOXN.length, c:'#FF7A00', sub:'Plates · TMT · Billets' },
        ].map((k,i) => (
          <div key={i} className="card p-4 text-center">
            <div className="font-display font-black text-2xl" style={{color:k.c}}>{k.v}</div>
            <div className="font-mono text-gray-400 text-xs mt-1">{k.l}</div>
            <div className="font-mono text-gray-600 mt-0.5" style={{fontSize:9}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { k:'rules',    l:'🚂 Wagon Rules' },
          { k:'penalty',  l:`🔴 Penalty Board (${sorted.length})` },
          { k:'bytype',   l:'📦 By Wagon Type' },
          { k:'plan',     l: plan ? `✅ Optimal Plan — ${plan.rake_plans?.length||0} Rakes` : '⚡ Optimal Plan' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2 rounded-lg font-mono text-xs transition-all"
            style={{
              background: tab===t.k ? 'rgba(255,122,0,0.18)' : 'rgba(11,60,93,0.3)',
              border: `1px solid ${tab===t.k ? '#FF7A00' : '#0B3C5D'}`,
              color: tab===t.k ? '#FF7A00' : '#6b7280',
            }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Tab: Wagon Rules ───────────────────────────────────────── */}
      {tab === 'rules' && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(WAGON_RULES).map(([wtype, rule]) => {
            const typeOrders = byWagon[wtype] || []
            const totalPen   = typeOrders.reduce((s,o)=>s+safe(o.penalty_cost),0)
            const totalTons  = typeOrders.reduce((s,o)=>s+safe(o.quantity_tons),0)
            const rakes      = Math.ceil(totalTons / rule.total)
            return (
              <motion.div key={wtype} whileHover={{scale:1.01}} className="card p-5"
                style={{border:`1px solid ${rule.color}30`, background:rule.bg}}>

                {/* Wagon type visualization — 8 mini wagons */}
                <div className="flex items-end gap-1 mb-4">
                  <LocoSVG small={true}/>
                  {[...Array(8)].map((_,i) => (
                    <WagonSVG key={i} type={wtype} color={rule.color}
                      state={i < 7 ? 'filled' : 'empty'} small={true}/>
                  ))}
                </div>

                <div className="font-display font-bold text-white mb-1">{rule.full_name}</div>
                <div className="font-mono text-xs text-gray-400 leading-relaxed mb-4">{rule.why}</div>

                {/* Compatible products */}
                <div className="mb-4">
                  <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Compatible Products
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.products.map(p => {
                      const pc = rule.product_colors?.[p] || rule.color
                      return (
                        <div key={p} className="px-2.5 py-1 rounded-lg font-mono font-bold"
                          style={{fontSize:11,background:`${pc}18`,color:pc,border:`1px solid ${pc}35`}}>
                          {p}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Specs grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { l:'Wagons/Rake', v:`${rule.wagons}` },
                    { l:'Tons/Wagon',  v:`${rule.cap}T` },
                    { l:'Rake Total',  v:`${(rule.total/1000).toFixed(1)}KT` },
                  ].map((s,i) => (
                    <div key={i} className="text-center py-2 rounded-lg" style={{background:'rgba(0,0,0,0.25)'}}>
                      <div className="font-display font-bold text-base" style={{color:rule.color}}>{s.v}</div>
                      <div className="font-mono text-gray-600" style={{fontSize:9}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Current pending */}
                <div className="pt-3 border-t border-steel-700/30">
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="text-gray-500">{typeOrders.length} orders · {(totalTons/1000).toFixed(1)}KT pending</span>
                    <span style={{color:rule.color}}>{rakes} rakes needed</span>
                  </div>
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-gray-600">Penalty exposure:</span>
                    <span className="text-red-400 font-bold">{fmtRs(totalPen)}/day</span>
                  </div>
                  {/* Mini penalty bar */}
                  <div className="mt-2 h-1.5 rounded-full" style={{background:'rgba(11,60,93,0.4)'}}>
                    <motion.div animate={{width:`${Math.min(totalPen/totalPenDay*100*3,100)}%`}}
                      transition={{duration:0.8}} style={{height:'100%',background:rule.color,borderRadius:99}}/>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Penalty Board ─────────────────────────────────────── */}
      {tab === 'penalty' && (
        <div className="card p-5">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-4">
            All Pending Orders — Sorted by Penalty/Day · Dispatch highest first
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:11}}>
              <thead>
                <tr className="border-b border-steel-700/50">
                  {['#','ORDER','CUSTOMER','PRODUCT','WAGON TYPE','DESTINATION','QTY (T)','PENALTY/DAY','DEADLINE','RISK'].map(h=>(
                    <th key={h} className="text-left py-2 px-2 font-mono text-gray-500" style={{fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0,20).map((o,i) => {
                  const wt     = PRODUCT_TO_WAGON[o.product_type] || 'BOXN'
                  const rule   = WAGON_RULES[wt]
                  const pc     = rule?.product_colors?.[o.product_type] || rule?.color || '#FF7A00'
                  const dl     = safe(o.deadline_days)
                  const dc     = dl<=1?'#ff2d55':dl<=2?'#ff6b35':dl<=7?'#ffcc02':'#34c759'
                  const risk   = dl<=1?'CRITICAL':dl<=2?'HIGH':dl<=7?'MEDIUM':'LOW'
                  return (
                    <motion.tr key={o.order_id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                      transition={{delay:i*0.015}} className="border-b border-steel-700/20 hover:bg-steel-700/10">
                      <td className="py-2 px-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                          style={{fontSize:9,background:i<3?'rgba(255,45,85,0.2)':'rgba(11,60,93,0.3)',
                            color:i<3?'#ff2d55':'#6b7280',border:`1px solid ${i<3?'rgba(255,45,85,0.4)':'rgba(11,60,93,0.3)'}`}}>
                          {i+1}
                        </div>
                      </td>
                      <td className="py-2 px-2 font-mono text-orange-400 font-bold">{o.order_id}</td>
                      <td className="py-2 px-2 text-gray-300 max-w-28 truncate" style={{fontSize:10}}>{o.customer_name||o.customer_id||'—'}</td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold"
                          style={{fontSize:9,background:`${pc}18`,color:pc,border:`1px solid ${pc}35`}}>
                          {o.product_type}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded font-mono"
                          style={{fontSize:9,background:`${rule?.color||'#FF7A00'}12`,
                            color:rule?.color||'#FF7A00',border:`1px solid ${rule?.color||'#FF7A00'}25`}}>
                          {wt}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-300">{o.destination}</td>
                      <td className="py-2 px-2 font-mono text-green-400">{safe(o.quantity_tons).toFixed(0)}</td>
                      <td className="py-2 px-2 font-mono font-bold text-red-400">{fmtRs(safe(o.penalty_cost))}</td>
                      <td className="py-2 px-2 font-mono font-bold" style={{color:dc}}>
                        {dl<=0?'TODAY!':dl===1?'TOMORROW':`${dl}d`}
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded font-mono"
                          style={{fontSize:9,background:`${dc}12`,color:dc,border:`1px solid ${dc}30`}}>
                          {risk}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: By Wagon Type ─────────────────────────────────────── */}
      {tab === 'bytype' && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(WAGON_RULES).map(([wtype, rule]) => {
            const typeOrders = (byWagon[wtype]||[]).sort((a,b)=>safe(b.penalty_cost)-safe(a.penalty_cost))
            const totalPen   = typeOrders.reduce((s,o)=>s+safe(o.penalty_cost),0)
            const totalTons  = typeOrders.reduce((s,o)=>s+safe(o.quantity_tons),0)
            const rakes      = Math.ceil(totalTons/rule.total)
            return (
              <div key={wtype} className="card p-4" style={{border:`1px solid ${rule.color}25`}}>
                <div className="flex items-center gap-2 mb-3">
                  <WagonSVG type={wtype} color={rule.color} state="filled" small={false}/>
                  <div>
                    <div className="font-display font-bold text-white">{wtype}</div>
                    <div className="font-mono text-gray-500" style={{fontSize:10}}>{rule.products.join(' · ')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[
                    {l:'Orders',        v:typeOrders.length,                  c:rule.color},
                    {l:'Total Tons',    v:`${(totalTons/1000).toFixed(1)}KT`, c:'#34c759'},
                    {l:'Rakes Needed',  v:rakes,                              c:'#ffcc02'},
                  ].map((s,i)=>(
                    <div key={i} className="rounded py-2" style={{background:'rgba(0,0,0,0.2)'}}>
                      <div className="font-display font-bold text-lg" style={{color:s.c}}>{s.v}</div>
                      <div className="font-mono text-gray-600" style={{fontSize:9}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-xs text-red-400 font-bold mb-3">
                  {fmtRs(totalPen)}/day penalty exposure
                </div>
                <div className="space-y-1 overflow-y-auto" style={{maxHeight:260}}>
                  {typeOrders.slice(0,12).map((o,i)=>{
                    const pc  = rule.product_colors?.[o.product_type]||rule.color
                    const dl  = safe(o.deadline_days)
                    const dc  = dl<=1?'#ff2d55':dl<=2?'#ff6b35':'#ffcc02'
                    return (
                      <div key={o.order_id} className="flex items-center justify-between p-2 rounded"
                        style={{background:'rgba(11,60,93,0.15)',border:'1px solid rgba(11,60,93,0.2)'}}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-orange-400" style={{fontSize:10}}>{o.order_id}</span>
                            <span className="px-1 rounded font-mono" style={{fontSize:8,background:`${pc}15`,color:pc}}>{o.product_type}</span>
                          </div>
                          <div className="font-mono text-gray-500 truncate" style={{fontSize:9}}>
                            {o.destination} · {safe(o.quantity_tons).toFixed(0)}T
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="font-mono font-bold text-red-400" style={{fontSize:10}}>{fmtRs(safe(o.penalty_cost))}</div>
                          <div className="font-mono" style={{fontSize:9,color:dc}}>
                            {dl<=0?'TODAY!':dl===1?'TMR':`${dl}d`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Optimal Plan ──────────────────────────────────────── */}
      {tab === 'plan' && (
        <div className="space-y-4">
          {!plan ? (
            <div className="card p-16 text-center" style={{border:'1px dashed rgba(52,199,89,0.2)'}}>
              <div style={{fontSize:48, marginBottom:12}}>⚡</div>
              <div className="font-display text-2xl text-gray-300 mb-2">Ready to optimize</div>
              <div className="font-mono text-sm text-gray-500 mb-6">
                Greedy phase picks highest-penalty orders first.<br/>
                MILP phase fills every remaining wagon slot to 96%+.
              </div>
              <button onClick={runPlan} disabled={planning} className="btn-primary px-8 py-3">
                {planning ? 'Running...' : '⚡ Generate Optimal Dispatch Plan'}
              </button>
            </div>
          ) : (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">

              {/* Plan summary */}
              <div className="card p-5"
                style={{background:'linear-gradient(135deg,rgba(52,199,89,0.05),rgba(13,25,41,0.99))',
                  border:'1px solid rgba(52,199,89,0.25)'}}>
                <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-4">
                  Two-Phase Dispatch Plan · Greedy Priority + MILP Backfill
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {[
                    {l:'Rakes',          v:plan.summary?.total_rakes||0,                                            c:'#FF7A00'},
                    {l:'Wagons Used',     v:plan.summary?.total_wagons_used||0,                                      c:'#4da6d9'},
                    {l:'Total Loaded',   v:`${(plan.summary?.total_loaded_tons||0).toFixed(0)}T`,                  c:'#34c759'},
                    {l:'Avg Utilization',v:`${plan.summary?.avg_rake_utilization||0}%`,
                      c:(plan.summary?.avg_rake_utilization||0)>=90?'#34c759':'#ffcc02'},
                    {l:'Orders Covered', v:plan.summary?.total_orders_covered||0,                                   c:'#ffcc02'},
                    {l:'Penalty Saved',  v:fmtRs(plan.summary?.total_penalty_saved||0),                            c:'#34c759'},
                  ].map((k,i)=>(
                    <div key={i} className="text-center p-3 rounded-lg" style={{background:'rgba(0,0,0,0.2)'}}>
                      <div className="font-display font-black text-xl" style={{color:k.c}}>{k.v}</div>
                      <div className="font-mono text-gray-500 mt-1" style={{fontSize:10}}>{k.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-rake cards */}
              {(plan.rake_plans||[]).map((rp, i) => {
                const rule    = WAGON_RULES[rp.wagon_type] || WAGON_RULES.BOXN
                const corrCol = CORR_COL[rp.corridor] || '#6b7280'
                const isOpen  = expanded === i
                return (
                  <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    transition={{delay:i*0.08}} className="card overflow-hidden"
                    style={{border:`1px solid ${rule.color}25`}}>

                    {/* Rake header — always visible */}
                    <div className="p-4 cursor-pointer select-none"
                      style={{background:isOpen?rule.bg:'transparent'}}
                      onClick={()=>setExpanded(isOpen?null:i)}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-end gap-0.5">
                            <LocoSVG small={true}/>
                            {[...Array(5)].map((_,wi)=>(
                              <WagonSVG key={wi} type={rp.wagon_type} color={rule.color} state="filled" small={true}/>
                            ))}
                            <WagonSVG type={rp.wagon_type} color={rule.color} state="empty" small={true}/>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-white text-lg">{rp.rake_id}</span>
                              <span className="px-2 py-0.5 rounded font-mono font-bold"
                                style={{fontSize:10,background:`${rule.color}18`,color:rule.color,border:`1px solid ${rule.color}30`}}>
                                {rp.wagon_type}
                              </span>
                              <span className="px-2 py-0.5 rounded font-mono"
                                style={{fontSize:10,background:`${corrCol}12`,color:corrCol,border:`1px solid ${corrCol}25`}}>
                                {rp.corridor}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-gray-400 mt-0.5">
                              Bokaro <span style={{color:corrCol}}>→ {(rp.route_stops||[]).join(' → ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-display font-black text-2xl"
                              style={{color:rp.rake_utilization_pct>=90?'#34c759':'#ffcc02'}}>
                              {rp.rake_utilization_pct}%
                            </div>
                            <div className="font-mono text-gray-500" style={{fontSize:9}}>utilization</div>
                          </div>
                          <div className="text-center">
                            <div className="font-display font-bold text-lg text-orange-400">{rp.total_wagons_used}w</div>
                            <div className="font-mono text-gray-500" style={{fontSize:9}}>wagons</div>
                          </div>
                          <div className="text-center">
                            <div className="font-display font-bold text-lg text-green-400">{rp.total_loaded_tons}T</div>
                            <div className="font-mono text-gray-500" style={{fontSize:9}}>loaded</div>
                          </div>
                          <div className="text-center">
                            <div className="font-display font-bold text-base text-yellow-400">{fmtRs(rp.penalty_saved||0)}</div>
                            <div className="font-mono text-gray-500" style={{fontSize:9}}>penalty saved</div>
                          </div>
                          <div className="font-mono text-gray-500" style={{fontSize:14}}>
                            {isOpen ? '▲' : '▼'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
                          exit={{height:0,opacity:0}} transition={{duration:0.3}}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 border-t border-steel-700/30">
                            <div className="mt-4 space-y-3">
                              {/* Wagon rule reminder */}
                              <div className="flex items-start gap-3 p-3 rounded-lg"
                                style={{background:rule.bg, border:`1px solid ${rule.color}20`}}>
                                <div className="flex items-end gap-1 flex-shrink-0">
                                  {[...Array(4)].map((_,wi)=>(
                                    <WagonSVG key={wi} type={rp.wagon_type} color={rule.color} state="filled" small={false}/>
                                  ))}
                                </div>
                                <div>
                                  <div className="font-mono text-xs font-bold mb-1" style={{color:rule.color}}>
                                    {rule.full_name} — Why this wagon?
                                  </div>
                                  <div className="font-mono text-xs text-gray-400">{rule.why}</div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {rule.products.map(p=>{
                                      const pc=rule.product_colors?.[p]||rule.color
                                      return (
                                        <span key={p} className="px-2 py-0.5 rounded font-mono font-bold"
                                          style={{fontSize:9,background:`${pc}15`,color:pc,border:`1px solid ${pc}30`}}>
                                          {p}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Full wagon visualization */}
                              <RakeVisual plan={rp}/>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
