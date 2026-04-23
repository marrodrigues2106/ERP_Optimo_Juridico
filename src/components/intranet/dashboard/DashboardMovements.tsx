import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DashboardChart } from './DashboardChart'
import { getEvolutionRange, generateDaysArray } from './utils'

export function DashboardMovements({
  movements,
  chartType,
  title,
}: {
  movements: any[]
  chartType: string
  title: string
}) {
  const [evolutionFilter, setEvolutionFilter] = useState('last30')

  const evolutionData = useMemo(() => {
    const range = getEvolutionRange(evolutionFilter)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const count = movements.filter(
        (m) => m.event_date && format(new Date(m.event_date), 'yyyy-MM-dd') === d,
      ).length
      return {
        date: format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        Quantidade: count,
      }
    })
  }, [movements, evolutionFilter])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Movimentações por dia no período</CardDescription>
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
          <DashboardChart data={evolutionData} keys={['Quantidade']} type={chartType} />
        </CardContent>
      </Card>
    </div>
  )
}
