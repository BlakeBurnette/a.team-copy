import { useMemo } from 'react'

export default function CashFlowChart({ historical, projections }) {
  const chartData = useMemo(() => {
    // Combine historical and projection data
    const historicalByYear = {}

    // Aggregate historical monthly data by year
    historical.forEach((h) => {
      const year = new Date(h.period_date).getFullYear()
      if (!historicalByYear[year]) {
        historicalByYear[year] = { revenue: 0, expenses: 0, ebitda: 0, type: 'historical' }
      }
      historicalByYear[year].revenue += Number(h.revenue) || 0
      historicalByYear[year].expenses += Number(h.operating_expenses) || 0
      historicalByYear[year].ebitda += Number(h.ebitda) || 0
    })

    // Convert to array
    const historicalData = Object.entries(historicalByYear).map(([year, data]) => ({
      year: parseInt(year),
      ...data,
    }))

    // Add projections
    const projectionData = projections.map((p) => ({
      year: p.year,
      revenue: Number(p.revenue) || 0,
      expenses: Number(p.operating_expenses) || 0,
      ebitda: Number(p.ebitda) || 0,
      fcf: Number(p.free_cash_flow) || 0,
      type: 'projection',
    }))

    return [...historicalData, ...projectionData].sort((a, b) => a.year - b.year)
  }, [historical, projections])

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map((d) => Math.max(d.revenue, d.expenses, d.ebitda)))
  }, [chartData])

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  if (chartData.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No data available for chart</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold mb-4">Cash Flow Overview</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-sm text-gray-600">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span className="text-sm text-gray-600">Expenses</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-sm text-gray-600">EBITDA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded" />
          <span className="text-sm text-gray-600">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" />
          <span className="text-sm text-gray-600">Projected</span>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="space-y-4">
        {chartData.map((data, i) => (
          <div
            key={data.year}
            className={`p-4 rounded-lg ${
              data.type === 'projection' ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{data.year}</span>
              <span className="text-xs text-gray-500 uppercase">{data.type}</span>
            </div>

            {/* Revenue Bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 w-16">Revenue</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded"
                  style={{ width: `${(data.revenue / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono w-20 text-right">
                {formatCurrency(data.revenue)}
              </span>
            </div>

            {/* Expenses Bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 w-16">Expenses</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded"
                  style={{ width: `${(data.expenses / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono w-20 text-right">
                {formatCurrency(data.expenses)}
              </span>
            </div>

            {/* EBITDA Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">EBITDA</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded"
                  style={{ width: `${(Math.max(0, data.ebitda) / maxValue) * 100}%` }}
                />
              </div>
              <span
                className={`text-xs font-mono w-20 text-right ${
                  data.ebitda >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(data.ebitda)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Historical Years</p>
          <p className="text-lg font-semibold">
            {chartData.filter((d) => d.type === 'historical').length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Projected Years</p>
          <p className="text-lg font-semibold">
            {chartData.filter((d) => d.type === 'projection').length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg EBITDA Growth</p>
          <p className="text-lg font-semibold text-green-600">
            {chartData.length > 1
              ? `${(
                  ((chartData[chartData.length - 1].ebitda / chartData[0].ebitda) **
                    (1 / (chartData.length - 1)) -
                    1) *
                  100
                ).toFixed(1)}%`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  )
}
