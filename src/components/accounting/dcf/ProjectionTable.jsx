import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'

export default function ProjectionTable({ projections, onUpdate, modelId }) {
  const [editableData, setEditableData] = useState([])
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditableData(projections.map((p) => ({ ...p })))
    setHasChanges(false)
  }, [projections])

  const formatCurrency = (value) => {
    if (!value && value !== 0) return ''
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const parseCurrency = (value) => {
    if (!value) return 0
    return parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
  }

  const handleChange = (index, field, value) => {
    const newData = [...editableData]
    newData[index] = {
      ...newData[index],
      [field]: parseCurrency(value),
    }

    // Auto-calculate EBITDA and FCF
    const row = newData[index]
    row.ebitda = (row.revenue || 0) - (row.operating_expenses || 0)
    row.free_cash_flow = row.ebitda * 0.75 // Simplified FCF calculation

    setEditableData(newData)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(editableData)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setEditableData(projections.map((p) => ({ ...p })))
    setHasChanges(false)
  }

  const columns = [
    { key: 'year', label: 'Year', editable: false },
    { key: 'revenue', label: 'Revenue', editable: true },
    { key: 'operating_expenses', label: 'Operating Expenses', editable: true },
    { key: 'ebitda', label: 'EBITDA', editable: false, calculated: true },
    { key: 'free_cash_flow', label: 'Free Cash Flow', editable: false, calculated: true },
    { key: 'present_value', label: 'Present Value', editable: false },
  ]

  if (editableData.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No projections yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Generate projections from the Overview tab or add them manually.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Financial Projections</h3>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <button
                onClick={handleReset}
                className="btn-secondary text-sm"
                disabled={saving}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset
              </button>
              <button
                onClick={handleSave}
                className="btn-primary text-sm"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {col.label}
                    {col.calculated && (
                      <span className="ml-1 text-gray-400 font-normal">(calc)</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {editableData.map((row, rowIndex) => (
                <tr key={row.year} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.editable ? (
                        <input
                          type="text"
                          value={formatCurrency(row[col.key])}
                          onChange={(e) => handleChange(rowIndex, col.key, e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right font-mono"
                        />
                      ) : col.key === 'year' ? (
                        <span className="font-semibold">{row[col.key]}</span>
                      ) : (
                        <span
                          className={`font-mono text-right block ${
                            col.calculated ? 'text-gray-600' : ''
                          } ${col.key === 'free_cash_flow' ? 'text-green-600 font-semibold' : ''}`}
                        >
                          {row[col.key] ? `$${formatCurrency(row[col.key])}` : '-'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td className="px-4 py-3 font-semibold">Total</td>
                <td className="px-4 py-3 font-mono text-right">
                  ${formatCurrency(editableData.reduce((sum, r) => sum + (r.revenue || 0), 0))}
                </td>
                <td className="px-4 py-3 font-mono text-right">
                  ${formatCurrency(editableData.reduce((sum, r) => sum + (r.operating_expenses || 0), 0))}
                </td>
                <td className="px-4 py-3 font-mono text-right">
                  ${formatCurrency(editableData.reduce((sum, r) => sum + (r.ebitda || 0), 0))}
                </td>
                <td className="px-4 py-3 font-mono text-right text-green-600 font-semibold">
                  ${formatCurrency(editableData.reduce((sum, r) => sum + (r.free_cash_flow || 0), 0))}
                </td>
                <td className="px-4 py-3 font-mono text-right">
                  ${formatCurrency(editableData.reduce((sum, r) => sum + (r.present_value || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Edit Revenue and Operating Expenses. EBITDA and FCF are calculated automatically.
        Click Calculate in the header to update present values.
      </p>
    </div>
  )
}
