import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './layouts/Sidebar'
import Header from './layouts/Header'
import Dashboard from './pages/Dashboard'
import OrdersPage from './pages/OrdersPage'
import WagonMonitor from './pages/WagonMonitor'
import WorkerPlanPage from './pages/WorkerPlanPage'
import RailMapPage from './pages/RailMapPage'
import FinancialPage from './pages/FinancialPage'
import ShiftHandoverPage from './pages/ShiftHandoverPage'
import CustomerHubPage from './pages/CustomerHubPage'
import LocoTrackerPage from './pages/LocoTrackerPage'
import { CostAnalytics } from './pages/AnalyticsPages'
import { InventoryPage } from './pages/OtherPages'

const TITLES = {
  '/':'Command Center', '/worker-plan':"Today's Plan",
  '/orders':'Orders Intelligence', '/wagons':'Wagon Monitor',
  '/inventory':'Stockyard Map', '/locos':'Loco Tracker',
  '/rake-planner':'Rake Planner', '/rail-map':'Railway Map',
  '/shift-handover':'Shift Handover Board',
  '/financial':'Financial Control Center',
  '/cost-analytics':'Cost & Penalty Analytics',
  '/customer-hub':'Customer Communications Hub',
}

const PARTICLES = Array.from({length:25},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:Math.random()*1.5+0.5,dur:Math.random()*8+6,delay:Math.random()*5,color:i%2===0?'#FF7A00':'#1565a0'}))

// Real rake SVG — locomotive + 6 wagons
const RakeSVG = () => (
  <svg width="320" height="32" viewBox="0 0 320 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Locomotive */}
    <rect x="0" y="4" width="52" height="20" rx="3" fill="#FF7A00" opacity="0.9"/>
    <rect x="2" y="6" width="20" height="10" rx="2" fill="#cc5500"/>
    <rect x="38" y="8" width="10" height="6" rx="1" fill="#cc5500"/>
    <circle cx="10" cy="26" r="4" fill="#333" stroke="#FF7A00" strokeWidth="1"/>
    <circle cx="42" cy="26" r="4" fill="#333" stroke="#FF7A00" strokeWidth="1"/>
    <rect x="52" y="14" width="8" height="2" fill="#888"/>
    {/* Wagons */}
    {[0,1,2,3,4,5].map(i=>(
      <g key={i} transform={`translate(${62+i*42},0)`}>
        <rect x="0" y="6" width="36" height="16" rx="2" fill="#1565a0" opacity="0.85"/>
        <rect x="2" y="8" width="32" height="8" rx="1" fill="#0B3C5D"/>
        <circle cx="6" cy="26" r="4" fill="#333" stroke="#1565a0" strokeWidth="1"/>
        <circle cx="30" cy="26" r="4" fill="#333" stroke="#1565a0" strokeWidth="1"/>
        {i<5&&<rect x="36" y="14" width="6" height="2" fill="#666"/>}
      </g>
    ))}
  </svg>
)
const BOOT_STEPS = [
  {id:1,icon:'🚂',label:'DETECTING WAGONS',          lines:['Scanning 2,500 wagons...','Checking 30 locos...','Fleet confirmed.']},
  {id:2,icon:'📦',label:'SCANNING INVENTORY',         lines:['Reading 5 stockyard blocks...','70+ product-location combos loaded.','Inventory ready.']},
  {id:3,icon:'📋',label:'EVALUATING ORDERS',           lines:['20,000 orders from ERP...','Computing risk & urgency scores...','Priority queue ready.']},
  {id:4,icon:'⚙️',label:'RUNNING OPTIMIZATION',        lines:['Greedy heuristic running...','MILP CBC solver...','Plan generated.']},
  {id:5,icon:'🌤️',label:'LIVE WEATHER + FINANCIALS',  lines:['Checking Bokaro weather...','Calculating demurrage...','System ready.']},
]

function LandingPage({ onStart }) {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#020912 0%,#04101e 60%,#020912 100%)'}}>

      {/* Subtle grid */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(21,101,160,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(21,101,160,0.03) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>

      {/* Minimal particles */}
      {PARTICLES.map(p=>(
        <motion.div key={p.id} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,borderRadius:'50%',background:p.color,opacity:0.3}} animate={{opacity:[0.1,0.4,0.1]}} transition={{duration:p.dur,delay:p.delay,repeat:Infinity,ease:'easeInOut'}}/>
      ))}

      {/* Railway track lines */}
      <div style={{position:'absolute',bottom:72,width:'100%'}}>
        <div style={{height:'1px',background:'linear-gradient(90deg,transparent 0%,rgba(21,101,160,0.25) 20%,rgba(21,101,160,0.25) 80%,transparent 100%)'}}/>
        <div style={{height:'1px',background:'linear-gradient(90deg,transparent 0%,rgba(21,101,160,0.15) 20%,rgba(21,101,160,0.15) 80%,transparent 100%)',marginTop:'6px'}}/>
        {/* Sleepers */}
        {Array.from({length:28},(_,i)=>(
          <div key={i} style={{position:'absolute',bottom:'1px',left:`${3+i*3.5}%`,width:'2%',height:'9px',background:'rgba(21,101,160,0.12)',borderRadius:'1px'}}/>
        ))}
        {/* Real rake animation — slow and realistic */}
        <motion.div
          style={{position:'absolute',bottom:'8px',display:'flex',alignItems:'center'}}
          animate={{left:['-28%','108%']}}
          transition={{duration:14,repeat:Infinity,ease:'linear',delay:2}}>
          <RakeSVG/>
        </motion.div>
      </div>

      {/* Corner brackets — subtle */}
      {[[{top:24,left:24},{borderTop:'1px solid rgba(255,122,0,0.2)',borderLeft:'1px solid rgba(255,122,0,0.2)'}],
        [{top:24,right:24},{borderTop:'1px solid rgba(255,122,0,0.2)',borderRight:'1px solid rgba(255,122,0,0.2)'}],
        [{bottom:24,left:24},{borderBottom:'1px solid rgba(255,122,0,0.2)',borderLeft:'1px solid rgba(255,122,0,0.2)'}],
        [{bottom:24,right:24},{borderBottom:'1px solid rgba(255,122,0,0.2)',borderRight:'1px solid rgba(255,122,0,0.2)'}],
      ].map(([pos,border],i)=>(
        <div key={i} style={{position:'absolute',...pos,width:28,height:28,...border}}/>
      ))}

      {/* Main content */}
      <motion.div initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} transition={{duration:1.2,ease:'easeOut'}}
        style={{textAlign:'center',zIndex:10,padding:'0 32px',maxWidth:720}}>

        {/* Live badge */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
          style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:32,
            background:'rgba(21,101,160,0.08)',border:'1px solid rgba(21,101,160,0.2)',
            borderRadius:24,padding:'6px 18px',fontSize:10,letterSpacing:'0.2em',
            color:'rgba(77,166,217,0.8)',fontFamily:'Rajdhani,sans-serif',fontWeight:600}}>
          <motion.span animate={{opacity:[1,0.2,1]}} transition={{duration:2,repeat:Infinity}}
            style={{width:5,height:5,borderRadius:'50%',background:'#34c759',display:'inline-block'}}/>
          STEEL AUTHORITY OF INDIA LIMITED · BOKARO STEEL PLANT
        </motion.div>

        {/* Title */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}}>
          <div style={{
            fontSize:'clamp(38px,7vw,76px)',fontWeight:900,lineHeight:1.0,letterSpacing:'-0.01em',
            fontFamily:'Rajdhani,sans-serif',color:'#ffffff',marginBottom:6,
          }}>
            BOKARO
            <span style={{background:'linear-gradient(135deg,#FF7A00,#ffb066)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}> DSS</span>
          </div>
          <div style={{fontSize:'clamp(13px,2vw,18px)',color:'rgba(77,166,217,0.7)',letterSpacing:'0.25em',fontFamily:'Rajdhani',fontWeight:500,marginBottom:20}}>
            RAILWAY RAKE DECISION SUPPORT SYSTEM
          </div>
        </motion.div>

        {/* Single clean tagline */}
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.9}}
          style={{color:'rgba(139,184,212,0.65)',fontSize:15,maxWidth:500,margin:'0 auto 48px',lineHeight:1.8,fontWeight:400}}>
          AI-driven dispatch planning for steel plant logistics.<br/>
          Minimize penalties · Optimize rake utilization · Automate customer communication.
        </motion.p>

        {/* CTA only — no stats, no tech stack */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:1.2}}
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.98}} onClick={onStart}
            style={{
              padding:'15px 52px',fontSize:12,fontFamily:'Rajdhani,sans-serif',fontWeight:700,
              letterSpacing:'0.22em',color:'#fff',cursor:'pointer',border:'none',borderRadius:6,
              background:'#FF7A00',transition:'background 0.2s',
            }}
            onMouseEnter={e=>e.target.style.background='#e06c00'}
            onMouseLeave={e=>e.target.style.background='#FF7A00'}>
            ENTER SYSTEM
          </motion.button>
          <div style={{fontSize:10,color:'rgba(21,101,160,0.5)',letterSpacing:'0.15em',fontFamily:'Rajdhani'}}>
            AUTHORISED PERSONNEL ONLY
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function BootPage({ onComplete }) {
  const [step, setStep] = React.useState(0)
  const [done, setDone] = React.useState([])
  const [lines, setLines] = React.useState(0)
  const [prog, setProg] = React.useState(0)
  React.useEffect(()=>{
    if(step>=BOOT_STEPS.length){setTimeout(onComplete,600);return}
    setLines(0);setProg(0)
    const s=BOOT_STEPS[step]
    s.lines.forEach((_,i)=>setTimeout(()=>setLines(l=>Math.max(l,i+1)),400+i*400))
    let p=0;const iv=setInterval(()=>{p+=2;setProg(Math.min(p,100));if(p>=100)clearInterval(iv)},1800/50)
    const nx=setTimeout(()=>{setDone(d=>[...d,s.id]);setStep(c=>c+1)},2000)
    return()=>{clearTimeout(nx);clearInterval(iv)}
  },[step])
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#020810,#050e1a)',padding:24}}>
      <div style={{width:'100%',maxWidth:760}}>
        <div style={{textAlign:'center',fontSize:10,color:'#1565a0',letterSpacing:3,marginBottom:24,fontFamily:'Rajdhani',fontWeight:600}}>INITIALIZING BOKARO DSS</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {BOOT_STEPS.map((s,idx)=>{
            const isDone=done.includes(s.id),isActive=step===idx,isPend=idx>step
            return(
              <motion.div key={s.id} initial={{opacity:0,x:-20}} animate={{opacity:isPend?0.3:1,x:0}} transition={{delay:idx*0.04}}
                style={{background:'rgba(10,25,41,0.9)',borderRadius:10,padding:'14px 18px',border:isActive?'1px solid rgba(255,122,0,0.5)':isDone?'1px solid rgba(52,199,89,0.2)':'1px solid rgba(21,101,160,0.1)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:20,minWidth:32,textAlign:'center'}}>
                    {isDone?'✅':isActive?<motion.span animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}>⚙️</motion.span>:s.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:isActive?6:0}}>
                      <span style={{fontSize:11,fontWeight:700,letterSpacing:2,fontFamily:'Rajdhani',color:isDone?'#34c759':isActive?'#FF7A00':'#1565a0'}}>{s.label}</span>
                      {isDone&&<span style={{fontSize:9,color:'#34c759',background:'rgba(52,199,89,0.1)',padding:'1px 6px',borderRadius:8}}>DONE</span>}
                    </div>
                    {isActive&&(
                      <motion.div initial={{height:0}} animate={{height:'auto'}}>
                        {s.lines.slice(0,lines).map((line,li)=>(
                          <motion.div key={li} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} style={{fontSize:11,color:'#4da6d9',marginBottom:2}}>
                            <span style={{color:'#FF7A00',marginRight:5}}>›</span>{line}
                          </motion.div>
                        ))}
                        <div style={{marginTop:8,height:2,background:'rgba(255,122,0,0.1)',borderRadius:2}}>
                          <motion.div animate={{width:`${prog}%`}} transition={{duration:0.1}} style={{height:'100%',background:'linear-gradient(90deg,#cc5500,#FF7A00)',borderRadius:2}}/>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div style={{fontSize:16,fontWeight:900,minWidth:24,textAlign:'right',fontFamily:'Rajdhani',color:isDone?'#34c759':isActive?'#FF7A00':'#0d4a75'}}>{String(s.id).padStart(2,'0')}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
        <div style={{marginTop:24}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#1565a0',marginBottom:5,fontFamily:'Rajdhani',letterSpacing:2}}>
            <span>INITIALIZATION</span><span>{Math.round(done.length/BOOT_STEPS.length*100)}%</span>
          </div>
          <div style={{height:3,background:'rgba(255,122,0,0.1)',borderRadius:2}}>
            <motion.div animate={{width:`${done.length/BOOT_STEPS.length*100}%`}} transition={{duration:0.5}} style={{height:'100%',background:'linear-gradient(90deg,#cc5500,#FF7A00,#34c759)',borderRadius:2}}/>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const title = TITLES[window.location.pathname] || 'Dashboard'

  if (screen==='landing') return <AnimatePresence mode="wait"><motion.div key="l" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><LandingPage onStart={()=>setScreen('boot')}/></motion.div></AnimatePresence>
  if (screen==='boot')    return <AnimatePresence mode="wait"><motion.div key="b" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><BootPage onComplete={()=>setScreen('app')}/></motion.div></AnimatePresence>

  return (
    <motion.div key="app" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5}} className="flex h-screen overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title}/>
        <main className="flex-1 overflow-y-auto p-5">
          <Routes>
            <Route path="/"               element={<Dashboard/>}/>
            <Route path="/worker-plan"    element={<WorkerPlanPage/>}/>
            <Route path="/orders"         element={<OrdersPage/>}/>
            <Route path="/wagons"         element={<WagonMonitor/>}/>
            <Route path="/inventory"      element={<InventoryPage/>}/>
            <Route path="/locos"          element={<LocoTrackerPage/>}/>
            <Route path="/rail-map"       element={<RailMapPage/>}/>
            <Route path="/shift-handover" element={<ShiftHandoverPage/>}/>
            <Route path="/financial"      element={<FinancialPage/>}/>
            <Route path="/cost-analytics" element={<CostAnalytics/>}/>
            <Route path="/customer-hub"   element={<CustomerHubPage/>}/>
          </Routes>
        </main>
      </div>
    </motion.div>
  )
}
