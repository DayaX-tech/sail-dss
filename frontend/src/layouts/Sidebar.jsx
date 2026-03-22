import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PackageSearch, Train, Boxes, Map,
  BarChart3, ClipboardList, ChevronLeft, ChevronRight,
  MapPin, Mail, DollarSign, Users, Activity
} from 'lucide-react'

const NAV = [
  { path:'/',              icon:LayoutDashboard, label:'Command Center',       section:'OVERVIEW' },
  { path:'/worker-plan',   icon:ClipboardList,   label:"Today's Dispatch Plan", section:'OVERVIEW', highlight:true },
  { path:'/orders',        icon:PackageSearch,   label:'Orders Intelligence',  section:'OPERATIONS' },
  { path:'/wagons',        icon:Train,           label:'Wagon Monitor',        section:'OPERATIONS' },
  { path:'/inventory',     icon:Boxes,           label:'Stockyard Inventory',  section:'OPERATIONS' },
  { path:'/locos',         icon:Activity,        label:'Loco Tracker',         section:'OPERATIONS' },
  { path:'/rail-map',      icon:MapPin,          label:'Railway Route Map',    section:'PLANNING' },
  { path:'/shift-handover',icon:Users,           label:'Shift Handover',       section:'PLANNING' },
  { path:'/cost-analytics',icon:BarChart3,       label:'Penalty & Cost Board', section:'ANALYTICS' },
  { path:'/customer-hub',  icon:Mail,            label:'Customer Hub',         section:'CUSTOMER' },
]
const SECTIONS = ['OVERVIEW','OPERATIONS','PLANNING','ANALYTICS','CUSTOMER']

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <aside className={`${collapsed?'w-16':'w-64'} flex-shrink-0 h-screen border-r border-steel-700/50 flex flex-col transition-all duration-300 relative`}
      style={{ background:'linear-gradient(180deg,#050e1a 0%,#0a1929 100%)' }}>
      <div className={`p-4 border-b border-steel-700/50 ${collapsed?'px-2':''}`}>
        {!collapsed ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Train size={16} className="text-white"/></div>
              <div><div className="font-display font-bold text-white text-sm tracking-wide">SAIL BOKARO</div><div className="font-mono text-xs text-orange-400">DSS v2.0</div></div>
            </div>
            <div className="text-xs text-gray-500 font-mono mt-2 pl-1">Railway Rake Formation</div>
          </div>
        ) : (
          <div className="flex justify-center"><div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Train size={16} className="text-white"/></div></div>
        )}
      </div>
      {!collapsed && (
        <div className="px-4 py-2 border-b border-steel-700/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <span className="font-mono text-xs text-green-400">SYSTEM ONLINE</span>
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {SECTIONS.map(section => {
          const items = NAV.filter(n => n.section === section)
          return (
            <div key={section} className="mb-3">
              {!collapsed && <div className="px-2 py-1 font-mono text-xs text-gray-600 uppercase tracking-widest mb-1">{section}</div>}
              {items.map(({ path, icon:Icon, label, highlight }) => (
                <NavLink key={path} to={path} title={collapsed?label:''}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 text-sm group
                    ${isActive ? 'text-orange-400 bg-steel-700/80 border-l-2 border-orange-500'
                    : highlight ? 'text-yellow-300 hover:text-yellow-200 hover:bg-steel-700/30 border-l-2 border-yellow-500/40'
                    : 'text-gray-400 hover:text-white hover:bg-steel-700/30'}`}>
                  <Icon size={16} className="flex-shrink-0"/>
                  {!collapsed && <span className="font-display font-medium tracking-wide">{label}</span>}
                  {!collapsed && highlight && <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">NEW</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>
      {!collapsed && (
        <div className="p-4 border-t border-steel-700/30">
          <div className="text-xs font-mono text-gray-600"><div>Bokaro Steel Plant</div><div>Steel Authority of India Ltd.</div></div>
        </div>
      )}
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-steel-700 border border-steel-500 flex items-center justify-center hover:bg-steel-600 transition-colors z-10">
        {collapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
      </button>
    </aside>
  )
}
