import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function KPICard({ label, value, unit = '', trend, trendLabel, icon: Icon, accent = 'orange', size = 'md' }) {
  const accentColors = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  }
  
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="card card-hover p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5"
        style={{ background: accent === 'orange' ? '#FF7A00' : accent === 'green' ? '#34c759' : '#1565a0', transform: 'translate(30%, -30%)' }} />
      
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${accentColors[accent]}`}>
          {Icon && <Icon size={18} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-mono ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div className="font-display text-2xl font-bold text-white number-counter">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </div>
      
      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mt-1">{label}</div>
      
      {trendLabel && <div className="text-xs text-gray-500 mt-1">{trendLabel}</div>}
    </div>
  )
}

export function MiniKPI({ label, value, unit = '', color = 'text-white' }) {
  return (
    <div className="text-center">
      <div className={`font-display text-xl font-bold ${color} number-counter`}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </div>
      <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">{label}</div>
    </div>
  )
}

export function AlertBadge({ level, message, timestamp }) {
  const styles = {
    HIGH: 'border-red-700/50 bg-red-900/20 text-red-300',
    MEDIUM: 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300',
    LOW: 'border-blue-700/50 bg-blue-900/20 text-blue-300',
  }
  const dots = {
    HIGH: 'bg-red-400',
    MEDIUM: 'bg-yellow-400',
    LOW: 'bg-blue-400',
  }

  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${styles[level]}`}>
      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 animate-pulse ${dots[level]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{message}</div>
        {timestamp && <div className="text-xs opacity-60 font-mono mt-0.5">{new Date(timestamp).toLocaleTimeString()}</div>}
      </div>
      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border opacity-70 ${styles[level]}`}>{level}</span>
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = 'orange', label, showPct = true }) {
  const pct = Math.min((value / max) * 100, 100)
  const barColors = {
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
  }
  
  const autoColor = pct >= 80 ? 'green' : pct >= 60 ? 'orange' : 'red'
  const finalColor = barColors[color] || barColors[autoColor]

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-mono text-gray-400">{label}</span>
          {showPct && <span className="text-xs font-mono text-gray-300">{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div className="h-2 bg-steel-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full progress-bar-fill ${finalColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function StatusDot({ status }) {
  const colors = {
    AVAILABLE: 'bg-green-400',
    IN_USE: 'bg-blue-400',
    MAINTENANCE: 'bg-yellow-400',
    TRANSIT: 'bg-orange-400',
    READY: 'bg-green-400',
    FORMING: 'bg-blue-400',
    DISPATCHED: 'bg-gray-400',
    OPERATIONAL: 'bg-green-400',
    FULL: 'bg-red-400',
    PENDING: 'bg-yellow-400',
    IN_PROCESS: 'bg-blue-400',
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
  )
}

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-steel-700 animate-spin border-t-orange-500" />
        <div className="absolute inset-2 rounded-full border border-orange-500/20 animate-ping" />
      </div>
      <div className="font-mono text-sm text-gray-400">{text}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <div className="text-red-400 font-mono text-sm">{message}</div>
      {onRetry && <button onClick={onRetry} className="btn-secondary text-sm">Retry</button>}
    </div>
  )
}
