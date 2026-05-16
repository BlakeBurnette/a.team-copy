import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { dcfApi } from '../../api/accounting'
import ValuationSummary from '../../components/accounting/dcf/ValuationSummary'
import ProjectionTable from '../../components/accounting/dcf/ProjectionTable'
import CashFlowChart from '../../components/accounting/dcf/CashFlowChart'
import ScenarioCards from '../../components/accounting/dcf/ScenarioCards'
import AIInsightPanel from '../../components/accounting/dcf/AIInsightPanel'
import SensitivityHeatmap from '../../components/accounting/dcf/SensitivityHeatmap'
import AIPrivacySettings from '../../components/accounting/dcf/AIPrivacySettings'
import { ArrowLeft, RefreshCw, Sparkles, Calculator, Settings, Shield } from 'lucide-react'

export default function AcctDCFModel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [calculating, setCalculating] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    loadModel()
  }, [id])

  const loadModel = async () => {
    setLoading(true)
    try {
      const response = await dcfApi.getModel(id)
      setModel(response.data)
    } catch (err) {
      console.error('Failed to load model:', err)
      // Demo data
      setModel({
        id,
        name: '2024 Valuation',
        description: 'Annual business valuation with AI projections',
        status: 'active',
        historical_start_date: '2023-01-01',
        historical_end_date: '2023-12-31',
        projection_years: 5,
        discount_rate: 0.12,
        terminal_growth_rate: 0.03,
        enterprise_value: 2500000,
        npv: 1850000,
        terminal_value: 3200000,
        ai_reasoning: null,
        historical: [
          { period_date: '2023-01-01', revenue: 45000, operating_expenses: 32000, ebitda: 13000 },
          { period_date: '2023-02-01', revenue: 48000, operating_expenses: 33000, ebitda: 15000 },
          { period_date: '2023-03-01', revenue: 52000, operating_expenses: 34000, ebitda: 18000 },
        ],
        projections: [
          { year: 2024, revenue: 600000, operating_expenses: 420000, ebitda: 180000, free_cash_flow: 135000, source: 'manual' },
          { year: 2025, revenue: 660000, operating_expenses: 440000, ebitda: 220000, free_cash_flow: 165000, source: 'manual' },
          { year: 2026, revenue: 726000, operating_expenses: 462000, ebitda: 264000, free_cash_flow: 198000, source: 'manual' },
        ],
        scenarios: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAggregateHistorical = async () => {
    setCalculating(true)
    try {
      await dcfApi.aggregateHistorical(id)
      await loadModel()
    } catch (err) {
      console.error('Failed to aggregate:', err)
      alert('Failed to aggregate historical data')
    } finally {
      setCalculating(false)
    }
  }

  const handleGenerateProjections = async () => {
    setCalculating(true)
    try {
      await dcfApi.generateProjections(id)
      await loadModel()
    } catch (err) {
      console.error('Failed to generate projections:', err)
      alert('Failed to generate projections')
    } finally {
      setCalculating(false)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      await dcfApi.calculate(id, { source: 'manual' })
      await loadModel()
    } catch (err) {
      console.error('Failed to calculate:', err)
      alert('Failed to calculate valuation: ' + (err.response?.data?.error || err.message))
    } finally {
      setCalculating(false)
    }
  }

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    try {
      await dcfApi.analyzeHistorical(id)
      await loadModel()
    } catch (err) {
      console.error('Failed to run AI analysis:', err)
      alert('Failed to run AI analysis')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiProjections = async () => {
    setAiLoading(true)
    try {
      await dcfApi.generateAiProjections(id, {})
      await loadModel()
    } catch (err) {
      console.error('Failed to generate AI projections:', err)
      alert('Failed to generate AI projections')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiScenarios = async () => {
    setAiLoading(true)
    try {
      await dcfApi.generateAiScenarios(id)
      await loadModel()
    } catch (err) {
      console.error('Failed to generate scenarios:', err)
      alert('Failed to generate scenarios')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAcceptAi = async () => {
    setAiLoading(true)
    try {
      await dcfApi.acceptAiSuggestions(id, { source: 'ai_base' })
      await loadModel()
    } catch (err) {
      console.error('Failed to accept AI:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const handleProjectionUpdate = async (projections) => {
    try {
      await dcfApi.bulkUpdateProjections(id, {
        projections,
        source: 'manual',
      })
      await loadModel()
    } catch (err) {
      console.error('Failed to update projections:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Model not found</p>
        <button onClick={() => navigate('/app/accounting/dcf')} className="btn-primary mt-4">
          Back to DCF
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'projections', label: 'Projections' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'ai', label: 'AI Insights' },
    { id: 'sensitivity', label: 'Sensitivity' },
    { id: 'settings', label: 'Privacy & Audit' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/accounting/dcf')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{model.name}</h1>
            {model.description && (
              <p className="text-gray-500">{model.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="btn-secondary flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {calculating ? 'Calculating...' : 'Calculate'}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="btn-secondary p-2"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Valuation Summary */}
      <ValuationSummary model={model} />

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          {(!model.historical || model.historical.length === 0) && (
            <div className="card p-6 bg-amber-50 border-amber-200">
              <h3 className="font-semibold mb-2">Get Started</h3>
              <p className="text-sm text-gray-600 mb-4">
                Aggregate your historical transaction data to begin the valuation process.
              </p>
              <button
                onClick={handleAggregateHistorical}
                disabled={calculating}
                className="btn-primary"
              >
                {calculating ? 'Aggregating...' : 'Aggregate Historical Data'}
              </button>
            </div>
          )}

          {model.historical && model.historical.length > 0 && (
            <>
              <CashFlowChart
                historical={model.historical}
                projections={model.projections?.filter((p) => p.source === 'manual') || []}
              />

              {(!model.projections || model.projections.length === 0) && (
                <div className="card p-6">
                  <h3 className="font-semibold mb-2">Generate Projections</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create initial projections based on your historical trends.
                  </p>
                  <button
                    onClick={handleGenerateProjections}
                    disabled={calculating}
                    className="btn-primary"
                  >
                    {calculating ? 'Generating...' : 'Generate Projections'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'projections' && (
        <ProjectionTable
          projections={model.projections?.filter((p) => p.source === 'manual') || []}
          onUpdate={handleProjectionUpdate}
          modelId={id}
        />
      )}

      {activeTab === 'scenarios' && (
        <ScenarioCards
          modelId={id}
          scenarios={model.scenarios || []}
          onGenerate={handleAiScenarios}
          onRefresh={loadModel}
          loading={aiLoading}
        />
      )}

      {activeTab === 'ai' && (
        <AIInsightPanel
          modelId={id}
          model={model}
          onAnalyze={handleAiAnalysis}
          onGenerateProjections={handleAiProjections}
          onAccept={handleAcceptAi}
          loading={aiLoading}
          aiProjections={model.projections?.filter((p) => p.source === 'ai_base') || []}
        />
      )}

      {activeTab === 'sensitivity' && (
        <SensitivityHeatmap
          modelId={id}
          model={model}
        />
      )}

      {activeTab === 'settings' && (
        <AIPrivacySettings />
      )}
    </div>
  )
}
