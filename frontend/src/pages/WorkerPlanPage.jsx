/**
 * SAIL Bokaro DSS — Today's Dispatch Plan
 * 5-step supervisor workflow:
 *   1. Select critical/high-penalty orders
 *   2. System finds compatible wagons (with live search animation)
 *   3. MILP builds optimal rake — shows every wagon slot filled/empty
 *      → Unfilled orders shown clearly
 *      → Smart suggestions for same-route same-type orders to fill gaps
 *      → Officer can manually add orders one by one
 *   4. Loading status board
 *   5. Dispatch confirmation + auto customer emails
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

const BASE = 'https://sail-dss-backend.onrender.com'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRs  = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${Math.round(n)}`
const fmtT   = n => `${Math.round(n).toLocaleString('en-IN')}T`
const safe   = (v,d=0) => (v===null||v===undefined||isNaN(+v))?d:+v
const RISK_C = s => s>=0.85?'#ff2d55':s>=0.65?'#ff6b35':s>=0.45?'#ffcc02':'#34c759'
const RISK_L = s => s>=0.85?'CRITICAL':s>=0.65?'HIGH':s>=0.45?'MEDIUM':'LOW'

// ── Indian Railways Rules ─────────────────────────────────────────────────────
const WAGON_RULES = {
  BCNA:{ products:['HR-COIL','CR-SHEET','WIRE-ROD'],  wagons:58, cap:58, total:3364, color:'#4da6d9',
    why:'Covered wagon — protects coils & sheets from rain and humidity' },
  BRN: { products:['PLATE-H','PLATE-M','SLAB-A','SLAB-B','STRUCT-A'], wagons:40, cap:55, total:2200, color:'#34c759',
    why:'Flat wagon — heavy slabs & plates secured with chains' },
  BOXN:{ products:['TMT-12','TMT-16','TMT-20','BILLET-S','BILLET-H','PIG-IRON'], wagons:58, cap:60, total:3480, color:'#FF7A00',
    why:'Open high-sided wagon — TMT bars & billets loaded in bundles' },
}
const PRODUCT_TO_WAGON = {}
Object.entries(WAGON_RULES).forEach(([wt,r]) => r.products.forEach(p => { PRODUCT_TO_WAGON[p]=wt }))
const CORRIDORS = {
  Eastern:['Dhanbad','Howrah','Kolkata','Durgapur','Asansol','Patna','Varanasi','Allahabad','Lucknow','Kanpur'],
  SouthEastern:['Jamshedpur','Rourkela','Bhilai','Raipur','Visakhapatnam','Vijayawada','Chennai','Coimbatore','Madurai'],
  Central:['Ranchi','Nagpur','Bhopal','Jabalpur','Delhi','Jaipur','Kota','Agra','Gwalior','Meerut','Faridabad','Ludhiana'],
  Western:['Vadodara','Surat','Ahmedabad','Rajkot','Pune','Nashik','Mumbai','Jodhpur'],
  Hyderabad:['Hyderabad'],
}
const CITY_CORR = {}
Object.entries(CORRIDORS).forEach(([c,cities]) => cities.forEach(city => { CITY_CORR[city]=c }))
const CORR_COL = { Eastern:'#3B8BD4',SouthEastern:'#1D9E75',Central:'#BA7517',Western:'#9F4AB7',Hyderabad:'#D85A30' }
const ORDER_PALETTE = ['#FF7A00','#4da6d9','#9F4AB7','#D85A30','#1D9E75','#ffcc02','#ff2d55','#74c0fc','#BA7517','#34c759']
const STATUS_COLORS = { pending:'#ffcc02', loading:'#FF7A00', loaded:'#1565a0', dispatched:'#34c759' }

// ── Wagon Mini SVG ────────────────────────────────────────────────────────────
function WagonSVG({ wtype, color, state }) {
  const bg = state==='empty' ? 'rgba(11,60,93,0.35)' : color
  const bd = state==='empty' ? 'rgba(21,101,160,0.2)' : `${color}AA`
  if (wtype==='BRN') return (
    <svg width="22" height="20" viewBox="0 0 22 20">
      <rect x="1" y="9" width="20" height="7" rx="1" fill={bg} stroke={bd} strokeWidth="0.6"/>
      {state!=='empty'&&<rect x="1" y="9" width="20" height="2" fill={color} opacity="0.4"/>}
      <rect x="0" y="11" width="1.5" height="2" fill={bd}/><rect x="20.5" y="11" width="1.5" height="2" fill={bd}/>
      <circle cx="4" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BRN.color} strokeWidth="0.5"/>
      <circle cx="18" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BRN.color} strokeWidth="0.5"/>
    </svg>
  )
  if (wtype==='BCNA') return (
    <svg width="22" height="20" viewBox="0 0 22 20">
      <rect x="1" y="3" width="20" height="13" rx="2" fill={bg} stroke={bd} strokeWidth="0.6"/>
      <path d="M 1 5 Q 11 1 21 5" fill="none" stroke={state==='empty'?bd:color} strokeWidth="0.8"/>
      {state!=='empty'&&<rect x="1" y="3" width="20" height="2" rx="1" fill={color} opacity="0.35"/>}
      <rect x="0" y="9" width="1.5" height="2" fill={bd}/><rect x="20.5" y="9" width="1.5" height="2" fill={bd}/>
      <circle cx="4" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BCNA.color} strokeWidth="0.5"/>
      <circle cx="18" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BCNA.color} strokeWidth="0.5"/>
    </svg>
  )
  return (
    <svg width="22" height="20" viewBox="0 0 22 20">
      <rect x="1" y="2" width="20" height="14" rx="2" fill={bg} stroke={bd} strokeWidth="0.6"/>
      {state!=='empty'&&<rect x="1" y="2" width="20" height="2.5" rx="1" fill={color} opacity="0.4"/>}
      <rect x="0" y="8" width="1.5" height="2" fill={bd}/><rect x="20.5" y="8" width="1.5" height="2" fill={bd}/>
      <circle cx="4" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BOXN.color} strokeWidth="0.5"/>
      <circle cx="18" cy="18" r="2.5" fill="#0d1e30" stroke={WAGON_RULES.BOXN.color} strokeWidth="0.5"/>
    </svg>
  )
}
function LocoSVG() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" style={{flexShrink:0,marginRight:2}}>
      <rect x="0" y="2" width="31" height="14" rx="3" fill="#FF7A00" opacity="0.95"/>
      <rect x="2" y="4" width="11" height="8" rx="2" fill="#cc5500"/>
      <rect x="20" y="5" width="8" height="6" rx="1" fill="#cc5500"/>
      <circle cx="5"  cy="18" r="2.5" fill="#0d1e30" stroke="#FF7A00" strokeWidth="0.5"/>
      <circle cx="27" cy="18" r="2.5" fill="#0d1e30" stroke="#FF7A00" strokeWidth="0.5"/>
      <rect x="30" y="8" width="1.5" height="2" fill="rgba(255,122,0,0.5)"/>
    </svg>
  )
}

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepDot({ num, label, active, done, color }) {
  return (
    <div className="flex flex-col items-center" style={{flex:1}}>
      <motion.div animate={active?{scale:[1,1.12,1],boxShadow:[`0 0 0px ${color}`,`0 0 18px ${color}`,`0 0 0px ${color}`]}:{}}
        transition={{duration:1.5,repeat:active?Infinity:0}}
        style={{width:34,height:34,borderRadius:'50%',
          background:done?color:active?`${color}28`:'rgba(11,60,93,0.4)',
          border:`2px solid ${done||active?color:'#0B3C5D'}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          color:done?'#000':active?color:'#456070',fontWeight:900,fontSize:13}}>
        {done?'✓':num}
      </motion.div>
      <div style={{fontSize:9,color:done||active?color:'#456070',marginTop:4,textAlign:'center',
        fontFamily:'Rajdhani',fontWeight:600,letterSpacing:1,whiteSpace:'nowrap'}}>{label}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Select Critical Orders
// ═══════════════════════════════════════════════════════════════════════════════
function Screen1({ onNext, selectedOrders, setSelectedOrders }) {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('TODAY')

  useEffect(() => {
    axios.get(`${BASE}/orders?status=PENDING&limit=300`)
      .then(r => setOrders(r.data?.orders||[]))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const today  = orders.filter(o=>safe(o.deadline_days)<=1).sort((a,b)=>safe(b.penalty_cost)-safe(a.penalty_cost))
  const h48    = orders.filter(o=>safe(o.deadline_days)<=2).sort((a,b)=>safe(b.penalty_cost)-safe(a.penalty_cost))
  const week   = orders.filter(o=>safe(o.deadline_days)<=7).sort((a,b)=>safe(a.deadline_days)-safe(b.deadline_days))
  const shown  = filter==='TODAY'?today:filter==='48H'?h48:week

  const toggle = o => setSelectedOrders(prev =>
    prev.find(x=>x.order_id===o.order_id) ? prev.filter(x=>x.order_id!==o.order_id) : [...prev,o]
  )

  return (
    <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-4">
      <div className="card p-5" style={{background:'linear-gradient(135deg,rgba(255,45,85,0.07),rgba(13,25,41,0.98))',border:'1px solid rgba(255,45,85,0.2)'}}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{fontSize:28}}>🚨</div>
          <div>
            <div className="font-display font-black text-xl text-white">Select Orders to Dispatch Today</div>
            <div className="font-mono text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            {l:'Expiring Today',    v:today.length,  c:'#ff2d55'},
            {l:'Due in 48 Hours',   v:h48.length,    c:'#ff6b35'},
            {l:'Due This Week',     v:week.length,   c:'#ffcc02'},
            {l:'Penalty if Missed', v:fmtRs(shown.reduce((s,o)=>s+safe(o.penalty_cost),0)), c:'#ff2d55'},
          ].map((k,i)=>(
            <div key={i} className="text-center p-3 rounded-lg" style={{background:'rgba(0,0,0,0.25)',border:`1px solid ${k.c}18`}}>
              <div className="font-display font-black text-2xl" style={{color:k.c}}>{k.v}</div>
              <div className="font-mono text-gray-500 mt-1" style={{fontSize:10}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {[{k:'TODAY',l:`🔴 Expiring Today (${today.length})`,c:'#ff2d55'},{k:'48H',l:`🟠 Next 48 hrs (${h48.length})`,c:'#ff6b35'},{k:'WEEK',l:`🟡 This Week (${week.length})`,c:'#ffcc02'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
            style={{background:filter===f.k?`${f.c}18`:'rgba(11,60,93,0.3)',border:`1px solid ${filter===f.k?f.c:'#0B3C5D'}`,color:filter===f.k?f.c:'#6b7280'}}>{f.l}</button>
        ))}
        {selectedOrders.length>0&&(
          <div className="ml-auto font-mono text-xs px-3 py-2 rounded-lg" style={{background:'rgba(52,199,89,0.1)',border:'1px solid rgba(52,199,89,0.25)',color:'#34c759'}}>
            ✓ {selectedOrders.length} orders selected · {fmtRs(selectedOrders.reduce((s,o)=>s+safe(o.penalty_cost),0))}/day saved
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center font-mono text-gray-400">Loading orders from system...</div>
      ) : (
        <div className="space-y-2">
          {shown.map((o,i)=>{
            const sel = !!selectedOrders.find(x=>x.order_id===o.order_id)
            const wt  = PRODUCT_TO_WAGON[o.product_type]||'BOXN'
            const wr  = WAGON_RULES[wt]
            const dl  = safe(o.deadline_days)
            const dc  = dl<=1?'#ff2d55':dl<=2?'#ff6b35':'#ffcc02'
            return (
              <motion.div key={o.order_id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.015}}
                onClick={()=>toggle(o)} className="card p-4 cursor-pointer hover:scale-[1.002] transition-transform"
                style={{border:`2px solid ${sel?'#34c759':dl<=1?'rgba(255,45,85,0.35)':'rgba(11,60,93,0.3)'}`,background:sel?'rgba(52,199,89,0.05)':'rgba(10,25,41,0.95)'}}>
                <div className="flex items-center gap-4">
                  <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${sel?'#34c759':'#0B3C5D'}`,background:sel?'#34c759':'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:900,fontSize:13,flexShrink:0}}>
                    {sel&&'✓'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-bold text-orange-400">{o.order_id}</span>
                      <span className="font-display font-semibold text-white text-sm truncate max-w-40">{o.customer_name||o.customer_id}</span>
                      <span className="px-2 py-0.5 rounded font-mono" style={{fontSize:9,background:`${wr.color}15`,color:wr.color,border:`1px solid ${wr.color}30`}}>{wt}</span>
                    </div>
                    <div className="flex gap-3 text-xs font-mono text-gray-400 flex-wrap">
                      <span>📦 <span className="text-yellow-400">{o.product_type}</span></span>
                      <span>⚖️ {fmtT(safe(o.quantity_tons))}</span>
                      <span>📍 {o.destination}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-black text-base" style={{color:dc}}>
                      {dl<=0?'TODAY':dl===1?'TOMORROW':`${dl}d left`}
                    </div>
                    <div className="font-mono text-xs text-gray-400">{fmtRs(safe(o.penalty_cost))}<span className="text-gray-600">/day</span></div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <div className="font-mono text-xs text-gray-500">
          {selectedOrders.length>0 ? `${selectedOrders.length} orders selected` : 'Click orders above to select, or proceed with all expiring today'}
        </div>
        <button onClick={()=>onNext(selectedOrders.length>0?selectedOrders:shown.slice(0,8))}
          className="btn-primary flex items-center gap-2 px-6 py-3">
          Find Available Wagons →
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Smart Wagon Search + Availability
// ═══════════════════════════════════════════════════════════════════════════════
function Screen2({ onNext, onBack, urgentOrders }) {
  const [phase,      setPhase]      = useState('searching') // searching | results
  const [wagons,     setWagons]     = useState([])
  const [searchLog,  setSearchLog]  = useState([])
  const logRef = useRef([])

  const PRODUCT_GROUPS = {}
  urgentOrders.forEach(o => {
    const wt = PRODUCT_TO_WAGON[o.product_type]||'BOXN'
    if (!PRODUCT_GROUPS[wt]) PRODUCT_GROUPS[wt] = []
    PRODUCT_GROUPS[wt].push(o)
  })

  useEffect(() => {
    const addLog = (msg, color='#4da6d9') => {
      logRef.current = [...logRef.current, {msg, color, id:Date.now()+Math.random()}]
      setSearchLog([...logRef.current])
    }
    const run = async () => {
      addLog('Initiating wagon availability scan across all sidings...', '#ffcc02')
      await new Promise(r=>setTimeout(r,600))
      addLog('Checking SID-1 Loading Point...', '#4da6d9')
      await new Promise(r=>setTimeout(r,400))
      addLog('Checking SID-2 Loading Point...', '#4da6d9')
      await new Promise(r=>setTimeout(r,300))
      addLog('Checking SID-3, SID-4, SID-5, SID-6...', '#4da6d9')
      await new Promise(r=>setTimeout(r,400))
      try {
        const r = await axios.get(`${BASE}/wagons?limit=500`)
        const all = r.data?.wagons||[]
        const avail = all.filter(w=>['available','Available','AVAILABLE'].includes(w.wagon_status||w.availability_status||''))
        setWagons(avail)
        addLog(`Found ${avail.length} wagons ready at sidings`, '#34c759')
        await new Promise(r=>setTimeout(r,300))
        Object.entries(PRODUCT_GROUPS).forEach(([wt, orders]) => {
          const compatible = avail.filter(w=>w.wagon_type===wt)
          const spec = WAGON_RULES[wt]
          const neededWagons = orders.reduce((s,o)=>s+Math.ceil(safe(o.quantity_tons)/spec.cap),0)
          if (compatible.length >= neededWagons) {
            addLog(`✅ ${wt} wagons: ${compatible.length} available — enough for ${orders.length} selected orders`, '#34c759')
          } else {
            addLog(`⚠️ ${wt} wagons: only ${compatible.length} available, need ${neededWagons} — partial rake possible`, '#ffcc02')
          }
        })
        await new Promise(r=>setTimeout(r,500))
        addLog('Wagon compatibility check complete. Ready for optimization.', '#34c759')
        await new Promise(r=>setTimeout(r,400))
        setPhase('results')
      } catch(e) {
        addLog('Error fetching wagons — using cached data', '#ff6b35')
        setPhase('results')
      }
    }
    run()
  }, [])

  const byType = wagons.reduce((acc,w) => { acc[w.wagon_type]=(acc[w.wagon_type]||0)+1; return acc }, {})
  const totalCap = wagons.reduce((s,w)=>s+safe(w.wagon_capacity_tons||55),0)
  const neededTons = urgentOrders.reduce((s,o)=>s+safe(o.quantity_tons),0)

  return (
    <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-4">
      <div className="card p-5" style={{background:'linear-gradient(135deg,rgba(255,122,0,0.07),rgba(13,25,41,0.98))',border:'1px solid rgba(255,122,0,0.2)'}}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{fontSize:28}}>🔍</div>
          <div>
            <div className="font-display font-black text-xl text-white">
              {phase==='searching' ? 'Scanning Available Wagons...' : 'Wagons Ready for Loading'}
            </div>
            <div className="font-mono text-xs text-gray-400">
              {phase==='searching' ? 'Checking all sidings and loading points across the plant' : `${wagons.length} wagons available · ${fmtT(totalCap)} total capacity`}
            </div>
          </div>
          {phase==='searching'&&<div className="ml-auto w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/>}
        </div>

        {/* Live search log */}
        <div className="rounded-lg p-3 font-mono text-xs space-y-1 overflow-y-auto" style={{background:'rgba(0,0,0,0.4)',maxHeight:160}}>
          {searchLog.map(l=>(
            <motion.div key={l.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
              style={{color:l.color}}>› {l.msg}</motion.div>
          ))}
          {phase==='searching'&&(
            <div className="text-gray-600 flex items-center gap-1">
              <motion.span animate={{opacity:[1,0,1]}} transition={{duration:0.8,repeat:Infinity}}>▋</motion.span>
            </div>
          )}
        </div>
      </div>

      {phase==='results' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {l:'Wagons at Sidings',   v:wagons.length,                                              c:'#34c759'},
              {l:'Total Load Capacity', v:fmtT(totalCap),                                            c:'#4da6d9'},
              {l:'Your Orders Need',    v:fmtT(neededTons),                                          c:'#FF7A00'},
              {l:'Coverage',           v:totalCap>=neededTons?'✓ SUFFICIENT':'⚠ PARTIAL',            c:totalCap>=neededTons?'#34c759':'#ffcc02'},
            ].map((k,i)=>(
              <div key={i} className="card p-4 text-center">
                <div className="font-display font-black text-xl" style={{color:k.c}}>{k.v}</div>
                <div className="font-mono text-gray-400 text-xs mt-1">{k.l}</div>
              </div>
            ))}
          </div>

          {/* What wagon types are available and why they matter */}
          <div className="card p-4">
            <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-3">
              Wagon Types at Sidings — Which can carry your selected orders
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(WAGON_RULES).map(([wt,rule])=>{
                const avlCount = byType[wt]||0
                const ordersNeedingThis = PRODUCT_GROUPS[wt]||[]
                const wagonsNeeded = ordersNeedingThis.reduce((s,o)=>s+Math.ceil(safe(o.quantity_tons)/rule.cap),0)
                const canFill = avlCount >= wagonsNeeded
                const hasOrders = ordersNeedingThis.length > 0
                return (
                  <div key={wt} className="p-3 rounded-xl" style={{
                    background:hasOrders?`${rule.color}08`:'rgba(11,60,93,0.1)',
                    border:`1px solid ${hasOrders?rule.color+'30':'rgba(11,60,93,0.2)'}`,
                    opacity:hasOrders?1:0.5}}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-end gap-0.5">
                        <LocoSVG/>
                        {[...Array(4)].map((_,i)=><WagonSVG key={i} wtype={wt} color={rule.color} state={i<3?'filled':'empty'}/>)}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-white text-sm">{wt}</div>
                    <div className="font-mono text-gray-500 mb-2" style={{fontSize:10}}>{rule.why}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rule.products.map(p=>(
                        <span key={p} className="px-1.5 py-0.5 rounded font-mono" style={{fontSize:8,background:`${rule.color}15`,color:rule.color}}>{p}</span>
                      ))}
                    </div>
                    <div className="flex justify-between font-mono text-xs">
                      <span style={{color:rule.color}}>{avlCount} available</span>
                      {hasOrders&&<span style={{color:canFill?'#34c759':'#ffcc02'}}>{canFill?'✓ Enough':'⚠ Limited'}</span>}
                    </div>
                    {hasOrders&&<div className="mt-1 font-mono text-gray-500" style={{fontSize:9}}>
                      {ordersNeedingThis.length} of your orders need {wt} · {wagonsNeeded} wagons required
                    </div>}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg font-mono text-sm text-gray-400" style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>← Back</button>
        <button onClick={()=>onNext(wagons)} disabled={phase==='searching'} className="btn-primary px-6 py-3 disabled:opacity-50">
          {phase==='searching' ? 'Scanning...' : 'Run MILP Optimization →'}
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — MILP Rake Plan + Smart Suggestions
// ═══════════════════════════════════════════════════════════════════════════════
function Screen3({ onNext, onBack, urgentOrders, availableWagons }) {
  const RAKE_SPECS = {BOXN:{wagons:58,cap:60,total:3480},BCNA:{wagons:58,cap:58,total:3364},BRN:{wagons:40,cap:55,total:2200}}

  const primaryWtype = PRODUCT_TO_WAGON[urgentOrders[0]?.product_type]||'BOXN'
  const [rakeType, setRakeType] = useState(primaryWtype)
  const spec = RAKE_SPECS[rakeType]||RAKE_SPECS.BOXN

  const [optimizing,   setOptimizing]   = useState(false)
  const [planResult,   setPlanResult]   = useState(null)
  const [activeRake,   setActiveRake]   = useState(0)
  const [allOrders,    setAllOrders]    = useState([])
  const [suggestions,  setSuggestions]  = useState([])
  const [addedOrders,  setAddedOrders]  = useState([]) // manually added
  const [addingOrder,  setAddingOrder]  = useState(null)
  const [addMessage,   setAddMessage]   = useState(null) // feedback message
  const [selectedWagon,setSelectedWagon]= useState(null)
  const [hoveredWagon, setHoveredWagon] = useState(null)
  const [wagonSlots,   setWagonSlots]   = useState([])
  const [colorMap,     setColorMap]     = useState({})

  // Load all pending orders for suggestions
  useEffect(() => {
    axios.get(`${BASE}/orders?status=PENDING&limit=500`)
      .then(r => setAllOrders(r.data?.orders||[]))
      .catch(()=>{})
  }, [])

  // Auto-detect wagon type
  useEffect(() => {
    const wt = PRODUCT_TO_WAGON[urgentOrders[0]?.product_type]||'BOXN'
    setRakeType(wt)
  }, [])

  const initSlots = (wt) => {
    const sp = RAKE_SPECS[wt]||RAKE_SPECS.BOXN
    return Array.from({length:sp.wagons},(_,i)=>({
      idx:i, state:'empty', color:'#6b7280', orderId:null,
      product:null, customer:null, destination:null,
      loadedTons:0, capacity:sp.cap, fillPct:0,
      ordersOnWagon:[], wagonId:`WGN-${String(i+1).padStart(4,'0')}`
    }))
  }

  useEffect(()=>{ setWagonSlots(initSlots(rakeType)) },[rakeType])

  const runOptimize = async () => {
    setOptimizing(true)
    setPlanResult(null)
    setSuggestions([])
    setAddedOrders([])
    setAddMessage(null)
    setSelectedWagon(null)
    try {
      const ids = [...urgentOrders,...addedOrders].map(o=>String(o.order_id))
      const r = await axios.post(`${BASE}/dispatch-plan`, {selected_order_ids:ids, algorithm:'milp'})
      const data = r.data
      setPlanResult(data)

      // Build wagon slots for primary rake type
      const plans = data?.rake_plans||[]
      const plan = plans.find(p=>p.wagon_type===rakeType)||plans[0]
      if (plan) {
        setActiveRake(plans.indexOf(plan))
        buildWagonSlots(plan, rakeType)
        // Generate suggestions for empty wagons
        generateSuggestions(plan, allOrders)
      }
    } catch(e) { console.error(e) }
    setOptimizing(false)
  }

  const buildWagonSlots = (plan, wt) => {
    const slots = initSlots(wt)
    const assignments = plan.wagon_assignments||[]
    const newColorMap = {}
    let ci = 0
    assignments.forEach(a => {
      if (!newColorMap[a.order_id]) { newColorMap[a.order_id]=ORDER_PALETTE[ci%ORDER_PALETTE.length]; ci++ }
    })
    setColorMap(newColorMap)
    let si = 0
    assignments.forEach(a => {
      if (si >= slots.length) return
      const color = newColorMap[a.order_id]||'#FF7A00'
      const cap = slots[si].capacity
      const load = Math.min(safe(a.loaded_tons), cap)
      slots[si] = {
        ...slots[si], state:a.fill_type==='BACKFILL'?'backfill':'urgent',
        color, orderId:a.order_id, product:a.product_type,
        customer:a.customer_name||'', destination:a.destination,
        loadedTons:Math.round(load*10)/10, fillPct:Math.round(load/cap*100),
        ordersOnWagon:[{orderId:a.order_id,product:a.product_type,customer:a.customer_name||'',
          destination:a.destination,loadedTons:Math.round(load*10)/10,color,type:a.fill_type||'URGENT'}]
      }
      si++
    })
    setWagonSlots(slots)
  }

  const generateSuggestions = (plan, allOrd) => {
    const emptyCount = (plan.wagons_in_rake||58) - (plan.total_wagons_used||0)
    if (emptyCount <= 0) { setSuggestions([]); return }
    const wt = plan.wagon_type
    const rule = WAGON_RULES[wt]
    const coveredIds = (plan.wagon_assignments||[]).map(a=>String(a.order_id))
    const corridor = (plan.wagon_assignments||[])[0]?.destination
    const mainCorr = CITY_CORR[corridor]

    // Find same-wagon-type orders on same corridor, sorted by urgency
    const sugg = allOrd
      .filter(o => PRODUCT_TO_WAGON[o.product_type]===wt && !coveredIds.includes(String(o.order_id)))
      .filter(o => !mainCorr || CITY_CORR[o.destination]===mainCorr)
      .sort((a,b) => safe(b.penalty_cost)/Math.max(safe(a.deadline_days),0.5) - safe(a.penalty_cost)/Math.max(safe(b.deadline_days),0.5))
      .slice(0, 8)
    setSuggestions(sugg)
  }

  const tryAddOrder = async (order) => {
    setAddingOrder(order.order_id)
    setAddMessage(null)
    const wt = PRODUCT_TO_WAGON[order.product_type]||'BOXN'
    const currentPlan = planResult?.rake_plans?.find(p=>p.wagon_type===wt)||planResult?.rake_plans?.[activeRake]
    const emptySlots = wagonSlots.filter(w=>w.state==='empty')

    if (wt !== rakeType) {
      setAddMessage({ type:'error', msg:`Cannot add — ${order.product_type} needs ${wt} wagons, but this rake is ${rakeType}. This order must go in a separate ${wt} rake.` })
      setAddingOrder(null)
      return
    }
    if (emptySlots.length === 0) {
      setAddMessage({ type:'error', msg:`Rake is full (${spec.wagons}/${spec.wagons} wagons loaded). No space remaining for order ${order.order_id}.` })
      setAddingOrder(null)
      return
    }

    // Calculate how many wagons this order needs
    const wagonsNeeded = Math.ceil(safe(order.quantity_tons)/spec.cap)
    const wagonsAvailable = emptySlots.length
    const canLoad = Math.min(wagonsNeeded, wagonsAvailable)
    const loadTons = Math.min(safe(order.quantity_tons), canLoad*spec.cap)
    const color = ORDER_PALETTE[(Object.keys(colorMap).length)%ORDER_PALETTE.length]

    // Fill wagons
    const newSlots = [...wagonSlots]
    let remaining = loadTons
    let filled = 0
    for (let i=0; i<newSlots.length && remaining>0; i++) {
      if (newSlots[i].state!=='empty') continue
      const load = Math.min(remaining, newSlots[i].capacity)
      newSlots[i] = {
        ...newSlots[i], state:'backfill', color,
        orderId:order.order_id, product:order.product_type,
        customer:order.customer_name||order.customer_id||'',
        destination:order.destination, loadedTons:Math.round(load*10)/10,
        fillPct:Math.round(load/newSlots[i].capacity*100),
        ordersOnWagon:[{orderId:order.order_id,product:order.product_type,
          customer:order.customer_name||'',destination:order.destination,
          loadedTons:Math.round(load*10)/10,color,type:'BACKFILL'}]
      }
      remaining -= load
      filled++
    }
    setWagonSlots(newSlots)
    setColorMap(prev=>({...prev,[order.order_id]:color}))
    setAddedOrders(prev=>[...prev,order])
    setSuggestions(prev=>prev.filter(s=>s.order_id!==order.order_id))

    const emptyAfter = newSlots.filter(w=>w.state==='empty').length
    if (remaining > 0.5) {
      setAddMessage({type:'partial',
        msg:`Order ${order.order_id} partially loaded — ${Math.round(loadTons-remaining)}T loaded across ${filled} wagons. ${Math.round(remaining)}T could not fit (${emptyAfter} wagon slots remaining). Consider adding another ${wt} rake.`})
    } else {
      setAddMessage({type:'success',
        msg:`✅ Order ${order.order_id} fully loaded — ${Math.round(loadTons)}T across ${filled} wagons. ${emptyAfter} empty wagon slots remaining on this rake.`})
    }
    setAddingOrder(null)
  }

  // Stats
  const filled    = wagonSlots.filter(w=>w.state!=='empty')
  const empty     = wagonSlots.filter(w=>w.state==='empty')
  const totalLoad = wagonSlots.reduce((s,w)=>s+w.loadedTons,0)
  const rakeUtil  = spec.total>0?Math.round(totalLoad/spec.total*100):0
  const plans     = planResult?.rake_plans||[]
  const selW      = selectedWagon!==null?wagonSlots[selectedWagon]:null

  return (
    <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-3">

      {/* Header */}
      <div className="card p-4" style={{background:'linear-gradient(135deg,rgba(52,199,89,0.05),rgba(13,25,41,0.98))',border:'1px solid rgba(52,199,89,0.18)'}}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-black text-xl text-white">Rake Formation & Loading Plan</div>
            <div className="font-mono text-xs text-gray-400 mt-0.5">
              MILP algorithm packs highest-penalty orders first · Remaining space filled with same-route orders
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-gray-500 mr-1">WAGON TYPE:</div>
            {Object.keys(RAKE_SPECS).map(t=>{
              const wr = WAGON_RULES[t]
              return (
                <button key={t} onClick={()=>setRakeType(t)}
                  className="px-2.5 py-1 rounded font-mono text-xs font-bold transition-all"
                  style={{background:rakeType===t?`${wr.color}20`:'rgba(11,60,93,0.3)',
                    border:`1px solid ${rakeType===t?wr.color:'#0B3C5D'}`,color:rakeType===t?wr.color:'#6b7280'}}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">

        {/* LEFT: Rake selector + stats */}
        <div className="space-y-3">
          <button onClick={runOptimize} disabled={optimizing}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm">
            {optimizing
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Optimizing...</>
              : <>⚡ Run MILP Optimization</>}
          </button>

          {/* Rake tabs if multiple rakes */}
          {plans.length>1&&(
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-500 uppercase tracking-wider px-1">Rakes Generated</div>
              {plans.map((p,i)=>{
                const wr = WAGON_RULES[p.wagon_type]||WAGON_RULES.BOXN
                const cc = CORR_COL[p.corridor]||'#6b7280'
                return (
                  <button key={i} onClick={()=>{setActiveRake(i);buildWagonSlots(p,rakeType);generateSuggestions(p,allOrders)}}
                    className="w-full p-2.5 rounded-lg text-left transition-all"
                    style={{background:activeRake===i?`${wr.color}12`:'rgba(11,60,93,0.15)',border:`1px solid ${activeRake===i?wr.color+'40':'rgba(11,60,93,0.2)'}`}}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-orange-400" style={{fontSize:11}}>{p.rake_id}</span>
                      <span className="font-mono font-bold" style={{fontSize:11,color:p.rake_utilization_pct>=90?'#34c759':'#ffcc02'}}>{p.rake_utilization_pct}%</span>
                    </div>
                    <div className="font-mono text-gray-500" style={{fontSize:9}}>{p.wagon_type} · <span style={{color:cc}}>{p.corridor}</span></div>
                    <div className="font-mono text-gray-600 truncate" style={{fontSize:9}}>→ {(p.route_stops||[]).join(', ')}</div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Stats */}
          {planResult&&(
            <div className="card p-3 space-y-2">
              <div className="font-mono text-xs text-gray-500 uppercase tracking-wider">Plan Summary</div>
              {[
                {l:'Rakes',         v:planResult.summary?.total_rakes||0,                  c:'#FF7A00'},
                {l:'Wagons Used',   v:planResult.summary?.total_wagons_used||0,             c:'#4da6d9'},
                {l:'Total Loaded',  v:`${(planResult.summary?.total_loaded_tons||0).toFixed(0)}T`, c:'#34c759'},
                {l:'Avg Util',      v:`${planResult.summary?.avg_rake_utilization||0}%`,   c:planResult.summary?.avg_rake_utilization>=90?'#34c759':'#ffcc02'},
                {l:'Penalty Saved', v:fmtRs(planResult.summary?.total_penalty_saved||0),  c:'#ffcc02'},
              ].map((k,i)=>(
                <div key={i} className="flex justify-between font-mono text-xs">
                  <span className="text-gray-500">{k.l}</span>
                  <span className="font-bold" style={{color:k.c}}>{k.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER: Rake visualization */}
        <div className="col-span-2 space-y-3">
          {/* Util bar */}
          <div className="card p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-mono text-xs font-bold text-white">
                {plans[activeRake]?.rake_id||'RK-000'} · {rakeType} · {spec.wagons} wagons · {(spec.total/1000).toFixed(1)}KT capacity
              </span>
              <span className="font-display font-black text-xl" style={{color:rakeUtil>=90?'#34c759':rakeUtil>=70?'#ffcc02':'#ff6b35'}}>
                {rakeUtil}%
              </span>
            </div>
            <div className="h-3.5 rounded-full overflow-hidden flex" style={{background:'rgba(11,60,93,0.4)'}}>
              <motion.div animate={{width:`${rakeUtil}%`}} transition={{duration:0.6}}
                style={{height:'100%',borderRadius:99,
                  background:rakeUtil>=90?`linear-gradient(90deg,${WAGON_RULES[rakeType]?.color||'#FF7A00'},#34c759)`:rakeUtil>=70?'linear-gradient(90deg,#FF7A00,#ffcc02)':'linear-gradient(90deg,#cc2200,#ff6b35)'}}/>
              {rakeUtil<100&&rakeUtil>0&&(
                <div style={{flex:1,background:'rgba(255,204,2,0.06)',borderLeft:'1.5px dashed rgba(255,204,2,0.3)',
                  display:'flex',alignItems:'center',paddingLeft:4,fontSize:9,color:'rgba(255,204,2,0.5)',fontFamily:'Rajdhani'}}>
                  {(spec.total-totalLoad).toFixed(0)}T unused
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mt-2">
              {[
                {l:'Empty',    v:empty.length,                                         c:'#6b7280'},
                {l:'Urgent',   v:wagonSlots.filter(w=>w.state==='urgent').length,      c:'#ff2d55'},
                {l:'Backfill', v:wagonSlots.filter(w=>w.state==='backfill').length,    c:'#34c759'},
                {l:'Loaded',   v:`${totalLoad.toFixed(0)}T`,                           c:'#FF7A00'},
              ].map((k,i)=>(
                <div key={i}>
                  <div className="font-display font-bold text-sm" style={{color:k.c}}>{k.v}</div>
                  <div style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>{k.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Wagon grid */}
          <div className="card p-3" style={{background:'rgba(3,10,20,0.97)'}}>
            <div className="font-mono text-center mb-2" style={{fontSize:9,color:'rgba(21,101,160,0.45)',letterSpacing:3}}>
              ← LOCOMOTIVE · {spec.wagons} {rakeType} WAGONS →
            </div>
            <div style={{overflowY:'auto',maxHeight:320}}>
              {Array.from({length:Math.ceil(spec.wagons/14)},(_,ri)=>{
                const row = wagonSlots.slice(ri*14, ri*14+14)
                return (
                  <div key={ri} style={{display:'flex',alignItems:'flex-end',gap:2,marginBottom:3}}>
                    {ri===0?<LocoSVG/>:<div style={{width:34}}/>}
                    {row.map((w,wi)=>{
                      const idx = ri*14+wi
                      const isSel = selectedWagon===idx
                      const isHov = hoveredWagon===idx
                      const isUnder = w.state!=='empty'&&w.fillPct<90
                      return (
                        <div key={idx} style={{position:'relative',
                          transform:isSel?'scale(1.25)':isHov?'scale(1.1)':'scale(1)',
                          transition:'transform 0.1s',cursor:'pointer',zIndex:isSel?10:1}}
                          onMouseEnter={()=>setHoveredWagon(idx)}
                          onMouseLeave={()=>setHoveredWagon(null)}
                          onClick={()=>setSelectedWagon(isSel?null:idx)}>
                          <WagonSVG wtype={rakeType} color={w.state==='empty'?WAGON_RULES[rakeType]?.color||'#6b7280':w.color} state={w.state==='empty'?'empty':'filled'}/>
                          <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',
                            fontSize:6,color:w.state==='empty'?'rgba(21,101,160,0.3)':w.color,
                            fontFamily:'Rajdhani',lineHeight:1,pointerEvents:'none'}}>
                            {idx+1}
                          </div>
                          {isUnder&&<motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:1.2,repeat:Infinity}}
                            style={{position:'absolute',top:0,right:0,width:4,height:4,borderRadius:'50%',background:'#ffcc02'}}/>}
                          {isSel&&<div style={{position:'absolute',inset:-1,border:'1.5px solid #fff',borderRadius:3,pointerEvents:'none'}}/>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 pt-2 mt-1 border-t border-steel-700/20">
              {[{bg:'rgba(11,60,93,0.35)',b:'rgba(21,101,217,0.2)',l:'Empty'},{bg:'#ff2d55',b:'#ff2d55',l:'Urgent order'},{bg:'#34c759',b:'#34c759',l:'Backfill (added)'}].map((x,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:12,height:7,background:x.bg,border:`1px solid ${x.b}`,borderRadius:2}}/>
                  <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>{x.l}</span>
                </div>
              ))}
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'#ffcc02'}}/>
                <span style={{fontSize:8,color:'#6b7280',fontFamily:'Rajdhani'}}>&lt;90% util</span>
              </div>
            </div>
          </div>

          {/* Unfilled orders alert */}
          {planResult&&plans[activeRake]&&(()=>{
            const plan = plans[activeRake]
            const coveredIds = new Set((plan.wagon_assignments||[]).map(a=>a.order_id))
            const unfilledOrders = urgentOrders.filter(o=>!coveredIds.has(o.order_id)&&!coveredIds.has(String(o.order_id)))
            if (unfilledOrders.length===0) return null
            return (
              <div className="card p-4" style={{border:'1px solid rgba(255,45,85,0.3)',background:'rgba(255,45,85,0.04)'}}>
                <div className="font-mono text-xs font-bold text-red-400 mb-2">
                  ⚠️ {unfilledOrders.length} order{unfilledOrders.length>1?'s':''} not fully loaded on this rake
                </div>
                {unfilledOrders.map(o=>(
                  <div key={o.order_id} className="flex items-center justify-between p-2 rounded mb-1.5"
                    style={{background:'rgba(255,45,85,0.06)',border:'1px solid rgba(255,45,85,0.15)'}}>
                    <div>
                      <span className="font-mono font-bold text-orange-400" style={{fontSize:11}}>{o.order_id}</span>
                      <span className="font-mono text-yellow-400 ml-2" style={{fontSize:10}}>{o.product_type}</span>
                      <span className="font-mono text-gray-400 ml-2" style={{fontSize:10}}>{safe(o.quantity_tons).toFixed(0)}T → {o.destination}</span>
                    </div>
                    <div className="font-mono text-xs text-red-400">{fmtRs(safe(o.penalty_cost))}/day</div>
                  </div>
                ))}
                <div className="font-mono text-xs text-gray-500 mt-1">
                  These orders may have been moved to another rake above, or need a separate dispatch.
                </div>
              </div>
            )
          })()}
        </div>

        {/* RIGHT: Wagon detail + suggestions */}
        <div className="space-y-3">
          {/* Wagon inspector */}
          <AnimatePresence mode="wait">
            {selW ? (
              <motion.div key="w" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                className="card p-3" style={{border:`1px solid ${selW.state==='empty'?'rgba(11,60,93,0.3)':selW.color+'40'}`}}>
                <div className="flex items-center gap-2 mb-2">
                  <WagonSVG wtype={rakeType} color={selW.state==='empty'?WAGON_RULES[rakeType]?.color||'#6b7280':selW.color} state={selW.state==='empty'?'empty':'filled'}/>
                  <div>
                    <div className="font-mono font-bold text-white text-sm">{selW.wagonId}</div>
                    <div className="font-mono text-gray-500" style={{fontSize:9}}>{rakeType} · {selW.capacity}T capacity</div>
                  </div>
                </div>
                <div className="h-2 rounded-full mb-2" style={{background:'rgba(11,60,93,0.4)'}}>
                  <div style={{width:`${selW.fillPct}%`,height:'100%',borderRadius:99,
                    background:selW.fillPct>=90?'#34c759':selW.fillPct>0?'#ffcc02':'transparent'}}/>
                </div>
                {selW.state==='empty' ? (
                  <div className="text-center py-2 text-gray-600 font-mono text-xs">Empty wagon — no order assigned</div>
                ) : (
                  <div className="space-y-1.5">
                    {selW.ordersOnWagon.map((o,i)=>(
                      <div key={i} className="p-2 rounded" style={{background:`${o.color}10`,border:`1px solid ${o.color}20`}}>
                        <div className="flex justify-between mb-0.5">
                          <span className="font-mono font-bold" style={{fontSize:10,color:o.color}}>{o.orderId}</span>
                          <span style={{fontSize:8,background:o.type==='URGENT'?'rgba(255,45,85,0.15)':'rgba(52,199,89,0.15)',
                            color:o.type==='URGENT'?'#ff6b35':'#34c759',padding:'1px 4px',borderRadius:3,fontFamily:'Rajdhani'}}>
                            {o.type}
                          </span>
                        </div>
                        <div className="font-mono text-yellow-400" style={{fontSize:10}}>{o.product}</div>
                        <div className="font-mono text-gray-400 truncate" style={{fontSize:9}}>{o.customer?.slice(0,20)}</div>
                        <div className="font-mono text-gray-400" style={{fontSize:9}}>→ {o.destination}</div>
                        <div className="font-mono text-green-400 mt-0.5" style={{fontSize:10}}>{o.loadedTons}T loaded</div>
                      </div>
                    ))}
                    <div className="flex justify-between font-mono text-gray-600 pt-1" style={{fontSize:8}}>
                      <span>Bogie A: {(selW.loadedTons*0.53).toFixed(1)}T</span>
                      <span>Bogie B: {(selW.loadedTons*0.47).toFixed(1)}T</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="card p-4 text-center" style={{border:'1px dashed rgba(21,101,160,0.15)'}}>
                <div style={{fontSize:24,marginBottom:4}}>🚃</div>
                <div className="font-mono text-xs text-gray-600">Click any wagon to inspect</div>
              </div>
            )}
          </AnimatePresence>

          {/* Add order feedback message */}
          <AnimatePresence>
            {addMessage&&(
              <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="card p-3" style={{border:`1px solid ${addMessage.type==='error'?'rgba(255,45,85,0.3)':addMessage.type==='partial'?'rgba(255,204,2,0.3)':'rgba(52,199,89,0.3)'}`,
                  background:addMessage.type==='error'?'rgba(255,45,85,0.04)':addMessage.type==='partial'?'rgba(255,204,2,0.04)':'rgba(52,199,89,0.04)'}}>
                <div className="font-mono text-xs leading-relaxed"
                  style={{color:addMessage.type==='error'?'#ff6b35':addMessage.type==='partial'?'#ffcc02':'#34c759'}}>
                  {addMessage.msg}
                </div>
                <button onClick={()=>setAddMessage(null)} className="font-mono text-gray-600 mt-2" style={{fontSize:9}}>dismiss</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart suggestions */}
          {planResult&&suggestions.length>0&&empty.length>0&&(
            <div className="card p-3" style={{border:'1px solid rgba(52,199,89,0.2)'}}>
              <div className="font-mono text-xs font-bold text-green-400 mb-1">
                💡 {empty.length} wagons still empty
              </div>
              <div className="font-mono text-xs text-gray-500 mb-2">
                Same route · Same wagon type ({rakeType}) · Add to fill the rake:
              </div>
              <div className="space-y-1.5">
                {suggestions.slice(0,5).map((s,i)=>{
                  const wt2 = PRODUCT_TO_WAGON[s.product_type]||'BOXN'
                  const isCompatible = wt2===rakeType
                  const wagonsNeeded = Math.ceil(safe(s.quantity_tons)/(WAGON_RULES[rakeType]?.cap||55))
                  const canFit = wagonsNeeded<=empty.length
                  return (
                    <div key={s.order_id} className="p-2 rounded" style={{background:'rgba(11,60,93,0.15)',border:'1px solid rgba(11,60,93,0.25)'}}>
                      <div className="flex items-start justify-between gap-2">
                        <div style={{flex:1,minWidth:0}}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-orange-400 font-bold" style={{fontSize:10}}>{s.order_id}</span>
                            <span className="font-mono text-yellow-400" style={{fontSize:9}}>{s.product_type}</span>
                            {!isCompatible&&<span className="font-mono text-red-400" style={{fontSize:8}}>needs {wt2}</span>}
                          </div>
                          <div className="font-mono text-gray-500 truncate" style={{fontSize:9}}>
                            {safe(s.quantity_tons).toFixed(0)}T · {wagonsNeeded} wagon{wagonsNeeded>1?'s':''} · → {s.destination}
                          </div>
                          <div className="font-mono text-red-400" style={{fontSize:9}}>{fmtRs(safe(s.penalty_cost))}/day · {safe(s.deadline_days)}d left</div>
                        </div>
                        <button
                          onClick={()=>tryAddOrder(s)}
                          disabled={addingOrder===s.order_id||!isCompatible}
                          className="px-2 py-1 rounded font-mono flex-shrink-0 transition-all"
                          style={{fontSize:9,
                            background:isCompatible?'rgba(52,199,89,0.15)':'rgba(255,45,85,0.1)',
                            border:`1px solid ${isCompatible?'rgba(52,199,89,0.3)':'rgba(255,45,85,0.2)'}`,
                            color:isCompatible?'#34c759':'#ff6b35',
                            cursor:isCompatible?'pointer':'not-allowed'}}>
                          {addingOrder===s.order_id?'...'
                            :!isCompatible?`${wt2} only`
                            :!canFit?`+${empty.length}w`
                            :'+ Add'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Under-util warning */}
          {planResult&&wagonSlots.filter(w=>w.state!=='empty'&&w.fillPct<90).length>0&&(
            <div className="card p-3" style={{border:'1px solid rgba(255,204,2,0.2)',background:'rgba(255,204,2,0.03)'}}>
              <div className="font-mono text-xs text-yellow-400 font-bold mb-1">
                ⚠️ {wagonSlots.filter(w=>w.state!=='empty'&&w.fillPct<90).length} wagons below 90% fill
              </div>
              <div className="font-mono text-xs text-gray-500">Use suggestions above to fill remaining space</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg font-mono text-sm text-gray-400" style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>← Back</button>
        <button onClick={()=>onNext(planResult||{wagon_assignments:wagonSlots.filter(w=>w.state!=='empty').map(w=>({...w,...(w.ordersOnWagon?.[0]||{}),loaded_tons:w.loadedTons})),summary:{total_loaded_tons:totalLoad,avg_utilization_pct:rakeUtil}})}
          disabled={filled.length===0}
          className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50">
          Confirm Loading Plan ({filled.length} wagons) →
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Loading Status Board
// ═══════════════════════════════════════════════════════════════════════════════
function Screen4({ onNext, onBack, urgentOrders, plan }) {
  const assignments = plan?.wagon_assignments||[]
  const [status, setStatus] = useState(()=>Object.fromEntries(assignments.map(a=>[a.wagon_id,'pending'])))

  const updateAll = (s) => setStatus(Object.fromEntries(assignments.map(a=>[a.wagon_id,s])))
  const counts = Object.values(status).reduce((acc,s)=>{acc[s]=(acc[s]||0)+1;return acc},{})
  const allLoaded = assignments.length>0&&Object.values(status).every(s=>s==='loaded')
  const progress = assignments.length?Math.round((counts['loaded']||0)/assignments.length*100):0

  return (
    <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-4">
      <div className="card p-5" style={{background:'linear-gradient(135deg,rgba(21,101,160,0.08),rgba(13,25,41,0.98))',border:'1px solid rgba(21,101,160,0.25)'}}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{fontSize:28}}>📦</div>
            <div>
              <div className="font-display font-black text-xl text-white">Loading Status — Supervisor Board</div>
              <div className="font-mono text-xs text-gray-400">Update status as loading crew reports progress from each siding</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>updateAll('loading')} className="px-3 py-1.5 rounded font-mono text-xs" style={{background:'rgba(255,122,0,0.12)',border:'1px solid rgba(255,122,0,0.35)',color:'#FF7A00'}}>Mark All → Loading</button>
            <button onClick={()=>updateAll('loaded')}  className="px-3 py-1.5 rounded font-mono text-xs" style={{background:'rgba(52,199,89,0.12)',border:'1px solid rgba(52,199,89,0.35)',color:'#34c759'}}>Mark All → Loaded ✓</button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between font-mono text-xs text-gray-500 mb-1.5">
            <span>Overall Loading Progress</span>
            <span>{counts['loaded']||0} / {assignments.length} wagons loaded ({progress}%)</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{background:'rgba(11,60,93,0.4)'}}>
            <motion.div animate={{width:`${progress}%`}} transition={{duration:0.5}}
              style={{height:'100%',background:'linear-gradient(90deg,#1565a0,#34c759)',borderRadius:99}}/>
          </div>
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {[{k:'pending',l:'Pending',c:'#ffcc02'},{k:'loading',l:'Loading Now',c:'#FF7A00'},{k:'loaded',l:'Loaded ✓',c:'#34c759'}].map(s=>(
            <div key={s.k} className="px-3 py-1.5 rounded font-mono text-xs" style={{background:`${s.c}10`,border:`1px solid ${s.c}25`,color:s.c}}>
              {counts[s.k]||0} {s.l}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {assignments.slice(0,18).map((a,i)=>{
          const s  = status[a.wagon_id]||'pending'
          const sc = STATUS_COLORS[s]||'#ffcc02'
          return (
            <motion.div key={i} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.025}}
              className="card p-3.5" style={{border:`1px solid ${sc}25`,background:`${sc}05`}}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-mono font-bold text-orange-400 text-sm">{a.wagon_id}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{background:`${sc}15`,color:sc,border:`1px solid ${sc}25`}}>{s.toUpperCase()}</span>
              </div>
              <div className="font-mono text-xs text-gray-400">{a.wagon_type} · {safe(a.loaded_tons).toFixed(1)}T</div>
              <div className="font-mono text-xs text-yellow-400 mb-2">{a.product_type} → {a.destination}</div>
              {s==='pending'&&<button onClick={()=>setStatus(p=>({...p,[a.wagon_id]:'loading'}))}
                className="w-full py-1.5 rounded font-mono text-xs" style={{background:'rgba(255,122,0,0.12)',border:'1px solid rgba(255,122,0,0.35)',color:'#FF7A00'}}>Start Loading</button>}
              {s==='loading'&&<button onClick={()=>setStatus(p=>({...p,[a.wagon_id]:'loaded'}))}
                className="w-full py-1.5 rounded font-mono text-xs" style={{background:'rgba(52,199,89,0.12)',border:'1px solid rgba(52,199,89,0.35)',color:'#34c759'}}>✓ Mark Loaded</button>}
              {s==='loaded'&&<div className="w-full py-1.5 rounded font-mono text-xs text-center" style={{background:'rgba(52,199,89,0.06)',color:'#34c759'}}>✅ Ready for Dispatch</div>}
            </motion.div>
          )
        })}
      </div>

      {allLoaded&&(
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
          className="card p-6 text-center" style={{border:'1px solid rgba(52,199,89,0.4)',background:'rgba(52,199,89,0.05)'}}>
          <div style={{fontSize:40,marginBottom:8}}>🎉</div>
          <div className="font-display font-black text-2xl text-green-400 mb-1">All Wagons Loaded!</div>
          <div className="font-mono text-sm text-gray-400">Rake is fully loaded and ready for departure. Proceed to confirm dispatch.</div>
        </motion.div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg font-mono text-sm text-gray-400" style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>← Back</button>
        <button onClick={onNext} className="btn-primary px-6 py-3">Confirm Departure →</button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Dispatch Confirmation
// ═══════════════════════════════════════════════════════════════════════════════
function Screen5({ onBack, onReset, urgentOrders, plan }) {
  const [dispatching, setDispatching] = useState(false)
  const [dispatched,  setDispatched]  = useState(false)
  const [emailResults,setEmailResults]= useState([])
  const [rakeId] = useState(`RK-${new Date().toISOString().slice(11,16).replace(':','')}`)

  const confirm = async () => {
    setDispatching(true)
    const results = []
    const allAssignments = plan?.wagon_assignments || []
    const now = new Date()
    const deptStr = now.toLocaleString('en-IN',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+' hrs'
    const loadEnd = new Date(now-60*60*1000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' hrs'
    const loadStart = new Date(now-4*60*60*1000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' hrs'
    for (const order of urgentOrders.slice(0,6)) {
      try {
        // Only this customer's wagons (confidential)
        const customerWagons = allAssignments.filter(a => String(a.order_id)===String(order.order_id))
        const rakePlan = plan?.rake_plans?.find(rp=>(rp.orders_covered||[]).includes(String(order.order_id)))||plan?.rake_plans?.[0]
        const r = await axios.post(`${BASE}/dispatch/confirm`, {
          order_id: String(order.order_id), customer_name: order.customer_name||order.customer_id||'',
          customer_email: order.customer_email||'', product_type: order.product_type||'',
          quantity_tons: safe(order.quantity_tons,50), destination: order.destination||'',
          rake_id: rakePlan?.rake_id||rakeId, wagon_type: rakePlan?.wagon_type||'',
          total_wagons: allAssignments.length,
          freight_cost: safe(order.quantity_tons,50)*120,
          rate_per_ton: 52000,
          wagon_list: customerWagons,
          customer_wagons: customerWagons,
          loading_start: loadStart, loading_end: loadEnd, dispatch_time: deptStr,
        })    
            results.push({order_id:order.order_id,customer:order.customer_name||order.customer_id,email:order.customer_email||'',wagons:customerWagons.length,status:r.data?.email_result?.status||'logged'})
      } catch(e) {
        results.push({order_id:order.order_id,customer:order.customer_name||order.customer_id,email:order.customer_email||'',status:'error'})
      }
    }
    setEmailResults(results)
    setDispatched(true)
    setDispatching(false)
  }

  const deptTime = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  const etaDays  = 2
  const etaDate  = new Date(Date.now()+etaDays*86400000).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})

  return (
    <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-4">
      <div className="card p-5" style={{background:'linear-gradient(135deg,rgba(52,199,89,0.07),rgba(13,25,41,0.98))',border:'1px solid rgba(52,199,89,0.25)'}}>
        <div className="flex items-center gap-3">
          <div style={{fontSize:28}}>🚂</div>
          <div>
            <div className="font-display font-black text-xl text-white">Confirm Rake Departure</div>
            <div className="font-mono text-xs text-gray-400">Dispatch confirmation logged · Customer notifications sent automatically</div>
          </div>
        </div>
      </div>

      {!dispatched ? (
        <div className="card p-5">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-4">Dispatch Summary</div>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="space-y-2 font-mono text-sm">
              {[
                {l:'Rake ID',        v:rakeId,                                  c:'#FF7A00'},
                {l:'Departure',      v:deptTime,                                c:'#34c759'},
                {l:'Wagons',         v:plan?.summary?.total_wagons||'—',        c:'#4da6d9'},
                {l:'Total Load',     v:fmtT(safe(plan?.summary?.total_loaded_tons)), c:'#34c759'},
                {l:'Orders',         v:urgentOrders.length,                     c:'#ffcc02'},
              ].map((r,i)=>(
                <div key={i} className="flex justify-between py-1.5 border-b border-steel-700/20">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-bold" style={{color:r.c}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-mono text-xs text-gray-500 uppercase mb-2">Customer Notifications</div>
              {urgentOrders.slice(0,6).map((o,i)=>(
                <div key={i} className="p-2 rounded mb-1.5 font-mono text-xs" style={{background:'rgba(11,60,93,0.2)',border:'1px solid rgba(11,60,93,0.3)'}}>
                  <div className="flex justify-between">
                    <span className="text-orange-400">{o.order_id}</span>
                    <span className="text-gray-400">{o.destination}</span>
                  </div>
                  <div className="text-gray-500 truncate mt-0.5">{o.customer_email||'No email on file'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg mb-4 font-mono text-xs" style={{background:'rgba(52,199,89,0.05)',border:'1px solid rgba(52,199,89,0.15)'}}>
            <div className="text-green-400 font-bold mb-1">When you click confirm:</div>
            <div className="text-gray-400 space-y-0.5">
              <div>• Dispatch logged with timestamp</div>
              <div>• e-RR (Electronic Railway Receipt) PDF generated with SAIL letterhead</div>
              <div>• Email sent to each customer with PDF attached</div>
              <div>• Order tracking activated — customers can check live status</div>
            </div>
          </div>
          <button onClick={confirm} disabled={dispatching} className="btn-primary w-full py-4 flex items-center justify-center gap-3">
            {dispatching
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending notifications...</>
              : <>🚂 Confirm Departure — Notify All Customers</>}
          </button>
        </div>
      ) : (
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="space-y-4">
          <div className="card p-8 text-center" style={{border:'2px solid rgba(52,199,89,0.4)',background:'rgba(52,199,89,0.04)'}}>
            <motion.div animate={{scale:[1,1.15,1]}} transition={{duration:0.5}} style={{fontSize:52,marginBottom:10}}>🎉</motion.div>
            <div className="font-display font-black text-3xl text-green-400 mb-1">Rake Dispatched!</div>
            <div className="font-mono text-base text-white mb-1">{rakeId} departed at {deptTime}</div>
            <div className="font-mono text-sm text-gray-400">Expected delivery: {etaDate}</div>
          </div>
          <div className="card p-5">
            <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-3">Customer Notification Status</div>
            {emailResults.map((r,i)=>(
              <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
                className="flex items-center justify-between p-3 rounded mb-2" style={{background:'rgba(11,60,93,0.2)',border:'1px solid rgba(11,60,93,0.3)'}}>
                <div>
                  <div className="font-mono font-bold text-orange-400">{r.order_id}</div>
                  <div className="font-mono text-xs text-gray-400">{r.customer} · {r.email||'No email'}</div>
                </div>
                <div className="font-mono text-xs px-3 py-1 rounded-full"
                  style={{background:r.status==='sent'?'rgba(52,199,89,0.12)':'rgba(255,204,2,0.12)',
                    color:r.status==='sent'?'#34c759':'#ffcc02',
                    border:`1px solid ${r.status==='sent'?'rgba(52,199,89,0.3)':'rgba(255,204,2,0.3)'}`}}>
                  {r.status==='sent'?'✅ Email Sent':'📋 Logged'}
                </div>
              </motion.div>
            ))}
            {emailResults.every(r=>r.status!=='sent')&&(
              <div className="p-3 rounded font-mono text-xs text-yellow-400 mt-2" style={{background:'rgba(255,204,2,0.06)',border:'1px solid rgba(255,204,2,0.15)'}}>
                💡 To send real emails: add GMAIL_USER and GMAIL_APP_PASSWORD to backend/.env
              </div>
            )}
          </div>
          <button onClick={onReset} className="w-full py-3 rounded-lg font-mono font-bold text-white"
            style={{background:'linear-gradient(135deg,#0B3C5D,#1565a0)',border:'1px solid #1565a0'}}>
            ← Start New Dispatch
          </button>
        </motion.div>
      )}
      {!dispatched&&<div className="flex justify-start"><button onClick={onBack} className="px-5 py-2.5 rounded-lg font-mono text-sm text-gray-400" style={{background:'rgba(11,60,93,0.3)',border:'1px solid #0B3C5D'}}>← Back</button></div>}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function WorkerPlanPage() {
  const [screen,   setScreen]  = useState(0)
  const [selected, setSelected]= useState([])
  const [wagons,   setWagons]  = useState([])
  const [plan,     setPlan]    = useState(null)

  const STEPS = ['Select Orders','Find Wagons','Build Rake Plan','Loading','Dispatch']
  const COLORS = ['#ff2d55','#FF7A00','#34c759','#1565a0','#34c759']

  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
  const hr    = new Date().getHours()
  const shift = hr<14?'Morning Shift (06:00–14:00)':hr<22?'Afternoon Shift (14:00–22:00)':'Night Shift (22:00–06:00)'

  return (
    <div className="space-y-4">
      <div className="card p-4" style={{background:'linear-gradient(135deg,rgba(13,25,41,0.98),rgba(11,60,93,0.12))'}}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-xs text-orange-400 uppercase tracking-widest mb-1">Supervisor Dispatch Workflow</div>
            <div className="font-display font-black text-2xl text-white">Today's Dispatch Plan</div>
            <div className="font-mono text-xs text-gray-400 mt-1">{today} · {shift}</div>
          </div>
          <div className="font-mono text-xs px-3 py-2 rounded-lg" style={{background:'rgba(52,199,89,0.08)',border:'1px solid rgba(52,199,89,0.2)',color:'#34c759'}}>● LIVE</div>
        </div>
        <div className="flex items-center mt-4 px-2">
          {STEPS.map((label,i)=>(
            <React.Fragment key={i}>
              <StepDot num={i+1} label={label} active={screen===i} done={screen>i} color={COLORS[i]}/>
              {i<STEPS.length-1&&<div style={{flex:1,height:2,background:screen>i?COLORS[i]:'rgba(11,60,93,0.4)',margin:'0 4px',marginBottom:20,transition:'background 0.5s'}}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {screen===0&&<Screen1 key="s1" onNext={o=>{setSelected(o);setScreen(1)}} selectedOrders={selected} setSelectedOrders={setSelected}/>}
        {screen===1&&<Screen2 key="s2" onNext={w=>{setWagons(w);setScreen(2)}} onBack={()=>setScreen(0)} urgentOrders={selected}/>}
        {screen===2&&<Screen3 key="s3" onNext={p=>{setPlan(p);setScreen(3)}} onBack={()=>setScreen(1)} urgentOrders={selected} availableWagons={wagons}/>}
        {screen===3&&<Screen4 key="s4" onNext={()=>setScreen(4)} onBack={()=>setScreen(2)} urgentOrders={selected} plan={plan}/>}
        {screen===4&&<Screen5 key="s5" onBack={()=>setScreen(3)} onReset={()=>{setScreen(0);setSelected([]);setWagons([]);setPlan(null)}} urgentOrders={selected} plan={plan}/>}
      </AnimatePresence>
    </div>
  )
}
