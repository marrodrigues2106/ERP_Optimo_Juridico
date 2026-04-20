import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfYear,
  differenceInDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

export function FinanceProfitTab({ transactions = [], cases = [], estimates = [], user }: any) {
  const [filterMode, setFilterMode] = useState<string>('ultimos_12_meses')
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(addMonths(new Date(), -11)), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  const isFinancialAdmin =
    user?.role === 'admin' || user?.isAdmin || user?.role === 'financial_user'

  const handleFilterChange = (val: string) => {
    setFilterMode(val)
    const today = new Date()
    if (val === 'mensal') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (val === 'ano_atual') {
      setStartDate(format(startOfYear(today), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (val === 'ultimos_12_meses') {
      setStartDate(format(startOfMonth(addMonths(today, -11)), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    }
  }

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    setFilterMode('custom')
    if (type === 'start') setStartDate(val)
    if (type === 'end') setEndDate(val)
  }

  const { chartData, summary } = useMemo(() => {
    const grouped: Record<
      string,
      {
        period: string
        realizedIn: number
        realizedOut: number
        sortKey: number
        casesInvolved: Set<string>
      }
    > = {}

    const ed = new Date(endDate)
    const sd = new Date(startDate)

    let totalIn = 0
    let totalOut = 0
    const casesInPeriod = new Set<string>()

    if (isNaN(ed.getTime()) || isNaN(sd.getTime())) return { chartData: [], summary: null }

    const diffDays = differenceInDays(ed, sd)
    const groupByDay = diffDays <= 31

    const filteredFinances = transactions.filter((f: any) => {
      if (f.deleted_at) return false
      if (!f.date) return false
      const d = f.date.substring(0, 10)
      return d >= startDate && d <= endDate
    })

    filteredFinances.forEach((f: any) => {
      if (!f.date) return
      const date = new Date(f.date + 'T12:00:00')
      if (isNaN(date.getTime())) return

      const key = groupByDay ? format(date, 'dd/MM') : format(date, 'MMM yyyy', { locale: ptBR })
      const sortKey = groupByDay ? date.getTime() : startOfMonth(date).getTime()

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          realizedIn: 0,
          realizedOut: 0,
          sortKey,
          casesInvolved: new Set(),
        }
      }

      if (f.type === 'inflow') {
        grouped[key].realizedIn += f.amount || 0
        totalIn += f.amount || 0
      }
      if (f.type === 'outflow') {
        grouped[key].realizedOut += f.amount || 0
        totalOut += f.amount || 0
      }
      if (f.linked_lawsuit) {
        grouped[key].casesInvolved.add(f.linked_lawsuit)
        casesInPeriod.add(f.linked_lawsuit)
      }
    })

    // Calculate Margin = Estimated Fees - Costs
    let totalEstimatedFees = 0
    casesInPeriod.forEach((caseId) => {
      const estimate = estimates.find((e: any) => e.case === caseId)
      if (estimate && estimate.estimated_fees) {
        totalEstimatedFees += estimate.estimated_fees
      }
    })

    const finalChartData = Object.values(grouped)
      .map((g) => {
        const netResult = g.realizedIn - g.realizedOut

        let periodEstFees = 0
        g.casesInvolved.forEach((cid) => {
          const est = estimates.find((e: any) => e.case === cid)
          if (est && est.estimated_fees) periodEstFees += est.estimated_fees
        })
        const periodMargin = periodEstFees > 0 ? periodEstFees - g.realizedOut : netResult

        return {
          period: g.period,
          margin: Number(periodMargin.toFixed(2)),
          netResult: Number(netResult.toFixed(2)),
          inflow: Number(g.realizedIn.toFixed(2)),
          outflow: Number(g.realizedOut.toFixed(2)),
          sortKey: g.sortKey,
        }
      })
      .sort((a, b) => a.sortKey - b.sortKey)

    const totalMargin = totalEstimatedFees > 0 ? totalEstimatedFees - totalOut : totalIn - totalOut

    return {
      chartData: finalChartData,
      summary: {
        totalIn,
        totalOut,
        netResult: totalIn - totalOut,
        totalEstimatedFees,
        totalMargin,
      },
    }
  }, [transactions, startDate, endDate, estimates])

  const chartConfig = {
    inflow: { label: 'Receitas', color: '#10b981' },
    outflow: { label: 'Despesas', color: '#ef4444' },
    netResult: { label: 'Resultado Líquido', color: '#3b82f6' },
    margin: { label: 'Margem', color: '#f59e0b' },
  }

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)

  const formatFullBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Receitas</p>
              <h4 className="text-xl font-bold text-slate-800">
                {summary ? formatFullBRL(summary.totalIn) : 'R$ 0,00'}
              </h4>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-500">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Custos/Despesas</p>
              <h4 className="text-xl font-bold text-slate-800">
                {summary ? formatFullBRL(summary.totalOut) : 'R$ 0,00'}
              </h4>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Resultado Líquido</p>
              <h4
                className={`text-xl font-bold ${summary && summary.netResult < 0 ? 'text-red-500' : 'text-slate-800'}`}
              >
                {summary ? formatFullBRL(summary.netResult) : 'R$ 0,00'}
              </h4>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-500">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Margem (Estimativa - Custos)</p>
              <h4
                className={`text-xl font-bold ${summary && summary.totalMargin < 0 ? 'text-red-500' : 'text-slate-800'}`}
              >
                {summary ? formatFullBRL(summary.totalMargin) : 'R$ 0,00'}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />{' '}
              {isFinancialAdmin ? 'Análise de Rentabilidade' : 'Minha Rentabilidade'}
            </CardTitle>
            <CardDescription>
              Evolução de receitas, custos, resultado e margem no período selecionado.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterMode} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[160px] h-9 text-xs bg-slate-50">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
                <SelectItem value="ultimos_12_meses">Últimos 12 Meses</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md border">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-auto h-7 text-xs bg-white border-none shadow-none"
              />
              <span className="text-slate-400 text-xs font-medium">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-auto h-7 text-xs bg-white border-none shadow-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px] w-full">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                <BarChart3 className="w-10 h-10 mb-3 text-slate-300" />
                <p className="font-medium text-sm">Nenhum dado financeiro encontrado no período.</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => formatBRL(value)}
                  />

                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dashed"
                        formatter={(value: any, name: string) => {
                          return formatFullBRL(Number(value))
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />

                  <Bar
                    yAxisId="left"
                    dataKey="inflow"
                    fill="var(--color-inflow)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="outflow"
                    fill="var(--color-outflow)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="netResult"
                    stroke="var(--color-netResult)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="margin"
                    stroke="var(--color-margin)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeDasharray: '3 3' }}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
