import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

export function FinanceProfitTab({ transactions, cases, estimates }: any) {
  const [profitGroupBy, setProfitGroupBy] = useState('area')
  const [profitPeriod, setProfitPeriod] = useState('all')

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const profitabilityDataRaw = cases.map((c: any) => {
    const caseFinances = transactions.filter((f: any) => {
      if (f.linked_lawsuit !== c.id) return false
      if (profitPeriod === 'all') return true
      const d = new Date(f.date)
      if (profitPeriod === 'yearly') return d.getFullYear() === currentYear
      if (profitPeriod === 'monthly')
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      return true
    })

    const caseEstimates = estimates
      .filter((e: any) => e.case === c.id)
      .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
    const latestEstimate = caseEstimates[0]

    const estimatedMargin = latestEstimate
      ? latestEstimate.estimated_fees - latestEstimate.total_estimated_costs
      : 0
    const realizedInflows = caseFinances
      .filter((f: any) => f.type === 'inflow' && ['recebida', 'realizada'].includes(f.status))
      .reduce((sum: number, f: any) => sum + f.amount, 0)
    const realizedOutflows = caseFinances
      .filter((f: any) => f.type === 'outflow' && ['pago', 'realizado'].includes(f.status))
      .reduce((sum: number, f: any) => sum + f.amount, 0)
    const realizedMargin = realizedInflows - realizedOutflows

    return {
      caseId: c.id,
      collaborator: c.expand?.responsible_collaborator?.name || 'Não atribuído',
      area: c.metadata?.action_class || c.type || 'Geral',
      estimatedMargin,
      realizedMargin,
    }
  })

  const profitAggregated = profitabilityDataRaw.reduce((acc: any, curr: any) => {
    const key = profitGroupBy === 'area' ? curr.area : curr.collaborator
    if (!acc[key]) acc[key] = { name: key, estimated: 0, realized: 0 }
    acc[key].estimated += curr.estimatedMargin
    acc[key].realized += curr.realizedMargin
    return acc
  }, {})

  const chartDataProfit = Object.values(profitAggregated).sort(
    (a: any, b: any) => b.realized - a.realized,
  )

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Rentabilidade
          </CardTitle>
          <CardDescription>Comparativo entre margem estimada vs. realizada.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={profitPeriod} onValueChange={setProfitPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="yearly">Este Ano</SelectItem>
              <SelectItem value="monthly">Este Mês</SelectItem>
            </SelectContent>
          </Select>
          <Select value={profitGroupBy} onValueChange={setProfitGroupBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area">Por Área</SelectItem>
              <SelectItem value="collaborator">Por Advogado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataProfit} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(v) => `R${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]} />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="estimated"
                name="Margem Estimada"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="realized"
                name="Margem Realizada"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
