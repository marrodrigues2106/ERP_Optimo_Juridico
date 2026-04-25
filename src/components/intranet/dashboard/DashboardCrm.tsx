import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { MessageSquare } from 'lucide-react'

export function DashboardCrm({
  interactions,
  chartType,
}: {
  interactions: any[]
  chartType: string
}) {
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    interactions.forEach((i) => {
      const type = i.type || 'Note'
      counts[type] = (counts[type] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [interactions])

  const collabData = useMemo(() => {
    const counts: Record<string, number> = {}
    interactions.forEach((i) => {
      const collab = i.expand?.responsible?.name || 'Não atribuído'
      counts[collab] = (counts[collab] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [interactions])

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
              <MessageSquare className="w-4 h-4" /> Total de Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interactions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Por Tipo de Interação</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{ count: { label: 'Quantidade', color: 'hsl(var(--primary))' } }}
              className="h-full w-full"
            >
              {renderChart(typeData, 'count', 'name', 'hsl(var(--primary))')}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Colaborador</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{ count: { label: 'Atendimentos', color: '#10b981' } }}
              className="h-full w-full"
            >
              {renderChart(collabData, 'count', 'name', '#10b981')}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
