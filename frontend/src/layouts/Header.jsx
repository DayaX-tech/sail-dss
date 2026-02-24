import React, { useState, useEffect } from 'react'
import { Bell, Search, RefreshCw, User, Activity, Wifi } from 'lucide-react'

export default function Header({ title = 'Dashboard' }) {
  const [time, setTime] = useState(new Date())
  const [alerts, setAlerts] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-14 border-b border-steel-700/50 bg-steel-900/90 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: 'rgba(5, 14, 26, 0.95)' }}>
      
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-white text-lg tracking-wide">{title}</h1>
          <div className="font-mono text-xs text-gray-500">
            SAIL Bokaro Steel Plant — Logistics Control
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="flex items-center gap-2 bg-steel-800 border border-steel-700/50 rounded-lg px-3 py-1.5">
          <Activity size={12} className="text-green-400 animate-pulse" />
          <span className="font-mono text-sm text-gray-300">
            {time.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
          <span className="font-mono text-xs text-gray-500">
            {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5 bg-green-900/20 border border-green-700/30 rounded px-2 py-1">
          <Wifi size={12} className="text-green-400" />
          <span className="font-mono text-xs text-green-400">LIVE</span>
        </div>

        {/* Alerts */}
        <button className="relative w-9 h-9 rounded-lg bg-steel-800 border border-steel-700/50 flex items-center justify-center hover:bg-steel-700 transition-colors">
          <Bell size={16} className="text-gray-300" />
          {alerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs font-mono text-white flex items-center justify-center">
              {alerts}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2 bg-steel-800 border border-steel-700/50 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-steel-700 transition-colors">
          <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <User size={12} className="text-orange-400" />
          </div>
          <div>
            <div className="font-display text-xs font-semibold text-white">AGM Logistics</div>
            <div className="font-mono text-xs text-gray-500">Officer #L-4821</div>
          </div>
        </div>
      </div>
    </header>
  )
}
