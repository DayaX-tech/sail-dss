import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PackageSearch, Train, Boxes, Map, Settings2,
  BarChart3, AlertTriangle, Clock, Lightbulb, Cpu, History,
  Shield, ChevronLeft, ChevronRight, Zap, Activity, GitCompare, 
  Gauge, FlaskConical
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Command Center', section: 'OVERVIEW' },
  { path: '/orders', icon: PackageSearch, label: 'Orders Intelligence', section: 'OPERATIONS' },
  { path: '/wagons', icon: Train, label: 'Wagon Monitor', section: 'OPERATIONS' },
  { path: '/compatibility', icon: Boxes, label: 'Compatibility Matrix', section: 'OPERATIONS' },
  { path: '/inventory', icon: Map, label: 'Stockyard Map', section: 'OPERATIONS' },
  { path: '/rake-planner', icon: Settings2, label: 'Rake Planner', section: 'PLANNING' },
  { path: '/utilization', icon: Gauge, label: 'Space Utilization', section: 'PLANNING' },
  { path: '/comparison', icon: GitCompare, label: 'Plan Comparison', section: 'PLANNING' },
  { path: '/cost-analytics', icon: BarChart3, label: 'Cost & Penalty', section: 'ANALYTICS' },
  { path: '/risk-monitor', icon: AlertTriangle, label: 'Risk Monitor', section: 'ANALYTICS' },
  { path: '/loading-scheduler', icon: Clock, label: 'Loading Scheduler', section: 'ANALYTICS' },
  { path: '/explanation', icon: Lightbulb, label: 'AI Explanation', section: 'AI' },
  { path: '/simulation', icon: FlaskConical, label: 'Digital Twin', section: 'AI' },
  { path: '/historical', icon: History, label: 'Historical Analytics', section: 'AI' },
  { path: '/admin', icon: Shield, label: 'Admin & Monitor', section: 'SYSTEM' },
]

const SECTIONS = ['OVERVIEW', 'OPERATIONS', 'PLANNING', 'ANALYTICS', 'AI', 'SYSTEM']

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 h-screen bg-steel-900 border-r border-steel-700/50 flex flex-col transition-all duration-300 relative`}
      style={{ background: 'linear-gradient(180deg, #050e1a 0%, #0a1929 100%)' }}>
      
      {/* Header */}
      <div className={`p-4 border-b border-steel-700/50 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Train size={16} className="text-white" />
              </div>
              <div>
                <div className="font-display font-bold text-white text-sm tracking-wide">SAIL BOKARO</div>
                <div className="font-mono text-xs text-orange-400">DSS v2.0</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono mt-2 pl-1">Railway Rake Formation</div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Train size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-steel-700/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-xs text-green-400">SYSTEM ONLINE</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {SECTIONS.map(section => {
          const items = NAV_ITEMS.filter(n => n.section === section)
          return (
            <div key={section} className="mb-3">
              {!collapsed && (
                <div className="px-2 py-1 font-mono text-xs text-gray-600 uppercase tracking-widest mb-1">
                  {section}
                </div>
              )}
              {items.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 text-sm group
                    ${isActive
                      ? 'text-orange-400 bg-steel-700/80 border-l-2 border-orange-500'
                      : 'text-gray-400 hover:text-white hover:bg-steel-700/30'
                    }`
                  }
                  title={collapsed ? label : ''}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {!collapsed && <span className="font-display font-medium tracking-wide">{label}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-steel-700/30">
          <div className="text-xs font-mono text-gray-600">
            <div>Bokaro Steel Plant</div>
            <div>Steel Authority of India Ltd.</div>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-steel-700 border border-steel-500 flex items-center justify-center hover:bg-steel-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
