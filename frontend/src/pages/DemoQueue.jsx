import { useState, useEffect } from 'react'
import { Monitor, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const columns = [
  { key: 'product_name', label: 'Product', render: (v) => v || '-' },
  { key: 'category', label: 'Category', render: (v) => v || '-' },
  { key: 'maturity_level', label: 'Maturity', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'recurring_model', label: 'Recurring', render: (v) => v ? 'Yes' : 'No' },
  { key: 'compliance_risk_level', label: 'Compliance Risk', render: (v) => v || '-' },
]

export default function DemoQueue() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 100 } })
      const items = (res.data.data || []).filter(p => p.demo_available)
      setProducts(items)
    } catch { setError('Failed to load demo queue') } finally { setLoading(false) }
  }

  const filtered = products.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.product_name} ${r.category} ${r.maturity_level} ${r.status}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Demo Queue
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selected.product_name}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Category', selected.category],
              ['Maturity Level', selected.maturity_level],
              ['Status', selected.status],
              ['Recurring Model', selected.recurring_model ? 'Yes' : 'No'],
              ['White Label Possible', selected.white_label_possible ? 'Yes' : 'No'],
              ['Reseller Possible', selected.reseller_possible ? 'Yes' : 'No'],
              ['Implementation Required', selected.implementation_required ? 'Yes' : 'No'],
              ['Compliance Risk Level', selected.compliance_risk_level],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
              ['Last Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selected.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Demo Queue</h1>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">{products.length}</span>
      </div>
      <p className="text-sm text-gray-500">Products with available demos for scheduling and tracking.</p>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search demos..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
