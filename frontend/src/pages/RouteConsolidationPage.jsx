import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '../components/UIKit'
import axios from 'axios'

const BASE = ''
const fmtRs = n => n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${n}`
const fmtT  = n => `${Math.round(n).toLocaleString('en-IN')}T`

// City coordinates for India map (normalized 0-100)
const CITY_POS = {
  "Bokaro":        {x:68,y:42}, "Dhanbad":      {x:70,y:41},
  "Howrah":        {x:75,y:43}, "Durgapur":     {x:73,y:43},
  "Patna":         {x:62,y:38}, "Varanasi":     {x:58,y:38},
  "Allahabad":     {x:56,y:38}, "Lucknow":      {x:54,y:34},
  "Kanpur":        {x:53,y:36}, "Jamshedpur":   {x:68,y:45},
  "Rourkela":      {x:64,y:46}, "Bhilai":       {x:55,y:50},
  "Raipur":        {x:54,y:51}, "Visakhapatnam":{x:65,y:58},
  "Vijayawada":    {x:62,y:63}, "Chennai":      {x:61,y:72},
  "Coimbatore":    {x:56,y:76}, "Madurai":      {x:58,y:79},
  "Ranchi":        {x:65,y:44}, "Nagpur":       {x:50,y:52},
  "Bhopal":        {x:46,y:45}, "Jabalpur":     {x:50,y:46},
  "Delhi":         {x:42,y:28}, "Jaipur":       {x:37,y:32},
  "Kota":          {x:39,y:38}, "Agra":         {x:44,y:33},
  "Gwalior":       {x:44,y:36}, "Meerut":       {x:44,y:27},
  "Faridabad":     {x:42,y:28}, "Ludhiana":     {x:38,y:22},
  "Mumbai":        {x:30,y:58}, "Pune":         {x:32,y:61},
  "Nashik":        {x:32,y:55}, "Ahmedabad":    {x:26,y:43},
  "Surat":         {x:27,y:52}, "Vadodara":     {x:28,y:48},
  "Rajkot":        {x:20,y:46}, "Jodhpur":      {x:30,y:36},
  "Hyderabad":     {x:54,y:60},
}

const CORRIDOR_COLORS = {
  "Eastern Corridor (ECR)":       "#3B8BD4",
  "South Eastern Corridor (SER)": "#1D9E75",
  "Central Corridor (CR/WCR)":    "#BA7517",
  "Western Corridor (WR)":        "#9F4AB7",
  "Hyderabad Corridor (SCR)":     "#D85A30",
}

export default function RouteConsolidationPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mapW, setMapW]       = useState(600)
  const mapRef = useRef(null)

  useEffect(() => {
    axios.get(`${BASE}/route-consolidation`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (mapRef.current) setMapW(mapRef.current.offsetWidth)
  }, [])

  if (loading) return <LoadingSpinner text="Computing optimal routes..."/>

  const plans = data?.rake_plans || []
  const mapH  = mapW * 0.75

  const toXY = (city) => {
    const pos = CITY_POS[city]
    if (!pos) return null
    return { x: pos.x / 100 * mapW, y: pos.y / 100 * mapH }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Route Consolidation — Optimal Dispatch</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">
            Orders grouped by railway corridor · One rake covers multiple destinations · Shortest path algorithm
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {l:'Rake Plans Generated',  v:data?.total_rake_plans||0,          c:'#FF7A00'},
          {l:'Orders Covered',        v:data?.total_orders_covered||0,       c:'#34c759'},
          {l:'Avg Utilization',       v:`${data?.avg_utilization||0}%`,      c:'#1565a0'},
          {l:'Corridors Active',      v:data?.corridors_used?.length||0,     c:'#BA7517'},
        ].map((k,i)=>(
          <div key={i} className="card p-4 text-center">
            <div className="font-display font-black text-2xl" style={{color:k.c}}>{k.v}</div>
            <div className="text-gray-500 font-mono text-xs mt-1">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* India Map */}
        <div className="col-span-2 card p-0 overflow-hidden" style={{position:'relative'}}>
          <div className="p-3 border-b border-steel-700/30">
            <div className="font-mono text-xs text-gray-500 uppercase tracking-wider">India Rail Map — Bokaro Dispatch Routes</div>
          </div>
          <div ref={mapRef} style={{position:'relative',background:'rgba(5,14,26,0.98)',padding:0}}>
            <svg width="100%" height={mapH} viewBox={`0 0 ${mapW} ${mapH}`}>
              {/* India outline simplified */}
              <rect width={mapW} height={mapH} fill="rgba(5,14,26,0.0)"/>

              {/* Draw all route lines */}
              {plans.map((plan,pi) => {
                const color = plan.corridor_color || '#1565a0'
                const isSelected = selected?.rake_id === plan.rake_id
                const bokaro = toXY('Bokaro')
                if (!bokaro) return null
                return plan.route_stops.map((city,ci) => {
                  const pos = toXY(city)
                  if (!pos) return null
                  const prev = ci===0 ? bokaro : toXY(plan.route_stops[ci-1])
                  if (!prev) return null
                  return (
                    <g key={`${pi}-${ci}`}>
                      <line x1={prev.x} y1={prev.y} x2={pos.x} y2={pos.y}
                        stroke={color} strokeWidth={isSelected?3:1.5}
                        opacity={isSelected?0.9:selected?0.2:0.6}
                        strokeDasharray={isSelected?"none":"4 3"}/>
                    </g>
                  )
                })
              })}

              {/* City dots */}
              {Object.entries(CITY_POS).map(([city,pos]) => {
                const x = pos.x/100*mapW, y = pos.y/100*mapH
                const isBokaro = city==='Bokaro'
                const isInRoute = selected?.route_stops?.includes(city)
                const hasOrders = plans.some(p=>p.route_stops.includes(city))
                return (
                  <g key={city}>
                    <circle cx={x} cy={y} r={isBokaro?8:isInRoute?6:hasOrders?4:2.5}
                      fill={isBokaro?'#FF7A00':isInRoute?(selected?.corridor_color||'#34c759'):hasOrders?'#4da6d9':'rgba(21,101,160,0.3)'}
                      opacity={isBokaro?1:selected&&!isInRoute?0.3:1}/>
                    {(isBokaro||isInRoute||hasOrders)&&(
                      <text x={x+9} y={y+4} fontSize={isBokaro?11:9} fill={isBokaro?'#FF7A00':isInRoute?'#fff':'rgba(77,166,217,0.7)'}
                        fontFamily="Rajdhani,sans-serif" fontWeight={isBokaro||isInRoute?600:400}>
                        {city}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Legend */}
            <div style={{position:'absolute',bottom:12,left:12,display:'flex',flexDirection:'column',gap:4}}>
              {Object.entries(CORRIDOR_COLORS).slice(0,4).map(([name,color])=>(
                <div key={name} style={{display:'flex',alignItems:'center',gap:6,fontSize:10,fontFamily:'Rajdhani',color:'rgba(139,184,212,0.7)'}}>
                  <div style={{width:16,height:2,background:color,borderRadius:1}}/>
                  {name.replace(' Corridor','').replace(' (ECR)','').replace(' (SER)','').replace(' (CR/WCR)','').replace(' (WR)','').replace(' (SCR)','')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rake plans list */}
        <div className="space-y-2 overflow-y-auto" style={{maxHeight:500}}>
          <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-2">Rake Plans — Click to highlight route</div>
          {plans.slice(0,12).map((plan,i)=>{
            const isSelected = selected?.rake_id===plan.rake_id
            const color = plan.corridor_color||'#1565a0'
            return (
              <motion.div key={i} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                onClick={()=>setSelected(isSelected?null:plan)} className="card cursor-pointer hover:scale-[1.02] transition-transform"
                style={{padding:'12px',border:`1px solid ${isSelected?color+'60':'rgba(11,60,93,0.3)'}`,background:isSelected?`${color}08`:'rgba(10,25,41,0.9)'}}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                    <span className="font-mono font-bold text-orange-400 text-sm">{plan.rake_id}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{background:`${color}15`,color,border:`1px solid ${color}30`}}>
                      {plan.wagon_type}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{color:plan.utilization_pct>=85?'#34c759':plan.utilization_pct>=70?'#ffcc02':'#ff6b35'}}>
                    {plan.utilization_pct}%
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-400 mb-1 truncate">
                  {plan.corridor.replace(' Corridor','').replace(/ \(.*\)/,'')}
                </div>
                <div className="flex items-center gap-1 flex-wrap mb-1">
                  <span className="font-mono text-xs" style={{color:'rgba(77,166,217,0.6)'}}>Bokaro</span>
                  {plan.route_stops.map((stop,si)=>(
                    <React.Fragment key={si}>
                      <span className="text-gray-600" style={{fontSize:10}}>→</span>
                      <span className="font-mono text-xs text-white">{stop.length>7?stop.slice(0,6)+'..':stop}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between font-mono text-xs text-gray-500 mt-1">
                  <span><span className="text-green-400">{plan.orders_count}</span> orders · {fmtT(plan.total_loaded_tons)}</span>
                  <span>{plan.wagons_needed} wagons · {plan.total_distance_km}km</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Selected plan detail */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}
            className="card p-5" style={{border:`1px solid ${selected.corridor_color}30`}}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{width:10,height:10,borderRadius:'50%',background:selected.corridor_color}}/>
              <div className="font-display font-bold text-white text-lg">{selected.rake_id} — {selected.corridor}</div>
              <div className="ml-auto font-mono text-sm" style={{color:selected.utilization_pct>=85?'#34c759':'#ffcc02'}}>
                {selected.utilization_pct}% utilization
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {[
                {l:'Wagon Type',     v:selected.wagon_type,              c:selected.corridor_color},
                {l:'Wagons Needed',  v:selected.wagons_needed,           c:'#FF7A00'},
                {l:'Total Load',     v:fmtT(selected.total_loaded_tons), c:'#34c759'},
                {l:'Orders',         v:selected.orders_count,            c:'#1565a0'},
                {l:'Max Distance',   v:`${selected.total_distance_km}km`,c:'#BA7517'},
              ].map((k,i)=>(
                <div key={i} className="text-center p-3 rounded-lg" style={{background:'rgba(11,60,93,0.2)',border:'1px solid rgba(11,60,93,0.3)'}}>
                  <div className="font-display font-bold text-lg" style={{color:k.c}}>{k.v}</div>
                  <div className="text-gray-500 font-mono text-xs mt-1">{k.l}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-steel-700/50">
                    {['ORDER ID','CUSTOMER','DESTINATION','TONS LOADED','PENALTY/DAY'].map(h=>(
                      <th key={h} className="text-left py-2 px-3 font-mono text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.orders.slice(0,15).map((o,i)=>(
                    <tr key={i} className="border-b border-steel-700/20 hover:bg-steel-700/10">
                      <td className="py-2 px-3 font-mono text-orange-400">{o.order_id}</td>
                      <td className="py-2 px-3 text-gray-300 truncate max-w-32">{o.customer_name}</td>
                      <td className="py-2 px-3 text-gray-300">{o.destination}</td>
                      <td className="py-2 px-3 text-green-400 font-mono">{o.loaded_tons}T</td>
                      <td className="py-2 px-3 text-red-400 font-mono">{fmtRs(o.penalty_per_day)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
