import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, addWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BarChart3 } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

export function FinanceProfitTab({ transactions, cases, estimates, user }: any) {
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(addWeeks(new Date(), -12)), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  const isFinancialAdmin =
    user?.role === 'admin' || user?.isAdmin || user?.role === 'financial_user'

  const chartData = useMemo(() => {
    const grouped: Record<
      string,
      { month: string; estimated: number; realized: number; sortKey: number }
    > = {}

    const filteredFinances = transactions.filter((f: any) => {
      if (f.deleted_at) return false
      const d = f.date.substring(0, 10)
      return d >= startDate && d <= endDate
    })

    filteredFinances.forEach((f: any) => {
      const date = new Date(f.date)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          estimated: 0,
          realized: 0,
          sortKey: startOfMonth(date).getTime(),
        }
      }

      const isEstimated = ['orçado', 'estimado', 'previsto'].includes(f.status)
      const isRealized = ['realizada', 'recebida', 'realizado', 'pago'].includes(f.status)

      if (f.type === 'inflow' && isEstimated) grouped[monthKey].estimated += f.amount || 0
      if (f.type === 'inflow' && isRealized) grouped[monthKey].realized += f.amount || 0
    })

    return Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey)
  }, [transactions, startDate, endDate])

  const chartConfig = {
    estimated: {
      label: 'Margem Estimada',
      color: '#94a3b8',
    },
    realized: {
      label: 'Margem Realizada',
      color: '#0f172a',
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />{' '}
            {isFinancialAdmin ? 'Rentabilidade Global' : 'Minha Rentabilidade'}
          </CardTitle>
          <CardDescription>
            Comparativo entre margem estimada vs. realizada mensalmente.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md border">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto h-8 text-xs bg-white"
          />
          <span className="text-slate-400 text-xs px-1">até</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto h-8 text-xs bg-white"
          />
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
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="estimated" fill="var(--color-estimated)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realized" fill="var(--color-realized)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
