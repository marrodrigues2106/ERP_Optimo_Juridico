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
import { BarChart3 } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

export function FinanceProfitTab({ transactions = [], user }: any) {
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

  const chartData = useMemo(() => {
    const grouped: Record<
      string,
      {
        period: string
        estimatedIn: number
        estimatedOut: number
        realizedIn: number
        realizedOut: number
        sortKey: number
      }
    > = {}

    const diffDays = differenceInDays(new Date(endDate), new Date(startDate))
    const groupByDay = diffDays <= 31

    const filteredFinances = transactions.filter((f: any) => {
      if (f.deleted_at) return false
      const d = f.date?.substring(0, 10)
      return d >= startDate && d <= endDate
    })

    filteredFinances.forEach((f: any) => {
      if (!f.date) return
      const date = new Date(f.date + 'T12:00:00')
      const key = groupByDay ? format(date, 'dd/MM') : format(date, 'MMM yyyy', { locale: ptBR })
      const sortKey = groupByDay ? date.getTime() : startOfMonth(date).getTime()

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          estimatedIn: 0,
          estimatedOut: 0,
          realizedIn: 0,
          realizedOut: 0,
          sortKey,
        }
      }

      const status = f.status?.toLowerCase() || ''
      const isEstimated = ['orçado', 'estimado', 'previsto'].includes(status)
      const isRealized = ['realizada', 'recebida', 'realizado', 'pago'].includes(status)

      if (f.type === 'inflow' && isEstimated) grouped[key].estimatedIn += f.amount || 0
      if (f.type === 'outflow' && isEstimated) grouped[key].estimatedOut += f.amount || 0

      if (f.type === 'inflow' && isRealized) grouped[key].realizedIn += f.amount || 0
      if (f.type === 'outflow' && isRealized) grouped[key].realizedOut += f.amount || 0
    })

    return Object.values(grouped)
      .map((g) => {
        const estimatedMargin =
          g.estimatedIn === 0 ? 0 : ((g.estimatedIn - g.estimatedOut) / g.estimatedIn) * 100
        const realizedMargin =
          g.realizedIn === 0 ? 0 : ((g.realizedIn - g.realizedOut) / g.realizedIn) * 100
        const netResult = g.realizedIn - g.realizedOut

        return {
          period: g.period,
          estimated: Number(estimatedMargin.toFixed(2)),
          realized: Number(realizedMargin.toFixed(2)),
          netResult: Number(netResult.toFixed(2)),
          sortKey: g.sortKey,
        }
      })
      .sort((a, b) => a.sortKey - b.sortKey)
  }, [transactions, startDate, endDate])

  const chartConfig = {
    estimated: {
      label: 'Margem Estimada (%)',
      color: '#94a3b8',
    },
    realized: {
      label: 'Margem Realizada (%)',
      color: '#0f172a',
    },
    netResult: {
      label: 'Resultado do Período (R$)',
      color: '#10b981',
    },
  }

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'BRL',
    }).format(value)

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />{' '}
            {isFinancialAdmin ? 'Rentabilidade e Resultado' : 'Minha Rentabilidade'}
          </CardTitle>
          <CardDescription>
            Comparativo entre margem (%) vs. resultado líquido (R$) no período.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterMode} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
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
              className="w-auto h-8 text-xs bg-white"
            />
            <span className="text-slate-400 text-xs px-1">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              className="w-auto h-8 text-xs bg-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 border border-dashed rounded-lg">
              Nenhum dado financeiro encontrado no período.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
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
                        if (name === 'netResult') return formatBRL(Number(value))
                        return `${value}%`
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="estimated"
                  fill="var(--color-estimated)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="realized"
                  fill="var(--color-realized)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netResult"
                  stroke="var(--color-netResult)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
