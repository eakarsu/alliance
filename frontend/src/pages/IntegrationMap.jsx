import { useState, useEffect } from 'react'
import { Network, ArrowLeft, Package } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const partnerColumns = [
  { key: 'entity_name', label: 'Partner', render: (v) => v || '-' },
  { key: 'entity_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'geography', label: 'Geography', render: (v) => v || '-' },
  { key: 'billing_capability', label: 'Billing', render: (v) => v || '-' },
  { key: 'contact_email', label: 'Email', render: (v) => v || '-' },
  { key: 'active_status', label: 'Active', render: (v) => v ? 'Yes' : 'No' },
]

const productColumns = [
  { key: 'product_name', label: 'Product', render: (v) => v || '-' },
  { key: 'category', label: 'Category', render: (v) => v || '-' },
  { key: 'maturity_level', label: 'Maturity', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'demo_available', label: 'Demo', render: (v) => v ? 'Yes' : 'No' },
]

export default function IntegrationMap() {
  const [partners, setPartners] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/partners', { params: { limit: 100 } }),
      api.get('/products', { params: { limit: 100 } }),
    ]).then(([partnerRes, productRes]) => {
      setPartners(partnerRes.data.data || [])
      setProducts(productRes.data.data || [])
    }).catch(() => setError('Failed to load integration map')).finally(() => setLoading(false))
  }, [])

  const productsByEntity = products.reduce((acc, p) => {
    const key = p.owner_entity_id || 'unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const filtered = partners.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.entity_name} ${r.entity_type} ${r.geography} ${r.contact_email}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  // Product detail view
  if (selectedProduct) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to {selectedPartner ? selectedPartner.entity_name : 'Integration Map'}
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selectedProduct.product_name}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Category', selectedProduct.category],
              ['Maturity Level', selectedProduct.maturity_level],
              ['Status', selectedProduct.status],
              ['Demo Available', selectedProduct.demo_available ? 'Yes' : 'No'],
              ['Recurring Model', selectedProduct.recurring_model ? 'Yes' : 'No'],
              ['White Label', selectedProduct.white_label_possible ? 'Yes' : 'No'],
              ['Reseller Possible', selectedProduct.reseller_possible ? 'Yes' : 'No'],
              ['Implementation Required', selectedProduct.implementation_required ? 'Yes' : 'No'],
              ['Compliance Risk', selectedProduct.compliance_risk_level],
              ['Created', selectedProduct.created_at ? new Date(selectedProduct.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selectedProduct.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedProduct.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Partner detail view
  if (selectedPartner) {
    const entityProducts = productsByEntity[selectedPartner.id] || []
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelectedPartner(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Integration Map
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Network className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selectedPartner.entity_name}</h2>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${selectedPartner.active_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {selectedPartner.active_status ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Entity Type', selectedPartner.entity_type],
              ['Billing Capability', selectedPartner.billing_capability],
              ['Geography', selectedPartner.geography],
              ['Website', selectedPartner.website],
              ['Contact Email', selectedPartner.contact_email],
              ['Status', selectedPartner.active_status ? 'Active' : 'Inactive'],
              ['Created', selectedPartner.created_at ? new Date(selectedPartner.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selectedPartner.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedPartner.notes}</p>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Products ({entityProducts.length})</h3>
            {entityProducts.length === 0 ? (
              <p className="text-sm text-gray-400">No products linked to this entity.</p>
            ) : (
              <DataTable columns={productColumns} data={entityProducts} onRowClick={(row) => setSelectedProduct(row)} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Network className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Integration Map</h1>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">{partners.length}</span>
      </div>
      <p className="text-sm text-gray-500">Partner entities and their product portfolios across the alliance ecosystem.</p>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search partners..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={partnerColumns} data={filtered} onRowClick={(row) => setSelectedPartner(row)} />
    </div>
  )
}
