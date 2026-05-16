import { useState } from 'react'
import { dcfApi } from '../../../api/accounting'
import { Grid, RefreshCw } from 'lucide-react'

export default function SensitivityHeatmap({ modelId, model }) {
  const [sensitivity, setSensitivity] = useState(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({
    variable_x: 'discount_rate',
    variable_y: 'terminal_growth_rate',
    x_steps: 5,
    y_steps: 5,
  })

  const variables = [
    { value: 'discount_rate', label: 'Discount Rate' },
    { value: 'terminal_growth_rate', label: 'Terminal Growth' },
    { value: 'revenue_growth_rate', label: 'Revenue Growth' },
    { value: 'expense_growth_rate', label: 'Expense Growth' },
  ]

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const response = await dcfApi.runSensitivity(modelId, params)
      setSensitivity(response.data.sensitivity)
    } catch (err) {
      console.error('Failed to run sensitivity:', err)
      alert('Failed to run sensitivity analysis')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const getHeatmapColor = (value, min, max) => {
    if (value === null) return 'bg-gray-100'

    const range = max - min
    const normalized = (value - min) / range

    if (normalized >= 0.8) return 'bg-green-500 text-white'
    if (normalized >= 0.6) return 'bg-green-300'
    if (normalized >= 0.4) return 'bg-amber-200'
    if (normalized >= 0.2) return 'bg-orange-300'
    return 'bg-red-400 text-white'
  }

  return (
    <div className="space-y-4">
      {/* Parameters */}
      <div className="card p-4">
        <h3 className="font-semibold mb-4">Sensitivity Analysis Parameters</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">X Axis Variable</label>
            <select
              value={params.variable_x}
              onChange={(e) => setParams({ ...params, variable_x: e.target.value })}
              className="input"
            >
              {variables
                .filter((v) => v.value !== params.variable_y)
                .map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Y Axis Variable</label>
            <select
              value={params.variable_y}
              onChange={(e) => setParams({ ...params, variable_y: e.target.value })}
              className="input"
            >
              {variables
                .filter((v) => v.value !== params.variable_x)
                .map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Grid Size</label>
            <select
              value={params.x_steps}
              onChange={(e) =>
                setParams({
                  ...params,
                  x_steps: parseInt(e.target.value),
                  y_steps: parseInt(e.target.value),
                })
              }
              className="input"
            >
              <option value="3">3x3</option>
              <option value="5">5x5</option>
              <option value="7">7x7</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Grid className="w-4 h-4" />
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      {sensitivity && (
        <div className="card p-4">
          <h3 className="font-semibold mb-4">
            Enterprise Value Sensitivity
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-gray-500 border bg-gray-50">
                    {variables.find((v) => v.value === sensitivity.variable_y)?.label} ↓ /{' '}
                    {variables.find((v) => v.value === sensitivity.variable_x)?.label} →
                  </th>
                  {sensitivity.x_values.map((val, i) => (
                    <th key={i} className="p-2 text-xs text-gray-700 border bg-gray-50 min-w-[80px]">
                      {val}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensitivity.matrix.map((row, yi) => (
                  <tr key={yi}>
                    <td className="p-2 text-xs font-medium text-gray-700 border bg-gray-50">
                      {sensitivity.y_values[yi]}
                    </td>
                    {row.map((value, xi) => (
                      <td
                        key={xi}
                        className={`p-2 text-xs text-center border font-mono ${getHeatmapColor(
                          value,
                          sensitivity.min_value,
                          sensitivity.max_value
                        )}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-xs text-gray-500">Lower Value</span>
            <div className="flex">
              <div className="w-6 h-4 bg-red-400" />
              <div className="w-6 h-4 bg-orange-300" />
              <div className="w-6 h-4 bg-amber-200" />
              <div className="w-6 h-4 bg-green-300" />
              <div className="w-6 h-4 bg-green-500" />
            </div>
            <span className="text-xs text-gray-500">Higher Value</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">Min Value</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(sensitivity.min_value)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Base Case</p>
              <p className="font-semibold">
                {formatCurrency(sensitivity.base_value)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Max Value</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(sensitivity.max_value)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!sensitivity && !loading && (
        <div className="card p-8 text-center">
          <Grid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Sensitivity Analysis</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            See how changes in key assumptions affect your enterprise value.
            Select variables and run the analysis to generate a heatmap.
          </p>
        </div>
      )}
    </div>
  )
}
