import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DashboardChart } from './DashboardChart'
import { getEvolutionRange, getForecastRange, generateDaysArray } from './utils'

export function DashboardActivities({
  activities,
  chartType,
}: {
  activities: any[]
  chartType: string
}) {
  const [evolutionFilter, setEvolutionFilter] = useState('last7')
  const [forecastFilter, setForecastFilter] = useState('next7')

  const evolutionData = useMemo(() => {
    const range = getEvolutionRange(evolutionFilter)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const dayActs = activities.filter(
        (a) => a.date && format(new Date(a.date), 'yyyy-MM-dd') === d,
      )
      return {
        date: format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        Concluído: dayActs.filter((a) => a.status === 'Concluído').length,
        'Em andamento': dayActs.filter((a) => a.status === 'Em andamento').length,
        Atrasado: dayActs.filter((a) => a.status === 'Atrasado').length,
      }
    })
  }, [activities, evolutionFilter])

  const forecastData = useMemo(() => {
    const range = getForecastRange(forecastFilter)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const dayActs = activities.filter(
        (a) => a.date && format(new Date(a.date), 'yyyy-MM-dd') === d,
      )
      return {
        date: format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        Quantidade: dayActs.length,
      }
    })
  }, [activities, forecastFilter])

  const totals = {
    completed: activities.filter((a) => a.status === 'Concluído').length,
    inProgress: activities.filter((a) => a.status === 'Em andamento').length,
    late: activities.filter((a) => a.status === 'Atrasado').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{totals.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{totals.late}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Concluído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">{totals.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Evolução de Atividades</CardTitle>
              <CardDescription>Atividades por dia</CardDescription>
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
            <DashboardChart
              data={evolutionData}
              keys={['Concluído', 'Em andamento', 'Atrasado']}
              type={chartType}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Previsão de Demandas</CardTitle>
              <CardDescription>Próximos dias</CardDescription>
            </div>
            <Select value={forecastFilter} onValueChange={setForecastFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next3">3 dias</SelectItem>
                <SelectItem value="next7">7 dias</SelectItem>
                <SelectItem value="next30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <DashboardChart data={forecastData} keys={['Quantidade']} type={chartType} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
