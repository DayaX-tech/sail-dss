import React, { useEffect, useState } from 'react'
import { fetchCompatibility } from '../services/api'
import { LoadingSpinner, ErrorState } from '../components/UIKit'

const COLORS_COMPAT = { BCNA: '#FF7A00', BRN: '#1565a0', BOXN: '#34c759', BOST: '#ff2d55', BTPN: '#ffcc02', BCN: '#7ec8e3' }
const PRODUCTS = ['Hot Rolled Coils', 'Cold Rolled Sheets', 'Plates', 'Billets', 'Pig Iron', 'Structural Steel', 'Finished Bundles']
const WAGON_TYPES = ['BCNA', 'BRN', 'BOXN', 'BOST', 'BTPN', 'BCN']

export default function CompatibilityMatrix() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCompatibility().then(d => { setData(d); setLoading(false) }).catch(() => { setError('Failed to load compatibility data'); setLoading(false) })
  }, [])

  if (loading) return <LoadingSpinner text="Loading compatibility matrix..." />
  if (error) return <ErrorState message={error} />

  const matrix = {}
  ;(data?.matrix || []).forEach(row => {
    if (!matrix[row.product_type]) matrix[row.product_type] = {}
    matrix[row.product_type][row.wagon_type] = row
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Product–Wagon Compatibility Matrix</h2>
        <p className="text-gray-400 text-sm font-mono mt-0.5">Engineering constraints defining valid wagon assignments per product type</p>
      </div>

      <div className="card p-5 overflow-x-auto">
        <div className="section-title">Compatibility Grid</div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left font-mono text-xs text-gray-400 uppercase pb-3 pr-4">Product Type</th>
              {WAGON_TYPES.map(wt => (
                <th key={wt} className="text-center pb-3 px-2">
                  <div className="font-mono text-xs font-bold px-2 py-1 rounded" style={{
                    background: COLORS_COMPAT[wt] + '22', color: COLORS_COMPAT[wt], border: `1px solid ${COLORS_COMPAT[wt]}44`
                  }}>{wt}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map(prod => (
              <tr key={prod} className="border-t border-steel-700/30 hover:bg-steel-700/10">
                <td className="py-3 pr-4">
                  <div className="font-display text-sm font-medium text-white">{prod}</div>
                </td>
                {WAGON_TYPES.map(wt => {
                  const cell = matrix[prod]?.[wt] || { compatible: false, load_efficiency: 0 }
                  return (
                    <td key={wt} className="py-3 px-2 text-center">
                      {cell.compatible ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-lg bg-green-900/40 border border-green-700/50 flex items-center justify-center">
                            <span className="text-green-400 text-lg">✓</span>
                          </div>
                          <span className="font-mono text-xs text-green-400">{(cell.load_efficiency * 100).toFixed(0)}%</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-red-900/20 border border-red-900/30 flex items-center justify-center mx-auto">
                          <span className="text-red-700 text-sm">✗</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(data?.product_wagon_map || {}).slice(0, 6).map(([prod, wagons]) => (
          <div key={prod} className="card p-4">
            <div className="font-display text-sm font-semibold text-white mb-2">{prod}</div>
            <div className="flex flex-wrap gap-1">
              {wagons.map(w => (
                <span key={w} className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: COLORS_COMPAT[w] + '22', color: COLORS_COMPAT[w], border: `1px solid ${COLORS_COMPAT[w]}44` }}>
                  {w}
                </span>
              ))}
            </div>
            <div className="text-xs font-mono text-gray-500 mt-2">{wagons.length} compatible wagon type{wagons.length > 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
