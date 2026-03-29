import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useRealtime } from '@/hooks/use-realtime'

export function CrmProductivityTab() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [intData, taskData, clientsData] = await Promise.all([
        pb.collection('crm_interactions').getFullList({ expand: 'responsible' }),
        pb.collection('tasks').getFullList(),
        pb.collection('clients').getFullList(),
      ])
      setInteractions(intData)
      setTasks(taskData)
      setClients(clientsData)
    } catch (e) {}
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('crm_interactions', loadData)
  useRealtime('tasks', loadData)
  useRealtime('clients', loadData)

  const chartConfig = {
    total: { label: 'Total', color: 'hsl(var(--primary))' },
    completed: { label: 'Concluídas', color: '#10b981' },
    pending: { label: 'Pendentes', color: '#f59e0b' },
  }

  const interactionsByCollab = useMemo(() => {
    const acc: Record<string, number> = {}
    interactions.forEach((i) => {
      const name = i.expand?.responsible?.name || 'Não Atribuído'
      acc[name] = (acc[name] || 0) + 1
    })
    return Object.entries(acc).map(([name, total]) => ({ name, total }))
  }, [interactions])

  const taskStats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length
    const pending = tasks.filter((t) => t.status === 'todo').length
    return [
      { name: 'Concluídas', value: completed, color: '#10b981' },
      { name: 'Pendentes', value: pending, color: '#f59e0b' },
    ]
  }, [tasks])

  const funnelStats = useMemo(() => {
    const leads = clients.filter(
      (c) => c.classification === 'Lead' || c.dynamicClassification === 'Lead',
    )
    const acc = { Contact: 0, Proposal: 0, Negotiation: 0, Closed: 0 }
    leads.forEach((l) => {
      if (l.funnel_stage && acc[l.funnel_stage as keyof typeof acc] !== undefined) {
        acc[l.funnel_stage as keyof typeof acc]++
      } else {
        acc.Contact++
      }
    })
    return [
      { stage: 'Contato', count: acc.Contact },
      { stage: 'Proposta', count: acc.Proposal },
      { stage: 'Negociação', count: acc.Negotiation },
      { stage: 'Fechado', count: acc.Closed },
    ]
  }, [clients])

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Interações por Colaborador</CardTitle>
          <CardDescription>Volume de emails, ligações e reuniões realizadas</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactionsByCollab}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas da Equipe</CardTitle>
          <CardDescription>Proporção de tarefas concluídas vs pendentes</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex justify-center items-center">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {taskStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Funil de Vendas (Leads)</CardTitle>
          <CardDescription>Distribuição de leads por estágio do funil</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer
            config={{ count: { label: 'Leads', color: '#3b82f6' } }}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelStats} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
