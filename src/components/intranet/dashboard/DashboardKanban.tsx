import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { LayoutDashboard, CheckCircle2 } from 'lucide-react'

export function DashboardKanban({
  tasks,
  kanbanColumns,
  chartType,
}: {
  tasks: any[]
  kanbanColumns: any[]
  chartType: string
}) {
  const columnData = useMemo(() => {
    const counts: Record<string, number> = {}
    kanbanColumns.forEach((c) => {
      counts[c.id] = 0
    })
    tasks.forEach((t) => {
      if (t.kanban_column) {
        counts[t.kanban_column] = (counts[t.kanban_column] || 0) + 1
      }
    })
    return kanbanColumns.map((c) => ({
      name: c.name,
      count: counts[c.id] || 0,
    }))
  }, [tasks, kanbanColumns])

  const collabEfficiency = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {}
    tasks.forEach((t) => {
      const collab = t.expand?.collaborator?.name || 'Não atribuído'
      if (!stats[collab]) stats[collab] = { total: 0, completed: 0 }
      stats[collab].total += 1
      if (t.status === 'completed') stats[collab].completed += 1
    })
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        efficiency: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        completed: data.completed,
        total: data.total,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
  }, [tasks])

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#6366f1',
    '#ec4899',
    '#14b8a6',
    '#f43f5e',
  ]

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length

  const renderChart = (data: any[], dataKey: string, nameKey: string, color: string) => {
    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={chartType === 'horizontal' ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          {chartType === 'horizontal' ? <XAxis type="number" /> : <XAxis dataKey={nameKey} />}
          {chartType === 'horizontal' ? (
            <YAxis dataKey={nameKey} type="category" width={100} />
          ) : (
            <YAxis />
          )}
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Total de Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% de taxa de
              conclusão
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas por Coluna (Kanban)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{ count: { label: 'Tarefas', color: '#8b5cf6' } }}
              className="h-full w-full"
            >
              {renderChart(columnData, 'count', 'name', '#8b5cf6')}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eficiência por Colaborador (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{ efficiency: { label: 'Eficiência (%)', color: '#10b981' } }}
              className="h-full w-full"
            >
              {renderChart(collabEfficiency, 'efficiency', 'name', '#10b981')}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
