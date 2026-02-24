import React, { useEffect, useState } from 'react'
import { fetchOrders } from '../services/api'
import { LoadingSpinner, ErrorState, StatusDot, ProgressBar } from '../components/UIKit'
import { Search, Filter, Download, ChevronUp, ChevronDown } from 'lucide-react'

const PRODUCTS = ['', 'Hot Rolled Coils', 'Cold Rolled Sheets', 'Plates', 'Billets', 'Pig Iron', 'Structural Steel', 'Finished Bundles']
const STATUSES = ['', 'PENDING', 'IN_PROCESS', 'DISPATCHED']

const RiskBadge = ({ score }) => {
  if (score >= 0.85) return <span className="badge-critical">CRITICAL</span>
  if (score >= 0.6) return <span className="badge-high">HIGH</span>
  if (score >= 0.3) return <span className="badge-medium">MEDIUM</span>
  return <span className="badge-low">LOW</span>
}

export default function OrdersPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [sortField, setSortField] = useState('composite_priority')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const load = async () => {
    try {
      setLoading(true)
      const d = await fetchOrders({ 
        status: statusFilter || undefined, 
        product_type: productFilter || undefined,
        limit: 500,
        offset: page * PAGE_SIZE
      })
      setData(d)
    } catch (e) {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, productFilter, page])

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const orders = (data?.orders || [])
    .filter(o => !search || o.order_id.includes(search.toUpperCase()) || o.customer_id.includes(search.toUpperCase()) || o.destination.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const SortIcon = ({ field }) => sortField === field
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span className="w-3" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Orders Intelligence</h2>
          <p className="text-gray-400 text-sm font-mono mt-0.5">
            {data?.total?.toLocaleString()} total orders • AI-scored with urgency & risk
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order ID, customer, destination..."
            className="bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none w-full font-mono"
          />
        </div>
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
          className="bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
          {PRODUCTS.map(p => <option key={p} value={p}>{p || 'All Products'}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-steel-700/50 border border-steel-600 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 outline-none">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <Filter size={14} /> Apply
        </button>
      </div>

      {loading ? <LoadingSpinner text="Analyzing orders..." /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="border-b border-steel-700">
                <tr>
                  {[
                    ['order_id', 'Order ID'],
                    ['customer_id', 'Customer'],
                    ['product_type', 'Product'],
                    ['quantity_tons', 'Qty (T)'],
                    ['destination', 'Destination'],
                    ['deadline_days', 'Days Left'],
                    ['urgency_score', 'Urgency'],
                    ['risk_score', 'Risk'],
                    ['composite_priority', 'Priority'],
                    ['penalty_cost', 'Penalty/day'],
                    ['status', 'Status'],
                  ].map(([field, label]) => (
                    <th key={field} className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort(field)}>
                      <div className="flex items-center gap-1">{label}<SortIcon field={field} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 100).map(order => (
                  <tr key={order.order_id} className="hover:bg-steel-700/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-orange-400 text-xs">{order.order_id}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{order.customer_id}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{order.product_type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{Number(order.quantity_tons).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-xs">{order.destination}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono text-xs font-bold ${order.deadline_days <= 2 ? 'text-red-400' : order.deadline_days <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {order.deadline_days}d
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <ProgressBar value={(order.urgency_score || 0) * 100} max={100} color={order.urgency_score > 0.7 ? 'red' : 'orange'} showPct={false} />
                    </td>
                    <td className="px-4 py-2.5"><RiskBadge score={order.risk_score || 0} /></td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-blue-300">{((order.composite_priority || 0) * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-300">
                      ₹{Number(order.penalty_cost).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={order.status} />
                        <span className="text-xs font-mono">{order.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-steel-700/50 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">Showing {Math.min(100, orders.length)} of {orders.length} filtered orders</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <span className="text-xs font-mono text-gray-400 px-2 flex items-center">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
