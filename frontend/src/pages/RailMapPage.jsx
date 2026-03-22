import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '../components/UIKit'
import axios from 'axios'

const BASE = 'https://sail-dss-backend.onrender.com'

// ── All Indian destination coordinates ───────────────────────────────────────
const CITY_COORDS = {
  "Bokaro":         [23.6693, 86.1511],
  "Mumbai":         [19.0760, 72.8777],
  "Delhi":          [28.6139, 77.2090],
  "Kolkata":        [22.5726, 88.3639],
  "Chennai":        [13.0827, 80.2707],
  "Hyderabad":      [17.3850, 78.4867],
  "Pune":           [18.5204, 73.8567],
  "Ahmedabad":      [23.0225, 72.5714],
  "Surat":          [21.1702, 72.8311],
  "Jaipur":         [26.9124, 75.7873],
  "Lucknow":        [26.8467, 80.9462],
  "Kanpur":         [26.4499, 80.3319],
  "Nagpur":         [21.1458, 79.0882],
  "Visakhapatnam":  [17.6868, 83.2185],
  "Bhopal":         [23.2599, 77.4126],
  "Patna":          [25.5941, 85.1376],
  "Ludhiana":       [30.9010, 75.8573],
  "Agra":           [27.1767, 78.0081],
  "Vadodara":       [22.3072, 73.1812],
  "Nashik":         [19.9975, 73.7898],
  "Faridabad":      [28.4089, 77.3178],
  "Meerut":         [28.9845, 77.7064],
  "Rajkot":         [22.3039, 70.8022],
  "Coimbatore":     [11.0168, 76.9558],
  "Jabalpur":       [23.1815, 79.9864],
  "Gwalior":        [26.2183, 78.1828],
  "Vijayawada":     [16.5062, 80.6480],
  "Jodhpur":        [26.2389, 73.0243],
  "Madurai":        [9.9252,  78.1198],
  "Raipur":         [21.2514, 81.6296],
  "Kota":           [25.2138, 75.8648],
  "Ranchi":         [23.3441, 85.3096],
  "Howrah":         [22.5958, 88.2636],
  "Dhanbad":        [23.7957, 86.4304],
  "Jamshedpur":     [22.8046, 86.2029],
  "Bhilai":         [21.2090, 81.4285],
  "Durgapur":       [23.5204, 87.3119],
  "Rourkela":       [22.2270, 84.8640],
  "Allahabad":      [25.4358, 81.8463],
  "Varanasi":       [25.3176, 82.9739],
}

const ROUTE_DISTANCE = {
  "Mumbai":1650,"Delhi":1300,"Kolkata":280,"Chennai":1850,"Hyderabad":1450,
  "Pune":1600,"Ahmedabad":1720,"Surat":1680,"Jaipur":1420,"Lucknow":1050,
  "Kanpur":980,"Nagpur":1120,"Visakhapatnam":780,"Bhopal":1050,"Patna":380,
  "Ludhiana":1480,"Agra":1180,"Vadodara":1690,"Nashik":1580,"Faridabad":1320,
  "Meerut":1260,"Rajkot":1820,"Coimbatore":2050,"Jabalpur":1100,"Gwalior":1200,
  "Vijayawada":920,"Jodhpur":1650,"Madurai":2150,"Raipur":720,"Kota":1420,
  "Ranchi":180,"Howrah":290,"Dhanbad":150,"Jamshedpur":120,"Bhilai":680,
  "Durgapur":310,"Rourkela":390,"Allahabad":750,"Varanasi":680,
}

const fmtRs = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`

export default function RailMapPage() {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})

  const [orders,    setOrders]    = useState([])
  const [weather,   setWeather]   = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [mapReady,  setMapReady]  = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [destSummary, setDestSummary]   = useState([])

  // ── Step 1: Load Leaflet ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapReady(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
  }, [])

  // ── Step 2: Load orders + weather separately ─────────────────────────────
  useEffect(() => {
    // Load weather independently - never block orders if weather fails
    axios.get(`${BASE}/weather?city=Bokaro`)
      .then(r => setWeather(r.data))
      .catch(() => setWeather(null))

    axios.get(`${BASE}/orders?status=PENDING&limit=500`)
    .then(od => {
      const orderList = od.data?.orders || []
      setOrders(orderList)
      // Build destination summary from real orders
      const acc = {}
      orderList.forEach(o => {
        const d = (o.destination || '').trim()
        if (!d) return
        if (!acc[d]) acc[d] = { city:d, orders:0, tons:0, penalty:0, highRisk:0, dist:ROUTE_DISTANCE[d]||0 }
        acc[d].orders++
        acc[d].tons    += parseFloat(o.quantity_tons || 0)
        acc[d].penalty += parseFloat(o.penalty_cost  || 0)
        if ((o.risk_score || 0) >= 0.55) acc[d].highRisk++
      })
      const summary = Object.values(acc).sort((a,b) => b.penalty - a.penalty)
      setDestSummary(summary)
      setOrdersLoaded(true)
    })
    .catch(() => setOrdersLoaded(true))  // still show map even if orders fail
  }, [])

  // ── Step 3: Build map AFTER both mapReady AND ordersLoaded ────────────────
  useEffect(() => {
    if (!mapReady || !ordersLoaded || !mapRef.current || mapInstance.current) return
    const L = window.L

    // ── Init map — full India view ──
    const map = L.map(mapRef.current, {
      center: [22.5, 80.5],   // Centre of India
      zoom:   5,              // Full India visible
      zoomControl: true,
    })

    // Base OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    // OpenRailwayMap overlay
    L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
      attribution: '© OpenRailwayMap contributors',
      maxZoom: 18, opacity: 0.55,
    }).addTo(map)

    // ── Compute demand from orders ──
    const demand = {}
    orders.forEach(o => {
      const d = (o.destination || '').trim()
      if (!d) return
      if (!demand[d]) demand[d] = { orders:0, tons:0, penalty:0, highRisk:0 }
      demand[d].orders++
      demand[d].tons    += parseFloat(o.quantity_tons || 0)
      demand[d].penalty += parseFloat(o.penalty_cost  || 0)
      if ((o.risk_score || 0) >= 0.55) demand[d].highRisk++
    })

    // ── Bokaro source marker ──
    const bokaro = CITY_COORDS['Bokaro']
    const bokaroIcon = L.divIcon({
      html: `<div style="width:22px;height:22px;background:#FF7A00;border:3px solid #fff;border-radius:50%;box-shadow:0 0 14px #FF7A00;"></div>`,
      iconSize:[22,22], iconAnchor:[11,11], className:'',
    })
    L.marker(bokaro, { icon: bokaroIcon }).addTo(map)
      .bindPopup(`<div style="font-family:monospace;font-size:12px"><b style="color:#FF7A00">🏭 BOKARO STEEL PLANT</b><br>Origin of all dispatches<br>Bokaro Steel City, Jharkhand</div>`)

    // ── Draw all city markers + route lines ──
    Object.entries(CITY_COORDS).forEach(([city, coords]) => {
      if (city === 'Bokaro') return
      const d    = demand[city] || { orders:0, tons:0, penalty:0, highRisk:0 }
      const dist = ROUTE_DISTANCE[city] || 500
      const hasOrders  = d.orders > 0
      const isHighRisk = d.highRisk > 0

      // Route line color
      const lineColor  = isHighRisk ? '#ff2d55' : hasOrders ? '#FF7A00' : '#1565a0'
      const lineWeight = hasOrders ? 2.5 : 1
      const lineOpacity= hasOrders ? 0.75 : 0.2

      L.polyline([bokaro, coords], {
        color: lineColor, weight: lineWeight, opacity: lineOpacity,
        dashArray: hasOrders ? null : '6,10',
      }).addTo(map)

      // City dot size based on demand
      const dotSize    = hasOrders ? Math.min(18, 10 + Math.floor(d.orders/3)) : 8
      const dotColor   = isHighRisk ? '#ff2d55' : hasOrders ? '#34c759' : '#1565a0'
      const cityIcon   = L.divIcon({
        html: `<div style="width:${dotSize}px;height:${dotSize}px;background:${dotColor};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px ${dotColor};cursor:pointer;transition:all 0.2s;"></div>`,
        iconSize:[dotSize,dotSize], iconAnchor:[dotSize/2,dotSize/2], className:'',
      })

      const popupHtml = `
        <div style="font-family:monospace;font-size:11px;min-width:180px;padding:4px;">
          <b style="color:#FF7A00;font-size:13px">${city}</b>
          <div style="color:#888;margin:4px 0;">Distance: <span style="color:#fff">${dist} km</span></div>
          ${hasOrders ? `
          <hr style="border-color:#333;margin:6px 0;">
          <div>Pending Orders: <span style="color:#34c759;font-weight:bold">${d.orders}</span></div>
          <div>Total Quantity: <span style="color:#fff">${Math.round(d.tons).toLocaleString('en-IN')}T</span></div>
          <div>High Risk: <span style="color:#ff2d55;font-weight:bold">${d.highRisk}</span></div>
          <div>Penalty/Day: <span style="color:#ffcc02;font-weight:bold">${fmtRs(Math.round(d.penalty))}</span></div>
          <div>Transit: ~${Math.max(1,Math.round(dist/350))} days</div>
          ` : '<div style="color:#555;margin-top:4px;">No pending orders</div>'}
        </div>`

      const marker = L.marker(coords, { icon: cityIcon }).addTo(map)
        .bindPopup(popupHtml)
        .on('click', () => {
          setSelected({
            city, coords, dist,
            orders:   d.orders,
            tons:     Math.round(d.tons),
            penalty:  Math.round(d.penalty),
            highRisk: d.highRisk,
            freightPerTon: Math.max(800, Math.round(dist * 1.1)),
            transitDays:   Math.max(1, Math.round(dist/350)),
          })
        })

      markersRef.current[city] = marker
    })

    mapInstance.current = map
  }, [mapReady, ordersLoaded]) // only runs when BOTH are ready

  // ── Click city in right panel → fly map there ────────────────────────────
  const flyToCity = useCallback((city) => {
    const coords = CITY_COORDS[city]
    if (!coords || !mapInstance.current) return
    mapInstance.current.flyTo(coords, 7, { duration: 1.2 })
    const marker = markersRef.current[city]
    if (marker) setTimeout(() => marker.openPopup(), 1300)
  }, [])

  const W_ICON = { Clear:'☀️', Clouds:'⛅', Rain:'🌧️', Thunderstorm:'⛈️', Haze:'🌫️', Fog:'🌫️', Drizzle:'🌦️' }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Railway Dispatch Map</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">
            Live rail routes from Bokaro Steel Plant · OpenRailwayMap overlay ·{' '}
            {ordersLoaded ? `${orders.length} pending orders plotted` : 'Loading orders...'}
          </p>
        </div>
        {weather && (
          <div className="card px-4 py-2 flex items-center gap-3" style={{ border:'1px solid rgba(21,101,160,0.3)' }}>
            <span className="text-2xl">{W_ICON[weather.condition] || '🌡️'}</span>
            <div>
              <div className="font-mono text-sm text-white font-bold">
                Bokaro: {weather.temperature_c}°C · {weather.condition}
              </div>
              <div className="font-mono text-xs" style={{ color: weather.delay_impact_pct > 10 ? '#ff2d55' : '#34c759' }}>
                {weather.advisory}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* MAP — 2/3 width */}
        <div className="col-span-2 card" style={{ height:560, padding:0, overflow:'hidden', borderRadius:12, position:'relative' }}>
          {(!mapReady || !ordersLoaded) && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(5,14,26,0.8)', zIndex:10, borderRadius:12 }}>
              <LoadingSpinner text={!mapReady ? 'Loading map...' : 'Plotting orders on map...'}/>
            </div>
          )}
          <div ref={mapRef} style={{ width:'100%', height:'100%', borderRadius:12 }}/>
        </div>

        {/* RIGHT PANEL — 1/3 width */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto', maxHeight:560 }}>

          {/* Legend */}
          <div className="card p-3">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">MAP LEGEND</div>
            {[
              { c:'#ff2d55', l:'High Risk Routes',  d:'≥1 critical order' },
              { c:'#FF7A00', l:'Active Routes',     d:'Pending orders exist' },
              { c:'#1565a0', l:'Available Routes',  d:'No current orders' },
              { c:'#FF7A00', l:'🏭 Bokaro Plant',   d:'Origin station' },
            ].map((item,i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div style={{ width:10, height:10, borderRadius:'50%', background:item.c, flexShrink:0 }}/>
                <div>
                  <div className="text-white text-xs">{item.l}</div>
                  <div className="text-gray-500" style={{ fontSize:10 }}>{item.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Top destinations */}
          <div className="card p-3" style={{ flex:1 }}>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              TOP DESTINATIONS — PENALTY RISK
            </div>
            {!ordersLoaded ? (
              <div className="text-gray-600 text-xs font-mono text-center py-4">Loading orders...</div>
            ) : destSummary.length === 0 ? (
              <div className="text-gray-600 text-xs font-mono text-center py-4">No pending orders found</div>
            ) : (
              destSummary.slice(0,12).map((d,i) => (
                <motion.div key={d.city} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                  onClick={() => { setSelected(d); flyToCity(d.city) }}
                  className="mb-1.5 p-2 rounded-lg cursor-pointer hover:bg-steel-700/20 transition-colors"
                  style={{
                    background: selected?.city===d.city ? 'rgba(255,122,0,0.1)' : 'rgba(11,60,93,0.15)',
                    border: `1px solid ${selected?.city===d.city ? 'rgba(255,122,0,0.4)' : 'rgba(11,60,93,0.2)'}`,
                  }}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-xs" style={{ color: d.highRisk>0?'#ff2d55':'#FF7A00' }}>
                      {d.city}
                    </span>
                    <span className="font-mono text-xs text-gray-500">{d.dist}km</span>
                  </div>
                  <div className="flex justify-between mt-1 text-xs font-mono">
                    <span style={{ color:'#34c759' }}>{d.orders} orders</span>
                    <span style={{ color:'#ffcc02' }}>{fmtRs(d.penalty)}/d</span>
                    {d.highRisk > 0 && (
                      <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ duration:1, repeat:Infinity }}
                        style={{ color:'#ff2d55' }}>
                        {d.highRisk} 🔴
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Selected city detail */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
                className="card p-4" style={{ border:'1px solid rgba(255,122,0,0.35)', background:'rgba(255,122,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color:'#FF7A00', fontSize:16 }}>📍</span>
                  <span className="font-display font-bold text-white text-base">{selected.city}</span>
                  {selected.highRisk > 0 && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background:'rgba(255,45,85,0.12)', color:'#ff2d55', border:'1px solid rgba(255,45,85,0.3)' }}>
                      {selected.highRisk} HIGH RISK
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs font-mono">
                  {[
                    { l:'Distance',        v:`${selected.dist || ROUTE_DISTANCE[selected.city] || 0} km`,       c:'#8bb8d4' },
                    { l:'Pending Orders',  v:selected.orders ?? 0,                                              c:'#34c759' },
                    { l:'Total Quantity',  v:`${(selected.tons || 0).toLocaleString('en-IN')} T`,               c:'#1565a0' },
                    { l:'High Risk Orders',v:selected.highRisk ?? 0,                                            c:'#ff2d55' },
                    { l:'Penalty / Day',   v:fmtRs(selected.penalty || 0),                                      c:'#ffcc02' },
                    { l:'Transit Time',    v:`~${selected.transitDays || Math.max(1,Math.round((selected.dist||500)/350))} days`, c:'#8bb8d4' },
                    { l:'Freight / Ton',   v:`₹${(selected.freightPerTon || Math.max(800,Math.round((selected.dist||500)*1.1))).toLocaleString('en-IN')}`, c:'#FF7A00' },
                  ].map((row,i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-steel-700/20">
                      <span className="text-gray-500">{row.l}</span>
                      <span className="font-bold" style={{ color: row.c }}>{row.v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => flyToCity(selected.city)}
                  className="mt-3 w-full text-xs py-1.5 rounded font-mono transition-all hover:text-white"
                  style={{ background:'rgba(255,122,0,0.12)', border:'1px solid rgba(255,122,0,0.3)', color:'#FF7A00' }}>
                  🗺️ Zoom to {selected.city}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
