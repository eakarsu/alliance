import { useState, useMemo } from 'react'
import { Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Search, X } from 'lucide-react'

// Extract plain text from a React element or string for filtering
function extractText(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(' ')
  // React element — dig into props.children and common text props
  if (typeof node === 'object') {
    if (node.props) {
      let text = ''
      if (node.props.children) text += extractText(node.props.children)
      if (node.props.status) text += ' ' + String(node.props.status)
      if (node.props.label) text += ' ' + String(node.props.label)
      return text
    }
    return String(node)
  }
  return String(node)
}

// Get the searchable text for a cell
function getCellSearchText(col, row) {
  // If column defines explicit filterKeys, search those fields
  if (col.filterKeys) {
    return col.filterKeys.map(k => row[k] != null ? String(row[k]) : '').join(' ')
  }
  // If column has a render function, extract text from rendered output
  if (col.render) {
    try {
      const rendered = col.render(row[col.key], row)
      return extractText(rendered)
    } catch {
      return ''
    }
  }
  // Plain value
  const val = row[col.key]
  return val != null ? String(val) : ''
}

export default function DataTable({ columns, data, onRowClick, onEdit, onDelete, emptyMessage = 'No records found.' }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [columnFilters, setColumnFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const handleSort = (colKey) => {
    if (sortKey === colKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(colKey)
      setSortDir('asc')
    }
  }

  const handleFilterChange = (key, value) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      if (value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  const clearAllFilters = () => {
    setColumnFilters({})
  }

  const activeFilterCount = Object.keys(columnFilters).length

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    let result = [...data]

    // Apply column filters
    for (const [key, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal) continue
      const lowerFilter = filterVal.toLowerCase()
      const col = columns.find(c => c.key === key)
      if (!col) continue

      result = result.filter(row => {
        const text = getCellSearchText(col, row)
        return text.toLowerCase().includes(lowerFilter)
      })
    }

    // Apply sort
    if (sortKey) {
      const sortCol = columns.find(c => c.key === sortKey)
      result.sort((a, b) => {
        // Get sortable values - use rendered text for rendered columns
        let aVal, bVal
        if (sortCol?.render) {
          aVal = getCellSearchText(sortCol, a)
          bVal = getCellSearchText(sortCol, b)
        } else {
          aVal = a[sortKey]
          bVal = b[sortKey]
        }

        // Handle nulls
        if (aVal == null && bVal == null) return 0
        if (aVal == null || aVal === '' || aVal === '-') return 1
        if (bVal == null || bVal === '' || bVal === '-') return -1

        // Try numeric comparison
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum) && String(aVal).trim() !== '' && String(bVal).trim() !== '') {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum
        }

        // Try date comparison
        const aStr = String(aVal)
        const bStr = String(bVal)
        if (aStr.includes('-') || aStr.includes('T')) {
          const aDate = Date.parse(aStr)
          const bDate = Date.parse(bStr)
          if (!isNaN(aDate) && !isNaN(bDate)) {
            return sortDir === 'asc' ? aDate - bDate : bDate - aDate
          }
        }

        // String comparison
        const aLower = aStr.toLowerCase()
        const bLower = bStr.toLowerCase()
        if (aLower < bLower) return sortDir === 'asc' ? -1 : 1
        if (aLower > bLower) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, sortKey, sortDir, columnFilters, columns])

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Filter toggle bar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Search className="h-3 w-3" />
            Column Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {processedData.length} of {data.length} records
        </span>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                <button
                  onClick={() => handleSort(col.key)}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors group"
                >
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-blue-500" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-blue-500" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400" />
                  )}
                </button>
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            )}
          </tr>
          {/* Column filter row */}
          {showFilters && (
            <tr className="bg-blue-50/40">
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className="px-4 py-2">
                  <input
                    type="text"
                    value={columnFilters[col.key] || ''}
                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs font-normal text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 normal-case"
                  />
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-4 py-2" />}
            </tr>
          )}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {processedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-8 text-center text-sm text-gray-400">
                No records match your filters
              </td>
            </tr>
          ) : (
            processedData.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`cursor-pointer transition-colors hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] != null ? String(row[col.key]) : '-')}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(row) }}
                          className="rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(row) }}
                          className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
