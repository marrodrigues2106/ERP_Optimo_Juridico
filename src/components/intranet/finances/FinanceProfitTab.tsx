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
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

const KPICard = ({ title, value, icon: Icon, color, valColor }: any) => (
  <Card className="shadow-sm border-slate-200">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className={cn('text-xl font-bold', valColor)}>{value}</h4>
      </div>
    </CardContent>
  </Card>
)

export function FinanceProfitTab({ transactions = [], cases = [], estimates = [], user }: any) {
  const [filterMode, setFilterMode] = useState('ultimos_12_meses')
  const [startDate, setStartDate] = useState(
    format(startOfMonth(addMonths(new Date(), -11)), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  const handleFilterChange = (val: string) => {
    setFilterMode(val)
    const today = new Date()
    if (val === 'mensal') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (val === 'trimestral') {
      setStartDate(format(startOfMonth(addMonths(today, -2)), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (val === 'ano_atual') {
      setStartDate(format(startOfYear(today), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (val === 'ultimos_12_meses') {
      setStartDate(format(startOfMonth(addMonths(today, -11)), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    }
  }

  const { chartData, summary, casesProf } = useMemo(() => {
    const sObj = new Date(startDate + 'T00:00:00'),
      eObj = new Date(endDate + 'T23:59:59')
    if (isNaN(eObj.getTime()) || isNaN(sObj.getTime()))
      return { chartData: [], summary: null, casesProf: [] }

    const expanded: any[] = []
    transactions.forEach((t: any) => {
      if (t.deleted_at || !t.date) return
      const st = t.status?.toLowerCase() || ''
      if (
        !(t.type === 'inflow' && ['realizada', 'recebida'].includes(st)) &&
        !(t.type === 'outflow' && ['realizado', 'pago'].includes(st))
      )
        return

      const tDate = t.date.substring(0, 10)
      if (t.recurrence_id || !t.frequency || t.frequency === 'única') {
        if (tDate >= startDate && tDate <= endDate) expanded.push(t)
      } else {
        const cur = new Date(tDate + 'T12:00:00')
        for (let limit = 0; limit < 1000 && cur <= eObj; limit++) {
          if (cur >= sObj) expanded.push({ ...t, date: cur.toISOString() })
          if (t.frequency === 'semanal') cur.setDate(cur.getDate() + 7)
          else if (t.frequency === 'quinzenal') cur.setDate(cur.getDate() + 14)
          else if (t.frequency === 'mensal') cur.setMonth(cur.getMonth() + 1)
          else break
        }
      }
    })

    let tIn = 0,
      tOut = 0
    const grouped: any = {}
    expanded.forEach((t: any) => {
      if (t.type === 'inflow') tIn += t.amount || 0
      else tOut += t.amount || 0
      const d = new Date(t.date.substring(0, 10) + 'T12:00:00')
      const isDaily = differenceInDays(eObj, sObj) <= 31
      const key = format(d, isDaily ? 'dd/MM' : 'MMM yyyy', { locale: ptBR })
      if (!grouped[key])
        grouped[key] = {
          period: key,
          inflow: 0,
          outflow: 0,
          sortKey: isDaily ? d.getTime() : startOfMonth(d).getTime(),
        }
      if (t.type === 'inflow') grouped[key].inflow += t.amount || 0
      else grouped[key].outflow += t.amount || 0
    })

    return {
      chartData: Object.values(grouped)
        .map((g: any) => ({ ...g, netResult: g.inflow - g.outflow }))
        .sort((a: any, b: any) => a.sortKey - b.sortKey),
      summary: { tIn, tOut, net: tIn - tOut, margin: tIn > 0 ? ((tIn - tOut) / tIn) * 100 : 0 },
      casesProf: cases
        .map((c: any) => {
          const cTx = expanded.filter((t) => t.linked_lawsuit === c.id)
          const cIn = cTx.reduce((acc, t) => (t.type === 'inflow' ? acc + (t.amount || 0) : acc), 0)
          const cOut = cTx.reduce(
            (acc, t) => (t.type === 'outflow' ? acc + (t.amount || 0) : acc),
            0,
          )
          const cEst = estimates.filter((e: any) => e.case === c.id)
          const eF = cEst.reduce((acc, e) => acc + (e.estimated_fees || 0), 0)
          const eC = cEst.reduce((acc, e) => acc + (e.total_estimated_costs || 0), 0)
          return {
            ...c,
            cIn,
            cOut,
            fix: c.allocated_fixed_cost || 0,
            prof: cIn - (cOut + (c.allocated_fixed_cost || 0)),
            eF,
            eC,
            marg: cIn > 0 ? ((cIn - (cOut + (c.allocated_fixed_cost || 0))) / cIn) * 100 : 0,
          }
        })
        .filter((c: any) => c.cIn > 0 || c.cOut > 0 || c.eF > 0 || c.eC > 0),
    }
  }, [transactions, cases, estimates, startDate, endDate])

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'BRL',
    }).format(v || 0)
  const fmtFull = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  const cfg = {
    inflow: { label: 'Receitas', color: '#10b981' },
    outflow: { label: 'Despesas', color: '#ef4444' },
    netResult: { label: 'Resultado Líquido', color: '#3b82f6' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-slate-800">
          {user?.role === 'admin' ? 'Visão Geral de Rentabilidade' : 'Minha Rentabilidade'}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterMode} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-slate-50">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="ano_atual">Ano Atual</SelectItem>
              <SelectItem value="ultimos_12_meses">Últimos 12 Meses</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md border">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setFilterMode('custom')
                setStartDate(e.target.value)
              }}
              className="w-auto h-7 text-xs border-none shadow-none bg-white"
            />
            <span className="text-slate-400 text-xs">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setFilterMode('custom')
                setEndDate(e.target.value)
              }}
              className="w-auto h-7 text-xs border-none shadow-none bg-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total"
          value={summary ? fmtFull(summary.tIn) : 'R$ 0,00'}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-500"
          valColor="text-slate-800"
        />
        <KPICard
          title="Custos e Despesas"
          value={summary ? fmtFull(summary.tOut) : 'R$ 0,00'}
          icon={TrendingDown}
          color="bg-red-50 text-red-500"
          valColor="text-slate-800"
        />
        <KPICard
          title="Lucro Líquido"
          value={summary ? fmtFull(summary.net) : 'R$ 0,00'}
          icon={DollarSign}
          color="bg-blue-50 text-blue-500"
          valColor={summary && summary.net < 0 ? 'text-red-500' : 'text-slate-800'}
        />
        <KPICard
          title="Margem Média"
          value={summary ? `${summary.margin.toFixed(1)}%` : '0,0%'}
          icon={Percent}
          color="bg-amber-50 text-amber-500"
          valColor={summary && summary.margin < 0 ? 'text-red-500' : 'text-slate-800'}
        />
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Evolução Financeira</CardTitle>
          <CardDescription>
            Comparativo de receitas, despesas e resultado líquido ao longo do tempo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                <BarChart3 className="w-8 h-8 mr-2" /> Nenhum dado no período.
              </div>
            ) : (
              <ChartContainer config={cfg} className="h-full w-full">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
                    tickFormatter={fmtBRL}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dashed"
                        formatter={(v: any) => fmtFull(Number(v))}
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
                </ComposedChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Rentabilidade por Processo</CardTitle>
          <CardDescription>
            Análise detalhada do lucro real e estimado para cada caso movimentado.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          {casesProf.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Nenhum processo com movimentação no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Processo</th>
                    <th className="px-4 py-3 font-medium text-right">Receitas (Real)</th>
                    <th className="px-4 py-3 font-medium text-right">Custos (Real+Fixo)</th>
                    <th className="px-4 py-3 font-medium text-right">Lucro Real</th>
                    <th className="px-4 py-3 font-medium text-right">Margem</th>
                    <th className="px-4 py-3 font-medium text-right">Hon. (Est.)</th>
                    <th className="px-4 py-3 font-medium text-right">Custos (Est.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {casesProf.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.case_number || 'S/N'}
                        <br />
                        <span className="text-xs text-slate-500 font-normal">{c.parties}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">{fmtFull(c.cIn)}</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {fmtFull(c.cOut + c.fix)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-bold',
                          c.prof >= 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {fmtFull(c.prof)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{c.marg.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmtFull(c.eF)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmtFull(c.eC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
