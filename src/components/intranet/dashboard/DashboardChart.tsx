import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
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

const CHART_CONFIG = {
  Concluído: { label: 'Concluído', color: '#10b981' },
  'Em andamento': { label: 'Em andamento', color: '#3b82f6' },
  Atrasado: { label: 'Atrasado', color: '#ef4444' },
  Quantidade: { label: 'Quantidade', color: '#6366f1' },
  Receitas: { label: 'Receitas', color: '#10b981' },
  Despesas: { label: 'Despesas', color: '#ef4444' },
}

export function DashboardChart({
  data,
  keys,
  type,
}: {
  data: any[]
  keys: string[]
  type: string
}) {
  const TheChart = type === 'line' ? LineChart : BarChart
  const isHorizontal = type === 'horizontal'

  return (
    <ChartContainer config={CHART_CONFIG as any} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <TheChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={!isHorizontal}
            horizontal={isHorizontal}
            opacity={0.5}
          />
          <XAxis
            type={isHorizontal ? 'number' : 'category'}
            dataKey={isHorizontal ? undefined : 'date'}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type={isHorizontal ? 'category' : 'number'}
            dataKey={isHorizontal ? 'date' : undefined}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {keys.map((k, i) => {
            const color =
              CHART_CONFIG[k as keyof typeof CHART_CONFIG]?.color || `hsl(var(--chart-${i + 1}))`
            if (type === 'line') {
              return (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )
            }
            return <Bar key={k} dataKey={k} fill={color} radius={[4, 4, 0, 0]} />
          })}
        </TheChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
