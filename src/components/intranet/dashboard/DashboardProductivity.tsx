import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart2, TrendingUp, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const CHART_CONFIG = {
  Tarefas: { label: 'Tarefas', color: 'hsl(var(--primary))' },
  'Eventos Processuais': { label: 'Eventos Processuais', color: '#8b5cf6' },
  Compromissos: { label: 'Compromissos', color: '#10b981' },
}

const getRetroRange = (filter: string) => {
  const now = new Date()
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfDay(now) }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfDay(now) }
    case 'last_7_days':
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) }
    case 'last_30_days':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) }
    default:
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) }
  }
}

const getProspRange = (filter: string) => {
  const now = new Date()
  switch (filter) {
    case 'next_3_days':
      return { start: startOfDay(now), end: endOfDay(addDays(now, 3)) }
    case 'next_week':
      return { start: startOfDay(now), end: endOfWeek(addDays(now, 7), { weekStartsOn: 0 }) }
    case 'next_month':
      return { start: startOfDay(now), end: endOfMonth(addDays(now, 30)) }
    default:
      return { start: startOfDay(now), end: endOfDay(addDays(now, 7)) }
  }
}

const generateDaysArray = (start: Date, end: Date) => {
  const days = []
  let curr = new Date(start)
  while (curr <= end) {
    days.push(new Date(curr))
    curr = addDays(curr, 1)
  }
  return days
}

export function DashboardProductivity() {
  const [retroPeriod, setRetroPeriod] = useState('last_7_days')
  const [prospPeriod, setProspPeriod] = useState('next_7_days')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ tasks: [] as any[], events: [] as any[], cases: [] as any[] })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const orgId = pb.authStore.record?.active_organization
        const baseFilter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

        const [tasks, events, cases] = await Promise.all([
          pb.collection('tasks').getFullList({ filter: baseFilter }),
          pb.collection('agenda_events').getFullList({ filter: baseFilter }),
          pb
            .collection('legal_cases')
            .getFullList({ filter: `${baseFilter} && lifecycle_status="Ativo"` }),
        ])
        setData({ tasks, events, cases })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const retroData = useMemo(() => {
    const range = getRetroRange(retroPeriod)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const dayStr = format(d, 'yyyy-MM-dd')
      const tasksCount = data.tasks.filter(
        (t) => t.due_date && t.due_date.startsWith(dayStr) && t.status === 'completed',
      ).length
      const eventsCount = data.events.filter(
        (e) => e.start_date && e.start_date.startsWith(dayStr),
      ).length
      const casesCount = data.cases.filter(
        (c) => c.deadline && c.deadline.startsWith(dayStr),
      ).length
      return {
        date: format(d, 'dd/MM', { locale: ptBR }),
        Tarefas: tasksCount,
        'Eventos Processuais': casesCount,
        Compromissos: eventsCount,
      }
    })
  }, [data, retroPeriod])

  const prospData = useMemo(() => {
    const range = getProspRange(prospPeriod)
    const days = generateDaysArray(range.start, range.end)
    return days.map((d) => {
      const dayStr = format(d, 'yyyy-MM-dd')
      const tasksCount = data.tasks.filter(
        (t) => t.due_date && t.due_date.startsWith(dayStr) && t.status !== 'completed',
      ).length
      const eventsCount = data.events.filter(
        (e) => e.start_date && e.start_date.startsWith(dayStr),
      ).length
      const casesCount = data.cases.filter(
        (c) => c.deadline && c.deadline.startsWith(dayStr),
      ).length
      return {
        date: format(d, 'dd/MM', { locale: ptBR }),
        Tarefas: tasksCount,
        'Eventos Processuais': casesCount,
        Compromissos: eventsCount,
      }
    })
  }, [data, prospPeriod])

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <BarChart2 className="w-5 h-5 text-primary" /> Retrospectiva
            </CardTitle>
            <CardDescription>Atividades concluídas / ocorridas</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={retroPeriod} onValueChange={setRetroPeriod}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="this_week">Esta Semana</SelectItem>
                <SelectItem value="this_month">Este Mês</SelectItem>
                <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Link
              to="/intranet/productivity"
              className="text-xs text-primary font-medium hover:underline hidden sm:block"
            >
              Detalhar
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={CHART_CONFIG as any} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retroData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="Tarefas"
                  fill="var(--color-Tarefas)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="Eventos Processuais"
                  fill="var(--color-Eventos-Processuais)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="Compromissos"
                  fill="var(--color-Compromissos)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Projeção de Demandas
            </CardTitle>
            <CardDescription>Carga de trabalho e prazos futuros</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={prospPeriod} onValueChange={setProspPeriod}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_3_days">Próximos 3 dias</SelectItem>
                <SelectItem value="next_week">Próxima Semana</SelectItem>
                <SelectItem value="next_month">Próximo Mês</SelectItem>
              </SelectContent>
            </Select>
            <Link
              to="/intranet/productivity"
              className="text-xs text-indigo-600 font-medium hover:underline hidden sm:block"
            >
              Detalhar
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={CHART_CONFIG as any} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prospData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="Tarefas"
                  stroke="var(--color-Tarefas)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Eventos Processuais"
                  stroke="var(--color-Eventos-Processuais)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Compromissos"
                  stroke="var(--color-Compromissos)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
