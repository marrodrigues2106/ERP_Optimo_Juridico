import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react'
import { format, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DashboardChart } from './DashboardChart'
import { getEvolutionRange, generateDaysArray } from './utils'

export function DashboardFinance({ finances, chartType }: { finances: any[]; chartType: string }) {
  const [evolutionFilter, setEvolutionFilter] = useState('last30')

  const stats = useMemo(() => {
    let pending = 0,
      late = 0,
      completed = 0
    let balanceOffice = 0
    const byProcess: Record<string, number> = {}

    finances.forEach((f) => {
      const isCompleted = ['pago', 'recebida', 'realizada', 'realizado'].includes(
        f.status?.toLowerCase() || '',
      )
      const isLate = !isCompleted && f.date && isBefore(new Date(f.date), startOfDay(new Date()))

      if (isCompleted) completed++
      else if (isLate) late++
      else pending++

      const amt = f.type === 'inflow' ? f.amount : -(f.amount || 0)
      if (isCompleted) {
        balanceOffice += amt
        if (f.linked_lawsuit) {
          const caseNum = f.expand?.linked_lawsuit?.case_number || 'Sem Processo'
          if (!byProcess[caseNum]) byProcess[caseNum] = 0
          byProcess[caseNum] += amt
        }
      }
    })
    return { pending, late, completed, balanceOffice, byProcess }
  }, [finances])

  const evolutionData = useMemo(() => {
    const range = getEvolutionRange(evolutionFilter)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const dayFins = finances.filter((f) => f.date && format(new Date(f.date), 'yyyy-MM-dd') === d)
      return {
        date: format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        Receitas: dayFins.filter((f) => f.type === 'inflow').reduce((s, f) => s + f.amount, 0),
        Despesas: dayFins.filter((f) => f.type === 'outflow').reduce((s, f) => s + f.amount, 0),
      }
    })
  }, [finances, evolutionFilter])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex gap-2 items-center">
              <DollarSign className="w-4 h-4" /> Balanço Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {stats.balanceOffice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 flex gap-2 items-center">
              <CheckCircle2 className="w-4 h-4" /> Concluído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex gap-2 items-center">
              <AlertTriangle className="w-4 h-4" /> Atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{stats.late}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex gap-2 items-center">
              <Clock className="w-4 h-4" /> Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Evolução Financeira</CardTitle>
              <CardDescription>Receitas vs Despesas</CardDescription>
            </div>
            <Select value={evolutionFilter} onValueChange={setEvolutionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="last7">Últimos 7 dias</SelectItem>
                <SelectItem value="last30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <DashboardChart data={evolutionData} keys={['Receitas', 'Despesas']} type={chartType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balanço por Processo</CardTitle>
            <CardDescription>Top 5 processos faturados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.byProcess)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([proc, val]) => (
                  <div
                    key={proc}
                    className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="text-sm font-medium text-slate-700 truncate w-2/3">
                      {proc}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              {Object.keys(stats.byProcess).length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">Nenhum faturamento.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
