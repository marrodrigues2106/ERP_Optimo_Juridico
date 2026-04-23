import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, BarChart2, LineChart as LineChartIcon, Loader2 } from 'lucide-react'
import { DashboardActivities } from './dashboard/DashboardActivities'
import { DashboardFinance } from './dashboard/DashboardFinance'
import { DashboardMovements } from './dashboard/DashboardMovements'
import { getTaskStatus, getEventStatus } from './dashboard/utils'

export default function Dashboard() {
  const [data, setData] = useState({ tasks: [], events: [], movements: [], finances: [] })
  const [loading, setLoading] = useState(true)
  const [collabId, setCollabId] = useState<string | null>(null)
  const [role, setRole] = useState({ isAdmin: false, isFinancial: false })
  const [chartType, setChartType] = useState('bar')
  const [activeTab, setActiveTab] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const user = pb.authStore.record
        if (!user) return

        const isAdmin = user.isAdmin || user.role === 'admin'
        const isFinancial = user.role === 'financial_user'
        setRole({ isAdmin, isFinancial })

        let currentCollab = null
        try {
          const c = await pb
            .collection('collaborators')
            .getFirstListItem(`user="${user.id}" && deleted_at=""`)
          currentCollab = c.id
          setCollabId(c.id)
        } catch {
          /* intentionally ignored */
        }

        const orgId = user.active_organization
        const filter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

        const [tasksRes, eventsRes, moveRes, finRes] = await Promise.all([
          pb.collection('tasks').getFullList({ filter }),
          pb.collection('agenda_events').getFullList({ filter }),
          pb.collection('case_movements').getFullList({ filter, expand: 'case' }),
          pb.collection('finances').getFullList({ filter, expand: 'linked_lawsuit' }),
        ])

        setData({ tasks: tasksRes, events: eventsRes, movements: moveRes, finances: finRes })

        if (isFinancial) setActiveTab('finance')
        else setActiveTab('activities')
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activities = useMemo(() => {
    const list: any[] = []
    data.tasks.forEach((t) => {
      if (!role.isAdmin && t.collaborator !== collabId) return
      list.push({ type: 'task', date: t.due_date || t.created, status: getTaskStatus(t), item: t })
    })
    data.events.forEach((e) => {
      if (!role.isAdmin && e.collaborator !== collabId && !e.participants?.includes(collabId))
        return
      list.push({
        type: 'event',
        date: e.start_date || e.created,
        status: getEventStatus(e),
        item: e,
      })
    })
    return list
  }, [data.tasks, data.events, role.isAdmin, collabId])

  const myMovements = useMemo(() => {
    return data.movements.filter((m: any) => m.expand?.case?.responsible_collaborator === collabId)
  }, [data.movements, collabId])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const tabs = []
  if (role.isFinancial) tabs.push({ id: 'finance', label: 'Controle Financeiro' })
  else tabs.push({ id: 'activities', label: 'Painel de Atividades' })

  if (role.isAdmin) tabs.push({ id: 'office_movements', label: 'Movimentação do Escritório' })
  tabs.push({ id: 'my_movements', label: 'Minhas Movimentações' })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Activity className="w-8 h-8" /> Dashboard de Produtividade
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe métricas, atividades e movimentações.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Tipo de Gráfico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Barras Verticais
                </div>
              </SelectItem>
              <SelectItem value="horizontal">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 rotate-90" /> Barras Horiz.
                </div>
              </SelectItem>
              <SelectItem value="line">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" /> Linha
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl h-auto flex flex-wrap gap-1">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="activities">
          <DashboardActivities activities={activities} chartType={chartType} />
        </TabsContent>
        <TabsContent value="finance">
          <DashboardFinance finances={data.finances} chartType={chartType} />
        </TabsContent>
        <TabsContent value="office_movements">
          <DashboardMovements
            movements={data.movements}
            chartType={chartType}
            title="Evolução de Movimentações (Escritório)"
          />
        </TabsContent>
        <TabsContent value="my_movements">
          <DashboardMovements
            movements={myMovements}
            chartType={chartType}
            title="Evolução de Movimentações (Minhas)"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
